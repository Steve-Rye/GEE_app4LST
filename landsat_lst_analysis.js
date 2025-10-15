/*

LST批量处理脚本
支持多个时间段的LST计算
可选ASTER GED或NDVI方法 */

// ====================== 参数设置区域（开始）======================

// 设置时间段列表
var timePeriods = [
    {start: '2023-01-01', end: '2023-12-31'},
    {start: '1990-01-01', end: '1990-12-31'},
    {start: '2020-02-02', end: '2020-12-31'}
];

// 选择计算方法：'ASTER' 或 'NDVI'
var method = 'NDVI';

// 选择统计方式：'mean', 'max', 'min', 或 'score_first'
var stat_type = 'mean';

// 设置行政边界参数 (设置为null表示不使用行政边界)
var admin_config = {
    level: 'city',  // 'province', 'city', 'county' 或 null
    name: '广州市',      // 行政区域名称
    custom_name: 'guangzhou'  // 用户自定义名称，将显示在导出文件名中
};

// 卫星配置
var satelliteConfig = {
    'L9': false,  // Landsat 9
    'L8': true,   // Landsat 8
    'L7': false,  // Landsat 7
    'L5': true,   // Landsat 5
    'L4': false   // Landsat 4
};

// 云量设置
var cloud_min = 0;
var cloud_max = 100;
var cloudInfo = 'cloud_' + cloud_min + '_' + cloud_max;

// 研究区域边界显示样式
var boundary_style = {
    province: {fillColor: '00000000', color: 'ff0000'},
    city: {fillColor: '00000000', color: 'ff0000'},
    county: {fillColor: '00000000', color: 'ff0000'}
};

// 数据集可用时间范围说明：
// - Landsat 4：1982.08 - 1993.12
// - Landsat 5：1984.03 - 2012.05
// - Landsat 7：1999.07 - 2022.04
// - Landsat 8：2013.04 - 至今
// - Landsat 9：2021.10 - 至今
// 注：以上为数据集的atmospherically corrected surface reflectance产品的可用时间范围

// ====================== 参数设置区域（结束）======================

// 导入所需模块
var LandsatLST_ASTER = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
var LandsatLST_NDVI = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');
    
// 导入中国行政边界数据
var china_provinces = ee.FeatureCollection("projects/ee-tilmacatanla/assets/boundry/china_provinces");
var china_city = ee.FeatureCollection("projects/ee-tilmacatanla/assets/boundry/china_city");
var china_county = ee.FeatureCollection("projects/ee-tilmacatanla/assets/boundry/china_county");

// 选择研究区域 (基于行政边界或自定义geometry)
var geometry;

// 检查是否存在用户自定义的table变量
try {
    geometry = table;
    print('使用用户自定义的研究区域');
} catch (error) {
    // 如果table未定义，则尝试使用行政边界
    var boundaryCollection = admin_config.level === 'province' ? china_provinces :
                            admin_config.level === 'city' ? china_city :
                            admin_config.level === 'county' ? china_county : null;
    if (boundaryCollection === null) throw new Error('未定义研究区域，请定义table变量或设置正确的行政边界参数');
    geometry = boundaryCollection.filter(ee.Filter.eq('name', admin_config.name)).geometry();
 
    print('使用行政边界作为研究区域：' + admin_config.level + ' - ' + admin_config.name);
}

// 获取研究区域名称
var areaName = (typeof table !== 'undefined') ?
    ee.String(table.get('system:id')).split('/').get(-1) : ee.String(admin_config.name);

// 获取用于地图图层显示的名称
var layerDisplayName = areaName.getInfo();
if (!layerDisplayName) {
    layerDisplayName = '研究区域';  // 提供一个默认值
}
    

// 数字补零函数
function padZero(num) {
    return num < 10 ? '0' + num : '' + num;
}

// 字符串重复函数
function repeatStr(str, times) {
    var result = '';
    for (var i = 0; i < times; i++) {
        result += str;
    }
    return result;
}

// 字符串填充函数
function padString(str, length, padChar) {
    str = String(str);
    if (str.length >= length) {
        return str;
    }
    return str + repeatStr(padChar || ' ', length - str.length);
}

/**
 * 创建指定卫星的Path/Row列表
 * @param {ee.ImageCollection} collection - 影像集合
 * @param {string} satellite - 卫星名称
 * @returns {ee.FeatureCollection} - 包含唯一Path/Row组合的FeatureCollection
 */
function createPathRowList(collection) {
    return collection.map(function(image) {
        return ee.Feature(null, {
            'WRS_PATH': image.get('WRS_PATH'),
            'WRS_ROW': image.get('WRS_ROW')
        });
    }).distinct(['WRS_PATH', 'WRS_ROW']);
}

// 计算东八区时间
function calcBeijingTime(centerTime) {
    // 解析UTC时间 (格式: "HH:MM:SS.SSSSSSSZ")
    var parts = centerTime.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);
    var seconds = parseFloat(parts[2]);  // 包含小数部分
    
    // 添加8小时得到北京时间
    hours = (hours + 8) % 24;
    
    // 格式化输出
    return padZero(hours) + ':' + padZero(minutes) + ':' + padZero(Math.floor(seconds));
}

/**
 * 导出影像详细信息表
 */
function exportImageInfo(collection, period, filename) {
    return Export.table.toDrive({
        collection: collection,
        description: filename + '_info',
        fileFormat: 'CSV',
        selectors: ['number', 'image_id', 'cloud_cover', 'date_acquired',
                   'scene_center_time_utc', 'scene_center_time_beijing']
    });
}

/**
 * 计算影像在研究区域内的云量评分
 * @param {ee.Image} image - 输入影像
 * @param {ee.Geometry} region - 研究区域几何对象
 * @returns {ee.Number} 云量评分（0-100，越高表示云量越少）
 */
function calculateRegionCloudScore(image, region) {
    // 定义Landsat 4-7的BQA云位
    var CLOUD_BIT_OLD = 4;  // 云
    var SHADOW_BIT_OLD = 3; // 云影
    
    // 定义Landsat 8-9的QA_PIXEL云位
    var CLOUD_BIT_NEW = 3;    // 云
    var SHADOW_BIT_NEW = 4;   // 云影
    var CIRRUS_BIT_NEW = 2;   // 卷云
    
    var cloudMask;
    
    // 根据不同卫星选择合适的云检测方法
    if (image.bandNames().contains('QA_PIXEL')) {
        // Landsat 8-9
        var qa = image.select('QA_PIXEL');
        // 检查云、云影和卷云
        cloudMask = qa.bitwiseAnd(1 << CLOUD_BIT_NEW).eq(0)  // 无云
            .and(qa.bitwiseAnd(1 << SHADOW_BIT_NEW).eq(0))   // 无云影
            .and(qa.bitwiseAnd(1 << CIRRUS_BIT_NEW).eq(0));  // 无卷云
    } else if (image.bandNames().contains('BQA')) {
        // Landsat 4-7
        var qa = image.select('BQA');
        // 检查云和云影
        cloudMask = qa.bitwiseAnd(1 << CLOUD_BIT_OLD).eq(0)  // 无云
            .and(qa.bitwiseAnd(1 << SHADOW_BIT_OLD).eq(0));  // 无云影
    } else {
        // 如果没有质量波段，返回常量图像
        return ee.Number(50);  // 返回中等评分
    }
    
    // 计算研究区域内的非云比例
    var stats = cloudMask.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 30,
        maxPixels: 1e13
    });
    
    // 获取清晰区域比例并处理空值
    var clearRatio = ee.Number(
        ee.Algorithms.If(
            stats.values().get(0),
            stats.values().get(0),
            0.5  // 如果结果为空，使用默认值0.5
        )
    );
    
    // 计算最终评分（0-100），保留两位小数
    return clearRatio.multiply(100).round().divide(100);
}

/**
 * 处理单个时间段的LST计算
 */
function processLST(startDate, endDate) {
    // 构建文件名中的日期和云量信息
    var startStr = ee.String(startDate).replace('-', '').replace('-', '');
    var endStr = ee.String(endDate).replace('-', '').replace('-', '');
    var dateInfo = ee.String(startStr).cat('_').cat(endStr);
    
    // 构建输出文件名
    var methodTag = method === 'ASTER' ? 'A' : 'N';
    
    // 确保所有组件都是字符串类型
    var areaNameStr = areaName.getInfo();
    var dateInfoStr = dateInfo.getInfo();
    
    // 构建文件名
    var filename;
    if (typeof table !== 'undefined') {
        // 使用用户自定义的研究区域
        filename = ee.String(areaName.getInfo()).cat('_')
            .cat(dateInfoStr).cat('_')
            .cat(cloudInfo).cat('_')
            .cat('LST').cat('_')
            .cat(stat_type).cat('_')
            .cat(methodTag);
    } else if (admin_config.level) {
        // 使用行政边界，添加行政等级和自定义名称
        filename = ee.String(admin_config.level).cat('_')
            .cat(admin_config.custom_name || admin_config.name).cat('_')
            .cat(dateInfoStr).cat('_')
            .cat(cloudInfo).cat('_')
            .cat('LST').cat('_')
            .cat(stat_type).cat('_')
            .cat(methodTag);
    } else {
        // 其他情况
        filename = ee.String(admin_config.name).cat('_')
            .cat(dateInfoStr).cat('_')
            .cat(cloudInfo).cat('_')
            .cat('LST').cat('_')
            .cat(stat_type).cat('_')
            .cat(methodTag);
    }
    
    // 获取启用的卫星列表
    var enabledSatellites = Object.keys(satelliteConfig).filter(function(sat) {
        return satelliteConfig[sat];
    });
    
    // 选择合适的LST模块
    var LandsatLST = method === 'NDVI' ? LandsatLST_NDVI : LandsatLST_ASTER;
    
    // 获取Landsat影像集合
    var LandsatColl = ee.ImageCollection([]);
    enabledSatellites.forEach(function(satellite) {
        var satCollection = LandsatLST.collection(
            satellite,
            startDate,
            endDate,
            geometry,
            method === 'NDVI' ? 'ndvi' : true
        ).filter(ee.Filter.and(
            ee.Filter.gte('CLOUD_COVER', cloud_min),
            ee.Filter.lte('CLOUD_COVER', cloud_max)
        ));
        LandsatColl = LandsatColl.merge(satCollection);
    });
    
    // 打印影像数量
    print('处理: ' + startDate + ' 至 ' + endDate + ' (' + LandsatColl.size().getInfo() + '景)');
    
    // 检查是否有影像
    var imageCount = LandsatColl.size().getInfo();
    if (imageCount === 0) {
        return {error: '在指定时间范围内未找到符合条件的影像'};
    }

    // 计算LST
    var lst_collection = LandsatColl.select('LST');
     
   // 转换为摄氏度
    var lst_celsius_collection = lst_collection.map(function(image) {
        return image.subtract(273.15)
            .multiply(10000).round()
            .divide(10000);
    });
    
    // 过滤异常值
    var lst_masked = lst_celsius_collection.map(function(image) {
        return image.updateMask(image.gt(-1000).and(image.lt(1000)));
    });
   
    // 计算时间序列均值影像
    var lst_mean = lst_masked.mean()
        .multiply(10000).round()
        .divide(10000);
    
    // 计算整个区域的均值和标准差（不打印，仅用于过滤异常值）
    var stats = lst_mean.reduceRegion({
        reducer: ee.Reducer.mean().combine({
        reducer2: ee.Reducer.stdDev(),
            sharedInputs: true
        }).setOutputs(['mean', 'stddev']),
        geometry: geometry,
        scale: 900,
        maxPixels: 1e13,
        tileScale: 4,
        bestEffort: true
    });
    
    // 提取均值和标准差
    var mean = ee.Number(stats.get('LST_mean'));
    var stdDev = ee.Number(stats.get('LST_stddev'));
   
      // 使用均值±4倍标准差创建掩膜
    lst_masked = lst_masked.map(function(image) {
        var z_score = image.subtract(mean).divide(stdDev);
        return image
            .updateMask(z_score.gte(-4).and(z_score.lte(4)))
            .multiply(10000).round()
            .divide(10000);
    });
    
    // 收集影像元信息
    LandsatColl.evaluate(function(collection) {
    });
    // 影像排序处理
    if (stat_type === 'score_first') {
        // 计算每张影像的云量评分并添加为属性
        LandsatColl = LandsatColl.map(function(image) {
            var score = calculateRegionCloudScore(image, geometry);
            return image.set('cloud_score', score);
        });
        // 按云量评分从高到低排序（分数越高表示云量越少）
        LandsatColl = LandsatColl.sort('cloud_score', false);
    } else {
        // 默认按时间排序
        LandsatColl = LandsatColl.sort('system:time_start');
    }
    
    // 计算整个区域的均值和标准差
    var stats = lst_mean.reduceRegion({
        reducer: ee.Reducer.mean().combine({
            reducer2: ee.Reducer.stdDev(),
            sharedInputs: true
        }).setOutputs(['mean', 'stddev']),
        geometry: geometry,
        scale: 900,
        maxPixels: 1e13,
        tileScale: 4,
        bestEffort: true
    });
    
    // 提取均值和标准差
    var mean = ee.Number(stats.get('LST_mean'));
    var stdDev = ee.Number(stats.get('LST_stddev'));
    
    // 使用均值±4倍标准差创建掩膜
    lst_masked = lst_masked.map(function(image) {
        var z_score = image.subtract(mean).divide(stdDev);
        return image
            .updateMask(z_score.gte(-4).and(z_score.lte(4)))
            .multiply(10000).round()
            .divide(10000);
    });
    
    // 选择reducer
    var reducer;
    switch(stat_type) {
        case 'max':
            reducer = ee.Reducer.max();
            break;
        case 'min':
            reducer = ee.Reducer.min();
            break;
        case 'score_first':
            reducer = ee.Reducer.firstNonNull();
            break;
        default:
            reducer = ee.Reducer.mean();
    }
    
    // 计算最终结果
    var resultLST = lst_masked.reduce(reducer)
        .select([0], ['LST'])
        .multiply(10000).round()
        .divide(10000);
    
    // 添加简化版LST直方图计算和显示功能
    // 定义温度区间
    var minTemp = -30;  // 最小温度
    var maxTemp = 60;   // 最大温度
    var binWidth = 2;   // 每个区间宽度为2°C
    
    // 创建区间
    var bins = ee.List.sequence(minTemp, maxTemp - binWidth, binWidth);
    
    // 计算每个区间的像素数量
    var histogramData = bins.map(function(start) {
        var end = ee.Number(start).add(binWidth);
        var binMask = resultLST.gte(ee.Number(start)).and(resultLST.lt(ee.Number(end)));
        var count = binMask.reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: geometry,
            scale: 900,  // 使用900米分辨率以提高效率
            maxPixels: 1e13,
            tileScale: 4
        });
        
        return ee.Feature(null, {
            'start': start,
            'end': end,
            'range': ee.Number(start).format('%.1f').cat(' - ').cat(ee.Number(end).format('%.1f')).cat(' °C'),
            'count': ee.Dictionary(count).values().get(0)
        });
    });
    
    // 转换为FeatureCollection以便导出
    var histogramFC = ee.FeatureCollection(histogramData);
    
    // 创建简化的直方图
    var simpleHistogram = ui.Chart.feature.byFeature({
        features: histogramFC,
        xProperty: 'range',
        yProperties: ['count']
    })
    .setChartType('ColumnChart')
    .setOptions({
        title: startDate + ' 至 ' + endDate + ' LST分布直方图',
        hAxis: {title: '温度区间 (°C)', slantedText: true, slantedTextAngle: 45},
        vAxis: {title: '像素数量'},
        legend: {position: 'none'},
        colors: ['#1d6b99'],
        dataOpacity: 0.8,
        bar: {gap: 0}
    });
    
    // 显示简化直方图
    print(simpleHistogram);
    
    print('完成: ' + startDate + ' 至 ' + endDate + ' -> ' + filename.getInfo());
    print('---处理完成---\n');
    
    // 导出结果
    // 创建外扩5公里的导出边界
    var exportRegion = ee.FeatureCollection(geometry).geometry().buffer(5000);
    
    Export.image.toDrive({
        image: resultLST.float(),
        description: filename.getInfo(),
        scale: 30,
        region: exportRegion,  // 使用外扩5公里的区域作为导出边界
        fileFormat: 'GeoTIFF',
        maxPixels: 1e13
    });
    
    // 显示当前时间段的结果
    var displayName = startDate + '到' + endDate +
        '时间段' + (stat_type === 'mean' ? '平均' :
        stat_type === 'max' ? '最大' :
        stat_type === 'min' ? '最小' :
        stat_type === 'score_first' ? '最优' : '') +
        'LST (°C) [' + (method === 'ASTER' ? 'ASTER方法' : 'NDVI方法') + ']';
    
    var cmap1 = ['blue', 'cyan', 'green', 'yellow', 'red'];
    Map.addLayer(resultLST, {min: 15, max: 45, palette: cmap1}, displayName);

    // 如果使用score_first方式，显示云量评分详情
    if (stat_type === 'score_first') {
        // 在集合层面评估云量评分
        var scores = LandsatColl.aggregate_array('cloud_score');
        var imageIds = LandsatColl.aggregate_array('system:id');
        
        print('云量评分详情:');
        var combined = ee.List(imageIds.zip(scores));
        combined.evaluate(function(list) {
            list.forEach(function(item) {
                print('影像ID:', item[0], '评分:', item[1]);
            });
        });
    }

    
    // 打印分隔符号
    var separatorLine = repeatStr('=', 40);
    print(separatorLine);
    
    // 为每个启用的卫星创建Path/Row列表并打印统计信息
    enabledSatellites.forEach(function(satellite) {
        var satCollection = LandsatLST.collection(
            satellite,
            startDate,
            endDate,
            geometry,
            method === 'NDVI' ? 'ndvi' : true
        );
        
        var pathRowList = createPathRowList(satCollection);
        pathRowList.evaluate(function(result) {
            if (result.features.length > 0) {
                print(satellite + ' 条带号统计:');
                print('  - 需要 ' + result.features.length + ' 张不同条带号的影像');
                print('  - Path/Row 信息:');
                
                // 按照Path和Row排序
                result.features.sort(function(a, b) {
                    return a.properties.WRS_PATH !== b.properties.WRS_PATH ? 
                        a.properties.WRS_PATH - b.properties.WRS_PATH :
                        a.properties.WRS_ROW - b.properties.WRS_ROW;
                }).forEach(function(feature) {
                    print('    path=' + feature.properties.WRS_PATH + 
                          ',row=' + feature.properties.WRS_ROW);
                });
                
                if (satellite !== enabledSatellites[enabledSatellites.length - 1]) {
                    print(repeatStr('-', 40));
                }
            }
        });
    });
    print(separatorLine);
    
    
    // 收集影像元信息
    LandsatColl.evaluate(function(collection) {
        // 创建表头
        var header = ['序号', '图像ID', '云量', '获取日期', '卫星过境时间(UTC)', '卫星过境时间(北京时间)'];
        var tableData = [header];
        var featureList = [];
        
        // 计算表格列宽
        var columnWidths = header.map(function(col) { return col.length; });
        
        collection.features.forEach(function(feature, index) {
            var id = feature.id;
            var cloudCover = feature.properties.CLOUD_COVER.toFixed(2) + '%';
            var dateAcquired = feature.properties.DATE_ACQUIRED;
            var sceneCenterTime = feature.properties.SCENE_CENTER_TIME;
            var beijingTime = calcBeijingTime(sceneCenterTime);
            var num = (index + 1).toString();
            
            // 添加数据行
            var row = [num, id, cloudCover, dateAcquired, sceneCenterTime, beijingTime];
            tableData.push(row);
            
            // 更新列宽
            row.forEach(function(cell, i) {
                columnWidths[i] = Math.max(columnWidths[i], cell.length);
            });
            
            // 创建用于导出的Feature
            featureList.push(ee.Feature(null, {
                'number': num,
                'image_id': id,
                'cloud_cover': cloudCover,
                'date_acquired': dateAcquired,
                'scene_center_time_utc': sceneCenterTime,
                'scene_center_time_beijing': beijingTime
            }));
        });
        
        // 打印表格
        var totalWidth = columnWidths.reduce(function(sum, width) { 
            return sum + width; 
        }) + columnWidths.length * 3 - 1;
        
        var separatorLine = repeatStr('=', totalWidth);
        print(separatorLine);
        
        tableData.forEach(function(row, rowIndex) {
            var formattedRow = row.map(function(cell, i) {
                return cell + repeatStr(' ', columnWidths[i] - cell.length);
            }).join(' | ');
            print('| ' + formattedRow + ' |');
        });
        
        // 导出元信息到CSV
        exportImageInfo(ee.FeatureCollection(featureList), {start: startDate, end: endDate}, filename.getInfo());
    });
    
    // 返回处理信息
    return {
        period: dateInfoStr,
        method: method,
        stat_type: stat_type,
        filename: filename.getInfo()
    };
}
    
Map.centerObject(geometry);

// 处理所有时间段
print('---配置信息---');
print('计算方法: ' + (method === 'ASTER' ? 'ASTER GED' : 'NDVI'));
if (stat_type === 'score_first') {
    print('注意: 使用基于研究区域内云量评分的最优影像镶嵌方法');
}
print('统计方式: ' + stat_type);
print('---开始处理---');

try {
    timePeriods.forEach(function(period) {
        print('\n开始处理' + period.start + ' 至 ' + period.end + '时间段');
        var result = processLST(period.start, period.end);
        if (result.error) {
            print('警告: ' + period.start + ' 至 ' + period.end + ' - ' + result.error);
            return;
        }
    });
} catch (error) {
    print('错误: ' + error);
}

// 在最后添加研究区域边界显示
var layerStyle;
// 检查是否明确使用了行政边界 (admin_config.level 已设置) 并且 *没有* 使用用户自定义的 table
if (admin_config.level && (typeof table === 'undefined')) {
    layerStyle = boundary_style[admin_config.level];
} else {
    // 对于用户自定义的 table 或未设置 admin_config 的情况，使用默认样式
    layerStyle = {'color': 'ff0000', 'fillColor': '00000000'};
}

// 使用获取到的名称和确定的样式添加图层
Map.addLayer(geometry, layerStyle, layerDisplayName);

/*
Landsat LST Calculator - UI Version
Supports multi-period LST calculation with ASTER GED or NDVI method
One-click deployment as GEE App
*/

// ==================== Import Modules ====================
var LandsatLST_ASTER = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
var LandsatLST_NDVI = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');

// ==================== Global Variables ====================
var currentGeometry = null;
var currentResults = [];
var timePeriodPanels = [];
var map;
var advancedVisible = false;
var drawingTools;

// Satellite valid date ranges
var SATELLITE_DATE_RANGES = {
    'L4': {startYear: 1982, endYear: 1993},
    'L5': {startYear: 1984, endYear: 2012},
    'L7': {startYear: 1999, endYear: 2022},
    'L8': {startYear: 2013, endYear: null},  // null means still active
    'L9': {startYear: 2021, endYear: null}
};

// ==================== UI Style Definitions ====================
var styles = {
    title: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#2c3e50',
        margin: '10px 0px'
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#34495e',
        margin: '10px 0px 5px 0px'
    },
    description: {
        fontSize: '12px',
        color: '#7f8c8d',
        margin: '0px 0px 10px 0px'
    },
    panel: {
        margin: '5px 0px',
        padding: '5px'
    },
    button: {
        margin: '5px 5px 5px 0px'
    }
};

// ==================== UI Component Creation ====================

// Create main panel
var mainPanel = ui.Panel({
    style: {
        width: '350px',
        padding: '10px'
    }
});

// Title
var title = ui.Label({
    value: '🛰️ Landsat LST Calculator',
    style: styles.title
});

var description = ui.Label({
    value: 'Multi-period, multi-satellite land surface temperature calculation and analysis',
    style: styles.description
});

// ==================== 1. Region Settings ====================
var regionSection = ui.Label('【Region Settings】', styles.sectionTitle);

var customNameInput = ui.Textbox({
    placeholder: 'Custom name (e.g., guangzhou)',
    value: 'my_region',
    style: {stretch: 'horizontal'}
});

var drawingInstructions = ui.Label({
    value: 'Click the button below, then draw a polygon on the map to define your study area.',
    style: {fontSize: '11px', color: '#7f8c8d', margin: '5px 0px', whiteSpace: 'pre-wrap'}
});

var enableDrawingButton = ui.Button({
    label: '📍 Enable Drawing',
    style: styles.button,
    onClick: function() {
        drawingTools.setShown(true);
        drawingTools.setShape('polygon');
        drawingTools.draw();
        statusLabel.setValue('✏️ Draw a polygon on the map');
        statusLabel.style().set('color', '#f39c12');
        enableDrawingButton.setLabel('✓ Drawing Enabled');
        enableDrawingButton.style().set('color', '#27ae60');
    }
});

var clearDrawingButton = ui.Button({
    label: '🗑️ Clear Drawing',
    style: styles.button,
    onClick: function() {
        var layers = drawingTools.layers();
        while (layers.length() > 0) {
            layers.remove(layers.get(0));
        }
        currentGeometry = null;
        regionStatusLabel.setValue('Status: No region defined');
        regionStatusLabel.style().set('color', '#95a5a6');
        statusLabel.setValue('✓ Ready');
        statusLabel.style().set('color', '#27ae60');
        enableDrawingButton.setLabel('📍 Enable Drawing');
        enableDrawingButton.style().set('color', '#000000');
        loadRegionButton.setDisabled(true);
    }
});

var loadRegionButton = ui.Button({
    label: '🎯 Load Region of Interest',
    style: styles.button,
    disabled: true,
    onClick: function() {
        if (currentGeometry) {
            map.centerObject(currentGeometry, 8);
            statusLabel.setValue('✓ Map centered on study area');
            statusLabel.style().set('color', '#27ae60');
        }
    }
});

var regionStatusLabel = ui.Label({
    value: 'Status: No region defined',
    style: {fontSize: '11px', color: '#95a5a6', margin: '5px 0px'}
});

// ==================== 2. Time Period Settings ====================
var timeSection = ui.Label('【Time Period Settings】', styles.sectionTitle);

var timePeriodContainer = ui.Panel({
    style: {margin: '5px 0px'}
});

// Create time period input panel
function createTimePeriodPanel(index) {
    var periodPanel = ui.Panel({
        layout: ui.Panel.Layout.flow('vertical'),
        style: {
            border: '1px solid #bdc3c7',
            padding: '8px',
            margin: '5px 0px',
            backgroundColor: '#ecf0f1'
        }
    });

    var periodLabel = ui.Label({
        value: 'Period ' + (index + 1),
        style: {fontWeight: 'bold', fontSize: '12px'}
    });

    var startDateInput = ui.Textbox({
        placeholder: 'YYYY-MM-DD',
        value: index === 0 ? '2023-01-01' : '',
        style: {stretch: 'horizontal'}
    });

    var endDateInput = ui.Textbox({
        placeholder: 'YYYY-MM-DD',
        value: index === 0 ? '2023-12-31' : '',
        style: {stretch: 'horizontal'}
    });

    // Time interpolation settings
    var enableInterpolation = ui.Checkbox({
        label: '⏱️ Enable Time Interpolation',
        value: false,
        style: {fontSize: '11px', margin: '8px 0px 3px 0px'}
    });

    var interpolationPanel = ui.Panel({
        style: {shown: false, margin: '3px 0px', padding: '5px', backgroundColor: '#f5f5f5'}
    });

    var yearRangeInput = ui.Textbox({
        placeholder: '1-5',
        value: '1',
        style: {width: '50px'}
    });

    var yearRangePanel = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [
            ui.Label('Year Range:', {fontSize: '11px', width: '80px'}),
            yearRangeInput
        ]
    });

    var useYearBefore = ui.Checkbox({
        label: 'Use previous years',
        value: true,
        style: {fontSize: '11px'}
    });

    var useYearAfter = ui.Checkbox({
        label: 'Use following years',
        value: true,
        style: {fontSize: '11px'}
    });

    enableInterpolation.onChange(function(checked) {
        interpolationPanel.style().set('shown', checked);
    });

    interpolationPanel.add(yearRangePanel);
    interpolationPanel.add(useYearBefore);
    interpolationPanel.add(useYearAfter);

    var deleteButton = ui.Button({
        label: '➖ Delete',
        style: {fontSize: '11px'},
        onClick: function() {
            var idx = timePeriodPanels.indexOf(periodData);
            if (idx > -1 && timePeriodPanels.length > 1) {
                timePeriodPanels.splice(idx, 1);
                timePeriodContainer.remove(periodPanel);
                updateTimePeriodLabels();
            } else if (timePeriodPanels.length === 1) {
                statusLabel.setValue('⚠️ At least one time period is required');
            }
        }
    });

    periodPanel.add(periodLabel);
    periodPanel.add(ui.Label('Start Date:', {fontSize: '11px', margin: '3px 0px'}));
    periodPanel.add(startDateInput);
    periodPanel.add(ui.Label('End Date:', {fontSize: '11px', margin: '3px 0px'}));
    periodPanel.add(endDateInput);
    periodPanel.add(enableInterpolation);
    periodPanel.add(interpolationPanel);
    periodPanel.add(deleteButton);

    var periodData = {
        panel: periodPanel,
        startInput: startDateInput,
        endInput: endDateInput,
        enableInterpolation: enableInterpolation,
        yearRangeInput: yearRangeInput,
        useYearBefore: useYearBefore,
        useYearAfter: useYearAfter
    };

    return periodData;
}

function updateTimePeriodLabels() {
    timePeriodPanels.forEach(function(periodData, idx) {
        var label = periodData.panel.widgets().get(0);
        label.setValue('Period ' + (idx + 1));
    });
}

// Add first time period
var firstPeriod = createTimePeriodPanel(0);
timePeriodPanels.push(firstPeriod);
timePeriodContainer.add(firstPeriod.panel);

var addTimePeriodButton = ui.Button({
    label: '➕ Add Time Period',
    style: styles.button,
    onClick: function() {
        var newPeriod = createTimePeriodPanel(timePeriodPanels.length);
        timePeriodPanels.push(newPeriod);
        timePeriodContainer.add(newPeriod.panel);
    }
});

// ==================== 3. Cloud Cover Filter ====================
var cloudSection = ui.Label('【Cloud Cover Filter】', styles.sectionTitle);

var cloudMinInput = ui.Textbox({
    placeholder: 'Min (%)',
    value: '0',
    style: {width: '150px', margin: '5px 5px 5px 0px'}
});

var cloudMaxInput = ui.Textbox({
    placeholder: 'Max (%)',
    value: '100',
    style: {width: '150px', margin: '5px 0px'}
});

var cloudPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    widgets: [
        ui.Label('Range:', {fontSize: '12px', width: '50px'}),
        cloudMinInput,
        ui.Label('-', {fontSize: '12px'}),
        cloudMaxInput
    ],
    style: {margin: '5px 0px'}
});

// ==================== 4. Statistical Method ====================
var statSection = ui.Label('【Statistical Method】', styles.sectionTitle);

var statTypeSelect = ui.Select({
    items: [
        {label: 'Mean', value: 'mean'},
        {label: 'Maximum', value: 'max'},
        {label: 'Minimum', value: 'min'},
        {label: 'Best Mosaic', value: 'score_first'}
    ],
    value: 'mean',
    placeholder: 'Select statistical method',
    style: {stretch: 'horizontal', margin: '5px 0px'}
});

// ==================== 5. Advanced Settings (Collapsible) ====================
var advancedSection = ui.Label('【Advanced Settings】', styles.sectionTitle);

var toggleAdvancedButton = ui.Button({
    label: '▶ Show Advanced Settings',
    style: {
        margin: '5px 0px',
        fontSize: '12px',
        color: '#3498db'
    },
    onClick: function() {
        advancedVisible = !advancedVisible;
        if (advancedVisible) {
            advancedPanel.style().set('shown', true);
            toggleAdvancedButton.setLabel('▼ Hide Advanced Settings');
        } else {
            advancedPanel.style().set('shown', false);
            toggleAdvancedButton.setLabel('▶ Show Advanced Settings');
        }
    }
});

// Advanced settings container
var advancedPanel = ui.Panel({
    style: {
        shown: false,
        border: '1px solid #bdc3c7',
        padding: '10px',
        margin: '5px 0px',
        backgroundColor: '#f8f9fa'
    }
});

// 5.1 Calculation Method
var methodLabel = ui.Label({
    value: 'Calculation Method:',
    style: {fontSize: '12px', fontWeight: 'bold', margin: '5px 0px'}
});

var methodPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {margin: '5px 0px'}
});

var methodNDVI = ui.Checkbox({label: 'NDVI', value: true, style: {margin: '0px 5px'}});
var methodASTER = ui.Checkbox({label: 'ASTER', value: false, style: {margin: '0px 5px'}});

// Mutual exclusion logic
methodNDVI.onChange(function(checked) {
    if (checked) methodASTER.setValue(false);
});

methodASTER.onChange(function(checked) {
    if (checked) methodNDVI.setValue(false);
});

methodPanel.add(methodNDVI);
methodPanel.add(methodASTER);

// 5.2 Satellite Selection
var satelliteLabel = ui.Label({
    value: 'Satellite Selection:',
    style: {fontSize: '12px', fontWeight: 'bold', margin: '10px 0px 5px 0px'}
});

var satellitePanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {margin: '5px 0px'}
});

var satL9 = ui.Checkbox({label: 'L9', value: false, style: {margin: '0px 5px'}});
var satL8 = ui.Checkbox({label: 'L8', value: true, style: {margin: '0px 5px'}});
var satL7 = ui.Checkbox({label: 'L7', value: false, style: {margin: '0px 5px'}});
var satL5 = ui.Checkbox({label: 'L5', value: true, style: {margin: '0px 5px'}});
var satL4 = ui.Checkbox({label: 'L4', value: false, style: {margin: '0px 5px'}});

satellitePanel.add(satL9);
satellitePanel.add(satL8);
satellitePanel.add(satL7);
satellitePanel.add(satL5);
satellitePanel.add(satL4);

// Add components to advanced panel
advancedPanel.add(methodLabel);
advancedPanel.add(methodPanel);
advancedPanel.add(satelliteLabel);
advancedPanel.add(satellitePanel);

// ==================== 6. Action Buttons ====================
var buttonSection = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {margin: '15px 0px 10px 0px'}
});

var runButton = ui.Button({
    label: '🚀 Run and Export',
    style: {
        stretch: 'horizontal',
        backgroundColor: '#3498db',
        color: 'black',
        fontWeight: 'bold'
    },
    onClick: function() {
        runCalculation();
    }
});

var resetButton = ui.Button({
    label: '🔄 Reset',
    style: {
        backgroundColor: '#3498db',
        color: 'black'
    },
    onClick: function() {
        resetUI();
    }
});

buttonSection.add(runButton);
buttonSection.add(resetButton);

// ==================== 7. Status Display ====================
var statusSection = ui.Label('【Processing Status】', styles.sectionTitle);

var statusLabel = ui.Label({
    value: '✓ Ready',
    style: {
        fontSize: '12px',
        color: '#27ae60',
        margin: '5px 0px',
        fontWeight: 'bold'
    }
});

var progressLabel = ui.Label({
    value: '',
    style: {fontSize: '11px', color: '#7f8c8d', margin: '5px 0px'}
});



// ==================== Assemble Main Panel ====================
mainPanel.add(title);
mainPanel.add(description);
mainPanel.add(ui.Panel([ui.Label('', {height: '1px', backgroundColor: '#bdc3c7', stretch: 'horizontal'})]));

mainPanel.add(regionSection);
mainPanel.add(ui.Label('Custom Name:', {fontSize: '11px', margin: '3px 0px'}));
mainPanel.add(customNameInput);
mainPanel.add(drawingInstructions);
mainPanel.add(ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    widgets: [enableDrawingButton, clearDrawingButton],
    style: {margin: '5px 0px'}
}));
mainPanel.add(loadRegionButton);
mainPanel.add(regionStatusLabel);

mainPanel.add(ui.Panel([ui.Label('', {height: '1px', backgroundColor: '#bdc3c7', stretch: 'horizontal'})]));
mainPanel.add(timeSection);
mainPanel.add(timePeriodContainer);
mainPanel.add(addTimePeriodButton);

mainPanel.add(ui.Panel([ui.Label('', {height: '1px', backgroundColor: '#bdc3c7', stretch: 'horizontal'})]));
mainPanel.add(cloudSection);
mainPanel.add(cloudPanel);

mainPanel.add(ui.Panel([ui.Label('', {height: '1px', backgroundColor: '#bdc3c7', stretch: 'horizontal'})]));
mainPanel.add(statSection);
mainPanel.add(statTypeSelect);

mainPanel.add(ui.Panel([ui.Label('', {height: '1px', backgroundColor: '#bdc3c7', stretch: 'horizontal'})]));
mainPanel.add(advancedSection);
mainPanel.add(toggleAdvancedButton);
mainPanel.add(advancedPanel);

mainPanel.add(ui.Panel([ui.Label('', {height: '1px', backgroundColor: '#bdc3c7', stretch: 'horizontal'})]));
mainPanel.add(buttonSection);

mainPanel.add(statusSection);
mainPanel.add(statusLabel);
mainPanel.add(progressLabel);

// ==================== Core Functions ====================

// Zero-padding function
function padZero(num) {
    return num < 10 ? '0' + num : '' + num;
}

// String repeat function
function repeatStr(str, times) {
    var result = '';
    for (var i = 0; i < times; i++) {
        result += str;
    }
    return result;
}

// Generate similar time period (previous or next year)
function generateSimilarPeriod(startDate, endDate, yearOffset) {
    var startParts = startDate.split('-');
    var endParts = endDate.split('-');
    var newStartYear = parseInt(startParts[0]) + yearOffset;
    var newEndYear = parseInt(endParts[0]) + yearOffset;
    return {
        start: newStartYear + '-' + startParts[1] + '-' + startParts[2],
        end: newEndYear + '-' + endParts[1] + '-' + endParts[2]
    };
}

// Check if satellite is valid for a given year
function isSatelliteValidForYear(satellite, year) {
    var range = SATELLITE_DATE_RANGES[satellite];
    if (!range) return false;
    if (year < range.startYear) return false;
    if (range.endYear !== null && year > range.endYear) return false;
    return true;
}

// Calculate Beijing Time (UTC+8)
function calcBeijingTime(centerTime) {
    var parts = centerTime.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);
    var seconds = parseFloat(parts[2]);
    hours = (hours + 8) % 24;
    return padZero(hours) + ':' + padZero(minutes) + ':' + padZero(Math.floor(seconds));
}

// Calculate cloud score for image within study area
function calculateRegionCloudScore(image, region) {
    var CLOUD_BIT_OLD = 4;
    var SHADOW_BIT_OLD = 3;
    var CLOUD_BIT_NEW = 3;
    var SHADOW_BIT_NEW = 4;
    var CIRRUS_BIT_NEW = 2;
    
    var cloudMask;
    
    if (image.bandNames().contains('QA_PIXEL')) {
        var qa = image.select('QA_PIXEL');
        cloudMask = qa.bitwiseAnd(1 << CLOUD_BIT_NEW).eq(0)
            .and(qa.bitwiseAnd(1 << SHADOW_BIT_NEW).eq(0))
            .and(qa.bitwiseAnd(1 << CIRRUS_BIT_NEW).eq(0));
    } else if (image.bandNames().contains('BQA')) {
        var qa = image.select('BQA');
        cloudMask = qa.bitwiseAnd(1 << CLOUD_BIT_OLD).eq(0)
            .and(qa.bitwiseAnd(1 << SHADOW_BIT_OLD).eq(0));
    } else {
        return ee.Number(50);
    }
    
    var stats = cloudMask.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 30,
        maxPixels: 1e13
    });
    
    var clearRatio = ee.Number(
        ee.Algorithms.If(
            stats.values().get(0),
            stats.values().get(0),
            0.5
        )
    );
    
    return clearRatio.multiply(100).round().divide(100);
}

// Create Path/Row list
function createPathRowList(collection) {
    return collection.map(function(image) {
        return ee.Feature(null, {
            'WRS_PATH': image.get('WRS_PATH'),
            'WRS_ROW': image.get('WRS_ROW')
        });
    }).distinct(['WRS_PATH', 'WRS_ROW']);
}

// Process LST calculation for a single time period
function processLST(startDate, endDate, config, callback) {
    var startStr = ee.String(startDate).replace('-', '').replace('-', '');
    var endStr = ee.String(endDate).replace('-', '').replace('-', '');
    var dateInfo = ee.String(startStr).cat('_').cat(endStr);
    
    var methodTag = config.method === 'ASTER' ? 'A' : 'N';
    var cloudInfo = 'cloud_' + config.cloudMin + '_' + config.cloudMax;
    
    var filename = ee.String(config.customName).cat('_')
        .cat(dateInfo.getInfo()).cat('_')
        .cat(cloudInfo).cat('_')
        .cat('LST').cat('_')
        .cat(config.statType).cat('_')
        .cat(methodTag);
    
    var LandsatLST = config.method === 'NDVI' ? LandsatLST_NDVI : LandsatLST_ASTER;
    
    var LandsatColl = ee.ImageCollection([]);
    config.satellites.forEach(function(satellite) {
        var satCollection = LandsatLST.collection(
            satellite,
            startDate,
            endDate,
            currentGeometry,
            config.method === 'NDVI' ? 'ndvi' : true
        ).filter(ee.Filter.and(
            ee.Filter.gte('CLOUD_COVER', config.cloudMin),
            ee.Filter.lte('CLOUD_COVER', config.cloudMax)
        ));
        LandsatColl = LandsatColl.merge(satCollection);
    });

    // Time interpolation: add data from previous/following years
    if (config.timeInterpolation && config.timeInterpolation.enabled) {
        var yearRange = config.timeInterpolation.yearRange || 1;
        var baseYear = parseInt(startDate.split('-')[0]);

        print('⏱️ Time interpolation enabled, year range: ' + yearRange);

        // Add previous years data
        if (config.timeInterpolation.useYearBefore) {
            for (var i = 1; i <= yearRange; i++) {
                var prevPeriod = generateSimilarPeriod(startDate, endDate, -i);
                var prevYear = baseYear - i;
                config.satellites.forEach(function(satellite) {
                    if (!isSatelliteValidForYear(satellite, prevYear)) {
                        return; // Skip invalid satellite-year combination
                    }
                    var satCollection = LandsatLST.collection(
                        satellite,
                        prevPeriod.start,
                        prevPeriod.end,
                        currentGeometry,
                        config.method === 'NDVI' ? 'ndvi' : true
                    ).filter(ee.Filter.and(
                        ee.Filter.gte('CLOUD_COVER', config.cloudMin),
                        ee.Filter.lte('CLOUD_COVER', config.cloudMax)
                    ));
                    LandsatColl = LandsatColl.merge(satCollection);
                });
                print('  Added data from ' + i + ' year(s) before: ' + prevPeriod.start + ' ~ ' + prevPeriod.end);
            }
        }

        // Add following years data
        if (config.timeInterpolation.useYearAfter) {
            for (var j = 1; j <= yearRange; j++) {
                var nextPeriod = generateSimilarPeriod(startDate, endDate, j);
                var nextYear = baseYear + j;
                config.satellites.forEach(function(satellite) {
                    if (!isSatelliteValidForYear(satellite, nextYear)) {
                        return; // Skip invalid satellite-year combination
                    }
                    var satCollection = LandsatLST.collection(
                        satellite,
                        nextPeriod.start,
                        nextPeriod.end,
                        currentGeometry,
                        config.method === 'NDVI' ? 'ndvi' : true
                    ).filter(ee.Filter.and(
                        ee.Filter.gte('CLOUD_COVER', config.cloudMin),
                        ee.Filter.lte('CLOUD_COVER', config.cloudMax)
                    ));
                    LandsatColl = LandsatColl.merge(satCollection);
                });
                print('  Added data from ' + j + ' year(s) after: ' + nextPeriod.start + ' ~ ' + nextPeriod.end);
            }
        }
    }

    var imageCount = LandsatColl.size();
    
    imageCount.evaluate(function(count) {
        if (count === 0) {
            print('⚠️ ' + startDate + ' to ' + endDate + ': No images found');
            if (callback) callback(null);
            return;
        }
        
        print('📊 Processing: ' + startDate + ' to ' + endDate + ' (' + count + ' images)');
        
        var lst_collection = LandsatColl.select('LST');
        
        var lst_celsius_collection = lst_collection.map(function(image) {
            return image.subtract(273.15)
                .multiply(10000).round()
                .divide(10000);
        });
        
        var lst_masked = lst_celsius_collection.map(function(image) {
            return image.updateMask(image.gt(-1000).and(image.lt(1000)));
        });
        
        var lst_mean = lst_masked.mean()
            .multiply(10000).round()
            .divide(10000);
        
        var stats = lst_mean.reduceRegion({
            reducer: ee.Reducer.mean().combine({
                reducer2: ee.Reducer.stdDev(),
                sharedInputs: true
            }).setOutputs(['mean', 'stddev']),
            geometry: currentGeometry,
            scale: 900,
            maxPixels: 1e13,
            tileScale: 4,
            bestEffort: true
        });
        
        var mean = ee.Number(stats.get('LST_mean'));
        var stdDev = ee.Number(stats.get('LST_stddev'));
        
        lst_masked = lst_masked.map(function(image) {
            var z_score = image.subtract(mean).divide(stdDev);
            return image
                .updateMask(z_score.gte(-4).and(z_score.lte(4)))
                .multiply(10000).round()
                .divide(10000);
        });
        
        if (config.statType === 'score_first') {
            LandsatColl = LandsatColl.map(function(image) {
                var score = calculateRegionCloudScore(image, currentGeometry);
                return image.set('cloud_score', score);
            });
            LandsatColl = LandsatColl.sort('cloud_score', false);
        } else {
            LandsatColl = LandsatColl.sort('system:time_start');
        }
        
        var reducer;
        switch(config.statType) {
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
        
        var resultLST = lst_masked.reduce(reducer)
            .select([0], ['LST'])
            .multiply(10000).round()
            .divide(10000);
        
        // Display result
        var displayName = startDate + ' to ' + endDate +
            ' - ' + (config.statType === 'mean' ? 'Mean' :
            config.statType === 'max' ? 'Max' :
            config.statType === 'min' ? 'Min' : 'Best') +
            ' LST (°C) [' + (config.method === 'ASTER' ? 'ASTER' : 'NDVI') + ']';
        
        var cmap1 = ['blue', 'cyan', 'green', 'yellow', 'red'];
        map.addLayer(resultLST, {min: 15, max: 45, palette: cmap1}, displayName);
        
        // Create histogram
        var minTemp = -30;
        var maxTemp = 60;
        var binWidth = 2;
        var bins = ee.List.sequence(minTemp, maxTemp - binWidth, binWidth);
        
        var histogramData = bins.map(function(start) {
            var end = ee.Number(start).add(binWidth);
            var binMask = resultLST.gte(ee.Number(start)).and(resultLST.lt(ee.Number(end)));
            var count = binMask.reduceRegion({
                reducer: ee.Reducer.sum(),
                geometry: currentGeometry,
                scale: 900,
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
        
        var histogramFC = ee.FeatureCollection(histogramData);
        
        var simpleHistogram = ui.Chart.feature.byFeature({
            features: histogramFC,
            xProperty: 'range',
            yProperties: ['count']
        })
        .setChartType('ColumnChart')
        .setOptions({
            title: displayName + ' - Temperature Distribution',
            hAxis: {title: 'Temperature Range (°C)', slantedText: true, slantedTextAngle: 45},
            vAxis: {title: 'Pixel Count'},
            legend: {position: 'none'},
            colors: ['#1d6b99'],
            dataOpacity: 0.8,
            bar: {gap: 0}
        });
        
        print(simpleHistogram);
        
        // Prepare export
        var exportRegion = ee.FeatureCollection(currentGeometry).geometry().buffer(5000);
        
        Export.image.toDrive({
            image: resultLST.float(),
            description: filename.getInfo(),
            scale: 30,
            region: exportRegion,
            fileFormat: 'GeoTIFF',
            maxPixels: 1e13
        });
        
        // Export metadata table
        var metadataFC = LandsatColl.map(function(img) {
            return ee.Feature(null, {
                'IMAGE_ID': img.get('LANDSAT_PRODUCT_ID'),
                'SATELLITE': img.get('SPACECRAFT_ID'),
                'DATE_ACQUIRED': img.get('DATE_ACQUIRED'),
                'SCENE_CENTER_TIME': img.get('SCENE_CENTER_TIME'),
                'CLOUD_COVER': img.get('CLOUD_COVER'),
                'WRS_PATH': img.get('WRS_PATH'),
                'WRS_ROW': img.get('WRS_ROW'),
                'SUN_AZIMUTH': img.get('SUN_AZIMUTH'),
                'SUN_ELEVATION': img.get('SUN_ELEVATION')
            });
        });
        
        Export.table.toDrive({
            collection: metadataFC,
            description: filename.getInfo() + '_metadata',
            fileFormat: 'CSV'
        });
        
        print('✓ ' + startDate + ' to ' + endDate + ' processing complete');
        print('Filename: ' + filename.getInfo());
        print(repeatStr('-', 50));
        
        var result = {
            filename: filename.getInfo(),
            image: resultLST,
            collection: LandsatColl
        };
        
        if (callback) callback(result);
    });
}

// Run calculation
function runCalculation() {
    // Validate parameters
    if (!currentGeometry) {
        statusLabel.setValue('❌ Please define a region first (draw on map)');
        statusLabel.style().set('color', '#e74c3c');
        return;
    }
    
    // Get parameters
    var method = methodNDVI.getValue() ? 'NDVI' : 'ASTER';
    var statType = statTypeSelect.getValue();
    var cloudMin = parseInt(cloudMinInput.getValue()) || 0;
    var cloudMax = parseInt(cloudMaxInput.getValue()) || 100;
    
    // Get enabled satellites
    var satellites = [];
    if (satL9.getValue()) satellites.push('L9');
    if (satL8.getValue()) satellites.push('L8');
    if (satL7.getValue()) satellites.push('L7');
    if (satL5.getValue()) satellites.push('L5');
    if (satL4.getValue()) satellites.push('L4');
    
    if (satellites.length === 0) {
        statusLabel.setValue('❌ Please select at least one satellite');
        statusLabel.style().set('color', '#e74c3c');
        return;
    }
    
    // Get time periods
    var timePeriods = [];
    var hasError = false;

    timePeriodPanels.forEach(function(periodData) {
        var start = periodData.startInput.getValue();
        var end = periodData.endInput.getValue();

        if (!start || !end) {
            hasError = true;
            return;
        }

        timePeriods.push({
            start: start,
            end: end,
            timeInterpolation: {
                enabled: periodData.enableInterpolation.getValue(),
                yearRange: parseInt(periodData.yearRangeInput.getValue()) || 1,
                useYearBefore: periodData.useYearBefore.getValue(),
                useYearAfter: periodData.useYearAfter.getValue()
            }
        });
    });
    
    if (hasError || timePeriods.length === 0) {
        statusLabel.setValue('❌ Please complete all time period information');
        statusLabel.style().set('color', '#e74c3c');
        return;
    }
    
    // Clear map layers (keep boundary)
    var layerCount = map.layers().length();
    if (layerCount > 0) {
        var boundaryLayer = map.layers().get(0);
        map.layers().reset();
        map.layers().add(boundaryLayer);
    } else {
        map.layers().reset();
    }
    
    // Update status
    statusLabel.setValue('🚀 Calculating...');
    statusLabel.style().set('color', '#f39c12');
    progressLabel.setValue('Total ' + timePeriods.length + ' periods to process');
    
    runButton.setDisabled(true);
    
    // Print configuration
    print(repeatStr('=', 60));
    print('🛰️ Landsat LST Calculation Started');
    print(repeatStr('=', 60));
    print('📍 Study Area: ' + customNameInput.getValue());
    print('🔬 Method: ' + method);
    print('📊 Statistics: ' + statType);
    print('🛰️ Satellites: ' + satellites.join(', '));
    print('☁️ Cloud Cover: ' + cloudMin + '% - ' + cloudMax + '%');
    print('📅 Time Periods: ' + timePeriods.length);
    print(repeatStr('-', 60));

    // Process each time period (asynchronous)
    currentResults = [];
    var totalPeriods = timePeriods.length;
    var processedCount = 0;
    
    timePeriods.forEach(function(period, index) {
        // Create config with time interpolation settings for each period
        var periodConfig = {
            method: method,
            statType: statType,
            cloudMin: cloudMin,
            cloudMax: cloudMax,
            satellites: satellites,
            customName: customNameInput.getValue() || 'my_region',
            timeInterpolation: period.timeInterpolation
        };

        processLST(period.start, period.end, periodConfig, function(result) {
            if (result) {
                currentResults.push(result);
            }
            processedCount++;
            progressLabel.setValue('Processed: ' + processedCount + '/' + totalPeriods);
            
            // All periods processed
            if (processedCount === totalPeriods) {
                statusLabel.setValue('✓ Calculation complete!');
                statusLabel.style().set('color', '#27ae60');
                progressLabel.setValue('All periods processed, check Console for details');
                
                runButton.setDisabled(false);
                
                print(repeatStr('=', 60));
                print('✅ All calculations completed!');
                print('💡 Tip: Go to Tasks tab to submit export tasks');
                print(repeatStr('=', 60));
            }
        });
    });
}



// Reset UI
function resetUI() {
    // Clear map and drawing layers
    map.layers().reset();
    var layers = drawingTools.layers();
    while (layers.length() > 0) {
        layers.remove(layers.get(0));
    }
    map.setCenter(0, 20, 3);
    
    // Reset form
    customNameInput.setValue('my_region');
    
    // Clear time periods (keep one)
    timePeriodContainer.clear();
    timePeriodPanels = [];
    var firstPeriod = createTimePeriodPanel(0);
    timePeriodPanels.push(firstPeriod);
    timePeriodContainer.add(firstPeriod.panel);
    
    methodNDVI.setValue(true);
    methodASTER.setValue(false);
    statTypeSelect.setValue('mean');
    
    satL9.setValue(false);
    satL8.setValue(true);
    satL7.setValue(false);
    satL5.setValue(true);
    satL4.setValue(false);
    
    cloudMinInput.setValue('0');
    cloudMaxInput.setValue('100');
    
    // Hide advanced settings
    advancedVisible = false;
    advancedPanel.style().set('shown', false);
    toggleAdvancedButton.setLabel('▶ Show Advanced Settings');
    
    currentGeometry = null;
    currentResults = [];
    
    statusLabel.setValue('✓ Reset');
    statusLabel.style().set('color', '#27ae60');
    regionStatusLabel.setValue('Status: No region defined');
    regionStatusLabel.style().set('color', '#95a5a6');
    progressLabel.setValue('');
    
    enableDrawingButton.setLabel('📍 Enable Drawing');
    enableDrawingButton.style().set('color', '#000000');
    
    loadRegionButton.setDisabled(true);
    
    runButton.setDisabled(false);
    
    print('🔄 Interface reset');
}

// ==================== Initialize Application ====================

// Create new map instance
map = ui.Map();
map.setCenter(0, 20, 3);
map.style().set('cursor', 'crosshair');

// Initialize drawing tools
drawingTools = map.drawingTools();
drawingTools.setShown(false);

// Listen for drawing completion
drawingTools.onDraw(function() {
    var layers = drawingTools.layers();
    if (layers.length() > 0) {
        var lastLayer = layers.get(layers.length() - 1);
        currentGeometry = lastLayer.toGeometry();
        
        // Display boundary
        map.layers().reset();
        map.addLayer(currentGeometry, {color: 'ff0000', fillColor: '00000000'}, 'Study Area');
        
        regionStatusLabel.setValue('Status: Region Defined');
        regionStatusLabel.style().set('color', '#27ae60');
        statusLabel.setValue('✓ Region defined successfully. Click "Load Region of Interest" to zoom.');
        statusLabel.style().set('color', '#27ae60');
        
        // Enable load region button
        loadRegionButton.setDisabled(false);
        
        // Disable drawing after first shape
        drawingTools.setShown(false);
    }
});

// Use SplitPanel to show control panel and map
var splitPanel = ui.SplitPanel({
    firstPanel: mainPanel,
    secondPanel: map,
    orientation: 'horizontal',
    wipe: false
});

// Clear root panel and add split panel
ui.root.clear();
ui.root.add(splitPanel);

// Add welcome message
print(repeatStr('=', 60));
print('🛰️ Landsat LST Calculator - UI Version');
print(repeatStr('=', 60));
print('📖 Instructions:');
print('1. Click "Enable Drawing" and draw a polygon on the map');
print('2. Set time periods for LST calculation');
print('3. Configure cloud cover filter and statistical method');
print('4. (Optional) Adjust advanced settings');
print('5. Click "Run Calculation" to start processing');
print('6. Submit export tasks in the Tasks tab');
print(repeatStr('=', 60));
print('✨ Ready to start your analysis!');
print(repeatStr('=', 60));

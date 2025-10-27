# Common Modifications

This guide covers frequently requested customizations to the LST analysis scripts.

## Modifying Time Periods

### Adding New Time Periods

**Batch Script** (`landsat_lst_analysis.js`):

```javascript
// Append to timePeriods array
var timePeriods = [
  {start: '2020-01-01', end: '2020-12-31'},
  {start: '2021-01-01', end: '2021-12-31'},
  {start: '2022-01-01', end: '2022-12-31'},  // New period
  {start: '2023-01-01', end: '2023-12-31'}   // New period
];
```

**Interactive UI** (`landsat_lst_analysis_ui.js`):
- Use the date picker controls in the UI panel
- Process one period at a time

### Monthly Time Series

For monthly analysis over multiple years:

```javascript
var timePeriods = [];
for (var year = 2018; year <= 2023; year++) {
  for (var month = 1; month <= 12; month++) {
    var startDate = ee.Date.fromYMD(year, month, 1);
    var endDate = startDate.advance(1, 'month');

    timePeriods.push({
      start: startDate.format('YYYY-MM-dd').getInfo(),
      end: endDate.format('YYYY-MM-dd').getInfo()
    });
  }
}
```

### Seasonal Analysis

Define custom seasons:

```javascript
// Northern Hemisphere seasons
var timePeriods = [
  // Spring: March-May
  {start: '2020-03-01', end: '2020-05-31'},
  // Summer: June-August
  {start: '2020-06-01', end: '2020-08-31'},
  // Fall: September-November
  {start: '2020-09-01', end: '2020-11-30'},
  // Winter: December-February
  {start: '2020-12-01', end: '2021-02-28'}
];
```

### Multi-Year Aggregation

For long-term climatology (e.g., average summer LST over 10 years):

```javascript
// Single time period spanning multiple years
var timePeriods = [
  {start: '2013-06-01', end: '2023-08-31'}  // All summers 2013-2023
];

var stat_type = 'mean';  // Average across all years
```

---

## Changing Emissivity Method

### Switch Between ASTER and NDVI

**In batch script**:
```javascript
// Option 1: ASTER method (high accuracy, potential gaps)
var method = 'ASTER';
var LandsatLST = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
var emissivityFlag = true;

// Option 2: NDVI method (complete coverage)
var method = 'NDVI';
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');
var emissivityFlag = 'ndvi';
```

**In interactive UI**:
- Use the dropdown menu: **Emissivity Method** → ASTER / NDVI

### Hybrid Approach (ASTER with NDVI Fallback)

For regions with partial ASTER coverage:

```javascript
// Use ASTER where available, NDVI for gaps
var method = 'HYBRID';

// Load both modules
var LandsatLST_aster = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
var LandsatLST_ndvi = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');

// Process with ASTER
var collection_aster = LandsatLST_aster.collection(satellite, start, end, geometry, true);

// Process with NDVI
var collection_ndvi = LandsatLST_ndvi.collection(satellite, start, end, geometry, 'ndvi');

// Merge: use ASTER first, fill gaps with NDVI
var lst_aster = collection_aster.select('LST');
var lst_ndvi = collection_ndvi.select('LST');

var lst_hybrid = lst_aster.unmask(lst_ndvi);
```

---

## Custom Region of Interest

### Using Uploaded Shapefile

1. **Upload to GEE Assets**:
   - Assets tab → New → Shape files
   - Select .shp, .shx, .dbf, .prj files
   - Name: `my_study_area`

2. **Reference in script**:
   ```javascript
   var table = ee.FeatureCollection('users/your_username/my_study_area');
   var geometry = table.geometry();
   ```

### Drawing Custom Geometry

**Interactive UI**:
- Use drawing tools in map panel
- Geometry stored as `geometry` variable

**Batch script**:
```javascript
// Rectangle
var table = ee.Geometry.Rectangle([lon_min, lat_min, lon_max, lat_max]);
// Example: Beijing area
var table = ee.Geometry.Rectangle([116.0, 39.7, 116.7, 40.2]);

// Polygon
var table = ee.Geometry.Polygon([
  [[lon1, lat1], [lon2, lat2], [lon3, lat3], [lon1, lat1]]
]);

// Point with buffer
var table = ee.Geometry.Point([lon, lat]).buffer(10000);  // 10km radius
```

### Multiple Regions in Batch

Process different regions in loop:

```javascript
var regions = [
  {name: 'Beijing', geometry: ee.Geometry.Rectangle([116.0, 39.7, 116.7, 40.2])},
  {name: 'Shanghai', geometry: ee.Geometry.Rectangle([121.2, 30.9, 121.8, 31.4])},
  {name: 'Guangzhou', geometry: ee.Geometry.Rectangle([113.0, 22.8, 113.6, 23.4])}
];

regions.forEach(function(region) {
  timePeriods.forEach(function(period) {
    // Process each region and time period
    var geometry = region.geometry;
    var layerName = region.name;
    // ... rest of processing code
  });
});
```

---

## Adjusting Statistical Aggregation

### Available Methods

```javascript
// Temporal mean (default)
var stat_type = 'mean';

// Maximum LST (warmest pixel over time)
var stat_type = 'max';

// Minimum LST (coolest pixel over time)
var stat_type = 'min';

// Best cloud-free image (single snapshot)
var stat_type = 'score_first';
```

### Custom Aggregation: Percentiles

Calculate 90th percentile LST (hot extremes):

```javascript
var stat_type = 'p90';

// Replace reducer section with:
var lstResult = lstCelsius.reduce(ee.Reducer.percentile([90]));
```

### Custom Aggregation: Median

Median is more robust to outliers than mean:

```javascript
var stat_type = 'median';

// Replace reducer section with:
var lstResult = lstCelsius.reduce(ee.Reducer.median());
```

### Day vs. Night Analysis

Separate daytime and nighttime images:

```javascript
// Filter by solar elevation angle
var daytime = collection.filter(ee.Filter.gt('SUN_ELEVATION', 0));
var nighttime = collection.filter(ee.Filter.lte('SUN_ELEVATION', 0));

// Process separately
var lst_day = processCollection(daytime).mean();
var lst_night = processCollection(nighttime).mean();

// Calculate day-night difference (thermal inertia proxy)
var lst_difference = lst_day.subtract(lst_night);
```

---

## Modifying Cloud Cover Thresholds

### Relaxing Cloud Filters

For regions/periods with limited data:

```javascript
// Very permissive (more data, lower quality)
var cloud_min = 0;
var cloud_max = 50;  // Up to 50% cloud cover

// Standard (balanced)
var cloud_min = 0;
var cloud_max = 20;  // Default

// Strict (less data, higher quality)
var cloud_min = 0;
var cloud_max = 10;
```

### Dynamic Thresholding

Adjust threshold based on data availability:

```javascript
function processWithAdaptiveCloudCover(geometry, start, end) {
  var cloud_thresholds = [10, 20, 30, 40];

  for (var i = 0; i < cloud_thresholds.length; i++) {
    var cloud_max = cloud_thresholds[i];

    var collection = LandsatLST.collection(satellite, start, end, geometry, emissivityFlag)
      .filter(ee.Filter.lte('CLOUD_COVER', cloud_max));

    var count = collection.size().getInfo();

    if (count >= 5) {  // Minimum 5 images required
      print('Using cloud threshold:', cloud_max, '% (', count, 'images)');
      return collection;
    }
  }

  print('Warning: Insufficient data even with 40% cloud threshold');
  return ee.ImageCollection([]);
}
```

---

## Adjusting Spatial Resolution

### Coarser Resolution for Faster Processing

```javascript
// In export section
Export.image.toDrive({
  image: lstResult,
  description: filename,
  folder: 'GEE_LST_Outputs',
  scale: 100,  // Change from 30m to 100m
  region: exportRegion,
  crs: crs,
  maxPixels: 1e9
});
```

**Benefits**:
- Faster export (9x faster for 100m vs 30m)
- Smaller file size
- Suitable for large regions or coarse-scale studies

**Trade-offs**:
- Loss of fine spatial details
- Not suitable for urban studies or small features

---

## Customizing Satellite Selection

### Use Specific Landsat Generations

**Thermal LWIR only** (Landsat 4/5/7):
```javascript
var use_L4 = true;
var use_L5 = true;
var use_L7 = true;
var use_L8 = false;
var use_L9 = false;
```

**Modern sensors only** (Landsat 8/9):
```javascript
var use_L4 = false;
var use_L5 = false;
var use_L7 = false;
var use_L8 = true;
var use_L9 = true;
```

### Exclude Landsat 7 Post-SLC Failure

Landsat 7 has scan line gaps after May 2003:

```javascript
var use_L7 = false;  // Disable L7

// Or filter by date
var L7_collection = LandsatLST.collection('L7', start, end, geometry, emissivityFlag)
  .filter(ee.Filter.lt('system:time_start', ee.Date('2003-05-31').millis()));
```

---

## Modifying Outlier Filtering

### Change Z-Score Threshold

**Default**: ±4σ (conservative)

```javascript
// More aggressive filtering (±3σ)
var z_threshold = 3;

var outlier_mask = lstCelsius.map(function(img) {
  var z_score = img.subtract(lst_mean).divide(lst_stddev).abs();
  return z_score.lte(z_threshold);
});

// More permissive filtering (±5σ)
var z_threshold = 5;
```

### Disable Outlier Filtering

To keep all values:

```javascript
// Comment out or remove outlier filtering section
// var lst_mean = ...
// var lst_stddev = ...
// var outlier_mask = ...

// Skip directly to aggregation
var lstResult = lstCelsius.reduce(ee.Reducer.mean());
```

### Use IQR Instead of Z-Score

For non-normally distributed data:

```javascript
// Calculate IQR
var percentiles = lstCelsius.reduce(ee.Reducer.percentile([25, 75]));
var q1 = percentiles.select('.*_p25');
var q3 = percentiles.select('.*_p75');
var iqr = q3.subtract(q1);

// Define outlier bounds (1.5 * IQR)
var k = 1.5;
var lower_bound = q1.subtract(iqr.multiply(k));
var upper_bound = q3.add(iqr.multiply(k));

// Apply mask
var outlier_mask = lstCelsius.map(function(img) {
  return img.gte(lower_bound).and(img.lte(upper_bound));
});
```

---

## Adjusting Visualization Parameters

See detailed guide: [Visualization](visualization.md)

### Quick Changes

**Temperature range**:
```javascript
var visParams = {
  min: -10,    // Change based on expected LST range
  max: 50,
  palette: ['blue', 'cyan', 'yellow', 'red']
};
```

**Boundary color**:
```javascript
var boundary_style = {
  color: 'yellow',  // Change from default red
  width: 3,
  fillColor: '00000000'  // Transparent fill
};
```

---

## Exporting Additional Bands

### Export NDVI with LST

```javascript
// Calculate NDVI
var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');

// Add to image
var imageWithNDVI = lstCelsius.addBands(ndvi);

// Export multi-band image
Export.image.toDrive({
  image: imageWithNDVI.select(['LST', 'NDVI']),
  description: filename + '_LST_NDVI',
  // ... other parameters
});
```

### Export Uncertainty/Stdev

```javascript
// Calculate standard deviation across time
var lst_mean = lstCelsius.mean().rename('LST_mean');
var lst_stdev = lstCelsius.reduce(ee.Reducer.stdDev()).rename('LST_stdev');

// Stack bands
var lstWithUncertainty = lst_mean.addBands(lst_stdev);

// Export
Export.image.toDrive({
  image: lstWithUncertainty,
  description: filename + '_LST_uncertainty',
  // ... other parameters
});
```

---

## Advanced: Custom Processing Functions

### Add Pre-Processing Step

Modify module or add custom function:

```javascript
// Custom cloud buffer function
function bufferClouds(image, buffer_distance) {
  var cloud_mask = createCloudMask(image);
  var cloud_buffer = cloud_mask.focal_min(buffer_distance, 'circle', 'pixels');
  return image.updateMask(cloud_buffer);
}

// Apply to collection before LST processing
var buffered_collection = collection.map(function(img) {
  return bufferClouds(img, 3);  // 3-pixel cloud buffer (90m)
});
```

### Add Post-Processing Step

Apply spatial smoothing:

```javascript
// Gaussian smoothing
var smoothed_lst = lstResult.convolve(ee.Kernel.gaussian({
  radius: 3,      // 3 pixels (90m at 30m resolution)
  sigma: 1,       // Standard deviation
  units: 'pixels'
}));

// Median filter (removes salt-and-pepper noise)
var smoothed_lst = lstResult.focal_median({
  radius: 2,
  units: 'pixels'
});
```

---

## Performance Optimization Tips

### 1. Reduce Region Size

Split large regions into tiles:

```javascript
// Create 1° x 1° tiles
var tiles = geometry.coveringGrid('EPSG:4326', 100000);  // 100km grid

tiles.evaluate(function(tile_list) {
  tile_list.features.forEach(function(tile, index) {
    var tile_geom = ee.Geometry(tile.geometry);
    // Process each tile
    processLST(tile_geom, 'tile_' + index);
  });
});
```

### 2. Use Simpler Aggregations

`score_first` is faster than `mean` for long time periods:

```javascript
var stat_type = 'score_first';  // Selects single image, no temporal averaging
```

### 3. Limit Satellite Collections

Disable older satellites if recent data sufficient:

```javascript
var use_L4 = false;  // 1982-1993 (usually not needed for recent studies)
var use_L5 = false;  // 1984-2013
```

### 4. Pre-filter by Geometry

Load collections with geometry filter:

```javascript
var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(geometry)  // Pre-filter before LST processing
  .filterDate(start, end)
  .filter(ee.Filter.lte('CLOUD_COVER', cloud_max));
```

---

## Saving Modified Scripts

### Best Practices

1. **Save as New Script**: Don't overwrite original
   - Click **Save As** → New name (e.g., `my_lst_analysis_v2`)

2. **Add Comments**: Document your changes
   ```javascript
   // Modified 2024-01-15: Changed cloud threshold to 30% for monsoon season
   var cloud_max = 30;
   ```

3. **Version Control**: Use Git or GEE's built-in version history
   - Scripts tab → Right-click script → View history

4. **Share with Collaborators**: Generate shareable link
   - Get Link button → Copy URL

---

## Common Issues After Modification

### "Variable not defined" Error

**Cause**: Typo or missing variable declaration

**Solution**: Check spelling, ensure all variables declared before use

### "Collection contains no elements" Warning

**Cause**: Too restrictive filters after modification

**Solution**: Relax cloud threshold, expand date range, or enable more satellites

### Memory Limit Exceeded

**Cause**: Added too many bands or increased resolution

**Solution**: Process fewer bands, reduce export resolution, or split into tiles

---

## Getting Help

If you encounter issues after modifications:

1. **Check console**: Read error messages carefully
2. **Simplify**: Remove modifications one by one to isolate issue
3. **Test with small region**: Use small geometry first
4. **Consult documentation**: Review [Architecture](../architecture/data-pipeline.md) and [Algorithms](../algorithms/lst-calculation.md)
5. **GEE Forum**: Search or post at https://groups.google.com/g/google-earth-engine-developers

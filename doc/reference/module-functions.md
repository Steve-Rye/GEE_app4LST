# Module Functions Reference

This document provides detailed reference for all functions used in the LST analysis scripts.

## Core Processing Functions

### LandsatLST.collection()

**Module**: `Landsat_LST.js` (ASTER) or `Landsat_LST_v2.js` (NDVI)

**Description**: Main entry point for LST calculation. Builds ImageCollection with LST band.

**Signature**:
```javascript
LandsatLST.collection(satellite, startDate, endDate, geometry, emissivityFlag)
```

**Parameters**:
- `satellite` (String): Satellite identifier
  - Values: `'L4'`, `'L5'`, `'L7'`, `'L8'`, `'L9'`
- `startDate` (String): Start date in `'YYYY-MM-DD'` format
- `endDate` (String): End date in `'YYYY-MM-DD'` format
- `geometry` (ee.Geometry): Region of interest
- `emissivityFlag` (Boolean or String):
  - `true`: Use ASTER GED method (Landsat_LST.js)
  - `'ndvi'`: Use NDVI-based method (Landsat_LST_v2.js)

**Returns**: `ee.ImageCollection` with `LST` band in Kelvin

**Example**:
```javascript
var lstCollection = LandsatLST.collection(
  'L8',
  '2020-01-01',
  '2020-12-31',
  geometry,
  'ndvi'
);

// Access LST band
var lstImages = lstCollection.select('LST');
```

**Notes**:
- Returns empty collection if no valid images found
- LST band is in Kelvin; convert to Celsius: `lst.subtract(273.15)`
- Collection includes all Landsat metadata properties

---

## Helper Utilities

### padZero()

**Description**: Zero-pad numbers for formatting

**Signature**:
```javascript
function padZero(num, width)
```

**Parameters**:
- `num` (Number): Number to pad
- `width` (Number): Desired width (number of digits)

**Returns**: String with leading zeros

**Example**:
```javascript
padZero(5, 3);      // Returns: "005"
padZero(42, 4);     // Returns: "0042"
padZero(123, 2);    // Returns: "123" (no padding if already wider)
```

**Use case**: Format dates, sequential IDs, or file names

---

### repeatStr()

**Description**: Repeat string N times for text alignment

**Signature**:
```javascript
function repeatStr(str, count)
```

**Parameters**:
- `str` (String): String to repeat
- `count` (Number): Number of repetitions

**Returns**: Repeated string

**Example**:
```javascript
repeatStr('-', 50);  // Returns: "--------------------------------------------------"
repeatStr(' ', 10);  // Returns: "          " (10 spaces)
```

**Use case**: Create text separators, format console output

---

### calcBeijingTime()

**Description**: Convert UTC timestamp to UTC+8 (Beijing Time)

**Signature**:
```javascript
function calcBeijingTime(utcString)
```

**Parameters**:
- `utcString` (String): UTC timestamp in format `'YYYY-MM-DD HH:mm:ss'`

**Returns**: String in UTC+8 format `'YYYY-MM-DD HH:mm:ss'`

**Example**:
```javascript
calcBeijingTime('2020-06-15 03:30:00');
// Returns: "2020-06-15 11:30:00" (+ 8 hours)

calcBeijingTime('2020-12-31 18:00:00');
// Returns: "2021-01-01 02:00:00" (crosses day boundary)
```

**Use case**: Display acquisition times in local timezone for Chinese users

**Implementation**:
```javascript
function calcBeijingTime(utcStr) {
  var utcDate = ee.Date.parse('YYYY-MM-dd HH:mm:ss', utcStr);
  var beijingDate = utcDate.advance(8, 'hour');
  return beijingDate.format('YYYY-MM-dd HH:mm:ss').getInfo();
}
```

---

### createPathRowList()

**Description**: Extract unique WRS Path/Row combinations from Landsat collection

**Signature**:
```javascript
function createPathRowList(imageCollection)
```

**Parameters**:
- `imageCollection` (ee.ImageCollection): Landsat image collection

**Returns**: Array of strings in format `'Path: XXX, Row: YYY'`

**Example**:
```javascript
var lstCollection = LandsatLST.collection('L8', start, end, geometry, 'ndvi');
var pathRows = createPathRowList(lstCollection);

print(pathRows);
// Output: ["Path: 123, Row: 034", "Path: 123, Row: 035", "Path: 124, Row: 034"]
```

**Use case**: Document which Landsat scenes cover the study area, identify overlapping paths/rows

**Implementation**:
```javascript
function createPathRowList(collection) {
  var pathRows = collection.aggregate_array('WRS_PATH').zip(
    collection.aggregate_array('WRS_ROW')
  );

  var uniquePairs = pathRows.distinct();

  return uniquePairs.map(function(pair) {
    var path = ee.List(pair).get(0);
    var row = ee.List(pair).get(1);
    return ee.String('Path: ').cat(path).cat(', Row: ').cat(row);
  }).getInfo();
}
```

---

### calculateRegionCloudScore()

**Description**: Calculate clear (cloud-free) pixel percentage for region

**Signature**:
```javascript
function calculateRegionCloudScore(image, geometry)
```

**Parameters**:
- `image` (ee.Image): Landsat image with `QA_PIXEL` band
- `geometry` (ee.Geometry): Region of interest

**Returns**: `ee.Image` with added `'clear_percentage'` property (0-100)

**Example**:
```javascript
var image = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_123034_20200615');
var scored = calculateRegionCloudScore(image, geometry);

var clearPercent = scored.get('clear_percentage').getInfo();
print('Clear pixel percentage:', clearPercent, '%');
```

**Use case**: Filter images by cloud cover, select best image for `score_first` method

**Implementation**:
```javascript
function calculateRegionCloudScore(image, geometry) {
  var qa = image.select('QA_PIXEL');

  // Extract cloud-related bits
  var cloud = qa.bitwiseAnd(1 << 3).eq(0);          // Bit 3: Cloud
  var cloudShadow = qa.bitwiseAnd(1 << 4).eq(0);    // Bit 4: Cloud Shadow
  var cirrus = qa.bitwiseAnd(1 << 2).eq(0);         // Bit 2: Cirrus

  // Clear mask
  var clearMask = cloud.and(cloudShadow).and(cirrus);

  // Calculate percentage
  var clearPercent = clearMask.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9
  }).get('QA_PIXEL');

  return image.set('clear_percentage', ee.Number(clearPercent).multiply(100));
}
```

---

## Emissivity Functions

### compute_emissivity() - ASTER Method

**Module**: `compute_emissivity.js`

**Description**: Derive surface emissivity from ASTER GED

**Signature**:
```javascript
function compute_emissivity(image, aster_ged, sensor)
```

**Parameters**:
- `image` (ee.Image): Landsat image
- `aster_ged` (ee.Image): ASTER Global Emissivity Database image
- `sensor` (String): `'L4'`, `'L5'`, `'L7'`, `'L8'`, or `'L9'`

**Returns**: `ee.Image` with `'emissivity'` band

**Example**:
```javascript
var aster = ee.Image('NASA/ASTER_GED/AG100_003');
var landsat = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_123034_20200615');

var emissivity = compute_emissivity(landsat, aster, 'L8');
```

**Notes**:
- Matches ASTER thermal bands to Landsat thermal bands
- Returns no-data where ASTER coverage is incomplete

---

### compute_emissivity_ndvi() - NDVI Method

**Module**: `compute_emissivity_ndvi.js`

**Description**: Derive emissivity from NDVI and FVC

**Signature**:
```javascript
function compute_emissivity_ndvi(image, ndvi, fvc)
```

**Parameters**:
- `image` (ee.Image): Landsat image
- `ndvi` (ee.Image or ee.ImageCollection): NDVI band
- `fvc` (ee.Image or ee.ImageCollection): Fractional Vegetation Cover band

**Returns**: `ee.Image` with `'emissivity'` band

**Example**:
```javascript
var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
var fvc = compute_FVC(ndvi);
var emissivity = compute_emissivity_ndvi(image, ndvi, fvc);
```

**Algorithm**:
```javascript
ε = 0.97                         (NDVI < 0.2)
ε = 0.97 + 0.02 × FVC            (0.2 ≤ NDVI ≤ 0.7)
ε = 0.99                         (NDVI > 0.7)
```

---

### compute_FVC()

**Module**: `compute_FVC.js`

**Description**: Calculate Fractional Vegetation Cover from NDVI

**Signature**:
```javascript
function compute_FVC(ndvi)
```

**Parameters**:
- `ndvi` (ee.Image): NDVI band

**Returns**: `ee.Image` with `'FVC'` band (0-1)

**Example**:
```javascript
var ndvi = image.normalizedDifference(['B5', 'B4']);
var fvc = compute_FVC(ndvi);
```

**Formula**:
```javascript
FVC = ((NDVI - NDVI_soil) / (NDVI_veg - NDVI_soil))²

Where:
- NDVI_soil = 0.2
- NDVI_veg = 0.7
```

**Implementation**:
```javascript
function compute_FVC(ndvi) {
  var ndvi_soil = 0.2;
  var ndvi_veg = 0.7;

  var fvc = ndvi.subtract(ndvi_soil)
    .divide(ndvi_veg - ndvi_soil)
    .pow(2)
    .clamp(0, 1)
    .rename('FVC');

  return fvc;
}
```

---

### compute_NDVI()

**Module**: `compute_NDVI.js`

**Description**: Calculate NDVI with automatic band selection for different Landsat sensors

**Signature**:
```javascript
function compute_NDVI(image, sensor)
```

**Parameters**:
- `image` (ee.Image): Landsat Surface Reflectance image
- `sensor` (String): `'L4'`, `'L5'`, `'L7'`, `'L8'`, or `'L9'`

**Returns**: `ee.Image` with `'NDVI'` band

**Example**:
```javascript
// Landsat 8
var ndvi_L8 = compute_NDVI(image_L8, 'L8');  // Uses B5, B4

// Landsat 5
var ndvi_L5 = compute_NDVI(image_L5, 'L5');  // Uses B4, B3
```

**Band Selection**:
| Sensor | NIR Band | Red Band |
|--------|----------|----------|
| L4, L5, L7 | B4 | B3 |
| L8, L9 | B5 | B4 |

**Implementation**:
```javascript
function compute_NDVI(image, sensor) {
  var nir, red;

  if (sensor === 'L8' || sensor === 'L9') {
    nir = 'B5';
    red = 'B4';
  } else {
    nir = 'B4';
    red = 'B3';
  }

  return image.normalizedDifference([nir, red]).rename('NDVI');
}
```

---

## Statistical Functions

### Temporal Aggregation Reducers

**Mean**:
```javascript
var lstMean = lstCollection.mean();
```

**Maximum**:
```javascript
var lstMax = lstCollection.max();
```

**Minimum**:
```javascript
var lstMin = lstCollection.min();
```

**Median**:
```javascript
var lstMedian = lstCollection.median();
```

**Standard Deviation**:
```javascript
var lstStdDev = lstCollection.reduce(ee.Reducer.stdDev());
```

**Percentiles**:
```javascript
var lstPercentiles = lstCollection.reduce(ee.Reducer.percentile([10, 90]));
// Creates bands: LST_p10, LST_p90
```

---

### Score-First Selection

**Description**: Select image with highest clear percentage

**Implementation**:
```javascript
function selectBestImage(imageCollection, geometry) {
  var scored = imageCollection.map(function(image) {
    return calculateRegionCloudScore(image, geometry);
  });

  var best = scored.sort('clear_percentage', false).first();
  return best;
}
```

**Usage**:
```javascript
var bestLST = selectBestImage(lstCollection, geometry).select('LST');
```

---

## Cloud Masking Functions

### createCloudMask()

**Description**: Generate cloud mask from QA_PIXEL band

**Signature**:
```javascript
function createCloudMask(image)
```

**Parameters**:
- `image` (ee.Image): Landsat Collection 2 image with `QA_PIXEL` band

**Returns**: `ee.Image` binary mask (1 = clear, 0 = cloud/shadow)

**Example**:
```javascript
var cloudMask = createCloudMask(image);
var maskedImage = image.updateMask(cloudMask);
```

**Implementation**:
```javascript
function createCloudMask(image) {
  var qa = image.select('QA_PIXEL');

  // Extract bits
  var cloud = qa.bitwiseAnd(1 << 3).eq(0);
  var cloudShadow = qa.bitwiseAnd(1 << 4).eq(0);
  var cirrus = qa.bitwiseAnd(1 << 2).eq(0);
  var dilatedCloud = qa.bitwiseAnd(1 << 1).eq(0);

  return cloud.and(cloudShadow).and(cirrus).and(dilatedCloud);
}
```

---

## Export Functions

### Export GeoTIFF

```javascript
Export.image.toDrive({
  image: lstResult,
  description: 'LST_output',
  folder: 'GEE_LST_Outputs',
  fileNamePrefix: filename,
  scale: 30,
  region: geometry.buffer(5000),  // 5km buffer
  crs: image.projection().crs(),
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});
```

**Parameters**:
- `image`: Image to export
- `description`: Task name (appears in Tasks tab)
- `folder`: Google Drive folder
- `fileNamePrefix`: Output file name
- `scale`: Resolution in meters
- `region`: Export bounds (ee.Geometry)
- `crs`: Coordinate reference system
- `maxPixels`: Maximum allowed pixels

---

### Export CSV Metadata

```javascript
var metadata = imageCollection.map(function(image) {
  return ee.Feature(null, {
    'IMAGE_ID': image.get('LANDSAT_PRODUCT_ID'),
    'DATE': image.date().format('YYYY-MM-dd'),
    'CLOUD_COVER': image.get('CLOUD_COVER')
  });
});

Export.table.toDrive({
  collection: metadata,
  description: 'LST_metadata',
  folder: 'GEE_LST_Outputs',
  fileNamePrefix: filename + '_metadata',
  fileFormat: 'CSV'
});
```

---

## UI Functions (Interactive Script)

### createControlPanel()

**Description**: Create UI control panel with input widgets

**Returns**: `ui.Panel` with controls

**Example widgets**:
```javascript
// Textbox
var startDateBox = ui.Textbox({
  placeholder: 'YYYY-MM-DD',
  value: '2020-01-01',
  style: {width: '150px'}
});

// Dropdown
var methodSelect = ui.Select({
  items: ['NDVI', 'ASTER'],
  value: 'NDVI',
  placeholder: 'Select method'
});

// Button
var runButton = ui.Button({
  label: 'Run Analysis',
  onClick: function() {
    runAnalysis();
  }
});

// Add to panel
var panel = ui.Panel([startDateBox, methodSelect, runButton]);
```

---

## Module Loading

### Standard Require

```javascript
// ASTER method module
var LandsatLST = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');

// NDVI method module
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');

// Administrative boundaries
var provinces = ee.FeatureCollection('projects/ee-tilmacatanla/assets/boundry/province');
```

---

## Error Handling

### Check Empty Collection

```javascript
var count = imageCollection.size().getInfo();

if (count === 0) {
  print('Warning: No images found for specified parameters');
  return;
}

print('Found', count, 'images');
```

### Handle Missing Data

```javascript
// Fill no-data gaps with NDVI method
var lstAster = processAster(geometry, start, end);
var lstNDVI = processNDVI(geometry, start, end);

var lstHybrid = lstAster.unmask(lstNDVI);
```

---

## Performance Tips

### Use Client vs. Server Operations Wisely

**Server-side** (preferred for large operations):
```javascript
var mean = lstCollection.mean();  // Computed on GEE servers
```

**Client-side** (use sparingly):
```javascript
var count = lstCollection.size().getInfo();  // Downloads result to browser
```

### Limit getInfo() Calls

```javascript
// BAD: Multiple getInfo() calls
lstCollection.toList(100).evaluate(function(list) {
  list.forEach(function(img) {
    var id = ee.Image(img).get('LANDSAT_PRODUCT_ID').getInfo();  // Slow!
  });
});

// GOOD: Single aggregate operation
var ids = lstCollection.aggregate_array('LANDSAT_PRODUCT_ID').getInfo();
ids.forEach(function(id) {
  print(id);
});
```

---

## Quick Reference

| Function | Purpose | Module |
|----------|---------|--------|
| `LandsatLST.collection()` | Main LST calculation | Landsat_LST_v2.js |
| `padZero()` | Number formatting | Helper utilities |
| `calcBeijingTime()` | Timezone conversion | Helper utilities |
| `createPathRowList()` | Extract Path/Row info | Helper utilities |
| `calculateRegionCloudScore()` | Cloud scoring | Cloud masking |
| `compute_emissivity_ndvi()` | NDVI-based emissivity | compute_emissivity_ndvi.js |
| `compute_FVC()` | Vegetation cover | compute_FVC.js |
| `compute_NDVI()` | NDVI calculation | compute_NDVI.js |
| `selectBestImage()` | Score-first selection | Statistical functions |
| `createCloudMask()` | Cloud mask generation | Cloud masking |

---

## See Also

- [Architecture: Data Processing Pipeline](../architecture/data-pipeline.md)
- [Algorithms: LST Calculation](../algorithms/lst-calculation.md)
- [Algorithms: Emissivity Calculation](../algorithms/emissivity.md)

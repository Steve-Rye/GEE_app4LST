# Data Processing Pipeline

## Pipeline Overview

```
Configuration
    ↓
Geometry Resolution
    ↓
Satellite Collection Building
    ↓
Cloud Filtering
    ↓
Emissivity Calculation (ASTER or NDVI path)
    ↓
LST Calculation (SMW Algorithm)
    ↓
Statistical Aggregation
    ↓
Visualization & Export
```

## Detailed Processing Steps

### 1. Configuration

**Input Parameters**:
- Region of interest (ROI) definition
- Time period(s) to analyze
- Cloud cover threshold (min/max percentage)
- Emissivity calculation method (ASTER or NDVI)
- Statistical aggregation method (mean/max/min/score_first)
- Satellite selection (Landsat 4/5/7/8/9)

**Configuration Files**:
- `landsat_lst_analysis.js`: Hardcoded configuration at top of script
- `landsat_lst_analysis_ui.js`: UI control panels for interactive configuration

### 2. Geometry Resolution

**Priority Order**:
1. Custom `table` variable (user-defined FeatureCollection or Geometry)
2. Administrative boundaries from `projects/ee-tilmacatanla/assets/boundry/*`:
   - Province level (`province_name`)
   - City level (`city_name`)
   - County level (`county_name`)

**Process**:
```javascript
var geometry;
if (typeof table !== 'undefined') {
  geometry = table.geometry();
} else if (province_name || city_name || county_name) {
  // Load from administrative boundary assets
  geometry = adminBoundary.geometry();
}
```

### 3. Satellite Collection Building & Cloud Filtering

**Data Sources**:
- Landsat 4/5 TM: Collection 2 Level 2
- Landsat 7 ETM+: Collection 2 Level 2
- Landsat 8/9 OLI/TIRS: Collection 2 Level 2

**Process**:
```javascript
// For each enabled satellite
var collection = LandsatLST.collection(
  satellite,      // 'L4', 'L5', 'L7', 'L8', 'L9'
  startDate,
  endDate,
  geometry,
  emissivityFlag  // 'ndvi' or true (for ASTER)
);
```

**Cloud Filtering**:
- Uses QA_PIXEL band from Landsat Collection 2
- Filters images by cloud cover percentage within ROI
- Configurable cloud cover range (e.g., 0-20%)

### 4. Emissivity Calculation

#### ASTER GED Method
```javascript
var emissivityFlag = true;
// Uses ASTER Global Emissivity Database
// Module: compute_emissivity.js
```

**Pros**:
- Based on measured spectral emissivity from ASTER sensor
- High accuracy for thermal band conversion

**Cons**:
- Incomplete global coverage (particularly for some regions)
- May result in no-data gaps

#### NDVI/FVC Method
```javascript
var emissivityFlag = 'ndvi';
// Derives emissivity from NDVI and FVC
// Module: compute_emissivity_ndvi.js
```

**Pros**:
- Complete coverage (derived from Landsat bands)
- Robust alternative when ASTER data unavailable

**Process**:
1. Calculate NDVI from red and NIR bands
2. Derive Fractional Vegetation Cover (FVC)
3. Apply emissivity model based on vegetation density

See [Emissivity Calculation](../algorithms/emissivity.md) for detailed formulas.

### 5. LST Calculation

**Algorithm**: Statistical Mono-Window (SMW)

**Inputs**:
- Brightness temperature (T_b) from thermal band
- Surface emissivity (ε) from step 4
- Total Precipitable Water (TPW) from NCEP dataset

**Process**:
```javascript
LST = (A × T_b) / ε + (B / ε) + C
```

Where A, B, C are TPW-dependent coefficients from lookup table.

**Module**: `SMWalgorithm.js`

See [LST Calculation](../algorithms/lst-calculation.md) for detailed implementation.

### 6. Statistical Aggregation

**Methods**:

#### mean
Temporal mean of all valid LST images in the period.
```javascript
var reducer = ee.Reducer.mean();
```

#### max
Maximum LST value across all images.
```javascript
var reducer = ee.Reducer.max();
```

#### min
Minimum LST value across all images.
```javascript
var reducer = ee.Reducer.min();
```

#### score_first
Selects the image with highest cloud-free percentage.
```javascript
// 1. Calculate cloud score for each image
// 2. Sort by cloud score (descending)
// 3. Select first image
```

**Additional Processing**:
- Unit conversion: Kelvin → Celsius (LST - 273.15)
- Outlier filtering: ±4σ z-score mask

### 7. Visualization & Export

**Visualization**:
- Map layer with blue-red gradient (cold to hot)
- Region boundary overlay (configurable style)
- Histogram chart (range: -30°C to 60°C, bin width: 2°C)

**Export**:

#### GeoTIFF Raster
- Format: GeoTIFF
- Resolution: 30m (native Landsat thermal)
- Buffer: 5km around ROI
- CRS: Source image CRS (WGS84 UTM zones)
- Destination: Google Drive

#### CSV Metadata
- Landsat image IDs
- Cloud cover percentages
- Acquisition times (UTC+8 for Chinese users)
- Path/Row information
- Destination: Google Drive

## Batch Processing Loop

```javascript
timePeriods.forEach(function(period) {
  // 1. Build filename from region + dates + cloud range + stat_type + method
  var filename = layerName + '_' + period.start + '_' + period.end +
                 '_LST_c' + cloud_min + '-' + cloud_max +
                 '_' + stat_type + '_' + method;

  // 2. Collect enabled satellites
  var collections = [];
  if (use_L4) collections.push(LandsatLST.collection('L4', ...));
  if (use_L5) collections.push(LandsatLST.collection('L5', ...));
  // ... etc

  // 3. Merge collections, apply LST algorithm
  var mergedCollection = ee.ImageCollection(collections).flatten();

  // 4. Check for empty collection (skip if no data)
  if (mergedCollection.size().getInfo() === 0) {
    print('No data for period:', period.start, 'to', period.end);
    return;
  }

  // 5. Convert K→°C, apply outlier mask
  var lstCelsius = mergedCollection.map(function(img) {
    return img.select('LST').subtract(273.15);
  });

  // 6. Apply reducer (mean/max/min/score_first)
  var lstResult;
  if (stat_type === 'score_first') {
    lstResult = selectBestImage(lstCelsius, geometry);
  } else {
    lstResult = lstCelsius.reduce(ee.Reducer[stat_type]());
  }

  // 7. Visualize + export GeoTIFF + CSV metadata
  Map.addLayer(lstResult, visParams, filename);
  Export.image.toDrive({ image: lstResult, ... });
  Export.table.toDrive({ collection: metadata, ... });
});
```

## Error Handling

- **Empty Collections**: Script continues to next time period with warning message
- **No ASTER Coverage**: Automatically falls back to NDVI method if configured
- **Invalid Geometry**: Logs error and skips processing
- **Export Failures**: User notified via GEE task manager

## Performance Considerations

- **Collection Size**: Limit time periods to avoid memory errors (recommend monthly/seasonal periods)
- **Region Size**: Large regions (>10,000 km²) may require longer processing times
- **Cloud Filtering**: Stricter cloud thresholds reduce available images but improve quality
- **Export Resolution**: 30m is recommended; higher resolution increases export time significantly

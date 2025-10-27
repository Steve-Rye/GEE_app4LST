# Filtering and Scoring Algorithms

## Outlier Filtering

### Z-Score Method

The application applies statistical outlier filtering to remove anomalous LST values that may result from cloud contamination, sensor errors, or processing artifacts.

### Algorithm

**Standard Deviation Threshold**: ±4σ (default)

```javascript
function applyOutlierFilter(image_collection, geometry) {
  // Calculate mean and standard deviation
  var mean = image_collection.mean();
  var std_dev = image_collection.reduce(ee.Reducer.stdDev());

  // Define valid range
  var lower_bound = mean.subtract(std_dev.multiply(4));
  var upper_bound = mean.add(std_dev.multiply(4));

  // Apply mask to collection
  var filtered = image_collection.map(function(image) {
    var mask = image.gte(lower_bound).and(image.lte(upper_bound));
    return image.updateMask(mask);
  });

  return filtered;
}
```

### Mathematical Formulation

```
z = (LST - μ) / σ

Keep pixel if: |z| ≤ 4

Where:
- LST = Land Surface Temperature value
- μ = Mean LST across all images
- σ = Standard deviation of LST
- z = z-score (number of standard deviations from mean)
```

### Implementation Steps

1. **Calculate Statistics**:
   ```javascript
   var lst_mean = lst_collection.mean();
   var lst_stddev = lst_collection.reduce(ee.Reducer.stdDev());
   ```

2. **Compute Z-Scores**:
   ```javascript
   var z_score = lst_collection.map(function(image) {
     return image.subtract(lst_mean).divide(lst_stddev).abs();
   });
   ```

3. **Apply Threshold**:
   ```javascript
   var threshold = 4;  // ±4 standard deviations
   var outlier_mask = z_score.map(function(image) {
     return image.lte(threshold);
   });
   ```

4. **Mask Outliers**:
   ```javascript
   var filtered_collection = lst_collection.zip(outlier_mask).map(function(zipped) {
     var image = ee.Image(zipped).select(0);
     var mask = ee.Image(zipped).select(1);
     return image.updateMask(mask);
   });
   ```

### Parameter Selection

| Threshold | Removed Data | Description |
|-----------|--------------|-------------|
| ±2σ | ~5% | Aggressive filtering, may remove valid extreme values |
| ±3σ | ~0.3% | Moderate filtering, balances outlier removal and data retention |
| ±4σ | ~0.006% | Conservative filtering (default), retains most valid data |
| ±5σ | ~0.00006% | Minimal filtering, only removes extreme outliers |

**Recommendation**: Use ±4σ for most applications. Adjust to ±3σ for noisier data or ±5σ to preserve extreme events (e.g., heat waves).

### Alternative: IQR Method

**Interquartile Range (IQR)** method is more robust to non-normal distributions:

```javascript
function applyIQRFilter(image_collection, geometry, k) {
  k = k || 1.5;  // Default multiplier

  // Calculate quartiles
  var percentiles = image_collection.reduce(
    ee.Reducer.percentile([25, 75])
  );
  var q1 = percentiles.select('.*_p25');
  var q3 = percentiles.select('.*_p75');
  var iqr = q3.subtract(q1);

  // Define bounds
  var lower_bound = q1.subtract(iqr.multiply(k));
  var upper_bound = q3.add(iqr.multiply(k));

  // Apply mask
  var filtered = image_collection.map(function(image) {
    var mask = image.gte(lower_bound).and(image.lte(upper_bound));
    return image.updateMask(mask);
  });

  return filtered;
}
```

**Formula**:
```
Valid range: [Q1 - k×IQR, Q3 + k×IQR]

Where:
- Q1 = 25th percentile
- Q3 = 75th percentile
- IQR = Q3 - Q1 (Interquartile Range)
- k = 1.5 (default) or 3.0 (conservative)
```

### Comparison

| Method | Advantages | Disadvantages | Best For |
|--------|------------|---------------|----------|
| **Z-Score** | Simple, fast, works well for normal distributions | Sensitive to extreme outliers | Most LST applications |
| **IQR** | Robust to outliers, works for non-normal data | May remove valid extreme values | Noisy data, skewed distributions |

---

## Cloud Scoring

### Overview

Cloud scoring calculates the percentage of clear (cloud-free) pixels in each image. This metric is used for:
1. **Pre-filtering**: Exclude heavily clouded images before processing
2. **Image selection**: Choose best image in `score_first` aggregation method
3. **Quality assessment**: Report data quality in metadata CSV

### Algorithm

**QA_PIXEL Band Analysis**

Landsat Collection 2 provides a `QA_PIXEL` band with bit-packed quality flags.

### Implementation

#### 1. Extract Cloud Bits

```javascript
function getQABits(image, start, end, name) {
  // Calculate bit range
  var pattern = 0;
  for (var i = start; i <= end; i++) {
    pattern += Math.pow(2, i);
  }

  // Extract bits
  return image.select([0], [name])
    .bitwiseAnd(pattern)
    .rightShift(start);
}
```

#### 2. Define Cloud Mask

**Landsat Collection 2 QA_PIXEL Bit Flags**:

| Bit | Meaning |
|-----|---------|
| 0 | Fill |
| 1 | Dilated Cloud |
| 2 | Cirrus (high confidence) |
| 3 | Cloud |
| 4 | Cloud Shadow |
| 5 | Snow |
| 6 | Clear |
| 7 | Water |

```javascript
function createCloudMask(image) {
  var qa = image.select('QA_PIXEL');

  // Extract relevant bits
  var cloud = getQABits(qa, 3, 3, 'cloud');
  var cloud_shadow = getQABits(qa, 4, 4, 'cloud_shadow');
  var cirrus = getQABits(qa, 2, 2, 'cirrus');
  var dilated_cloud = getQABits(qa, 1, 1, 'dilated_cloud');

  // Clear pixel: no cloud, shadow, cirrus, or dilated cloud
  var clear_mask = cloud.eq(0)
    .and(cloud_shadow.eq(0))
    .and(cirrus.eq(0))
    .and(dilated_cloud.eq(0));

  return clear_mask;
}
```

#### 3. Calculate Cloud Score

```javascript
function calculateRegionCloudScore(image, geometry) {
  var clear_mask = createCloudMask(image);

  // Calculate percentage of clear pixels in region
  var stats = clear_mask.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9
  });

  var clear_percentage = ee.Number(stats.get('QA_PIXEL')).multiply(100);

  // Add as image property
  return image.set('clear_percentage', clear_percentage);
}
```

#### 4. Apply to Collection

```javascript
var collection_with_scores = landsat_collection.map(function(image) {
  return calculateRegionCloudScore(image, geometry);
});
```

### Usage in Processing

#### Pre-filtering by Cloud Cover

```javascript
var cloud_min = 0;   // Minimum acceptable cloud cover (%)
var cloud_max = 20;  // Maximum acceptable cloud cover (%)

var filtered_collection = collection_with_scores.filter(
  ee.Filter.and(
    ee.Filter.gte('CLOUD_COVER', cloud_min),
    ee.Filter.lte('CLOUD_COVER', cloud_max)
  )
);
```

**Note**: `CLOUD_COVER` is a Landsat metadata property (scene-level), while `clear_percentage` is calculated for the specific region.

#### Score-First Aggregation

Selects the single image with highest clear pixel percentage:

```javascript
function selectBestImage(image_collection, geometry) {
  // Calculate clear percentage for each image
  var scored = image_collection.map(function(image) {
    return calculateRegionCloudScore(image, geometry);
  });

  // Sort by clear percentage (descending) and select first
  var best = scored.sort('clear_percentage', false).first();

  return best;
}
```

**Use case**: When you want a single, cloud-free snapshot rather than temporal average.

### Cloud Score Interpretation

| Clear Percentage | Quality | Recommendation |
|------------------|---------|----------------|
| 90-100% | Excellent | Use without concern |
| 70-90% | Good | Acceptable for most applications |
| 50-70% | Fair | May have residual cloud effects in edges |
| 30-50% | Poor | Check visual inspection, consider excluding |
| 0-30% | Very Poor | Exclude from analysis |

### Limitations

1. **Thin Cirrus**: May not be fully detected, can affect LST
2. **Cloud Shadows**: Detection not perfect, especially in mountainous terrain
3. **Snow vs. Cloud**: Sometimes misclassified
4. **Edge Effects**: Cloud edges may have gradual effects not captured by binary mask

### Advanced: Custom Cloud Scoring

For more sophisticated cloud detection:

```javascript
function advancedCloudScore(image) {
  // Combine QA_PIXEL with spectral tests
  var qa_clear = createCloudMask(image);

  // Additional spectral tests
  var ndsi = image.normalizedDifference(['B3', 'B6']);  // Snow index
  var brightness = image.select(['B2', 'B3', 'B4']).reduce(ee.Reducer.sum());

  // Cloud: high brightness + low NDSI
  var cloud_spectral = brightness.gt(0.6).and(ndsi.lt(0.4));

  // Combine masks
  var combined_clear = qa_clear.and(cloud_spectral.not());

  // Calculate score
  var clear_percentage = combined_clear.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 30
  }).get('QA_PIXEL');

  return image.set('clear_percentage', ee.Number(clear_percentage).multiply(100));
}
```

---

## Metadata Extraction

### Image Metadata CSV

For each time period, the application exports a CSV with metadata for all processed images:

```javascript
function extractMetadata(image) {
  var metadata = {
    'IMAGE_ID': image.get('LANDSAT_PRODUCT_ID'),
    'SATELLITE': image.get('SPACECRAFT_ID'),
    'ACQUISITION_DATE': image.date().format('YYYY-MM-dd'),
    'ACQUISITION_TIME_UTC': image.date().format('HH:mm:ss'),
    'ACQUISITION_TIME_UTC8': calcBeijingTime(image.date().format()),
    'CLOUD_COVER_SCENE': image.get('CLOUD_COVER'),
    'CLOUD_COVER_REGION': image.get('clear_percentage'),
    'SUN_ELEVATION': image.get('SUN_ELEVATION'),
    'SUN_AZIMUTH': image.get('SUN_AZIMUTH'),
    'WRS_PATH': image.get('WRS_PATH'),
    'WRS_ROW': image.get('WRS_ROW'),
    'PROCESSING_LEVEL': image.get('PROCESSING_LEVEL')
  };

  return ee.Feature(null, metadata);
}

// Create feature collection from image collection
var metadata_fc = image_collection.map(extractMetadata);

// Export to CSV
Export.table.toDrive({
  collection: metadata_fc,
  description: filename + '_metadata',
  fileFormat: 'CSV'
});
```

### UTC+8 Time Conversion

For Chinese users, convert acquisition time to UTC+8 (Beijing Time):

```javascript
function calcBeijingTime(utcStr) {
  // Parse UTC time string
  var utc_date = ee.Date.parse('YYYY-MM-dd HH:mm:ss', utcStr);

  // Add 8 hours
  var beijing_date = utc_date.advance(8, 'hour');

  return beijing_date.format('YYYY-MM-dd HH:mm:ss');
}
```

---

## Best Practices

### Outlier Filtering

1. **Visual inspection**: Always check histogram before/after filtering
2. **Preserve extremes**: Use conservative threshold (±4σ or ±5σ) for climate studies
3. **Iterate**: Adjust threshold based on data quality and application needs

### Cloud Scoring

1. **Use region-specific scores**: Global `CLOUD_COVER` may differ from ROI cloud cover
2. **Set appropriate thresholds**: Balance data quantity vs. quality
3. **Manual verification**: Visually inspect images with borderline scores (50-70%)

### Metadata

1. **Always export metadata**: Essential for reproducibility and quality control
2. **Include custom fields**: Add processing parameters (method, aggregation type, etc.)
3. **Document time zones**: Critical for temporal analysis

## Module Reference

**Outlier Filtering**:
- Implemented in main scripts: `landsat_lst_analysis.js`, `landsat_lst_analysis_ui.js`
- Function: `applyOutlierFilter()` (custom implementation)

**Cloud Scoring**:
- Module: `Landsat_LST_v2.js`
- Function: `calculateRegionCloudScore(image, geometry)`

**Metadata Extraction**:
- Helper function: `calcBeijingTime(utcStr)` for time conversion
- Function: `createPathRowList(collection)` for WRS path/row extraction

## References

1. USGS Landsat Collection 2 Quality Assessment Bands: https://www.usgs.gov/landsat-missions/landsat-collection-2-quality-assessment-bands

2. Foga, S., et al. (2017). Cloud detection algorithm comparison and validation for operational Landsat data products. *Remote Sensing of Environment*, 194, 379-390.

3. Zhu, Z., & Woodcock, C. E. (2012). Object-based cloud and cloud shadow detection in Landsat imagery. *Remote Sensing of Environment*, 118, 83-94.

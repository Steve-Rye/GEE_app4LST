# Technical Notes

This document covers important technical details, limitations, and considerations for LST analysis.

## Band Mapping Across Landsat Generations

### Spectral Band Differences

Different Landsat sensors have different band numbering schemes for equivalent spectral regions:

#### Surface Reflectance Bands

| Spectral Region | L4/L5 TM | L7 ETM+ | L8/L9 OLI |
|-----------------|----------|---------|-----------|
| **Blue** | B1 | B1 | B2 |
| **Green** | B2 | B2 | B3 |
| **Red** | B3 | B3 | B4 |
| **NIR** | B4 | B4 | B5 |
| **SWIR 1** | B5 | B5 | B6 |
| **SWIR 2** | B7 | B7 | B7 |

#### Thermal Bands

| Sensor | Thermal Band(s) | Wavelength (μm) | Resolution |
|--------|----------------|-----------------|------------|
| **L4/L5 TM** | B6 | 10.40-12.50 | 120m → 30m |
| **L7 ETM+** | B6_VCID_1, B6_VCID_2 | 10.40-12.50 | 60m → 30m |
| **L8/L9 TIRS** | B10, B11 | 10.60-11.19, 11.50-12.51 | 100m → 30m |

**Important**:
- Landsat 8/9 have two thermal bands, but **only B10 is used** for LST due to calibration issues with B11
- All thermal bands are resampled to 30m in Collection 2 Level 2 products

### NDVI Band Selection

The `compute_NDVI()` function automatically selects the correct bands:

```javascript
// Landsat 4/5/7: NDVI = (B4 - B3) / (B4 + B3)
var ndvi_L5 = image_L5.normalizedDifference(['B4', 'B3']);

// Landsat 8/9: NDVI = (B5 - B4) / (B5 + B4)
var ndvi_L8 = image_L8.normalizedDifference(['B5', 'B4']);
```

**Consequence**: When merging collections across Landsat generations, NDVI calculations must account for band differences. The custom modules handle this automatically.

---

## TPW Interpolation Details

### Temporal Interpolation

NCEP TPW data is available at **6-hour intervals** (00:00, 06:00, 12:00, 18:00 UTC).

#### Example Scenario

Landsat image acquired at **10:30 UTC**:

1. **Nearest before**: 06:00 UTC (4.5 hours earlier)
2. **Nearest after**: 12:00 UTC (1.5 hours later)

**Weight calculation**:
```javascript
var delta_before = 4.5 hours;
var delta_after = 1.5 hours;
var total_delta = 6.0 hours;

var weight_after = delta_before / total_delta = 0.75;
var weight_before = delta_after / total_delta = 0.25;

var tpw_interp = tpw_06 × 0.25 + tpw_12 × 0.75;
```

**Result**: TPW value is weighted toward the closer (12:00 UTC) observation.

### Spatial Interpolation

NCEP TPW native resolution: **~2.5° × 2.5°** (~278 km at equator)

**Resampling method**: Bilinear interpolation to 30m

**Consequence**:
- TPW varies smoothly across Landsat scene
- Local atmospheric variations (e.g., thunderstorms) not captured
- Regional-scale patterns preserved

---

## Empty Collections and No-Data Scenarios

### Common Causes

1. **No Landsat coverage**: Region outside Landsat acquisition zones (rare)
2. **All images cloudy**: Cloud cover exceeds threshold for all available images
3. **Date range issues**:
   - Landsat 4: Only 1982-1993
   - Landsat 5: Only 1984-2013
   - Landsat 6: Failed (no data)
   - Landsat 7: SLC-off gaps after 2003
4. **ASTER gaps**: Some regions have incomplete ASTER GED coverage
5. **Processing errors**: Images filtered out by quality masks

### Detection and Handling

```javascript
var collection = LandsatLST.collection('L8', start, end, geometry, 'ndvi');

var count = collection.size().getInfo();

if (count === 0) {
  print('⚠️ No data for period:', start, 'to', end);
  print('Suggestions:');
  print('  1. Increase cloud threshold (e.g., 30% or 40%)');
  print('  2. Expand date range');
  print('  3. Enable more satellites (L4-L9)');
  print('  4. Check region geometry (ensure valid bounds)');
  return;  // Skip processing
}

print('✓ Found', count, 'images');
// Continue processing
```

### Mitigation Strategies

1. **Adaptive cloud thresholds**: Start strict (10%), relax if no data (20%, 30%, etc.)
2. **Multi-satellite fusion**: Enable all available Landsat sensors
3. **Seasonal compositing**: Use longer time windows (quarterly/annual)
4. **NDVI method**: Switch from ASTER if emissivity gaps detected

---

## Coordinate Reference Systems

### Native Landsat CRS

Landsat Collection 2 uses **WGS84 UTM zones** based on scene location:

| UTM Zone | Longitude Range | Example Regions |
|----------|-----------------|-----------------|
| **49N** | 108°E - 114°E | Hong Kong, parts of Guangdong |
| **50N** | 114°E - 120°E | Shenzhen, Guangzhou, Taipei |
| **51N** | 120°E - 126°E | Shanghai, Seoul |

**EPSG codes**:
- UTM Zone 49N: `EPSG:32649`
- UTM Zone 50N: `EPSG:32650`
- UTM Zone 51N: `EPSG:32651`

### CRS in Exports

**Default behavior**: Use source image CRS

```javascript
Export.image.toDrive({
  image: lstResult,
  crs: lstResult.projection().crs(),  // Uses Landsat scene CRS
  // ...
});
```

**For cross-zone regions**: May need to reproject to common CRS

```javascript
// Reproject to WGS84 Geographic (lat/lon)
var lstWGS84 = lstResult.reproject({
  crs: 'EPSG:4326',
  scale: 30
});

Export.image.toDrive({
  image: lstWGS84,
  crs: 'EPSG:4326',
  // ...
});
```

**Warning**: Reprojection introduces interpolation artifacts. Prefer native CRS when possible.

---

## Resolution and Resampling

### Native Resolutions

| Data Source | Native Resolution | Resampled To |
|-------------|-------------------|--------------|
| **Landsat 4/5 TM thermal** | 120m | 30m |
| **Landsat 7 ETM+ thermal** | 60m | 30m |
| **Landsat 8/9 TIRS thermal** | 100m | 30m |
| **Landsat multispectral** | 30m | 30m |
| **ASTER GED emissivity** | 100m | 30m |
| **NCEP TPW** | ~278 km | 30m |

**Resampling methods**:
- **Thermal bands**: Cubic convolution (Collection 2 processing)
- **ASTER**: Bilinear interpolation
- **TPW**: Bilinear interpolation

### Effective Resolution

**LST effective resolution**: ~100m

**Reason**: Limited by coarsest input (thermal bands at 100m native)

**Implication**:
- Fine details < 100m may not be accurate
- 30m output represents resampled thermal data
- Suitable for most regional studies
- May be too coarse for individual buildings

### Export Resolution Options

```javascript
// Native (30m) - largest files, slowest
Export.image.toDrive({ scale: 30, ... });

// Moderate (60m) - 4x faster, 1/4 file size
Export.image.toDrive({ scale: 60, ... });

// Coarse (100m) - matches thermal native resolution
Export.image.toDrive({ scale: 100, ... });

// Regional (500m) - for continental studies
Export.image.toDrive({ scale: 500, ... });
```

**Recommendation**: Use 100m for most applications to balance accuracy and performance.

---

## Time of Day and Solar Geometry

### Landsat Overpass Times

Landsat satellites have **sun-synchronous orbits** with consistent local solar times:

| Satellite | Equatorial Crossing Time (Local Solar Time) |
|-----------|---------------------------------------------|
| **Landsat 4/5** | ~09:45 AM (descending) |
| **Landsat 7** | ~10:00 AM (descending) |
| **Landsat 8/9** | ~10:00 AM (descending) |

**Consequence**:
- LST represents mid-morning conditions (warming phase)
- Not representative of daily maximum (typically 2-4 PM)
- Not representative of nighttime minimum
- Consistent across dates for temporal comparison

### Solar Elevation Effects

Higher solar elevation → more heating → higher LST

**Seasonal variation**:
- **Summer (June-August)**: High sun angle, maximum heating
- **Winter (December-February)**: Low sun angle, minimum heating

**Latitude effects**:
- **Tropics (0-23°)**: High sun year-round
- **Mid-latitudes (23-50°)**: Strong seasonal variation
- **High latitudes (>50°)**: Extreme seasonal variation, low winter sun

### Day vs. Night LST

**Current limitation**: Landsat only acquires **daytime** imagery (solar illumination required for optical bands)

**For day-night analysis**: Use **MODIS Terra/Aqua** LST products
- Terra: ~10:30 AM and ~10:30 PM
- Aqua: ~1:30 PM and ~1:30 AM

---

## Accuracy and Uncertainty

### Expected LST Accuracy

| Condition | RMSE (K) | Notes |
|-----------|----------|-------|
| **Optimal** (clear, dry, ASTER) | 1-2 K | Low TPW, accurate emissivity |
| **Typical** (moderate conditions) | 2-3 K | Standard performance |
| **Challenging** (humid, NDVI) | 3-5 K | High TPW, vegetation-based emissivity |
| **Poor** (cloud contamination) | >5 K | Residual cloud effects |

### Error Sources and Magnitudes

| Source | Magnitude | Impact |
|--------|-----------|--------|
| **Emissivity uncertainty** | ±0.01 | ±1-2 K |
| **TPW interpolation** | ±0.5 cm | ±0.5-1 K |
| **Atmospheric variability** | Variable | ±1-2 K |
| **Sensor calibration** | ±0.5 K | ±0.5 K |
| **Surface heterogeneity** | ±1-3 K | Varies with pixel size |
| **Total uncertainty** | - | ±2-4 K (typical) |

### Validation Methods

1. **Ground-based radiometers**: Most accurate but spatially limited
2. **MODIS LST products**: Good spatial coverage, different overpass times
3. **Weather station data**: Air temperature ≠ surface temperature (correction needed)
4. **Cross-comparison**: ASTER LST, Landsat 7 vs. 8, etc.

**Validation considerations**:
- Match spatial scales (point vs. 30m pixel)
- Account for temporal differences (overpass time vs. measurement time)
- Consider surface type (vegetated, urban, water)

---

## Data Gaps and SLC-off Issue

### Landsat 7 Scan Line Corrector Failure

**Date**: May 31, 2003

**Effect**: ~22% data loss per scene in diagonal stripes

**Mitigation in this application**:
1. **Temporal compositing**: Gaps filled by other dates
2. **Multi-satellite**: L5/L8/L9 fill gaps
3. **Option to disable L7**: Set `use_L7 = false`

**When to use L7 post-2003**:
- Need maximum temporal coverage (more data > gaps)
- Using temporal aggregation (gaps averaged out)
- Other satellites unavailable (2003-2013 L5 overlap, 2013+ L8/L9)

---

## Performance and Computational Limits

### GEE Memory Limits

**User memory limit**: Varies by account type
- **Free**: ~2-5 GB per task
- **Commercial**: Higher limits

**Common triggers**:
1. **Large regions**: > 100,000 km² at 30m
2. **Long time periods**: > 500 images
3. **Complex calculations**: Multiple bands, nested operations

**Solutions**:
- **Reduce scale**: Export at 100m instead of 30m
- **Split spatially**: Tile large regions
- **Split temporally**: Process shorter periods
- **Simplify aggregation**: Use `score_first` instead of `mean`

### Export Limitations

**Maximum pixels per export**: `1e9` (1 billion)

**Calculation**:
```
pixels = (width_m / scale_m) × (height_m / scale_m)
```

**Example** (30m resolution):
```
Region: 100 km × 100 km
Pixels: (100,000 / 30) × (100,000 / 30) ≈ 11 million pixels ✓ OK

Region: 1,000 km × 1,000 km
Pixels: (1,000,000 / 30) × (1,000,000 / 30) ≈ 1.1 billion pixels ✗ EXCEEDS LIMIT
```

**Solution**: Export at coarser resolution or split into tiles

---

## Cloud Masking Limitations

### QA_PIXEL Bit Flags

Landsat Collection 2 QA_PIXEL provides automated cloud detection, but has limitations:

**Strengths**:
- Good for obvious thick clouds
- Detects most cloud shadows
- High-confidence cirrus detection

**Limitations**:
1. **Thin cirrus**: May not be fully detected (especially at edges)
2. **Bright surfaces**: Can be misclassified as clouds (deserts, salt flats, snow)
3. **Shadows in complex terrain**: Mountain shadows may be misidentified
4. **Cloud edges**: Gradual transition not captured by binary mask

**Result**: Some residual cloud contamination possible even after filtering

### Additional Quality Control

**Recommendation**: Always visually inspect results, especially for:
- First-time analysis of new region
- Unusual LST patterns
- Studies requiring high accuracy

**Manual inspection**:
```javascript
// Visualize cloud mask
var cloudMask = createCloudMask(image);
Map.addLayer(cloudMask, {min: 0, max: 1}, 'Cloud Mask');

// Overlay on image
Map.addLayer(image.updateMask(cloudMask), {bands: ['B4', 'B3', 'B2'], max: 0.3}, 'Masked Image');
```

---

## Temporal Compositing Considerations

### Aggregation Method Choice

| Method | Best For | Limitations |
|--------|----------|-------------|
| **mean** | General studies, smooth trends | Sensitive to outliers |
| **median** | Robust to outliers | Requires many images (>5) |
| **max** | Heat wave detection | Sensitive to cloud contamination |
| **min** | Cold event detection | Sensitive to shadows |
| **score_first** | Single snapshot, minimal clouds | Not representative of period |

### Seasonal Biases

**Problem**: Uneven image distribution across period

**Example**:
- Period: 2020-01-01 to 2020-12-31 (full year)
- Images: 30 total
  - Winter: 2 images (cloudy season)
  - Summer: 20 images (clear season)
  - Spring/Fall: 8 images

**Result**: `mean` biased toward summer LST

**Mitigation**:
1. **Stratified sampling**: Equal number of images per season
2. **Median**: Less affected by sample size imbalance
3. **Seasonal analysis**: Process seasons separately

---

## Data Availability by Region

### Global Coverage

Landsat has **global coverage** via WRS-2 path/row system:
- **233 paths** (north-south strips)
- **248 rows** (east-west segments)
- **16-day repeat cycle** per satellite

### Regional Constraints

**High cloud cover regions** (limited usable data):
- Tropical rainforests (Amazon, Congo, Southeast Asia)
- Monsoon regions during wet season
- Mountainous areas with persistent clouds

**Polar regions** (seasonal limitations):
- No solar illumination during winter
- Ice/snow complicates emissivity
- Fewer Landsat overpasses at high latitudes

**Typical data availability** (clear images per year):
- **Arid regions**: 15-30 images/year
- **Temperate regions**: 10-20 images/year
- **Tropical regions**: 5-15 images/year
- **Polar regions**: 5-10 images/year (summer only)

---

## Version and Compatibility Notes

### Landsat Collection Versions

**Current**: Collection 2 (C02)
**Legacy**: Collection 1 (C01, deprecated)

**This application uses Collection 2** exclusively.

**Key C02 improvements**:
- Improved geometric accuracy
- Better radiometric calibration
- Enhanced cloud masking (QA_PIXEL)
- Consistent processing across sensors

**Migration from C01**: If using old scripts with C01 data, update dataset IDs:
```javascript
// OLD (C01)
var dataset = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA');

// NEW (C02)
var dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA');
```

### GEE API Changes

**Current API**: JavaScript API (stable)

**Potential future changes**:
- Function deprecations (rare)
- Dataset updates (ASTER GED, NCEP)
- New Landsat missions (Landsat 10+)

**Best practice**:
- Test scripts periodically
- Follow GEE announcements
- Version control your scripts

---

## Best Practices Summary

### Data Quality

1. ✓ **Use Collection 2** (most recent and accurate)
2. ✓ **Enable multiple satellites** (L4-L9) for temporal coverage
3. ✓ **Set appropriate cloud thresholds** (10-20% for most regions)
4. ✓ **Visual inspection** of results (first-time and anomalies)
5. ✓ **Document processing parameters** (reproducibility)

### Performance

1. ✓ **Start with small regions** (test before large exports)
2. ✓ **Use appropriate resolution** (100m for regional, 30m for detailed)
3. ✓ **Limit time periods** (monthly/seasonal better than multi-year)
4. ✓ **Monitor Tasks tab** (check for errors)

### Analysis

1. ✓ **Match aggregation to science question** (mean vs. max vs. score_first)
2. ✓ **Consider temporal biases** (seasonal image distribution)
3. ✓ **Account for uncertainty** (±2-4 K typical RMSE)
4. ✓ **Validate against independent data** (when possible)

---

## Known Issues and Workarounds

### Issue: Landsat 8 B11 Stray Light

**Problem**: TIRS Band 11 has stray light contamination

**Workaround**: **Only use Band 10** for LST (application default)

**Reference**: USGS Landsat 8 Data Users Handbook

### Issue: Landsat 7 SLC-off Gaps

**Problem**: 22% data loss in diagonal stripes (post-May 2003)

**Workaround**:
- Enable L4/L5/L8/L9 to fill gaps
- Use temporal compositing
- Set `use_L7 = false` if other data sufficient

### Issue: ASTER GED Gaps

**Problem**: Incomplete global coverage

**Workaround**: **Use NDVI method** (`emissivityFlag = 'ndvi'`)

### Issue: TPW Coarse Resolution

**Problem**: ~278 km native resolution misses local atmospheric features

**Workaround**: No perfect solution; accept as limitation or use higher-res atmospheric models (if available)

---

## See Also

- [Architecture: Data Processing Pipeline](../architecture/data-pipeline.md)
- [Algorithms: LST Calculation](../algorithms/lst-calculation.md)
- [Getting Started: Troubleshooting](../guides/getting-started.md#troubleshooting)
- [Module Functions Reference](module-functions.md)

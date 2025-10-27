# LST Calculation Algorithm

## Statistical Mono-Window (SMW) Algorithm

### Overview

The Statistical Mono-Window algorithm is used to retrieve Land Surface Temperature (LST) from Landsat thermal bands. It accounts for atmospheric effects using Total Precipitable Water (TPW) as a proxy for atmospheric conditions.

### Formula

```
LST = (A × T_b) / ε + (B / ε) + C
```

**Where**:
- `LST` = Land Surface Temperature (Kelvin)
- `T_b` = Brightness temperature from thermal band (Kelvin)
- `ε` = Surface emissivity (dimensionless, 0-1)
- `A, B, C` = TPW-dependent coefficients

### Coefficients

The coefficients A, B, and C are derived from statistical analysis of atmospheric profiles and depend on Total Precipitable Water (TPW):

| TPW Range (cm) | A | B | C |
|----------------|---|---|---|
| 0.0 - 0.6 | 0.9765 | 3.1406 | -0.2943 |
| 0.6 - 1.2 | 0.9628 | 3.3069 | 1.5635 |
| 1.2 - 1.6 | 0.9499 | 3.4693 | 3.2073 |
| 1.6 - 2.0 | 0.9375 | 3.6276 | 4.6562 |
| 2.0 - 2.6 | 0.9218 | 3.8338 | 6.3410 |
| 2.6 - 3.2 | 0.9070 | 4.0330 | 7.9106 |
| 3.2 - 4.0 | 0.8888 | 4.2820 | 9.6961 |
| 4.0 - 4.8 | 0.8715 | 4.5203 | 11.3155 |
| > 4.8 | 0.8552 | 4.7475 | 12.7528 |

**Source**: Ermida et al. (2020), derived from MODTRAN radiative transfer simulations

### Implementation Steps

#### 1. Extract Brightness Temperature

For each Landsat thermal band:

```javascript
// Landsat 4/5/7 - Band 6
var brightness_temp = image.select('B6');

// Landsat 8/9 - Band 10 (TIRS1)
var brightness_temp = image.select('B10');
```

Landsat TOA collections provide brightness temperature in Kelvin directly.

#### 2. Retrieve TPW Value

```javascript
// Get TPW at image acquisition time
var ncep = ee.ImageCollection('NCEP_RE/surface_wv')
  .filterDate(start_date, end_date)
  .filterBounds(geometry);

// Interpolate to exact acquisition time
var tpw = interpolateTPW(ncep, image_date);

// Extract TPW value at image location
var tpw_value = tpw.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: geometry,
  scale: 2500
}).get('pr_wtr');
```

#### 3. Select Coefficients

```javascript
function selectCoefficients(tpw_cm) {
  var coefficients;

  if (tpw_cm < 0.6) {
    coefficients = {A: 0.9765, B: 3.1406, C: -0.2943};
  } else if (tpw_cm < 1.2) {
    coefficients = {A: 0.9628, B: 3.3069, C: 1.5635};
  } else if (tpw_cm < 1.6) {
    coefficients = {A: 0.9499, B: 3.4693, C: 3.2073};
  } else if (tpw_cm < 2.0) {
    coefficients = {A: 0.9375, B: 3.6276, C: 4.6562};
  } else if (tpw_cm < 2.6) {
    coefficients = {A: 0.9218, B: 3.8338, C: 6.3410};
  } else if (tpw_cm < 3.2) {
    coefficients = {A: 0.9070, B: 4.0330, C: 7.9106};
  } else if (tpw_cm < 4.0) {
    coefficients = {A: 0.8888, B: 4.2820, C: 9.6961};
  } else if (tpw_cm < 4.8) {
    coefficients = {A: 0.8715, B: 4.5203, C: 11.3155};
  } else {
    coefficients = {A: 0.8552, B: 4.7475, C: 12.7528};
  }

  return coefficients;
}
```

#### 4. Calculate Surface Emissivity

See [Emissivity Calculation](emissivity.md) for detailed methods.

Two options:
- **ASTER GED**: From ASTER Global Emissivity Database
- **NDVI-based**: Derived from vegetation indices

#### 5. Apply SMW Formula

```javascript
function calculateLST(brightness_temp, emissivity, tpw_value) {
  // Get coefficients based on TPW
  var coef = selectCoefficients(tpw_value);

  // Apply SMW formula
  var lst = brightness_temp
    .multiply(coef.A)
    .divide(emissivity)
    .add(ee.Image(coef.B).divide(emissivity))
    .add(coef.C)
    .rename('LST');

  return lst;
}
```

#### 6. Post-processing

```javascript
// Convert Kelvin to Celsius
var lst_celsius = lst.subtract(273.15);

// Apply valid range mask (typical LST range: -50°C to 70°C)
var valid_mask = lst_celsius.gt(-50).and(lst_celsius.lt(70));
lst_celsius = lst_celsius.updateMask(valid_mask);
```

## TPW Interpolation

### Temporal Interpolation

NCEP TPW data is available at 6-hour intervals (00:00, 06:00, 12:00, 18:00 UTC). For Landsat images acquired between these times, temporal interpolation is performed:

```javascript
function interpolateTPW(ncep_collection, image_date) {
  // Get TPW images before and after acquisition time
  var tpw_before = ncep_collection
    .filterDate(image_date.advance(-6, 'hour'), image_date)
    .sort('system:time_start', false)
    .first();

  var tpw_after = ncep_collection
    .filterDate(image_date, image_date.advance(6, 'hour'))
    .sort('system:time_start')
    .first();

  // Calculate time weights
  var time_before = ee.Date(tpw_before.get('system:time_start'));
  var time_after = ee.Date(tpw_after.get('system:time_start'));

  var delta_before = image_date.difference(time_before, 'second');
  var delta_after = time_after.difference(image_date, 'second');
  var total_delta = time_after.difference(time_before, 'second');

  var weight_before = ee.Number(1).subtract(delta_before.divide(total_delta));
  var weight_after = ee.Number(1).subtract(delta_after.divide(total_delta));

  // Weighted average
  var tpw_interp = tpw_before.multiply(weight_before)
    .add(tpw_after.multiply(weight_after))
    .divide(weight_before.add(weight_after));

  return tpw_interp;
}
```

### Spatial Resampling

TPW is resampled from ~2.5° to Landsat resolution (30m) using bilinear interpolation:

```javascript
var tpw_resampled = tpw_interp.resample('bilinear').reproject({
  crs: landsat_image.projection(),
  scale: 30
});
```

## Accuracy Considerations

### Error Sources

1. **Emissivity Uncertainty**: ±0.01 in emissivity → ±1-2K in LST
2. **TPW Interpolation**: Temporal/spatial interpolation introduces ~0.5-1K error
3. **Atmospheric Variability**: Local atmospheric conditions not captured by coarse TPW → ~1-2K error
4. **Sensor Calibration**: Landsat thermal band calibration → ~0.5K uncertainty

### Expected Accuracy

- **Typical conditions**: ±2-3K RMSE
- **Clear, dry atmosphere**: ±1-2K RMSE
- **Humid, cloudy conditions**: ±3-5K RMSE

### Validation

Validate against:
- Ground-based temperature measurements (adjusted for emissivity)
- MODIS LST products (consider resolution differences)
- In-situ weather station data (corrected for air vs. surface temperature)

## Sensor-Specific Considerations

### Landsat 4/5/7 (Single Thermal Band)

- **Thermal Band**: B6 (10.4-12.5 μm)
- **Resolution**: 120m (L4/5), 60m (L7) - resampled to 30m
- **Advantages**: Simple, established algorithm
- **Limitations**: No split-window option for atmospheric correction

### Landsat 8/9 (Dual Thermal Bands)

- **Thermal Bands**: B10 (10.6-11.2 μm), B11 (11.5-12.5 μm)
- **Resolution**: 100m - resampled to 30m
- **Current Approach**: Uses only B10 due to B11 calibration issues
- **Advantages**: Potential for split-window algorithm (future enhancement)
- **Limitations**: B11 has stray light issues, not recommended for LST

## Module Reference

**Primary Module**: `SMWalgorithm.js`

**Key Functions**:
- `addTPW(image)`: Adds TPW band to image
- `addCoefficients(image)`: Adds A, B, C coefficient bands based on TPW
- `calculateLST(image)`: Applies SMW formula to compute LST

**Usage Example**:
```javascript
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');

var lst_collection = LandsatLST.collection(
  'L8',                    // Satellite
  '2020-01-01',           // Start date
  '2020-12-31',           // End date
  geometry,               // Region of interest
  'ndvi'                  // Emissivity method
);

// Result: ImageCollection with 'LST' band in Kelvin
```

## References

1. Ermida, S. L., Soares, P., Mantas, V., Göttsche, F. M., & Trigo, I. F. (2020). Google Earth Engine open-source code for Land Surface Temperature estimation from the Landsat series. *Remote Sensing*, 12(9), 1471. https://doi.org/10.3390/rs12091471

2. Jiménez-Muñoz, J. C., & Sobrino, J. A. (2003). A generalized single-channel method for retrieving land surface temperature from remote sensing data. *Journal of Geophysical Research: Atmospheres*, 108(D22).

3. USGS Landsat Collection 2 documentation: https://www.usgs.gov/landsat-missions/landsat-collection-2

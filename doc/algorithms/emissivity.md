# Emissivity Calculation

## Overview

Surface emissivity is a critical parameter for LST retrieval, representing the efficiency of a surface in emitting thermal radiation. The application supports two methods for calculating emissivity:

1. **ASTER GED Method**: Uses measured spectral emissivity from ASTER Global Emissivity Database
2. **NDVI Method**: Derives emissivity from vegetation indices (NDVI and FVC)

## Method 1: ASTER GED-Based Emissivity

### Data Source

**Dataset**: NASA ASTER Global Emissivity Database v3 (AG100_003)

**Collection ID**: `NASA/ASTER_GED/AG100_003`

### Process

#### 1. Load ASTER GED

```javascript
var aster_ged = ee.Image('NASA/ASTER_GED/AG100_003')
  .clip(geometry);
```

#### 2. Extract Relevant Bands

ASTER provides emissivity in 5 thermal bands (10-14):

```javascript
var emissivity_bands = [
  'emissivity_band10',  // 8.125-8.475 μm
  'emissivity_band11',  // 8.475-8.825 μm
  'emissivity_band12',  // 8.925-9.275 μm
  'emissivity_band13',  // 10.25-10.95 μm
  'emissivity_band14'   // 10.95-11.65 μm
];
```

#### 3. Match to Landsat Thermal Band

**For Landsat 4/5/7** (B6: 10.4-12.5 μm):
- Use weighted average of ASTER bands 13 and 14
- Weights based on spectral overlap

**For Landsat 8/9** (B10: 10.6-11.2 μm):
- Primarily use ASTER band 13 (best spectral match)
- Minor contribution from band 14

```javascript
function asterToLandsatEmissivity(aster_image, sensor) {
  var emissivity;

  if (sensor === 'L4' || sensor === 'L5' || sensor === 'L7') {
    // Weighted average for broader thermal band
    emissivity = aster_image.select('emissivity_band13').multiply(0.6)
      .add(aster_image.select('emissivity_band14').multiply(0.4));
  } else if (sensor === 'L8' || sensor === 'L9') {
    // Mostly band 13 for narrower thermal band
    emissivity = aster_image.select('emissivity_band13').multiply(0.85)
      .add(aster_image.select('emissivity_band14').multiply(0.15));
  }

  return emissivity.rename('emissivity');
}
```

#### 4. Apply to Landsat Image

```javascript
// Add emissivity band to each Landsat image
var landsat_with_emissivity = landsat_collection.map(function(image) {
  var emissivity = asterToLandsatEmissivity(aster_ged, sensor);
  return image.addBands(emissivity);
});
```

### Advantages

- Based on actual measured emissivity from ASTER sensor
- High accuracy for most land cover types
- Validated against ground measurements

### Limitations

- **Incomplete coverage**: Gaps in some regions (especially high latitudes, some mountainous areas)
- **Static data**: Averaged 2000-2008, no temporal variation
- **Cloud contamination**: Some areas affected by persistent cloud cover during ASTER acquisition
- **Resolution**: 100m native, resampled to 30m (potential spatial smoothing)

### Typical Emissivity Values

| Surface Type | Emissivity Range |
|--------------|------------------|
| Water | 0.98 - 0.99 |
| Dense vegetation | 0.97 - 0.99 |
| Bare soil | 0.92 - 0.97 |
| Urban/Built-up | 0.88 - 0.95 |
| Desert sand | 0.90 - 0.94 |
| Snow/Ice | 0.96 - 0.99 |

## Method 2: NDVI-Based Emissivity

### Overview

This method derives emissivity from vegetation indices when ASTER data is unavailable or unreliable. It's based on the empirical relationship between NDVI, Fractional Vegetation Cover (FVC), and emissivity.

### Process

#### 1. Calculate NDVI

**Landsat 4/5/7**:
```javascript
var ndvi = image.normalizedDifference(['B4', 'B3']).rename('NDVI');
// NIR=B4, Red=B3
```

**Landsat 8/9**:
```javascript
var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
// NIR=B5, Red=B4
```

**Formula**:
```
NDVI = (NIR - Red) / (NIR + Red)
```

#### 2. Calculate Fractional Vegetation Cover (FVC)

```javascript
// NDVI thresholds
var ndvi_soil = 0.2;   // Bare soil
var ndvi_veg = 0.7;    // Dense vegetation

// Calculate FVC
var fvc = image.expression(
  '((ndvi - ndvi_s) / (ndvi_v - ndvi_s)) ** 2', {
    'ndvi': ndvi,
    'ndvi_s': ndvi_soil,
    'ndvi_v': ndvi_veg
  }
).clamp(0, 1).rename('FVC');
```

**Formula**:
```
FVC = ((NDVI - NDVI_soil) / (NDVI_veg - NDVI_soil))²
```

Where:
- `NDVI_soil = 0.2`: Typical NDVI for bare soil
- `NDVI_veg = 0.7`: Typical NDVI for full vegetation cover
- Result clamped to [0, 1]

#### 3. Calculate Emissivity

**Piecewise function based on NDVI ranges**:

```javascript
function calculateEmissivityNDVI(ndvi, fvc) {
  var emissivity = ee.Image(0);

  // Water, snow, bare soil (NDVI < 0.2)
  var em_low = ee.Image(0.97);

  // Mixed pixels (0.2 ≤ NDVI ≤ 0.7)
  var em_soil = 0.97;
  var em_veg = 0.99;
  var em_mixed = ee.Image(em_soil)
    .add(fvc.multiply(em_veg - em_soil));

  // Dense vegetation (NDVI > 0.7)
  var em_high = ee.Image(0.99);

  // Apply piecewise function
  emissivity = emissivity
    .where(ndvi.lt(0.2), em_low)
    .where(ndvi.gte(0.2).and(ndvi.lte(0.7)), em_mixed)
    .where(ndvi.gt(0.7), em_high);

  return emissivity.rename('emissivity');
}
```

**Mathematical Expression**:

```
ε = 0.97                                       (NDVI < 0.2)

ε = 0.97 + FVC × (0.99 - 0.97)                (0.2 ≤ NDVI ≤ 0.7)
  = 0.97 + FVC × 0.02

ε = 0.99                                       (NDVI > 0.7)
```

Where:
- `ε_soil = 0.97`: Emissivity of bare soil/water
- `ε_veg = 0.99`: Emissivity of full vegetation cover

#### 4. Apply to Image Collection

```javascript
var landsat_with_emissivity = landsat_collection.map(function(image) {
  var ndvi = calculateNDVI(image, sensor);
  var fvc = calculateFVC(ndvi);
  var emissivity = calculateEmissivityNDVI(ndvi, fvc);
  return image.addBands([ndvi, fvc, emissivity]);
});
```

### Advantages

- **Complete coverage**: Works anywhere with valid Landsat imagery
- **Temporal variation**: Captures seasonal changes in vegetation
- **No external dependencies**: Derived directly from Landsat bands
- **Robust**: Handles regions where ASTER data is missing

### Limitations

- **Simplified model**: Assumes only soil and vegetation endmembers
- **Constant endmember values**: ε_soil=0.97, ε_veg=0.99 may not suit all regions
- **Urban areas**: May underestimate emissivity for built-up surfaces
- **Water bodies**: Fixed ε=0.97 may differ from actual water emissivity (~0.98-0.99)
- **Accuracy**: ±0.01-0.02 emissivity uncertainty → ±1-2K LST error

### Validation

Comparison with ASTER GED shows:
- RMSE: ~0.015 for mixed vegetation/soil pixels
- Better agreement in vegetated areas (RMSE < 0.01)
- Larger differences in urban and bare soil areas (RMSE up to 0.025)

## Method Comparison

| Aspect | ASTER GED | NDVI-Based |
|--------|-----------|------------|
| **Coverage** | Incomplete | Complete |
| **Temporal variation** | None (static) | Yes (seasonal) |
| **Accuracy** | Higher (±0.01) | Moderate (±0.015) |
| **Urban areas** | Better | Underestimates |
| **Vegetation** | Good | Good |
| **Water bodies** | Excellent | Acceptable |
| **Dependencies** | ASTER dataset | Landsat bands only |
| **Recommended for** | High-accuracy LST | Areas with ASTER gaps |

## Implementation in Code

### Switching Between Methods

**ASTER Method**:
```javascript
var LandsatLST = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
var collection = LandsatLST.collection('L8', start, end, geometry, true);
// emissivityFlag = true (uses ASTER)
```

**NDVI Method**:
```javascript
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');
var collection = LandsatLST.collection('L8', start, end, geometry, 'ndvi');
// emissivityFlag = 'ndvi' (uses NDVI-based)
```

### Modules

**ASTER Method**:
- `compute_emissivity.js`: Loads ASTER GED and matches to Landsat bands

**NDVI Method**:
- `compute_NDVI.js`: Calculates NDVI for different Landsat sensors
- `compute_FVC.js`: Derives Fractional Vegetation Cover
- `compute_emissivity_ndvi.js`: Applies piecewise emissivity model
- `broadband_emiss.js`: Converts narrowband to broadband emissivity (if needed)

## Best Practices

### Method Selection

1. **Default**: Start with ASTER method for highest accuracy
2. **Gaps**: Switch to NDVI method if ASTER coverage incomplete
3. **Temporal studies**: Consider NDVI method to capture seasonal emissivity changes
4. **Urban studies**: Prefer ASTER method for better urban emissivity representation

### Quality Control

```javascript
// Check for ASTER no-data pixels
var aster_mask = aster_ged.select('emissivity_band13').mask();
var coverage_percent = aster_mask.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: geometry,
  scale: 100
}).get('emissivity_band13');

print('ASTER coverage:', ee.Number(coverage_percent).multiply(100), '%');

// If coverage < 80%, consider NDVI method
if (coverage_percent < 0.8) {
  print('Warning: Low ASTER coverage. Consider using NDVI method.');
}
```

### Hybrid Approach

For regions with partial ASTER coverage:

```javascript
// Use ASTER where available, NDVI where not
var emissivity_aster = asterToLandsatEmissivity(aster_ged, sensor);
var emissivity_ndvi = calculateEmissivityNDVI(ndvi, fvc);

var emissivity_hybrid = emissivity_aster
  .unmask(emissivity_ndvi);  // Fill ASTER gaps with NDVI-based values
```

## References

1. Sobrino, J. A., & Raissouni, N. (2000). Toward remote sensing methods for land cover dynamic monitoring: Application to Morocco. *International Journal of Remote Sensing*, 21(2), 353-366.

2. Valor, E., & Caselles, V. (1996). Mapping land surface emissivity from NDVI: Application to European, African, and South American areas. *Remote Sensing of Environment*, 57(3), 167-184.

3. Hulley, G. C., & Hook, S. J. (2009). Intercomparison of versions 4, 4.1 and 5 of the MODIS Land Surface Temperature and Emissivity products and validation with laboratory measurements of sand samples from the Namib desert, Namibia. *Remote Sensing of Environment*, 113(6), 1313-1318.

4. Gillespie, A., et al. (1998). A temperature and emissivity separation algorithm for Advanced Spaceborne Thermal Emission and Reflection Radiometer (ASTER) images. *IEEE Transactions on Geoscience and Remote Sensing*, 36(4), 1113-1126.

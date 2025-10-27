# External Dependencies

## GEE User Assets

These assets are imported via `require()` function in the main scripts.

### Landsat LST Modules

#### 1. ASTER Method Module
```javascript
var LandsatLST = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
```

**Source**: Sofia Ermida's Landsat SMW LST repository

**Purpose**: Original implementation using ASTER Global Emissivity Database

**Key Functions**:
- `collection(satellite, start, end, geometry, useEmissivity)`
- Thermal band processing
- ASTER GED integration

**Reference**: [Ermida et al. (2020)](https://doi.org/10.3390/rs12091471)

#### 2. NDVI Method Module (Custom Implementation)
```javascript
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');
```

**Source**: Custom fork with NDVI-based emissivity support

**Repository**: https://code.earthengine.google.com/?accept_repo=users/yyyh48201/GEE_landsat_lst

**Purpose**: Extended version supporting NDVI/FVC-based emissivity calculation

**Key Modules**:
- `Landsat_LST_v2.js` - Main collection builder with dual emissivity support
- `compute_emissivity_ndvi.js` - NDVI/FVC-based emissivity calculation
- `compute_emissivity.js` - ASTER GED-based emissivity
- `compute_FVC.js` - Fractional Vegetation Cover calculation
- `compute_NDVI.js` - NDVI calculation for different Landsat generations
- `SMWalgorithm.js` - Statistical Mono-Window algorithm
- `broadband_emiss.js` - Broadband emissivity conversion

**Key Features**:
- Support for `emissivityFlag = 'ndvi'` parameter
- Automatic band selection for different Landsat sensors
- Robust alternative when ASTER data unavailable

### Administrative Boundary Assets

```javascript
// Province boundaries
var province_boundary = ee.FeatureCollection('projects/ee-tilmacatanla/assets/boundry/province');

// City boundaries
var city_boundary = ee.FeatureCollection('projects/ee-tilmacatanla/assets/boundry/city');

// County boundaries
var county_boundary = ee.FeatureCollection('projects/ee-tilmacatanla/assets/boundry/county');
```

**Source**: Custom uploaded assets for Chinese administrative divisions

**Purpose**: Enable region selection by province/city/county names

**Structure**:
- Province level: 34 provinces/autonomous regions/municipalities
- City level: 334 prefecture-level cities
- County level: 2,851 county-level divisions

**Properties**:
- `name`: Administrative division name (Chinese characters)
- `geometry`: Boundary polygon

**Usage Example**:
```javascript
var province_name = '广东省';
var geometry = province_boundary.filter(ee.Filter.eq('name', province_name)).geometry();
```

## GEE Platform Datasets

These datasets are accessed via standard GEE ImageCollection/Image IDs.

### 1. Landsat Collection 2 Level 2

#### Surface Reflectance Collections

**Landsat 4-5 TM**:
- ID: `LANDSAT/LT04/C02/T1_L2`, `LANDSAT/LT05/C02/T1_L2`
- Bands: SR_B1-B7, QA_PIXEL
- Period: 1982-2012 (L4), 1984-2013 (L5)
- Resolution: 30m

**Landsat 7 ETM+**:
- ID: `LANDSAT/LE07/C02/T1_L2`
- Bands: SR_B1-B7, QA_PIXEL
- Period: 1999-present
- Resolution: 30m
- Note: SLC-off after May 2003

**Landsat 8-9 OLI/TIRS**:
- ID: `LANDSAT/LC08/C02/T1_L2`, `LANDSAT/LC09/C02/T1_L2`
- Bands: SR_B1-B7, QA_PIXEL
- Period: 2013-present (L8), 2021-present (L9)
- Resolution: 30m

#### Top of Atmosphere (TOA) Collections

**Purpose**: Used for thermal band brightness temperature calculation

**Landsat 4-5 TM**:
- ID: `LANDSAT/LT04/C02/T1_TOA`, `LANDSAT/LT05/C02/T1_TOA`
- Thermal band: B6

**Landsat 7 ETM+**:
- ID: `LANDSAT/LE07/C02/T1_TOA`
- Thermal band: B6_VCID_1, B6_VCID_2

**Landsat 8-9 OLI/TIRS**:
- ID: `LANDSAT/LC08/C02/T1_TOA`, `LANDSAT/LC09/C02/T1_TOA`
- Thermal bands: B10, B11 (B10 used for LST)

**Key Bands**:
- Thermal bands: Brightness temperature in Kelvin
- QA_PIXEL: Quality assessment flags for cloud masking

### 2. NCEP Total Precipitable Water (TPW)

**Dataset**: NCEP/NCAR Reanalysis Data

**ID**: `NCEP_RE/surface_wv`

**Purpose**: Atmospheric water vapor content for LST correction

**Band**: `pr_wtr` (Total Precipitable Water, kg/m²)

**Temporal Resolution**: 6-hour intervals (00:00, 06:00, 12:00, 18:00 UTC)

**Spatial Resolution**: ~2.5° × 2.5° (resampled to Landsat resolution)

**Period**: 1948-present

**Usage**:
- Interpolated to Landsat image acquisition time
- Used to determine A, B, C coefficients in SMW algorithm
- Critical for accurate LST retrieval

### 3. ASTER Global Emissivity Database (GED)

**Dataset**: ASTER Global Emissivity Database v3

**ID**: `NASA/ASTER_GED/AG100_003`

**Purpose**: Surface emissivity for thermal band conversion

**Bands**:
- `emissivity_band10` - `emissivity_band14`: ASTER TIR bands (8-12 μm)
- Narrowband emissivity for different surface types

**Temporal Resolution**: Static (averaged 2000-2008)

**Spatial Resolution**: 100m (resampled to 30m for Landsat)

**Coverage**: Global land areas (excluding some polar regions)

**Limitations**:
- Incomplete coverage in some regions
- No temporal variation (static climatology)
- May have gaps in mountainous or cloudy regions

**Fallback**: NDVI-based emissivity when ASTER data unavailable

## Dependency Management

### Version Compatibility

**GEE API**: Designed for current Earth Engine JavaScript API (as of 2024)

**Landsat Collection**: Collection 2 Level 2 (C02/T1_L2)

**Module Versioning**: Custom modules use v2 suffix for NDVI support

### Updating Dependencies

**To switch emissivity methods**:
```javascript
// ASTER method
var LandsatLST = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');
var emissivityFlag = true;

// NDVI method
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js');
var emissivityFlag = 'ndvi';
```

**To update custom modules**:
1. Edit files in local `GEE_landsat_lst/modules/` folder
2. Commit changes to GEE repository
3. Scripts using `require()` automatically use updated version

### Access Requirements

**Permissions Needed**:
- GEE account with access to public datasets (default)
- Read access to Sofia Ermida's public repository
- Read access to custom module repository (`users/yyyh48201/GEE_landsat_lst`)
- Read access to boundary assets (`projects/ee-tilmacatanla/assets/boundry/*`)

**To request access**:
- Custom modules: Contact repository owner or fork repository
- Boundary assets: Contact asset owner or use alternative region definitions

## Data Availability

**Temporal Coverage**:
- Landsat 4: 1982-1993
- Landsat 5: 1984-2013
- Landsat 7: 1999-present (SLC-off after 2003)
- Landsat 8: 2013-present
- Landsat 9: 2021-present

**Spatial Coverage**:
- Global (WRS-2 path/row system)
- 16-day repeat cycle per satellite

**Typical Image Availability**:
- Clear conditions: 10-50 images per year per location
- Cloudy regions: 5-20 usable images per year
- Depends heavily on cloud cover filtering settings

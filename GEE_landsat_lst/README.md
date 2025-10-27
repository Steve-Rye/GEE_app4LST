# GEE_landsat_lst Module

## Overview

This folder contains custom modules for Landsat Land Surface Temperature (LST) analysis using Google Earth Engine. The code is based on and references the [Landsat_SMW_LST GitHub project](https://github.com/sofiaermida/Landsat_SMW_LST.git) by Sofia Ermida.

## Relationship to Reference Implementation

- **Reference Project**: https://github.com/sofiaermida/Landsat_SMW_LST.git

## Key Differences from Reference Implementation

The main enhancement in this custom implementation is the addition of NDVI/FVC-based emissivity calculation:

- **Landsat_LST_v2.js**: Extended version of the original `Landsat_LST.js` that supports both ASTER GED and NDVI-based emissivity methods
- **compute_emissivity_ndvi.js**: New module for calculating emissivity from NDVI/FVC, providing a robust alternative for regions with incomplete ASTER GED coverage

## Module Files

### Core Modules
- `Landsat_LST_v2.js` - Main collection builder with dual emissivity support
- `compute_emissivity_ndvi.js` - NDVI/FVC-based emissivity calculation

### Shared Modules (from reference implementation)
- `SMW_coefficients.js` - Statistical Mono-Window algorithm coefficients
- `SMWalgorithm.js` - SMW LST calculation algorithm
- `NCEP_TPW.js` - Total Precipitable Water data retrieval
- `ASTER_bare_emiss.js` - ASTER bare soil emissivity
- `cloudmask.js` - Cloud masking utilities
- `compute_FVC.js` - Fractional Vegetation Cover calculation
- `compute_NDVI.js` - NDVI calculation
- `compute_emissivity.js` - ASTER GED-based emissivity calculation

## Usage in Scripts

Import modules using the GEE repository path:

```javascript
// Custom NDVI-based implementation
var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2');

// Use NDVI emissivity method
var collection = LandsatLST.collection('L8', startDate, endDate, geometry, 'ndvi');

// Or use ASTER emissivity method
var collection = LandsatLST.collection('L8', startDate, endDate, geometry, true);
```

## Reference

For the original implementation and methodology, refer to:
- Sofia Ermida's repository: https://github.com/sofiaermida/Landsat_SMW_LST.git

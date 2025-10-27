# Architecture Overview

## Project Structure

This Google Earth Engine (GEE) JavaScript application is designed for Landsat Land Surface Temperature (LST) analysis with support for batch processing across multiple time periods.

## Main Scripts

### landsat_lst_analysis.js
Batch processing script with hardcoded configuration for automated LST analysis.

**Use case**: Automated, reproducible LST analysis for multiple time periods and regions.

**Features**:
- Hardcoded configuration for consistent processing
- Batch time period processing
- Automated export to GeoTIFF and CSV

### landsat_lst_analysis_ui.js
Interactive UI version with drawing tools, parameter controls, and real-time visualization.

**Use case**: Interactive exploration, parameter tuning, and ad-hoc analysis.

**Features**:
- Drawing tools for custom regions
- Parameter control panels
- Real-time visualization
- Export functionality

## Module Structure

```
GEE_landsat_lst/modules/          # Custom implementation (supports NDVI method)
├── Landsat_LST_v2.js             # Main collection builder with dual emissivity support
├── compute_emissivity_ndvi.js    # NDVI/FVC-based emissivity (robust alternative)
├── compute_emissivity.js         # ASTER GED-based emissivity
├── broadband_emiss.js            # Broadband emissivity calculation
├── compute_FVC.js                # Fractional Vegetation Cover calculation
├── compute_NDVI.js               # NDVI calculation
└── SMWalgorithm.js               # Statistical Mono-Window algorithm implementation
```

## Design Principles

1. **Dual Emissivity Support**: Both ASTER GED and NDVI-based methods to handle incomplete ASTER coverage
2. **Modular Architecture**: Separate modules for each processing step enable easy maintenance and testing
3. **Batch Processing**: Automated iteration through multiple time periods with consistent configuration
4. **Cloud Infrastructure**: Entirely server-side execution on GEE platform, no local dependencies
5. **Flexible Region Selection**: Support for custom geometries, uploaded assets, and administrative boundaries

## Deployment Model

**No local build/test required** - This runs entirely on Google Earth Engine's cloud infrastructure.

- **Development**: Copy scripts to [GEE Code Editor](https://code.earthengine.google.com)
- **Quick Start**: Use the [pre-configured link](https://code.earthengine.google.com/4a36ef5888d417f26b03974c2aa643a0)
- **Production**: Deploy `landsat_lst_analysis_ui.js` as a GEE App for public access
- **Module Deployment**: The `GEE_landsat_lst` folder is deployed as a GEE repository at https://code.earthengine.google.com/?accept_repo=users/yyyh48201/GEE_landsat_lst

All code executes server-side on GEE - there are no local dependencies, build steps, or test commands.

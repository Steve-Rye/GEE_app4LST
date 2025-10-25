# AGENTS.md - GEE_app4LST Project Guide

## Build/Test Commands
- **Run**: This is a Google Earth Engine (GEE) JavaScript project - scripts run in GEE Code Editor at https://code.earthengine.google.com
- **No local build/test**: Code is executed server-side on GEE infrastructure
- **Deployment**: Copy scripts to GEE Code Editor or use GEE API

## Architecture & Structure
- **Main Scripts**: 
  - `landsat_lst_analysis.js`: Batch LST processing with configurable parameters
  - `landsat_lst_analysis_ui.js`: Interactive UI version for GEE App deployment
- **External Dependencies**: 
  - `users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js` (ASTER GED method)
  - `users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js` (NDVI/FVC method)
  - Chinese administrative boundary assets: `projects/ee-tilmacatanla/assets/boundry/*`
- **Data Flow**: Configuration → Geometry Resolution → Satellite Collection → Cloud Filtering → LST Calculation → Visualization → Export

## Code Style & Conventions
- **Language**: Google Earth Engine JavaScript (server-side)
- **Comments**: Bilingual (Chinese/English), use Chinese for user-facing messages
- **Naming**: camelCase for variables/functions, UPPERCASE for constants
- **Functions**: Modular helper functions (padZero, repeatStr, calcBeijingTime, etc.)
- **Error Handling**: Check for empty collections, validate geometry, handle missing data gracefully

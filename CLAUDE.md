# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Earth Engine (GEE) JavaScript application for Landsat Land Surface Temperature (LST) analysis. It supports batch processing across multiple time periods with two emissivity calculation methods (ASTER GED-based and NDVI/FVC-based), designed to handle regions where ASTER data coverage is incomplete.

## Deployment & Execution

**No local build/test required** - This runs entirely on Google Earth Engine's cloud infrastructure.

- **Development**: Copy scripts to [GEE Code Editor](https://code.earthengine.google.com)
- **Quick Start**: Use the [pre-configured link](https://code.earthengine.google.com/4a36ef5888d417f26b03974c2aa643a0)
- **Production**: Deploy `landsat_lst_analysis_ui.js` as a GEE App for public access
- **Module Deployment**: The `GEE_landsat_lst` folder is deployed as a GEE repository at https://code.earthengine.google.com/?accept_repo=users/yyyh48201/GEE_landsat_lst

All code executes server-side on GEE - there are no local dependencies, build steps, or test commands.

## Documentation Structure

```
doc/
├── README.md                          # Documentation index and navigation
│
├── architecture/                      # System Architecture
│   ├── overview.md                   # Main scripts, module structure, deployment model
│   ├── data-pipeline.md              # Complete processing workflow (Configuration → Export)
│   └── external-dependencies.md      # GEE assets, platform datasets, module versions
│
├── algorithms/                        # Core Algorithms
│   ├── lst-calculation.md            # Statistical Mono-Window (SMW) algorithm with formulas
│   ├── emissivity.md                 # ASTER GED vs NDVI-based methods (detailed comparison)
│   └── filtering-and-scoring.md      # Outlier filtering (z-score/IQR) and cloud scoring
│
├── guides/                            # User Guides
│   ├── getting-started.md            # Quick start (3-step setup), first analysis, troubleshooting
│   ├── common-modifications.md       # 20+ customization scenarios (time periods, regions, parameters)
│   └── visualization.md              # Map layers, color palettes, legends, histograms, charts
│
└── reference/                         # Technical Reference
    ├── module-functions.md           # Complete API reference for all functions
    ├── file-naming.md                # Output file naming patterns and examples
    └── technical-notes.md            # Band mapping, resolution, CRS, known issues

Other Documentation:
README.md                          # Quick start guide (3-step setup)
```

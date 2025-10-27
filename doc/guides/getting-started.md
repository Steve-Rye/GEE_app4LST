# Getting Started

## Quick Start

### 3-Step Setup

#### 1. Access Google Earth Engine Code Editor

Open your web browser and navigate to:
```
https://code.earthengine.google.com
```

**Requirements**:
- Google account with Earth Engine access
- Modern web browser (Chrome, Firefox, Edge, Safari)

**New to GEE?** Sign up at https://earthengine.google.com/signup

#### 2. Load the Pre-configured Script

Click this link to load the LST analysis UI:
```
https://code.earthengine.google.com/4a36ef5888d417f26b03974c2aa643a0
```

**Alternative**: Copy-paste the code from [`landsat_lst_analysis_ui.js`](../../landsat_lst_analysis_ui.js) into the Code Editor.

#### 3. Run the Script

Click the **Run** button at the top of the code editor.

The interactive UI will load in the right panel with:
- Map canvas for drawing regions
- Control panels for parameters
- Output display area

**That's it!** No installation, build, or dependencies required.

---

## Choosing Your Script

The project provides two main scripts for different use cases:

### Interactive UI Version (Recommended for Beginners)

**File**: `landsat_lst_analysis_ui.js`

**Best for**:
- First-time users exploring the tool
- Ad-hoc analysis of custom regions
- Parameter experimentation
- Interactive visualization

**Features**:
- Drawing tools for custom regions
- Dropdown menus for parameter selection
- Real-time preview
- Single-period processing
- Manual export triggers

**Workflow**:
1. Draw or select region
2. Set date range and parameters
3. Click "Run Analysis"
4. View results on map
5. Export if satisfied

### Batch Processing Script (For Production)

**File**: `landsat_lst_analysis.js`

**Best for**:
- Automated batch processing of multiple time periods
- Consistent, reproducible analysis
- Large-scale studies
- Scheduled/repeated runs

**Features**:
- Hardcoded configuration at top of script
- Loops through multiple time periods automatically
- Batch export of all results
- Minimal user interaction needed

**Workflow**:
1. Edit configuration section (lines 10-50)
2. Click "Run"
3. Wait for processing
4. All results exported to Google Drive automatically

---

## Your First Analysis

### Using the Interactive UI

#### Step 1: Define Region of Interest

**Option A: Draw Custom Region**
1. Click the **Draw a rectangle** tool in the map toolbar
2. Draw a box around your area of interest
3. The region will be highlighted in yellow

**Option B: Select Administrative Boundary**
1. Use the **Province/City/County** dropdown menus
2. Select from Chinese administrative divisions
3. The boundary will display on the map

**Option C: Upload Asset**
1. Upload shapefile to GEE Assets (Asset → Upload)
2. In the script, define:
   ```javascript
   var table = ee.FeatureCollection('users/your/asset');
   ```

#### Step 2: Set Time Period

1. Locate the **Date Range** panel
2. Set **Start Date**: e.g., `2020-01-01`
3. Set **End Date**: e.g., `2020-12-31`

**Tips**:
- Shorter periods (monthly/seasonal) process faster
- Longer periods (annual) may have more cloud-free images
- Consider local climate (dry season = less clouds)

#### Step 3: Configure Parameters

**Cloud Cover Range**:
- **Min**: `0` (%)
- **Max**: `20` (%) - adjust based on data availability

**Emissivity Method**:
- **ASTER**: High accuracy, may have gaps
- **NDVI**: Complete coverage, slightly lower accuracy

**Statistical Aggregation**:
- **mean**: Average LST across all images
- **max**: Warmest LST (useful for heat waves)
- **min**: Coolest LST (useful for cold events)
- **score_first**: Best cloud-free image (single snapshot)

**Satellites**:
- Check boxes for Landsat 4/5/7/8/9
- More satellites = more images (recommended: all)

#### Step 4: Run Analysis

1. Click the **Run Analysis** button
2. Wait for processing (1-5 minutes depending on region size and time period)
3. Results appear on map with:
   - LST layer (blue = cold, red = hot)
   - Region boundary
   - Histogram chart

#### Step 5: Export Results

1. Go to the **Tasks** tab (top-right of Code Editor)
2. You'll see two export tasks:
   - `{filename}_LST.tif` - GeoTIFF raster
   - `{filename}_metadata.csv` - Image metadata
3. Click **Run** for each task
4. Choose Google Drive folder
5. Click **Submit**

**Export time**: 5-30 minutes depending on region size and resolution.

---

## Your First Batch Analysis

### Using the Batch Processing Script

#### Step 1: Open and Configure Script

Open `landsat_lst_analysis.js` in the Code Editor.

#### Step 2: Edit Configuration Section (lines 10-50)

```javascript
// ==================== CONFIGURATION ====================

// Define region
var province_name = '广东省';  // Province name (or null)
var city_name = '广州市';      // City name (or null)
var county_name = null;        // County name (or null)

// Or use custom geometry (uncomment to use)
// var table = ee.Geometry.Rectangle([113.0, 22.5, 114.0, 23.5]);

// Time periods to process
var timePeriods = [
  {start: '2020-01-01', end: '2020-03-31'},  // Q1 2020
  {start: '2020-04-01', end: '2020-06-30'},  // Q2 2020
  {start: '2020-07-01', end: '2020-09-30'},  // Q3 2020
  {start: '2020-10-01', end: '2020-12-31'}   // Q4 2020
];

// Cloud cover range (%)
var cloud_min = 0;
var cloud_max = 20;

// Emissivity method ('NDVI' or 'ASTER')
var method = 'NDVI';

// Statistical aggregation ('mean', 'max', 'min', 'score_first')
var stat_type = 'mean';

// Enabled satellites
var use_L4 = true;
var use_L5 = true;
var use_L7 = true;
var use_L8 = true;
var use_L9 = true;

// ==================== END CONFIGURATION ====================
```

**Key parameters to modify**:
- `province_name`, `city_name`, `county_name`: Your region
- `timePeriods`: Array of {start, end} date pairs
- `method`: 'NDVI' or 'ASTER'
- `stat_type`: 'mean', 'max', 'min', or 'score_first'

#### Step 3: Run Script

1. Click **Run** button
2. Script will process all time periods automatically
3. Watch the **Console** for progress messages
4. Map will update with each time period's result

#### Step 4: Monitor and Export

1. Go to **Tasks** tab
2. You'll see multiple export tasks (2 per time period):
   - GeoTIFF rasters
   - CSV metadata files
3. Click **Run All** to export all results
4. Confirm Google Drive folder
5. Click **Submit**

**Processing time**: Depends on number of periods and region size. Expect 2-5 minutes per period.

---

## Understanding Your Results

### GeoTIFF Raster

**File naming**:
```
{region}_{start}_{end}_LST_c{cloud_min}-{cloud_max}_{stat_type}_{method}.tif
```

Example: `广州市_2020-01-01_2020-03-31_LST_c0-20_mean_NDVI.tif`

**File details**:
- **Format**: GeoTIFF
- **Spatial Resolution**: 30m
- **Units**: Degrees Celsius (°C)
- **CRS**: WGS84 UTM (varies by region)
- **Extent**: ROI + 5km buffer
- **No-data value**: Masked pixels

**Opening the file**:
- GIS software: QGIS, ArcGIS, ENVI, ERDAS
- Python: `rasterio`, `gdal`, `xarray`
- R: `raster`, `terra`, `stars`

### CSV Metadata

**Columns**:
- `IMAGE_ID`: Landsat product ID
- `SATELLITE`: Spacecraft (LANDSAT_4/5/7/8/9)
- `ACQUISITION_DATE`: Date (YYYY-MM-DD)
- `ACQUISITION_TIME_UTC`: Time in UTC
- `ACQUISITION_TIME_UTC8`: Time in UTC+8 (Beijing Time)
- `CLOUD_COVER_SCENE`: Scene-level cloud cover (%)
- `CLOUD_COVER_REGION`: Region-specific cloud cover (%)
- `SUN_ELEVATION`: Solar elevation angle (degrees)
- `SUN_AZIMUTH`: Solar azimuth angle (degrees)
- `WRS_PATH`: Landsat WRS path
- `WRS_ROW`: Landsat WRS row
- `PROCESSING_LEVEL`: Landsat processing level (L2)

**Use cases**:
- Quality control: Check cloud cover and solar angles
- Temporal analysis: Identify acquisition dates/times
- Scene tracking: Use path/row to find overlapping images
- Reproducibility: Document exact input images used

---

## Troubleshooting

### No Data / Empty Collection

**Symptom**: Console message "No data for period: YYYY-MM-DD to YYYY-MM-DD"

**Causes**:
1. Too restrictive cloud cover threshold
2. No Landsat coverage for that region/time
3. All images masked by quality filters

**Solutions**:
- Increase `cloud_max` (e.g., from 20% to 40%)
- Enable more satellites (check all Landsat 4-9 boxes)
- Expand time period (e.g., quarterly instead of monthly)
- Check Landsat acquisition schedule for your region

### ASTER Gaps / Missing Emissivity

**Symptom**: Patchy LST results with no-data gaps

**Cause**: ASTER GED incomplete coverage in your region

**Solution**: Switch to NDVI method
```javascript
var method = 'NDVI';  // or emissivityFlag = 'ndvi'
```

### Memory Limit Exceeded

**Symptom**: "User memory limit exceeded" error

**Causes**:
1. Region too large
2. Time period too long (too many images)
3. High resolution export

**Solutions**:
- Reduce region size (split into tiles)
- Shorten time periods (monthly instead of annual)
- Lower export resolution (e.g., 100m instead of 30m)
- Use aggregation before export (temporal mean first)

### Slow Processing

**Symptom**: Script takes very long to run

**Optimization tips**:
1. **Use score_first for large time periods**: Selects single image instead of averaging
2. **Filter satellites**: Disable older Landsat 4/5 if not needed
3. **Reduce export scale**: 60m or 100m instead of 30m
4. **Smaller buffer**: Reduce from 5km to 1km if edges not important

---

## Next Steps

### Learn More

- [**Common Modifications**](common-modifications.md): Customize parameters and processing
- [**Visualization Guide**](visualization.md): Adjust map layers and color schemes
- [**Architecture**](../architecture/data-pipeline.md): Understand the processing pipeline
- [**Algorithms**](../algorithms/lst-calculation.md): Deep dive into LST calculation methods

### Advanced Usage

1. **Temporal Trend Analysis**: Process monthly LST for multiple years, analyze trends
2. **Urban Heat Island Studies**: Compare urban vs. rural LST patterns
3. **Agricultural Monitoring**: Track crop temperature stress using LST time series
4. **Climate Change Studies**: Analyze long-term LST changes (Landsat 4 1982 - present)

### Share Your Results

- **Publish**: Deploy `landsat_lst_analysis_ui.js` as a public GEE App
- **Collaborate**: Share script links with colleagues
- **Cite**: Reference original SMW algorithm paper (Ermida et al. 2020)

---

## Support

### Getting Help

- **GEE Documentation**: https://developers.google.com/earth-engine
- **GEE Forum**: https://groups.google.com/g/google-earth-engine-developers
- **GEE Tutorials**: https://developers.google.com/earth-engine/tutorials

### Reporting Issues

If you encounter bugs or have feature requests, please:
1. Check existing documentation
2. Search GEE forum for similar issues
3. Contact the repository maintainer with detailed description

### Contributing

Contributions welcome! Areas for improvement:
- Additional emissivity methods
- Support for other satellites (Sentinel-3, MODIS)
- Improved cloud masking algorithms
- Performance optimizations

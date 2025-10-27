# File Naming Convention

This document describes the auto-generated file naming scheme for LST outputs.

## Standard Naming Pattern

All exported files follow this consistent pattern:

```
{layerName}_{startDate}_{endDate}_LST_c{cloudMin}-{cloudMax}_{statType}_{method}.{extension}
```

### Components

#### 1. layerName

**Description**: Region identifier

**Sources**:
- Administrative boundary name (province/city/county)
- Custom name from `table` variable
- User-defined string

**Examples**:
- `广州市` (Guangzhou City)
- `北京市` (Beijing)
- `珠江三角洲` (Pearl River Delta)
- `study_area_01`

**Character encoding**: UTF-8 (supports Chinese characters)

#### 2. startDate

**Description**: Start of time period

**Format**: `YYYY-MM-DD`

**Examples**:
- `2020-01-01` (January 1, 2020)
- `2023-06-15` (June 15, 2023)

#### 3. endDate

**Description**: End of time period (inclusive)

**Format**: `YYYY-MM-DD`

**Examples**:
- `2020-12-31` (December 31, 2020)
- `2023-08-31` (August 31, 2023)

#### 4. LST

**Description**: Product type identifier (always "LST" for Land Surface Temperature)

#### 5. cloudMin and cloudMax

**Description**: Cloud cover filter range in percent

**Format**: `c{min}-{max}`

**Examples**:
- `c0-20` (0-20% cloud cover)
- `c0-10` (0-10% cloud cover)
- `c5-30` (5-30% cloud cover)

**Interpretation**: Only images with cloud cover within this range were included

#### 6. statType

**Description**: Statistical aggregation method

**Values**:
- `mean` - Temporal mean
- `max` - Maximum value
- `min` - Minimum value
- `median` - Median value
- `score_first` - Best cloud-free image
- `p90` - 90th percentile
- Custom aggregations

**Examples**:
- `mean` (most common)
- `max` (for heat wave studies)
- `score_first` (for single-image snapshots)

#### 7. method

**Description**: Emissivity calculation method

**Values**:
- `NDVI` - NDVI-based emissivity
- `ASTER` - ASTER GED-based emissivity
- `HYBRID` - Combination of ASTER and NDVI

#### 8. extension

**Description**: File format

**Values**:
- `.tif` - GeoTIFF raster (LST data)
- `.csv` - Comma-separated values (metadata)

---

## Complete Examples

### Example 1: Annual Mean LST, Guangzhou

```
广州市_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI.tif
```

**Interpretation**:
- **Region**: Guangzhou City (广州市)
- **Time period**: Full year 2020
- **Product**: Land Surface Temperature
- **Cloud filter**: 0-20% cloud cover
- **Aggregation**: Temporal mean
- **Method**: NDVI-based emissivity
- **Format**: GeoTIFF

### Example 2: Summer Maximum LST, Beijing

```
北京市_2023-06-01_2023-08-31_LST_c0-10_max_ASTER.tif
```

**Interpretation**:
- **Region**: Beijing (北京市)
- **Time period**: Summer 2023 (June-August)
- **Product**: Land Surface Temperature
- **Cloud filter**: 0-10% cloud cover (strict)
- **Aggregation**: Maximum value (hottest LST)
- **Method**: ASTER GED-based emissivity
- **Format**: GeoTIFF

### Example 3: Quarterly Best Image, Custom Region

```
study_area_A_2021-01-01_2021-03-31_LST_c0-30_score_first_NDVI.tif
```

**Interpretation**:
- **Region**: Custom study area A
- **Time period**: Q1 2021 (January-March)
- **Product**: Land Surface Temperature
- **Cloud filter**: 0-30% cloud cover (relaxed)
- **Aggregation**: Best cloud-free image (single snapshot)
- **Method**: NDVI-based emissivity
- **Format**: GeoTIFF

### Example 4: Metadata CSV

```
广州市_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI_metadata.csv
```

**Interpretation**:
- Same parameters as corresponding GeoTIFF
- `_metadata` suffix distinguishes from raster
- **Format**: CSV with image metadata

---

## File Naming in Code

### Automatic Generation

In batch processing script:

```javascript
var filename = layerName + '_' +
               period.start + '_' +
               period.end + '_LST_c' +
               cloud_min + '-' +
               cloud_max + '_' +
               stat_type + '_' +
               method;

print('Output filename:', filename);
// Output: "广州市_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI"
```

### Manual Override

To use custom filename:

```javascript
var filename = 'custom_name_LST_2020';

Export.image.toDrive({
  image: lstResult,
  description: filename,
  fileNamePrefix: filename,
  // ... other parameters
});
```

**Recommendation**: Stick to standard naming for consistency and metadata tracking

---

## Metadata CSV Structure

The companion CSV file contains detailed metadata for all images used in the analysis.

### Column Names

| Column | Description | Example |
|--------|-------------|---------|
| `IMAGE_ID` | Landsat Product ID | `LC08_123034_20200615_02_T1` |
| `SATELLITE` | Spacecraft | `LANDSAT_8` |
| `ACQUISITION_DATE` | Date (UTC) | `2020-06-15` |
| `ACQUISITION_TIME_UTC` | Time (UTC) | `03:42:15` |
| `ACQUISITION_TIME_UTC8` | Time (UTC+8) | `11:42:15` |
| `CLOUD_COVER_SCENE` | Scene cloud cover (%) | `12.5` |
| `CLOUD_COVER_REGION` | ROI cloud cover (%) | `8.3` |
| `SUN_ELEVATION` | Solar elevation (°) | `62.4` |
| `SUN_AZIMUTH` | Solar azimuth (°) | `135.2` |
| `WRS_PATH` | Landsat Path | `123` |
| `WRS_ROW` | Landsat Row | `034` |
| `PROCESSING_LEVEL` | Landsat level | `L2` |

### Example CSV Content

```csv
IMAGE_ID,SATELLITE,ACQUISITION_DATE,ACQUISITION_TIME_UTC,ACQUISITION_TIME_UTC8,CLOUD_COVER_SCENE,CLOUD_COVER_REGION,SUN_ELEVATION,SUN_AZIMUTH,WRS_PATH,WRS_ROW,PROCESSING_LEVEL
LC08_123034_20200115_02_T1,LANDSAT_8,2020-01-15,03:45:20,11:45:20,15.2,12.8,45.3,142.1,123,034,L2
LC08_123034_20200131_02_T1,LANDSAT_8,2020-01-31,03:45:30,11:45:30,8.7,5.2,48.1,138.5,123,034,L2
LC08_123034_20200216_02_T1,LANDSAT_8,2020-02-16,03:45:40,11:45:40,5.1,3.8,52.6,134.2,123,034,L2
```

---

## File Organization Best Practices

### Folder Structure

Organize outputs in Google Drive:

```
GEE_LST_Outputs/
├── 2020/
│   ├── 广州市_2020-01-01_2020-03-31_LST_c0-20_mean_NDVI.tif
│   ├── 广州市_2020-01-01_2020-03-31_LST_c0-20_mean_NDVI_metadata.csv
│   ├── 广州市_2020-04-01_2020-06-30_LST_c0-20_mean_NDVI.tif
│   ├── 广州市_2020-04-01_2020-06-30_LST_c0-20_mean_NDVI_metadata.csv
│   └── ...
├── 2021/
│   └── ...
└── 2022/
    └── ...
```

### Naming Tips

1. **Consistency**: Always use the same naming pattern
2. **Avoid spaces**: Use underscores (`_`) or hyphens (`-`)
3. **Readable dates**: YYYY-MM-DD is sortable and unambiguous
4. **Include units**: LST is in °C (after K→°C conversion)
5. **Document parameters**: Include cloud threshold and method in name
6. **Version control**: Add version suffix if regenerating: `_v2`, `_v3`

### Version Suffixes

For iterative analysis:

```
study_area_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI_v1.tif  # Original
study_area_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI_v2.tif  # After outlier filter adjustment
study_area_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI_final.tif  # Published version
```

---

## Special Characters Handling

### Chinese Characters

**Supported**: Yes, UTF-8 encoding

**Example**:
```
广东省_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI.tif
```

**Note**: Some older software may have issues with non-ASCII characters in file names. Use ASCII alternatives if sharing with diverse users:

```
Guangdong_Province_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI.tif
```

### Special Characters to Avoid

Avoid these characters in `layerName`:
- `/` (forward slash)
- `\` (backslash)
- `:` (colon)
- `*` (asterisk)
- `?` (question mark)
- `"` (double quote)
- `<` `>` (angle brackets)
- `|` (pipe)

**Reason**: These are reserved or problematic in file systems

**Safe alternatives**:
- Use `_` (underscore) instead of spaces
- Use `-` (hyphen) for compound names
- Use `_and_` instead of `&`

---

## Parsing File Names

### Extract Metadata from Filename

Python example:

```python
import re
from datetime import datetime

filename = "广州市_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI.tif"

# Parse filename
pattern = r"(.+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_LST_c(\d+)-(\d+)_(\w+)_(\w+)\.(\w+)"
match = re.match(pattern, filename)

if match:
    region = match.group(1)          # "广州市"
    start_date = match.group(2)      # "2020-01-01"
    end_date = match.group(3)        # "2020-12-31"
    cloud_min = int(match.group(4))  # 0
    cloud_max = int(match.group(5))  # 20
    stat_type = match.group(6)       # "mean"
    method = match.group(7)          # "NDVI"
    extension = match.group(8)       # "tif"

    print(f"Region: {region}")
    print(f"Period: {start_date} to {end_date}")
    print(f"Cloud range: {cloud_min}-{cloud_max}%")
    print(f"Method: {stat_type} aggregation, {method} emissivity")
```

### Batch Rename

If you need to rename files after export, use consistent patterns:

```python
import os

old_name = "LST_output_2020.tif"
new_name = "广州市_2020-01-01_2020-12-31_LST_c0-20_mean_NDVI.tif"

os.rename(old_name, new_name)
```

---

## Documentation in File Metadata

### GeoTIFF Tags

When opening in GIS software, check metadata tags:

- **Band 1 name**: `LST` (or `LST_mean`, `LST_max`, etc.)
- **Units**: `degrees_Celsius`
- **CRS**: Usually WGS84 UTM (varies by region)
- **Resolution**: `30m`

### Companion README

For large projects, create a README file:

```
GEE_LST_Outputs/README.txt

Project: Urban Heat Island Study
Region: Guangzhou City, China
Period: 2020-2023
Processing date: 2024-01-15

File naming convention:
  {region}_{start}_{end}_LST_c{cloudMin}-{cloudMax}_{statType}_{method}.tif

Parameters:
  - Cloud threshold: 0-20%
  - Emissivity method: NDVI-based
  - Aggregation: Temporal mean
  - Resolution: 30m
  - CRS: WGS84 UTM Zone 49N

Contact: your.email@example.com
```

---

## Export Configuration in Code

### Specify Custom Folder and Filename

```javascript
Export.image.toDrive({
  image: lstResult,
  description: 'LST_export_task',       // Task name (internal)
  folder: 'GEE_LST_Outputs/2020',       // Drive folder path
  fileNamePrefix: filename,              // Actual file name
  scale: 30,
  region: geometry,
  crs: 'EPSG:32649',                    // WGS84 UTM Zone 49N
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});
```

### Multiple Exports in Loop

```javascript
timePeriods.forEach(function(period, index) {
  // Generate unique filename for each period
  var filename = layerName + '_' +
                 period.start + '_' +
                 period.end + '_LST_c' +
                 cloud_min + '-' +
                 cloud_max + '_' +
                 stat_type + '_' +
                 method;

  // Export raster
  Export.image.toDrive({
    image: lstResult,
    description: 'LST_' + index,  // Unique task ID
    fileNamePrefix: filename,
    // ... other parameters
  });

  // Export metadata
  Export.table.toDrive({
    collection: metadata,
    description: 'metadata_' + index,
    fileNamePrefix: filename + '_metadata',
    fileFormat: 'CSV'
  });
});
```

---

## Troubleshooting

### Filename Too Long Error

**Symptom**: Export fails with "filename too long" error

**Cause**: Windows has 260-character path limit, some cloud storage has similar limits

**Solution**: Shorten region names or use abbreviations

```javascript
// Before (long)
var layerName = '广东省深圳市福田区某某街道某某社区研究区域';

// After (shortened)
var layerName = 'Shenzhen_Futian';
```

### Special Character Issues

**Symptom**: File not found or garbled characters

**Cause**: Character encoding mismatch

**Solution**: Use ASCII-only characters or ensure UTF-8 throughout pipeline

```javascript
// Replace Chinese characters with romanization
var layerName = 'Guangzhou';  // Instead of '广州市'
```

### Duplicate Filenames

**Symptom**: Previous export overwritten

**Cause**: Same filename used for different analyses

**Solution**: Add timestamp or version suffix

```javascript
var timestamp = ee.Date(Date.now()).format('YYYYMMdd_HHmmss').getInfo();
var filename = layerName + '_' + period.start + '_' + period.end +
               '_LST_' + timestamp;
```

---

## See Also

- [Getting Started: Understanding Your Results](../guides/getting-started.md#understanding-your-results)
- [Common Modifications: Exporting Additional Bands](../guides/common-modifications.md#exporting-additional-bands)
- [Reference: Technical Notes](technical-notes.md)

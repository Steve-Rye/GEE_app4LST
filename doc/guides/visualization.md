# Visualization Guide

This guide explains how to customize map layers, color schemes, legends, and charts for LST visualization.

## Map Layers

### LST Layer Visualization

#### Default Color Scheme

**Blue → Red Gradient** (cold to hot):

```javascript
var visParams = {
  min: -10,
  max: 50,
  palette: ['blue', 'cyan', 'yellow', 'red']
};

Map.addLayer(lstResult, visParams, layerName);
```

**Color stops**:
- Blue: -10°C (very cold)
- Cyan: ~10°C (cool)
- Yellow: ~30°C (warm)
- Red: 50°C (very hot)

#### Custom Temperature Ranges

**Cold climate regions**:
```javascript
var visParams = {
  min: -30,
  max: 30,
  palette: ['darkblue', 'blue', 'cyan', 'white', 'yellow', 'orange', 'red']
};
```

**Tropical regions**:
```javascript
var visParams = {
  min: 15,
  max: 45,
  palette: ['green', 'yellow', 'orange', 'red', 'darkred']
};
```

**Urban heat island studies** (narrow range for detail):
```javascript
var visParams = {
  min: 25,
  max: 40,
  palette: ['green', 'lime', 'yellow', 'orange', 'red', 'darkred']
};
```

### Advanced Color Palettes

#### Perceptually Uniform (Viridis)

Better for visual interpretation:

```javascript
var visParams = {
  min: -10,
  max: 50,
  palette: ['440154', '414487', '2a788e', '22a884', '7ad151', 'fde725']
  // Viridis palette (purple-blue-green-yellow)
};
```

#### Diverging (Emphasize Deviations)

Highlight hot/cold anomalies:

```javascript
// Calculate long-term mean
var lst_climatology = 25;  // °C

var visParams = {
  min: lst_climatology - 15,
  max: lst_climatology + 15,
  palette: ['313695', '4575b4', '74add1', 'abd9e9', 'e0f3f8',
            'fee090', 'fdae61', 'f46d43', 'd73027', 'a50026']
  // RdBu (Red-Blue) diverging palette, reversed
};
```

#### ColorBrewer Palettes

Popular scientific palettes:

**Spectral**:
```javascript
palette: ['5e4fa2', '3288bd', '66c2a5', 'abdda4', 'e6f598',
          'fee08b', 'fdae61', 'f46d43', 'd53e4f', '9e0142']
```

**YlOrRd** (Yellow-Orange-Red):
```javascript
palette: ['ffffb2', 'fed976', 'feb24c', 'fd8d3c', 'fc4e2a', 'e31a1c', 'b10026']
```

**RdYlBu** (Red-Yellow-Blue):
```javascript
palette: ['d73027', 'f46d43', 'fdae61', 'fee090', 'e0f3f8',
          'abd9e9', '74add1', '4575b4', '313695']
```

### Dynamic Range (Data-Driven)

Auto-adjust min/max to data:

```javascript
// Calculate 2nd and 98th percentiles for robust range
var percentiles = lstResult.reduceRegion({
  reducer: ee.Reducer.percentile([2, 98]),
  geometry: geometry,
  scale: 100,
  maxPixels: 1e9
});

var min_val = ee.Number(percentiles.get('LST_p2')).getInfo();
var max_val = ee.Number(percentiles.get('LST_p98')).getInfo();

var visParams = {
  min: min_val,
  max: max_val,
  palette: ['blue', 'cyan', 'yellow', 'red']
};

print('Auto-detected range:', min_val, 'to', max_val, '°C');
```

---

## Region Boundary Overlay

### Default Boundary Style

```javascript
var boundary_style = {
  color: 'red',
  width: 2,
  fillColor: '00000000'  // Transparent fill
};

Map.addLayer(geometry, boundary_style, 'Region Boundary');
```

### Custom Boundary Colors

**Yellow (high visibility on satellite imagery)**:
```javascript
var boundary_style = {
  color: 'yellow',
  width: 3,
  fillColor: '00000000'
};
```

**Black with white outline** (works on any background):
```javascript
// Outer white line
Map.addLayer(geometry, {color: 'white', width: 5, fillColor: '00000000'}, 'Boundary Outline');
// Inner black line
Map.addLayer(geometry, {color: 'black', width: 3, fillColor: '00000000'}, 'Boundary');
```

### Semi-Transparent Fill

Highlight region while showing underlying data:

```javascript
var boundary_style = {
  color: 'red',
  width: 2,
  fillColor: 'FF000033'  // Red with 20% opacity (RRGGBBAA format)
};
```

### Multiple Regions

Display multiple boundaries with different colors:

```javascript
var regions = [
  {name: 'Urban', geometry: urban_geom, color: 'red'},
  {name: 'Rural', geometry: rural_geom, color: 'green'},
  {name: 'Forest', geometry: forest_geom, color: 'darkgreen'}
];

regions.forEach(function(region) {
  Map.addLayer(region.geometry, {color: region.color, width: 2}, region.name);
});
```

---

## Legends

### Manual Legend Creation

GEE doesn't have built-in legends, but you can create a legend panel:

```javascript
// Create color bar
function createColorBarParams(palette, min, max) {
  return {
    bbox: [0, 0, 1, 0.1],
    dimensions: '100x10',
    format: 'png',
    min: min,
    max: max,
    palette: palette
  };
}

// Create legend panel
function createLegend(title, min, max, palette) {
  var legend = ui.Panel({
    style: {
      position: 'bottom-left',
      padding: '8px 15px'
    }
  });

  // Title
  var legendTitle = ui.Label({
    value: title,
    style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0'}
  });
  legend.add(legendTitle);

  // Color bar
  var lon = ee.Image.pixelLonLat().select('latitude');
  var gradient = lon.multiply((max - min) / 100.0).add(min);
  var colorBar = gradient.visualize(createColorBarParams(palette, min, max));

  var thumbnail = ui.Thumbnail({
    image: colorBar,
    params: {bbox: '0,0,100,10', dimensions: '200x20'},
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'}
  });
  legend.add(thumbnail);

  // Labels
  var labels = ui.Panel({
    widgets: [
      ui.Label(min + ' °C', {margin: '4px 8px', fontSize: '12px'}),
      ui.Label((min + max) / 2 + ' °C',
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal', fontSize: '12px'}),
      ui.Label(max + ' °C', {margin: '4px 8px', fontSize: '12px'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  legend.add(labels);

  return legend;
}

// Add legend to map
var legend = createLegend('Land Surface Temperature', -10, 50,
  ['blue', 'cyan', 'yellow', 'red']);
Map.add(legend);
```

### Simplified Legend (Text Only)

```javascript
var legend = ui.Panel({
  style: {position: 'bottom-left', padding: '8px'}
});

legend.add(ui.Label('LST (°C)', {fontWeight: 'bold'}));
legend.add(ui.Label('🟦 < 10°C (Cold)'));
legend.add(ui.Label('🟩 10-20°C (Cool)'));
legend.add(ui.Label('🟨 20-30°C (Warm)'));
legend.add(ui.Label('🟧 30-40°C (Hot)'));
legend.add(ui.Label('🟥 > 40°C (Very Hot)'));

Map.add(legend);
```

---

## Histograms

### Default Histogram

```javascript
var histogram = ui.Chart.image.histogram({
  image: lstResult,
  region: geometry,
  scale: 100,
  minBucketWidth: 2  // 2°C bins
})
.setOptions({
  title: 'LST Distribution',
  hAxis: {title: 'Temperature (°C)'},
  vAxis: {title: 'Frequency'},
  legend: 'none',
  colors: ['blue']
});

print(histogram);
```

### Custom Histogram Parameters

**Narrow bins for detail**:
```javascript
var histogram = ui.Chart.image.histogram({
  image: lstResult,
  region: geometry,
  scale: 30,
  minBucketWidth: 0.5,  // 0.5°C bins
  maxBuckets: 200
});
```

**Specific temperature range**:
```javascript
var histogram = ui.Chart.image.histogram({
  image: lstResult.clip(geometry),
  region: geometry,
  scale: 100,
  minBucketWidth: 2,
  maxBuckets: 50
})
.setOptions({
  title: 'LST Distribution (Urban Area)',
  hAxis: {
    title: 'Temperature (°C)',
    viewWindow: {min: 15, max: 45}  // Zoom to relevant range
  },
  vAxis: {title: 'Pixel Count'},
  colors: ['red']
});
```

### Multi-Period Comparison

Compare histograms for different time periods:

```javascript
var hist_summer = ui.Chart.image.histogram({
  image: lst_summer,
  region: geometry,
  scale: 100,
  minBucketWidth: 2
});

var hist_winter = ui.Chart.image.histogram({
  image: lst_winter,
  region: geometry,
  scale: 100,
  minBucketWidth: 2
});

var combined = ui.Chart.image.histogram({
  image: ee.Image.cat(lst_summer.rename('Summer'), lst_winter.rename('Winter')),
  region: geometry,
  scale: 100,
  minBucketWidth: 2
})
.setOptions({
  title: 'LST: Summer vs Winter',
  hAxis: {title: 'Temperature (°C)'},
  vAxis: {title: 'Frequency'},
  colors: ['red', 'blue'],
  series: {
    0: {labelInLegend: 'Summer'},
    1: {labelInLegend: 'Winter'}
  }
});

print(combined);
```

---

## Time Series Charts

### LST Time Series

Plot mean LST over time:

```javascript
var timeSeries = ui.Chart.image.series({
  imageCollection: lstCelsius,
  region: geometry,
  reducer: ee.Reducer.mean(),
  scale: 100,
  xProperty: 'system:time_start'
})
.setOptions({
  title: 'LST Time Series',
  hAxis: {title: 'Date', format: 'YYYY-MM'},
  vAxis: {title: 'LST (°C)'},
  lineWidth: 2,
  pointSize: 4,
  colors: ['red']
});

print(timeSeries);
```

### Multi-Region Comparison

Compare LST between urban and rural areas:

```javascript
var urban_series = ui.Chart.image.series({
  imageCollection: lstCelsius,
  region: urban_geometry,
  reducer: ee.Reducer.mean(),
  scale: 100
});

var rural_series = ui.Chart.image.series({
  imageCollection: lstCelsius,
  region: rural_geometry,
  reducer: ee.Reducer.mean(),
  scale: 100
});

// Combine
var comparison = ui.Chart.image.seriesByRegion({
  imageCollection: lstCelsius,
  regions: ee.FeatureCollection([
    ee.Feature(urban_geometry, {label: 'Urban'}),
    ee.Feature(rural_geometry, {label: 'Rural'})
  ]),
  reducer: ee.Reducer.mean(),
  scale: 100,
  seriesProperty: 'label'
})
.setOptions({
  title: 'Urban Heat Island Effect',
  hAxis: {title: 'Date'},
  vAxis: {title: 'LST (°C)'},
  lineWidth: 2,
  colors: ['red', 'green']
});

print(comparison);
```

---

## Basemap Selection

### Change Background Map

```javascript
// Satellite imagery (default)
Map.setOptions('SATELLITE');

// Terrain
Map.setOptions('TERRAIN');

// Hybrid (satellite + labels)
Map.setOptions('HYBRID');

// Roadmap
Map.setOptions('ROADMAP');
```

### Custom Basemap

Add custom tile layers:

```javascript
// OpenStreetMap
var osm = ui.Map.Layer({
  eeObject: ee.Image.constant(0),
  visParams: {},
  name: 'OpenStreetMap',
  shown: false,
  opacity: 1.0
});

// Add tile URL
Map.addLayer(
  ee.Image.constant(0),
  {},
  'OpenStreetMap',
  true,
  1.0,
  null,
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);
```

---

## Layer Management

### Layer Opacity

Make LST layer semi-transparent to see underlying features:

```javascript
Map.addLayer(lstResult, visParams, layerName, true, 0.7);
// Parameters: image, visParams, name, shown, opacity
```

### Toggle Layers On/Off

```javascript
// Add layers with initial visibility
Map.addLayer(lstResult, visParams, 'LST', true);  // Shown
Map.addLayer(geometry, boundary_style, 'Boundary', false);  // Hidden
Map.addLayer(ndvi, ndviParams, 'NDVI', false);  // Hidden

// Use layer manager in UI to toggle
```

### Layer Order

Layers added later appear on top:

```javascript
Map.addLayer(lstResult, visParams, 'LST');        // Bottom
Map.addLayer(urban_mask, {palette: 'gray'}, 'Urban');  // Middle
Map.addLayer(geometry, boundary_style, 'Boundary');  // Top
```

---

## Map Extent and Centering

### Center on Region

```javascript
Map.centerObject(geometry, 10);  // Zoom level 10
```

### Fit to Region Bounds

```javascript
Map.centerObject(geometry);  // Auto-zoom to fit
```

### Set Specific View

```javascript
Map.setCenter(lon, lat, zoom);
// Example: Beijing
Map.setCenter(116.4074, 39.9042, 10);
```

---

## Export Visualizations

### Export RGB Composite to Drive

```javascript
// Create RGB visualization
var lstRGB = lstResult.visualize(visParams);

Export.image.toDrive({
  image: lstRGB,
  description: filename + '_RGB',
  folder: 'GEE_LST_Outputs',
  scale: 30,
  region: geometry,
  fileFormat: 'PNG'  // or 'JPEG'
});
```

### Export Thumbnail

Quick preview image:

```javascript
var thumbnail = lstResult.getThumbURL({
  min: -10,
  max: 50,
  palette: ['blue', 'cyan', 'yellow', 'red'],
  dimensions: 512,
  region: geometry
});

print('Thumbnail URL:', thumbnail);
```

---

## Interactive UI Enhancements

### Add Click Listener

Query LST value on click:

```javascript
Map.onClick(function(coords) {
  var point = ee.Geometry.Point([coords.lon, coords.lat]);

  var value = lstResult.reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: point,
    scale: 30
  }).evaluate(function(result) {
    print('LST at clicked location:', result.LST, '°C');
  });
});
```

### Split Panel View

Compare two LST images side-by-side:

```javascript
var leftMap = ui.Map();
var rightMap = ui.Map();

leftMap.addLayer(lst_2020, visParams, '2020');
rightMap.addLayer(lst_2023, visParams, '2023');

// Link maps
var linker = ui.Map.Linker([leftMap, rightMap]);

// Create split panel
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true,
  style: {stretch: 'both'}
});

ui.root.widgets().reset([splitPanel]);
```

---

## Best Practices

### 1. Choose Appropriate Color Schemes

- **Continuous data**: Use sequential palettes (blue → red)
- **Diverging data**: Use diverging palettes (blue → white → red)
- **Categorical data**: Use distinct colors
- **Accessibility**: Test for colorblind-friendliness

### 2. Set Data-Appropriate Ranges

- Use percentiles (2nd-98th) instead of min-max to avoid outliers
- Adjust range to highlight features of interest
- Document range choices for reproducibility

### 3. Add Context Layers

- Always show region boundary
- Consider adding urban masks, water bodies, or administrative boundaries
- Use transparency to overlay multiple layers

### 4. Provide Clear Labels

- Add legends with units
- Label layers descriptively
- Include dates/time periods in layer names

### 5. Optimize for Performance

- Use lower scale for preview (100m or 500m)
- Limit histogram buckets for large regions
- Use thumbnails for quick visualizations

---

## Example: Complete Visualization Setup

```javascript
// Set map options
Map.setOptions('SATELLITE');
Map.centerObject(geometry, 10);

// Add LST layer with custom palette
var visParams = {
  min: 15,
  max: 45,
  palette: ['313695', '4575b4', '74add1', 'abd9e9', 'fee090',
            'fdae61', 'f46d43', 'd73027', 'a50026']
};
Map.addLayer(lstResult, visParams, 'LST', true, 0.8);

// Add boundary
Map.addLayer(geometry, {color: 'yellow', width: 3}, 'Boundary');

// Add legend
var legend = createLegend('LST (°C)', 15, 45, visParams.palette);
Map.add(legend);

// Add histogram
var histogram = ui.Chart.image.histogram({
  image: lstResult,
  region: geometry,
  scale: 100,
  minBucketWidth: 2
})
.setOptions({
  title: 'LST Distribution',
  hAxis: {title: 'Temperature (°C)'},
  vAxis: {title: 'Pixel Count'},
  colors: ['red']
});
print(histogram);

// Add click listener
Map.onClick(function(coords) {
  var point = ee.Geometry.Point([coords.lon, coords.lat]);
  var value = lstResult.sample(point, 30).first().get('LST').getInfo();
  print('LST:', value.toFixed(2), '°C at', coords.lat.toFixed(4), ',', coords.lon.toFixed(4));
});
```

---

## References

- **Google Earth Engine Guides**: https://developers.google.com/earth-engine/guides/visualization
- **ColorBrewer**: https://colorbrewer2.org/ (choose palettes)
- **Chart API**: https://developers.google.com/earth-engine/guides/charts
- **UI Widgets**: https://developers.google.com/earth-engine/guides/ui_widgets

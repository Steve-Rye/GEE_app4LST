/*
Author: [Your Name]
Based on the original work by Sofia Ermida (sofia.ermida@ipma.pt; @ermida_sofia)

This code is free and open. 
By using this code and any data derived with it, 
you agree to cite the following reference 
in any publications derived from them:
Ermida, S.L., Soares, P., Mantas, V., Göttsche, F.-M., Trigo, I.F., 2020. 
    Google Earth Engine open-source code for Land Surface Temperature estimation from the Landsat series.
    Remote Sensing, 12 (9), 1471; https://doi.org/10.3390/rs12091471

This is an enhanced version of the original Landsat_LST.js module,
providing support for both ASTER GED-based and NDVI-based emissivity calculation methods.

to call this function use:

var LandsatLST = require('users/yyyh48201/GEE_landsat_lst:modules/Landsat_LST_v2.js')
var LandsatCollection = LandsatLST.collection(landsat, date_start, date_end, geometry, emiss_method)

USES:
    - NCEP_TPW.js
    - cloudmask.js
    - compute_NDVI.js
    - compute_FVC.js
    - compute_emissivity.js        (for ASTER method)
    - compute_emissivity_ndvi.js   (for NDVI method)
    - SMWalgorithm.js
*/

// MODULES DECLARATION -----------------------------------------------------------
// Total Precipitable Water 
var NCEP_TPW = require('users/yyyh48201/GEE_landsat_lst:modules/NCEP_TPW.js');
//cloud mask
var cloudmask = require('users/yyyh48201/GEE_landsat_lst:modules/cloudmask.js');
//Normalized Difference Vegetation Index
var NDVI = require('users/yyyh48201/GEE_landsat_lst:modules/compute_NDVI.js');
//Fraction of Vegetation cover
var FVC = require('users/yyyh48201/GEE_landsat_lst:modules/compute_FVC.js');
//surface emissivity (ASTER method)
var EM_aster = require('users/yyyh48201/GEE_landsat_lst:modules/compute_emissivity.js');
//surface emissivity (NDVI method)
var EM_ndvi = require('users/yyyh48201/GEE_landsat_lst:modules/compute_emissivity_ndvi.js');
// land surface temperature
var LST = require('users/yyyh48201/GEE_landsat_lst:modules/SMWalgorithm.js');
// --------------------------------------------------------------------------------

var COLLECTION = ee.Dictionary({
  'L4': {
    'TOA': ee.ImageCollection('LANDSAT/LT04/C02/T1_TOA'),
    'SR': ee.ImageCollection('LANDSAT/LT04/C02/T1_L2'),
    'TIR': ['B6',],
    'VISW': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7','QA_PIXEL']
  },
  'L5': {
    'TOA': ee.ImageCollection('LANDSAT/LT05/C02/T1_TOA'),
    'SR': ee.ImageCollection('LANDSAT/LT05/C02/T1_L2'),
    'TIR': ['B6',],
    'VISW': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7','QA_PIXEL']
  },
  'L7': {
    'TOA': ee.ImageCollection('LANDSAT/LE07/C02/T1_TOA'),
    'SR': ee.ImageCollection('LANDSAT/LE07/C02/T1_L2'),
    'TIR': ['B6_VCID_1','B6_VCID_2'],
    'VISW': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7','QA_PIXEL']
  },
  'L8': {
    'TOA': ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA'),
    'SR': ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'),
    'TIR': ['B10','B11'],
    'VISW': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7','QA_PIXEL']
  },
  'L9': {
    'TOA': ee.ImageCollection('LANDSAT/LC09/C02/T1_TOA'),
    'SR': ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'),
    'TIR': ['B10','B11'],
    'VISW': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7','QA_PIXEL']
  }
});

// Convert Kelvin to Celsius
exports.toCelsius = function(image) {
  return image.addBands(
    image.select('LST').subtract(273.15).rename('LST_celsius'),
    ['LST_celsius'],
    true
  );
};

exports.collection = function(landsat, date_start, date_end, geometry, emiss_method){
  // load TOA Radiance/Reflectance
  var collection_dict = ee.Dictionary(COLLECTION.get(landsat));
  
  var landsatTOA = ee.ImageCollection(collection_dict.get('TOA'))
                .filter(ee.Filter.date(date_start, date_end))
                .filterBounds(geometry);
  
  // load Surface Reflectance collection for NDVI
  var landsatSR = ee.ImageCollection(collection_dict.get('SR'))
                .filter(ee.Filter.date(date_start, date_end))
                .filterBounds(geometry)
                .map(cloudmask.sr)
                .map(NDVI.addBand(landsat))
                .map(FVC.addBand(landsat))
                .map(NCEP_TPW.addBand);

  // Add emissivity using selected method
  if (emiss_method === 'aster') {
    landsatSR = landsatSR.map(EM_aster.addBand(landsat, true));
  } else if (emiss_method === 'ndvi') {
    landsatSR = landsatSR.map(EM_ndvi.addBand(landsat));
  } else {
    throw new Error("Invalid emissivity method. Use 'aster' or 'ndvi'.");
  }

  // combine collections
  var tir = ee.List(collection_dict.get('TIR'));
  var visw = ee.List(collection_dict.get('VISW'))
    .add('NDVI')
    .add('FVC')
    .add('TPW')
    .add('TPWpos')
    .add('EM');
  var landsatALL = (landsatSR.select(visw).combine(landsatTOA.select(tir), true));
  
  // compute the LST
  var landsatLST = landsatALL.map(LST.addBand(landsat));

  return landsatLST;
};
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

This function computes surface emissivity based on NDVI values
This is an alternative to the ASTER GED based method,
useful when ASTER GED data is missing or incomplete.

to call this function use:

var EMfun = require('users/yyyh48201/GEE_landsat_lst:modules/compute_emissivity_ndvi.js')
var ImagewithEM = EMfun.addBand(landsat)(image)
or
var collectionwithEM = ImageCollection.map(EMfun.addBand(landsat))

USES:
    - compute_NDVI.js (indirectly through image input)
    
INPUTS:
        - landsat: <string>
                  the Landsat satellite id
                  valid inputs: 'L4', 'L5', 'L7', 'L8' and 'L9'
        - image: <ee.Image>
                image for which to calculate the emissivity
                must contain the 'NDVI' band
OUTPUTS:
        - <ee.Image>
          the input image with 1 new band: 
          'EM': surface emissivity of TIR band
*/

exports.addBand = function(landsat){
  var wrap = function(image){
    
    // Define emissivity values for different surface types
    var EMIS_SOIL = 0.97;    // bare soil emissivity
    var EMIS_VEG = 0.99;     // vegetation emissivity
    var EMIS_WATER = 0.99;   // water emissivity
    var EMIS_URBAN = 0.97;   // urban/built-up emissivity
    
    // Get NDVI band
    var ndvi = image.select('NDVI');
    
    // Calculate emissivity based on NDVI thresholds
    // Formula: ε = a + b * NDVI
    // where a and b are empirical parameters
    var emissivity = ee.Image(ndvi).expression(
      'NDVI < 0.0 ? EM_URBAN : ' +                           // Urban/Built-up areas
      'NDVI < 0.2 ? EM_SOIL : ' +                           // Bare soil
      'NDVI > 0.7 ? EM_VEG : ' +                           // Dense vegetation
      'EM_SOIL + (EM_VEG - EM_SOIL) * ((NDVI - 0.2) / 0.5)', // Mixed pixels
      {
        'NDVI': ndvi,
        'EM_SOIL': EMIS_SOIL,
        'EM_VEG': EMIS_VEG,
        'EM_URBAN': EMIS_URBAN
      });
    
    // Set water bodies emissivity
    var qa = image.select('QA_PIXEL');
    emissivity = emissivity.where(qa.bitwiseAnd(1 << 7), EMIS_WATER);
    
    // Set snow/ice emissivity
    emissivity = emissivity.where(qa.bitwiseAnd(1 << 5), 0.989);
    
    return image.addBands(emissivity.rename('EM'));
  }
  return wrap
};

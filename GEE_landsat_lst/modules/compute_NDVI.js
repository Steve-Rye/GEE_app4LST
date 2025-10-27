/*
Author: Sofia Ermida (sofia.ermida@ipma.pt; @ermida_sofia)

This code is free and open. 
By using this code and any data derived with it, 
you agree to cite the following reference 
in any publications derived from them:
Ermida, S.L., Soares, P., Mantas, V., Göttsche, F.-M., Trigo, I.F., 2020. 
    Google Earth Engine open-source code for Land Surface Temperature estimation from the Landsat series.
    Remote Sensing, 12 (9), 1471; https://doi.org/10.3390/rs12091471

this function computes NDVI values for Landsat

to call this function use:

var NDVIfun = require('users/yyyh48201/GEE_landsat_lst:modules/compute_NDVI.js')
var ImagewithNDVI = NDVIfun.addBand(landsat)(image)
or
var collectionwithNDVI = ImageCollection.map(NDVIfun.addBand(landsat))

INPUTS:
        - landsat: <string>
                  the Landsat satellite id
                  valid inputs: 'L4', 'L5', 'L7', 'L8' and 'L9'
        - image: <ee.Image>
                image for which to calculate the NDVI
OUTPUTS:
        - <ee.Image>
          the input image with 1 new band: 
          'NDVI': normalized difference vegetation index
*/

exports.addBand = function(landsat){
  var wrap = function(image){
    
    // choose bands
    var nir = ee.String(ee.Algorithms.If(landsat==='L8','SR_B5',
                        ee.Algorithms.If(landsat==='L9','SR_B5','SR_B4')))
    var red = ee.String(ee.Algorithms.If(landsat==='L8','SR_B4',
                        ee.Algorithms.If(landsat==='L9','SR_B4','SR_B3')))
  
    // compute NDVI 
    return image.addBands(image.expression('(nir-red)/(nir+red)',{
      'nir':image.select(nir).multiply(0.0000275).add(-0.2),
      'red':image.select(red).multiply(0.0000275).add(-0.2)
    }).rename('NDVI'))
  }
  return wrap
};

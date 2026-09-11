// =================================================================
// PEATLAND DROUGHT MONITORING
// Sentinel-2 NDMI / Moisture Index
// Target: Monitoring vegetation/peatland moisture condition
// =================================================================


// =================================================================
// 1. AREA OF INTEREST (AOI)
// =================================================================

var aoi = ee.FeatureCollection(
  "projects/neon-framing-487603-c9/assets/Kabupaten_Katingan/Kec_Mendawai"
);

Map.centerObject(aoi, 10);

Map.addLayer(
  aoi,
  {color: 'yellow'},
  'AOI'
);


// =================================================================
// 2. SENTINEL-2 CLOUD PROBABILITY
// =================================================================

var s2 = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
)
.filterBounds(aoi)
.filterDate(
  '2026-08-01',
  '2026-09-01'
)
.filter(
  ee.Filter.lt(
    'CLOUDY_PIXEL_PERCENTAGE',
    40
  )
);


var cloudProbability = ee.ImageCollection(
  'COPERNICUS/S2_CLOUD_PROBABILITY'
)
.filterBounds(aoi)
.filterDate(
  '2026-08-01',
  '2026-09-01'
);


// =================================================================
// 3. JOIN SENTINEL-2 WITH CLOUD PROBABILITY
// =================================================================

var join = ee.Join.saveFirst(
  'cloud_probability'
);

var joined = join.apply({
  primary: s2,
  secondary: cloudProbability,

  condition: ee.Filter.equals({
    leftField: 'system:index',
    rightField: 'system:index'
  })
});


// =================================================================
// 4. CLOUD MASK
// =================================================================

function maskClouds(image) {

  var cloud = ee.Image(
    image.get('cloud_probability')
  );

  var cloudMask = cloud
    .select('probability')
    .lt(20);


  // Sentinel-2 Scene Classification Layer

  var scl = image.select('SCL');

  var sclMask = scl.neq(3)   // Cloud shadow
    .and(scl.neq(7))         // Unclassified
    .and(scl.neq(8))         // Cloud medium probability
    .and(scl.neq(9))         // Cloud high probability
    .and(scl.neq(10))        // Cirrus
    .and(scl.neq(11));       // Snow / ice


  return image
    .updateMask(
      cloudMask.and(sclMask)
    )
    .divide(10000);
}


var dataset = ee.ImageCollection(
  joined
).map(maskClouds);


// =================================================================
// 5. INFORMATION
// =================================================================

print(
  'Jumlah citra Sentinel-2:',
  s2.size()
);

print(
  'Jumlah citra setelah masking:',
  dataset.size()
);


// =================================================================
// 6. MEDIAN COMPOSITE
// =================================================================

var composite = dataset
  .median()
  .clip(aoi);


// =================================================================
// 7. NDMI
// =================================================================
//
// NDMI = (NIR - SWIR) / (NIR + SWIR)
//
// Sentinel-2:
// B8  = NIR
// B11 = SWIR
//
// NDMI digunakan untuk melihat kondisi kelembapan
// vegetasi/tajuk.
//

var ndmi = composite
  .normalizedDifference([
    'B8',
    'B11'
  ])
  .rename('NDMI');


// =================================================================
// 8. NDMI VISUALIZATION
// =================================================================

var ndmiVis = {
  min: -0.3,
  max: 0.6,

  palette: [
    'darkred',
    'red',
    'orange',
    'yellow',
    'lightgreen',
    'green',
    'darkgreen'
  ]
};


// =================================================================
// 9. DISPLAY RGB
// =================================================================

Map.addLayer(
  composite,
  {
    bands: [
      'B4',
      'B3',
      'B2'
    ],

    min: 0,
    max: 0.3
  },
  'Sentinel-2 RGB',
  false
);


// =================================================================
// 10. DISPLAY NDMI
// =================================================================

Map.addLayer(
  ndmi,
  ndmiVis,
  'Peatland Moisture - NDMI'
);


// =================================================================
// 11. NDMI STATISTICS
// =================================================================

var stats = ndmi.reduceRegion({

  reducer: ee.Reducer.mean()
    .combine({
      reducer2: ee.Reducer.minMax(),
      sharedInputs: true
    }),

  geometry: aoi.geometry(),

  scale: 20,

  maxPixels: 1e13
});


print(
  'NDMI Statistics:',
  stats
);


// =================================================================
// 12. EXPORT NDMI
// =================================================================

Export.image.toDrive({

  image: ndmi,

  description:
    'NDMI_KotawaringinTimur_Agustus2026',

  folder:
    'GEE_Peatland_Drought',

  fileNamePrefix:
    'NDMI_KotawaringinTimur_Agustus2026',

  region:
    aoi.geometry(),

  scale:
    20,

  maxPixels:
    1e13,

  fileFormat:
    'GeoTIFF'
});


print(
  'Export NDMI siap. Buka TASKS lalu klik RUN.'
);

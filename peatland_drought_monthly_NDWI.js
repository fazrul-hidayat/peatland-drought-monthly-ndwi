// =================================================================
// PEMANTAUAN KEKERINGAN GAMBUT (PEATLAND DROUGHT) MENGGUNAKAN NDWI
// Target: Mendeteksi area gambut kering yang rawan Karhutla
// =================================================================

// 1. AREA OF INTEREST (AOI) - Kecamatan Sebangau
// (Menggunakan asset polygon milik komandan)
var aoi = ee.FeatureCollection("projects/neon-framing-487603-c9/assets/SHP_KABUPATEN/Administrasi_KotaPalangkaraya");
Map.centerObject(aoi, 11);

// 2. FUNGSI CLOUD MASKING SENTINEL-2 (Membersihkan Awan)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

// 3. MEMANGGIL DATA SENTINEL-2 (Agustus 2026 - Puncak Kemarau)
// Kita ambil data bulan ini untuk melihat kekeringan terkini
var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(aoi)
                .filterDate('2026-08-01', '2026-08-20') 
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                .map(maskS2clouds)
                .median()
                .clip(aoi);

// 4. MENGHITUNG NDWI (Normalized Difference Water Index)
// Menggunakan Band 8 (NIR) dan Band 11 (SWIR) untuk mendeteksi kadar air tajuk/gambut
var ndwi = dataset.normalizedDifference(['B8', 'B11']).rename('NDWI');

// 5. PARAMETER VISUALISASI WARNA
// Merah/Jeruk = Kering Kritis (Awas Api!), Kuning = Sedang, Biru = Basah/Aman
var ndwiVis = {
  min: -0.3, // Nilai kering
  max: 0.3,  // Nilai basah
  palette: ['darkred', 'red', 'orange', 'yellow', 'lightblue', 'blue', 'darkblue']
};

// 6. MENAMPILKAN PETA KE LAYAR
// Menampilkan citra asli (RGB) sebagai lapisan bawah (dimatikan otomatis/false)
Map.addLayer(dataset, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'Citra Asli (RGB)', false);

// Menampilkan Peta Kekeringan
Map.addLayer(ndwi, ndwiVis, 'Peta Kekeringan Gambut (NDWI)');

print('Tugas Selesai Komandan! Peta Kekeringan Gambut Berhasil Diproses.');

// =================================================================
// 7. EKSPOR PETA NDWI KE GOOGLE DRIVE (Format GeoTIFF)
// =================================================================

Export.image.toDrive({
  image: ndwi,                             // Data yang diekspor (Peta Kekeringan)
  description: 'NDWI_Sebangau_Agustus2026', // Nama Task di Tab Tasks (Kanan Atas)
  folder: 'GEE_Sebangau_Export',           // Nama folder baru yang akan otomatis dibuat di Google Drive pian
  fileNamePrefix: 'NDWI_Sebangau_Agustus2026', // Nama file saat tersimpan (GeoTIFF)
  region: aoi,                             // Batas area ekspor (Kec. Sebangau)
  scale: 10,                               // Resolusi Sentinel-2 (10 meter per pixel)
  maxPixels: 1e13                          // Jaga-jaga kalau filenya kebesaran
});

print('PERHATIAN: Buka tab "Tasks" di kanan atas lalu klik "RUN" untuk mulai men-download ke Google Drive!');

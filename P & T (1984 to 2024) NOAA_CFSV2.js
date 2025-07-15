// 1. Zone d'étude : Région de l'Oriental du Maroc
var region = ee.FeatureCollection("projects/oubdils/assets/zone_jerda");

// 2. Période d'étude
var startYear = 1984;
var endYear = 2024;
var years = ee.List.sequence(startYear, endYear);

// 3. Chargement de la collection NOAA CFSV2
var cfsv2 = ee.ImageCollection("NOAA/CFSV2/FOR6H")
  .filterBounds(region)
  .filterDate(startYear + '-01-01', endYear + '-12-31');

// 4. Calcul des statistiques annuelles
var annualStats = years.map(function(y) {
  var year = ee.Number(y);
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = ee.Date.fromYMD(year, 12, 31);

  var yearCollection = cfsv2.filterDate(start, end);

  // Température moyenne annuelle (°C)
  var tempC = yearCollection
    .select('Temperature_height_above_ground')
    .mean()
    .subtract(273.15);  // Kelvin → Celsius

  // Précipitations (mm/an)
  var prate = yearCollection
    .select('Precipitation_rate_surface_6_Hour_Average')
    .mean()
    .multiply(60 * 60 * 6 * 4 * 365);  // mm/s × sec/an

  // Réduction spatiale (moyenne sur la zone)
  var stats = ee.Image.cat([tempC, prate]).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: region.geometry(),
    scale: 5000,
    maxPixels: 1e9
  });

  return ee.Feature(null, {
    'YearStr': year.format('%.0f'),  // ✅ Format sans virgule
    'Tmean (°C)': stats.get('Temperature_height_above_ground'),
    'Precipitation (mm)': stats.get('Precipitation_rate_surface_6_Hour_Average')
  });
});

// 5. Création de la FeatureCollection
var climateFC = ee.FeatureCollection(annualStats);

// 6. Créer les ticks tous les 5 ans
var tickYears = ee.List.sequence(startYear, endYear, 5).map(function(y) {
  return ee.Number(y).format('%.0f');
});

// 7. Affichage du graphique combiné
var chart = ui.Chart.feature.byFeature(climateFC, 'YearStr', [
    'Tmean (°C)',
    'Precipitation (mm)'
  ])
  .setChartType('ComboChart')
  .setOptions({
    title: 'NOAA CFSV2 – Temperature & Precipitations (1984–2024)',
    hAxis: {
      title: 'Year',
      slantedText: true,
      slantedTextAngle: 45,
      ticks: tickYears.getInfo()
    },
    vAxes: {
      0: {title: 'Temperature (°C)'},
      1: {title: 'Precipitations (mm)'}
    },
    seriesType: 'line',
    series: {
      0: {targetAxisIndex: 0, color: '#e31a1c'}, // Température
      1: {targetAxisIndex: 1, type: 'bars', color: '#1f78b4'} // Précipitation
    },
    lineWidth: 2,
    pointSize: 5,
    legend: { position: 'top' }
  });

print(chart);

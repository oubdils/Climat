// 1. Study Area: Oriental Region of Morocco
var region = ee.FeatureCollection("projects/oubdils/assets/zone_jerda");

// 2. Time Period
var startYear = 1984;
var endYear = 2024;

// 3. Load Climate Datasets
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
               .filterBounds(region)
               .filterDate(startYear + '-01-01', endYear + '-12-31');

var terraclimate = ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE")
                      .filterBounds(region)
                      .filterDate(startYear + '-01-01', endYear + '-12-31');

// 4. Compute annual statistics
var years = ee.List.sequence(startYear, endYear);

var yearlyStats = years.map(function(y) {
  var year = ee.Number(y).toInt();
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = ee.Date.fromYMD(year, 12, 31);

  var tmax = terraclimate.filterDate(start, end).select('tmmx').mean().multiply(0.1);
  var tmin = terraclimate.filterDate(start, end).select('tmmn').mean().multiply(0.1);
  var prcp = chirps.filterDate(start, end).select('precipitation').sum();

  var tmean = tmax.add(tmin).divide(2);

  var stats = ee.Image.cat([tmax, tmin, tmean, prcp])
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: region.geometry(),
      scale: 5000,
      maxPixels: 1e9
    });

  return ee.Feature(null, {
    'Year': year.format(),  // formatted as string "2024"
    'Tmax (°C)': stats.get('tmmx'),
    'Tmin (°C)': stats.get('tmmn'),
    'Tmean (°C)': stats.getNumber('tmmx').add(stats.getNumber('tmmn')).divide(2),
    'Precipitation (mm)': stats.get('precipitation')
  });
});

// 5. Create FeatureCollection for charting
var climFC = ee.FeatureCollection(yearlyStats);

// 6. Extract tick labels every 5 years
var tickYears = ee.List.sequence(startYear, endYear, 5).map(function(y) {
  return ee.Number(y).format();
});

// 7. Display the chart
var chart = ui.Chart.feature.byFeature(climFC, 'Year', [
    'Tmax (°C)',
    'Tmin (°C)',
    'Tmean (°C)',
    'Precipitation (mm)'
  ])
  .setChartType('ComboChart')
  .setOptions({
    title: 'Annual Climate Trends (1984–2024) – Oriental Region of Morocco',
    hAxis: {
      title: 'Year',
      slantedText: true,
      slantedTextAngle: 45,
      ticks: tickYears
    },
    vAxes: {
      0: {title: 'Temperature (°C)'},
      1: {title: 'Precipitation (mm)'}
    },
    seriesType: 'line',
    series: {
      0: {targetAxisIndex: 0, color: 'red'},
      1: {targetAxisIndex: 0, color: 'blue'},
      2: {targetAxisIndex: 0, color: 'green'},
      3: {targetAxisIndex: 1, type: 'bars', color: 'steelblue'}
    },
    lineWidth: 2,
    pointSize: 5
  });

print(chart);

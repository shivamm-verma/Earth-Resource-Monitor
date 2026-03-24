import ee
import requests
import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.auth.transport.requests import Request
from datetime import datetime, timedelta
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# INITIALIZE EARTH ENGINE
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

SERVICE_ACCOUNT = os.getenv('GEE_CLIENT_EMAIL')
PRIVATE_KEY = os.getenv('GEE_PRIVATE_KEY', '').replace('\\n', '\n')
PROJECT_ID = os.getenv('GEE_PROJECT_ID', '')
PRIVATE_KEY_ID = os.getenv('GEE_PRIVATE_KEY_ID', '')
CLIENT_ID = os.getenv('GEE_CLIENT_ID', '')
TOKEN_URI = os.getenv('GEE_TOKEN_URI', 'https://oauth2.googleapis.com/token')

if not SERVICE_ACCOUNT or not PRIVATE_KEY:
    raise RuntimeError(
        'Missing GEE credentials. Set GEE_CLIENT_EMAIL and GEE_PRIVATE_KEY in Server/.env.'
    )

service_account_info = {
    'type': 'service_account',
    'project_id': PROJECT_ID,
    'private_key_id': PRIVATE_KEY_ID,
    'private_key': PRIVATE_KEY,
    'client_email': SERVICE_ACCOUNT,
    'client_id': CLIENT_ID,
    'token_uri': TOKEN_URI,
}

CREDENTIALS = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, key_data=json.dumps(service_account_info))
ee.Initialize(CREDENTIALS)

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def get_tile_url(image, vis_params):
    """Returns a proxied tile URL for the given image."""
    map_id = image.getMapId(vis_params)
    original = map_id['tile_fetcher'].url_format
    return original.replace(
        'https://earthengine.googleapis.com/v1/',
        'http://localhost:5000/tiles/'
    )


def parse_dates(request):
    """Parse start/end dates from request, defaulting to last 12 months."""
    end_date   = request.args.get('end_date',   datetime.utcnow().strftime('%Y-%m-%d'))
    start_date = request.args.get('start_date', (datetime.utcnow() - timedelta(days=365)).strftime('%Y-%m-%d'))
    return start_date, end_date


def make_region(lat, lon, buffer_km=50):
    """Create a buffered bounding box around a point."""
    point = ee.Geometry.Point([lon, lat])
    return point.buffer(buffer_km * 1000).bounds()


# ─────────────────────────────────────────────
# TILE PROXY  (fixes 403 errors in browser)
# ─────────────────────────────────────────────
@app.route('/tiles/<path:tile_path>')
def proxy_tile(tile_path):
    gee_url = f"https://earthengine.googleapis.com/v1/{tile_path}"
    CREDENTIALS.refresh(Request())
    response = requests.get(
        gee_url,
        headers={"Authorization": f"Bearer {CREDENTIALS.token}"}
    )
    return response.content, response.status_code, {
        'Content-Type': response.headers.get('Content-Type', 'image/png'),
        'Access-Control-Allow-Origin': '*'
    }


# ─────────────────────────────────────────────
# 1. LAND USE / LAND COVER
# ─────────────────────────────────────────────
@app.route('/api/landcover')
def landcover():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    region = make_region(lat, lon)

    # ESA WorldCover 10m
    esa = ee.ImageCollection('ESA/WorldCover/v200').first().clip(region)
    esa_url = get_tile_url(esa, {'bands': ['Map']})

    # MODIS Land Cover
    modis = (ee.ImageCollection('MODIS/061/MCD12Q1')
             .filterDate('2022-01-01', '2023-01-01')
             .first()
             .select('LC_Type1')
             .clip(region))
    modis_url = get_tile_url(modis, {
        'min': 1, 'max': 17,
        'palette': ['05450a','086a10','54a708','78d203','009900','c6b044',
                    'dcd159','dade48','fbff13','b6ff05','27ff87','c24f44',
                    'a5a5a5','ff6d4c','69fff8','f9ffa4','1c0dff']
    })

    return jsonify({
        'layers': {
            'esa_worldcover': esa_url,
            'modis_landcover': modis_url
        },
        'legend': {
            'esa': 'ESA WorldCover 10m (2021)',
            'modis': 'MODIS MCD12Q1 Land Cover Type 1'
        }
    })


# ─────────────────────────────────────────────
# 2. VEGETATION — NDVI & EVI
# ─────────────────────────────────────────────
@app.route('/api/vegetation')
def vegetation():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    start_date, end_date = parse_dates(request)
    region = make_region(lat, lon)

    # Sentinel-2 NDVI
    s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
          .filterBounds(region)
          .filterDate(start_date, end_date)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
          .median()
          .clip(region))
    ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndvi_url = get_tile_url(ndvi, {
        'min': -1, 'max': 1,
        'palette': ['#d73027','#f46d43','#fdae61','#fee08b','#ffffbf',
                    '#d9ef8b','#a6d96a','#66bd63','#1a9850']
    })

    # MODIS EVI
    modis_vi = (ee.ImageCollection('MODIS/061/MOD13A2')
                .filterBounds(region)
                .filterDate(start_date, end_date)
                .select(['EVI', 'NDVI'])
                .mean()
                .clip(region))
    evi_url = get_tile_url(modis_vi.select('EVI'), {
        'min': 0, 'max': 8000,
        'palette': ['brown','yellow','green','darkgreen']
    })
    modis_ndvi_url = get_tile_url(modis_vi.select('NDVI'), {
        'min': 0, 'max': 10000,
        'palette': ['brown','yellow','lightgreen','green','darkgreen']
    })

    # Landsat 8/9 NDVI
    landsat = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
               .filterBounds(region)
               .filterDate(start_date, end_date)
               .filter(ee.Filter.lt('CLOUD_COVER', 20))
               .median()
               .clip(region))
    ls_ndvi = landsat.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
    ls_ndvi_url = get_tile_url(ls_ndvi, {
        'min': -1, 'max': 1,
        'palette': ['#d73027','#fee08b','#ffffbf','#a6d96a','#1a9850']
    })

    # NDVI time series (monthly means as JSON)
    year = int(end_date[:4])

    def monthly_ndvi(month):
        m = ee.Number(month)
        start = ee.Date.fromYMD(year, m, 1)
        end   = start.advance(1, 'month')
        mean_ndvi = (ee.ImageCollection('MODIS/061/MOD13A2')
                     .filterDate(start, end)
                     .filterBounds(region)
                     .select('NDVI')
                     .mean()
                     .reduceRegion(ee.Reducer.mean(), region, 1000)
                     .get('NDVI'))
        return ee.Feature(None, {'month': month, 'ndvi': mean_ndvi})

    months = ee.List.sequence(1, 12)
    time_series = ee.FeatureCollection(months.map(monthly_ndvi)).getInfo()

    return jsonify({
        'layers': {
            'sentinel2_ndvi': ndvi_url,
            'modis_evi': evi_url,
            'modis_ndvi': modis_ndvi_url,
            'landsat9_ndvi': ls_ndvi_url
        },
        'time_series': time_series
    })


# ─────────────────────────────────────────────
# 3. WATER BODIES & HYDROLOGY
# ─────────────────────────────────────────────
@app.route('/api/water')
def water():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    start_date, end_date = parse_dates(request)
    region = make_region(lat, lon)

    # JRC Surface Water
    jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(region)
    occurrence_url = get_tile_url(jrc.select('occurrence'), {
        'min': 0, 'max': 100,
        'palette': ['white','lightblue','blue','darkblue']
    })
    seasonality_url = get_tile_url(jrc.select('seasonality'), {
        'min': 0, 'max': 12,
        'palette': ['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494']
    })

    # JRC monthly water (change detection)
    jrc_monthly = (ee.ImageCollection('JRC/GSW1_4/MonthlyHistory')
                   .filterDate(start_date, end_date)
                   .filterBounds(region)
                   .select('water')
                   .mean()
                   .clip(region))
    monthly_url = get_tile_url(jrc_monthly, {
        'min': 0, 'max': 2,
        'palette': ['white','grey','blue']
    })

    # HydroSHEDS river network (flow accumulation)
    hydrosheds = ee.Image('WWF/HydroSHEDS/15ACC').clip(region)
    hydro_url = get_tile_url(hydrosheds.log10(), {
        'min': 0, 'max': 6,
        'palette': ['white','lightblue','blue','darkblue','navy']
    })

    return jsonify({
        'layers': {
            'jrc_occurrence': occurrence_url,
            'jrc_seasonality': seasonality_url,
            'jrc_monthly': monthly_url,
            'hydrosheds_flow': hydro_url
        }
    })


# ─────────────────────────────────────────────
# 4. SOIL & TERRAIN
# ─────────────────────────────────────────────
@app.route('/api/terrain')
def terrain():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    region = make_region(lat, lon)

    # SRTM Elevation
    srtm = ee.Image('USGS/SRTMGL1_003').clip(region)
    elevation_url = get_tile_url(srtm, {
        'min': 0, 'max': 3000,
        'palette': ['#006633','#E5FFCC','#662A00','#D8D8D8','#F5F5F5']
    })

    # Slope & Aspect from SRTM
    terrain_img = ee.Terrain.products(srtm)
    slope_url = get_tile_url(terrain_img.select('slope'), {
        'min': 0, 'max': 60,
        'palette': ['green','yellow','orange','red']
    })
    aspect_url = get_tile_url(terrain_img.select('aspect'), {
        'min': 0, 'max': 360,
        'palette': ['#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff','#ff0000']
    })

    # Hillshade
    hillshade_url = get_tile_url(terrain_img.select('hillshade'), {
        'min': 0, 'max': 255,
        'palette': ['black','white']
    })

    # ASTER DEM
    aster = ee.Image('NASA/ASTER_GED/AG100_003').select('elevation').clip(region)
    aster_url = get_tile_url(aster, {
        'min': 0, 'max': 3000,
        'palette': ['#006633','#E5FFCC','#662A00','#D8D8D8','#F5F5F5']
    })

    # Elevation stats for the region
    stats = srtm.reduceRegion(
        reducer=ee.Reducer.minMax().combine(ee.Reducer.mean(), sharedInputs=True),
        geometry=region,
        scale=30,
        maxPixels=1e9
    ).getInfo()

    return jsonify({
        'layers': {
            'srtm_elevation': elevation_url,
            'slope': slope_url,
            'aspect': aspect_url,
            'hillshade': hillshade_url,
            'aster_elevation': aster_url
        },
        'stats': stats
    })


# ─────────────────────────────────────────────
# 5. CLIMATE & WEATHER
# ─────────────────────────────────────────────
@app.route('/api/climate')
def climate():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    start_date, end_date = parse_dates(request)
    region = make_region(lat, lon)

    # ERA5 — Temperature & Precipitation
    era5 = (ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
            .filterDate(start_date, end_date)
            .filterBounds(region)
            .select(['temperature_2m', 'total_precipitation_sum'])
            .mean()
            .clip(region))

    temp_url = get_tile_url(
        era5.select('temperature_2m').subtract(273.15),  # K → °C
        {
            'min': -20, 'max': 45,
            'palette': ['#313695','#4575b4','#74add1','#abd9e9','#e0f3f8',
                        '#ffffbf','#fee090','#fdae61','#f46d43','#d73027','#a50026']
        }
    )
    precip_url = get_tile_url(era5.select('total_precipitation_sum'), {
        'min': 0, 'max': 0.01,
        'palette': ['white','lightblue','blue','darkblue','navy']
    })

    # CHIRPS Rainfall
    chirps = (ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
              .filterDate(start_date, end_date)
              .filterBounds(region)
              .sum()
              .clip(region))
    chirps_url = get_tile_url(chirps, {
        'min': 0, 'max': 2000,
        'palette': ['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494']
    })

    # Monthly climate time series
    def monthly_climate(month):
        m = ee.Number(month)
        yr = ee.Number(int(end_date[:4]))
        start = ee.Date.fromYMD(yr, m, 1)
        end_m = start.advance(1, 'month')
        stats = (ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
                 .filterDate(start, end_m)
                 .filterBounds(region)
                 .select(['temperature_2m', 'total_precipitation_sum'])
                 .mean()
                 .reduceRegion(ee.Reducer.mean(), region, 11132)
                 )
        return ee.Feature(None, {'month': month,
                                  'temp_k': stats.get('temperature_2m'),
                                  'precip': stats.get('total_precipitation_sum')})

    months = ee.List.sequence(1, 12)
    time_series = ee.FeatureCollection(months.map(monthly_climate)).getInfo()

    return jsonify({
        'layers': {
            'era5_temperature': temp_url,
            'era5_precipitation': precip_url,
            'chirps_rainfall': chirps_url
        },
        'time_series': time_series
    })


# ─────────────────────────────────────────────
# 6. DISASTER & HAZARD LAYERS
# ─────────────────────────────────────────────
@app.route('/api/hazards')
def hazards():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    start_date, end_date = parse_dates(request)
    region = make_region(lat, lon)

    # MODIS Active Fire
    fire = (ee.ImageCollection('MODIS/061/MOD14A1')
            .filterDate(start_date, end_date)
            .filterBounds(region)
            .select('FireMask')
            .max()
            .clip(region))
    fire_url = get_tile_url(fire, {
        'min': 0, 'max': 9,
        'palette': ['black','grey','grey','grey','lightgrey',
                    'yellow','orange','red','darkred','white']
    })

    # MODIS Burned Area
    burned = (ee.ImageCollection('MODIS/061/MCD64A1')
              .filterDate(start_date, end_date)
              .filterBounds(region)
              .select('BurnDate')
              .max()
              .clip(region))
    burned_url = get_tile_url(burned, {
        'min': 0, 'max': 366,
        'palette': ['black','red','orange','yellow']
    })

    # SRTM-based Landslide Risk (slope proxy)
    srtm = ee.Image('USGS/SRTMGL1_003').clip(region)
    slope = ee.Terrain.slope(srtm)
    landslide_risk = slope.gt(15).multiply(slope).clip(region)
    landslide_url = get_tile_url(landslide_risk, {
        'min': 0, 'max': 60,
        'palette': ['green','yellow','orange','red','darkred']
    })

    # JRC Flood Occurrence (as flood proxy)
    flood = (ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
             .select('max_extent')
             .clip(region))
    flood_url = get_tile_url(flood, {
        'min': 0, 'max': 1,
        'palette': ['white','blue']
    })

    return jsonify({
        'layers': {
            'modis_fire': fire_url,
            'modis_burned_area': burned_url,
            'landslide_risk': landslide_url,
            'flood_extent': flood_url
        }
    })


# ─────────────────────────────────────────────
# 7. URBAN & INFRASTRUCTURE
# ─────────────────────────────────────────────
@app.route('/api/urban')
def urban():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    start_date, end_date = parse_dates(request)
    region = make_region(lat, lon)

    # VIIRS Night Lights
    viirs = (ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
             .filterDate(start_date, end_date)
             .filterBounds(region)
             .select('avg_rad')
             .mean()
             .clip(region))
    viirs_url = get_tile_url(viirs, {
        'min': 0, 'max': 60,
        'palette': ['black','darkblue','blue','yellow','white']
    })

    # GHSL Built-up Area
    ghsl = (ee.ImageCollection('JRC/GHSL/P2023A/GHS_BUILT_S')
            .filterDate('2020-01-01', '2021-01-01')
            .first()
            .clip(region))
    ghsl_url = get_tile_url(ghsl, {
        'min': 0, 'max': 8000,
        'palette': ['black','grey','orange','red']
    })

    # GHSL Population
    pop = (ee.ImageCollection('JRC/GHSL/P2023A/GHS_POP')
           .filterDate('2020-01-01', '2021-01-01')
           .first()
           .clip(region))
    pop_url = get_tile_url(pop, {
        'min': 0, 'max': 1000,
        'palette': ['black','darkblue','blue','green','yellow','orange','red','white']
    })

    # Urban population stats
    pop_stats = pop.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=region,
        scale=100,
        maxPixels=1e9
    ).getInfo()

    return jsonify({
        'layers': {
            'viirs_nightlights': viirs_url,
            'ghsl_builtup': ghsl_url,
            'ghsl_population': pop_url
        },
        'stats': {
            'estimated_population': pop_stats
        }
    })


# ─────────────────────────────────────────────
# ALL LAYERS IN ONE CALL
# ─────────────────────────────────────────────
@app.route('/api/maps')
def all_maps():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    start_date, end_date = parse_dates(request)
    region = make_region(lat, lon)

    # Satellite base (Sentinel-2)
    s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
          .filterBounds(region)
          .filterDate(start_date, end_date)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
          .median()
          .clip(region))
    satellite_url = get_tile_url(s2, {
        'bands': ['B4', 'B3', 'B2'], 'min': 0, 'max': 3000
    })
    ndvi = s2.normalizedDifference(['B8', 'B4'])
    ndvi_url = get_tile_url(ndvi, {
        'min': -1, 'max': 1,
        'palette': ['brown','yellow','green']
    })
    esa = ee.ImageCollection('ESA/WorldCover/v200').first().clip(region)
    landcover_url = get_tile_url(esa, {'bands': ['Map']})
    srtm = ee.Image('USGS/SRTMGL1_003').clip(region)
    elevation_url = get_tile_url(srtm, {
        'min': 0, 'max': 3000,
        'palette': ['#006633','#E5FFCC','#662A00','#D8D8D8','#F5F5F5']
    })
    viirs = (ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
             .filterDate(start_date, end_date)
             .filterBounds(region)
             .select('avg_rad').mean().clip(region))
    nightlights_url = get_tile_url(viirs, {
        'min': 0, 'max': 60,
        'palette': ['black','darkblue','blue','yellow','white']
    })
    fire = (ee.ImageCollection('MODIS/061/MOD14A1')
            .filterDate(start_date, end_date)
            .filterBounds(region)
            .select('FireMask').max().clip(region))
    fire_url = get_tile_url(fire, {
        'min': 0, 'max': 9,
        'palette': ['black','grey','grey','grey','lightgrey',
                    'yellow','orange','red','darkred','white']
    })
    jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(region)
    water_url = get_tile_url(jrc.select('occurrence'), {
        'min': 0, 'max': 100,
        'palette': ['white','lightblue','blue','darkblue']
    })

    return jsonify({
        'center': {'lat': lat, 'lon': lon},
        'date_range': {'start': start_date, 'end': end_date},
        'tiles': {
            'satellite':   satellite_url,
            'ndvi':        ndvi_url,
            'landcover':   landcover_url,
            'elevation':   elevation_url,
            'nightlights': nightlights_url,
            'fire':        fire_url,
            'water':       water_url
        }
    })


# ─────────────────────────────────────────────
# EXPORT — GeoTIFF or JSON
# ─────────────────────────────────────────────
@app.route('/api/export')
def export():
    lat        = float(request.args.get('lat'))
    lon        = float(request.args.get('lon'))
    layer      = request.args.get('layer', 'elevation')   # which layer
    fmt        = request.args.get('format', 'json')       # 'json' or 'geotiff'
    start_date, end_date = parse_dates(request)
    region     = make_region(lat, lon, buffer_km=10)

    # Pick the image
    if layer == 'elevation':
        image = ee.Image('USGS/SRTMGL1_003').clip(region)
        scale = 30
    elif layer == 'ndvi':
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(region).filterDate(start_date, end_date)
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
              .median().clip(region))
        image = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
        scale = 10
    elif layer == 'landcover':
        image = ee.ImageCollection('ESA/WorldCover/v200').first().clip(region)
        scale = 10
    elif layer == 'nightlights':
        image = (ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
                 .filterDate(start_date, end_date).filterBounds(region)
                 .select('avg_rad').mean().clip(region))
        scale = 500
    else:
        return jsonify({'error': f'Unknown layer: {layer}'}), 400

    if fmt == 'json':
        # Return pixel stats as JSON
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean().combine(
                ee.Reducer.minMax(), sharedInputs=True).combine(
                ee.Reducer.stdDev(), sharedInputs=True),
            geometry=region,
            scale=scale,
            maxPixels=1e9
        ).getInfo()
        return jsonify({
            'layer': layer,
            'date_range': {'start': start_date, 'end': end_date},
            'stats': stats
        })

    elif fmt == 'geotiff':
        # Start a GEE export task and return the task ID
        task = ee.batch.Export.image.toDrive(
            image=image,
            description=f'{layer}_export',
            folder='GEE_Exports',
            fileNamePrefix=f'{layer}_{lat}_{lon}',
            region=region,
            scale=scale,
            fileFormat='GeoTIFF',
            maxPixels=1e9
        )
        task.start()
        return jsonify({
            'message': 'GeoTIFF export started. Check Google Drive → GEE_Exports folder.',
            'task_id': task.id,
            'layer': layer
        })

    return jsonify({'error': 'format must be json or geotiff'}), 400


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(port=5000, debug=True)

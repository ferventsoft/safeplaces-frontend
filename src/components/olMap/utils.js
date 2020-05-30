import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM as OSMSource, TileImage } from 'ol/source';
import { Style, Icon, Fill, Stroke } from 'ol/style';
import BingMaps from 'ol/source/BingMaps.js';
import XYZ from 'ol/source/XYZ.js';
import { GlobalConfiguration } from './mapConfiguration';
const styleCache = {};
const hereLayers = [
  {
    base: 'base',
    type: 'maptile',
    scheme: 'normal.day',
    app_id: process.env.REACT_APP_HERE_APP_ID,
    app_code: process.env.REACT_APP_HERE_APP_CODE,
  },
  {
    base: 'base',
    type: 'maptile',
    scheme: 'normal.day.transit',
    app_id: process.env.REACT_APP_HERE_APP_ID,
    app_code: process.env.REACT_APP_HERE_APP_CODE,
  },
  {
    base: 'base',
    type: 'maptile',
    scheme: 'pedestrian.day',
    app_id: process.env.REACT_APP_HERE_APP_ID,
    app_code: process.env.REACT_APP_HERE_APP_CODE,
  },
  {
    base: 'aerial',
    type: 'maptile',
    title: 'Here Terrain Day',
    scheme: 'terrain.day',
    app_id: process.env.REACT_APP_HERE_APP_ID,
    app_code: process.env.REACT_APP_HERE_APP_CODE,
  },
  {
    base: 'aerial',
    type: 'maptile',
    title: 'Here Satellite',
    scheme: 'satellite.day',
    app_id: process.env.REACT_APP_HERE_APP_ID,
    app_code: process.env.REACT_APP_HERE_APP_CODE,
  },
  {
    base: 'aerial',
    type: 'maptile',
    title: 'Here Hybrid Day',
    scheme: 'hybrid.day',
    app_id: process.env.REACT_APP_HERE_APP_ID,
    app_code: process.env.REACT_APP_HERE_APP_CODE,
  },
];
const hereUrlTpl =
  'https://{1-4}.{base}.maps.cit.api.here.com' +
  '/{type}/2.1/maptile/newest/{scheme}/{z}/{x}/{y}/256/png' +
  '?app_id={app_id}&app_code={app_code}';

function createUrl(tpl, layerDesc) {
  return tpl
    .replace('{base}', layerDesc.base)
    .replace('{type}', layerDesc.type)
    .replace('{scheme}', layerDesc.scheme)
    .replace('{app_id}', layerDesc.app_id)
    .replace('{app_code}', layerDesc.app_code);
}
export const loadBaseMaps = map => {
  const tileWorldImagery = new TileLayer({
    source: new XYZ({
      url: GlobalConfiguration.mapURL.tileWorldImagery,
      crossOrigin: 'Anonymous',
      attributions:
        'Esri, © OpenStreetMap contributors, HERE, Garmin, NGA, USGS',
    }),
    visible: false,
    title: 'World Imagery',
    type: 'base',
  });
  const StreetBaseMap = new TileLayer({
    source: new XYZ({
      url: GlobalConfiguration.mapURL.StreetBaseMap,
      crossOrigin: 'Anonymous',
      attributions:
        'Esri, © OpenStreetMap contributors, HERE, Garmin, NGA, USGS',
    }),
    title: 'Street Map',
    type: 'base',
    visible: true,
  });
  const MapBoxBase = new TileLayer({
    source: new XYZ({
      url:
        GlobalConfiguration.mapURL.mapBoxUrl +
        `?access_token=${process.env.REACT_APP_MAPBOX_KEY}`,
      crossOrigin: 'Anonymous',
      attributions: 'Mapbox',
    }),
    title: 'MapBox',
    type: 'base',
    visible: true,
  });
  const NationalGeoBaseMap = new TileLayer({
    source: new XYZ({
      url: GlobalConfiguration.mapURL.nationalGeoBaseMap,
      crossOrigin: 'Anonymous',
      attributions:
        'Esri, © OpenStreetMap contributors, HERE, Garmin, NGA, USGS',
    }),
    title: 'National Geographic Map',
    type: 'base',
    visible: false,
  });
  const googleMap = new TileLayer({
    visible: false,
    source: new TileImage({ url: GlobalConfiguration.mapURL.googleBaseMap }),
    title: 'Google',
    type: 'base',
  });
  const bingMap = new TileLayer({
    visible: false,
    preload: Infinity,
    source: new BingMaps({
      key: process.env.REACT_APP_BING_KEY,
      imagerySet: 'Road',
    }),
    title: 'Bing',
    type: 'base',
  });
  var tileOSM = new TileLayer({
    source: new OSMSource(),
    visible: false,
    title: 'OSM',
    type: 'base',
  });
  const baseLayerList = [];
  var i, ii;
  baseLayerList.push(tileWorldImagery);
  baseLayerList.push(googleMap);
  baseLayerList.push(bingMap);
  baseLayerList.push(NationalGeoBaseMap);
  baseLayerList.push(StreetBaseMap);
  baseLayerList.push(tileOSM);
  for (i = 0, ii = hereLayers.length; i < ii; ++i) {
    var layerDesc = hereLayers[i];
    baseLayerList.push(
      new TileLayer({
        type: 'base',
        maxResolution: layerDesc.maxResolution,
        preload: Infinity,
        title: layerDesc.title,
        source: new XYZ({
          url: createUrl(hereUrlTpl, layerDesc),
          attributions:
            'Map Tiles &copy; ' +
            new Date().getFullYear() +
            ' ' +
            '<a href="http://developer.here.com">HERE</a>',
        }),
      }),
    );
  }
  baseLayerList.push(MapBoxBase);
  baseLayerList.forEach(layer => {
    map.addLayer(layer);
  });
};

export const styleEntryFeature = (feature, resolution) => {
  try {
    let iconUrl = '';
    const seleted =
      feature.get('selected') === undefined
        ? 'default'
        : feature.get('selected');
    const num = feature.get('num') === undefined ? 'line' : feature.get('num');
    let trash =
      feature.get('trash') === undefined ? false : feature.get('trash');
    if (trash === 'true') {
      trash = true;
    } else if (trash === 'false') {
      trash = false;
    }
    if (!styleCache[num + seleted + trash]) {
      if (!isNaN(num)) {
        iconUrl = require(`../../assets/images/number-${
          seleted === 'true' ? 'selected' : 'default'
        }/number_${num}.png`);
      } else {
        iconUrl =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      }
      styleCache[num + seleted + trash] = new Style({
        image: new Icon({
          anchor: [0.5, 36],
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          src: iconUrl,
          opacity: trash ? 0 : 1,
        }),
        stroke: new Stroke({
          color: [255, 0, 255, 1],
          width: 2,
          lineDash: [4, 8],
          lineDashOffset: 6,
          opacity: 1,
        }),
      });
    }
    return [styleCache[num + seleted + trash]];
  } catch (error) {
    console.log(error);
    return null;
  }
};

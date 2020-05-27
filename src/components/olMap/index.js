import React, { Component, createRef } from 'react';
import mapboxgl from 'mapbox-gl';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat, toLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { defaults as defaultControls } from 'ol/control';
import { GeoJSON } from 'ol/format';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';
import LayerSwitcher from 'ol-layerlist';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

import { loadBaseMaps, styleEntryFeature } from './utils';
import Track from './trackPath';
import { getFilteredTrackPath } from '../../selectors';
import styles from './styles.module.scss';
import 'ol/ol.css';
import 'ol-layerlist/src/ol-layerlist.css';
import moment from 'moment';
import { setMapCoordinate } from '../../ducks/map';
import { connect } from 'react-redux';
let content = null;

class MapComponent extends Component {
  constructor(props) {
    super(props);
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY;
    this.state = {
      viewport: {
        width: 400,
        height: 300,
        latitude: 37.7577,
        longitude: -122.4376,
        zoom: 8,
      },
      currentEntryId: '',
    };
    this.mapRef = createRef();
    this.map = null;
    this.trackLayer = null;
    this.LayerSwitcherButton = React.createRef();
    this.handleMapClick = this.handleMapClick.bind(this);
    this.customStyleFunction = styleEntryFeature;
    this.overlay = null;
  }

  componentDidMount() {
    const container = document.getElementById('popup');
    content = document.getElementById('popup-content');
    const closer = document.getElementById('popup-closer');
    this.overlay = new Overlay({
      element: container,
      autoPan: true,
      autoPanAnimation: {
        duration: 250,
      },
    });
    closer.onclick = () => {
      this.overlay.setPosition(undefined);
      closer.blur();
      return false;
    };
    this.initMap();
  }

  componentWillReceiveProps(nextProps) {
    try {
      if (nextProps.cases !== this.props.cases) {
        const historyMapData = Track({
          trackPath: getFilteredTrackPath(nextProps.state),
        });
        this.updatePathOnMap(historyMapData);
      }
      if (nextProps.currentPointId !== this.props.currentPointId) {
        this.setState({ currentPointId: nextProps.currentPointId });
        const source = this.trackLayer.getSource();
        const features = source.getFeatures();
        features.forEach(feature => {
          if (feature.get('id') === nextProps.currentPointId) {
            feature.set('selected', 'true');
          } else {
            feature.set('selected', 'false');
          }
        });
        this.trackLayer.setSource(null);
        this.trackLayer.setSource(source);
      }
    } catch (e) {
      console.log(e);
    }
  }

  updatePathOnMap = historyMapData => {
    if (historyMapData === undefined) {
      historyMapData = Track({
        trackPath: getFilteredTrackPath(this.props.state),
      });
    }
    const { points, lines } = historyMapData;
    if (this.trackLayer !== null) {
      const trackSource = this.trackLayer.getSource();
      trackSource.clear();
      const features = new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      }).readFeatures(points);
      const linesFeatures = new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      }).readFeatures(lines);
      // if (features.length > 1) {
      trackSource.addFeatures(linesFeatures);
      // }
      trackSource.addFeatures(features);
      this.trackLayer.setSource(null);
      this.trackLayer.setSource(trackSource);
      if (features.length > 1) {
        this.map.getView().fit(trackSource.getExtent());
      } else if (features.length === 1) {
        this.map
          .getView()
          .setCenter(features[0].getGeometry().getCoordinates());
        this.map.getView().setZoom(this.state.viewport.zoom);
      }
    }
  };

  initMap() {
    try {
      const { viewport } = this.state;
      this.map = new Map({
        controls: defaultControls().extend([]),
        target: 'map',
        overlays: [this.overlay],
        view: new View({
          center: fromLonLat([viewport.longitude, viewport.latitude]),
          zoom: viewport.zoom,
        }),
      });
      const curobj = this;
      loadBaseMaps(this.map);
      const layerSwitcher = new LayerSwitcher({
        tipLabel: 'Legend', // Optional label for button
        className: 'treeview',
      });
      this.map.addControl(layerSwitcher);
      const geocoder = new MapboxGeocoder({
        marker: true,
        mapboxgl: mapboxgl,
        accessToken: mapboxgl.accessToken,
      });
      // geocoder.onAdd(this.map);
      geocoder.addTo('#geocoder');
      geocoder.on('result', function (e) {
        const centerTo = fromLonLat(e.result.geometry.coordinates);
        curobj.addNewPoint(centerTo);
        // this looks good for the same resolution(zoom) moving
        const view = curobj.map.getView();
        const centerFrom = view.getCenter();
        const resolution = view.getResolutionForExtent(view.calculateExtent());
        const duration = 3000;
        view.animate(
          {
            resolution: resolution * 4, // jump effect
            center: [
              (centerFrom[0] + centerTo[0]) / 2,
              (centerFrom[1] + centerTo[1]) / 2,
            ],
            duration: duration / 2,
          },
          {
            resolution: resolution, // back again
            center: centerTo,
            duration: duration / 2,
          },
        );
      });
      this.map.once('postrender', function (e) {
        const trackSource = new VectorSource();
        curobj.trackLayer = new VectorLayer({
          id: 'trackLayer',
          source: trackSource,
          style: curobj.customStyleFunction,
        });
        curobj.map.addLayer(curobj.trackLayer);
        curobj.updatePathOnMap();
      });

      this.map.on('singleclick', curobj.handleMapClick);
      this.map.on('pointermove', curobj.handleMapOver.bind(this));
    } catch (e) {
      console.log(e);
    }
  }

  handleMapOver = evt => {
    const features = this.map.forEachFeatureAtPixel(
      evt.pixel,
      function (feature, layer) {
        return feature;
      },
      { hitTolerance: 10 },
      function (layer) {
        return layer.get('id') === this.trackLayer.get('id');
      },
    );

    if (features) {
      const {
        cases: { entries },
        currentPointId,
        currentEntryId,
      } = this.props;
      if (entries[currentEntryId] !== undefined) {
        const point = entries[currentEntryId].points[features.get('id')];
        if (point !== undefined && entries[currentEntryId] !== undefined) {
          content.innerHTML = `<p>Date & Time:</p>${moment(
            new Date(point.time),
          ).format('YYYY-MM-DD HH:mm:ss')}`;
          this.overlay.setPosition(
            fromLonLat([point.longitude, point.latitude]),
          );
        } else {
          this.overlay.setPosition(null);
        }
      }
    } else {
      this.overlay.setPosition(null);
    }
  };

  handleMapClick = e => {
    const { currentPointId } = this.state;
    if (currentPointId === '' || currentPointId === undefined) {
      return false;
    }

    const { dispatch } = this.props;
    dispatch(setMapCoordinate(toLonLat(e.coordinate)));
    this.addNewPoint(e.coordinate);
  };

  addNewPoint(coordinate) {
    const feature = new Feature({
      geometry: new Point(coordinate),
      num: '0',
      selected: 'true',
      trash: false,
    });
    const features = this.trackLayer.getSource().getFeatures();
    features.forEach(f => {
      if (f.get('num') === '0') {
        this.trackLayer.getSource().removeFeature(f);
      }
    });
    this.trackLayer.getSource().addFeature(feature);
  }

  render() {
    return (
      <>
        <div id="map" ref={this.mapRef} className={`${styles.map}`}>
          <div id="popup" className={`${styles.olPopup}`}>
            <a
              href="#"
              id="popup-closer"
              className={`${styles.olPopupCloser}`}
            ></a>
            <div id="popup-content"></div>
          </div>
          <div id="geocoder" className={`${styles.geocoder}`}></div>
        </div>
      </>
    );
  }
}

// Connect Component
function mapStateToProps(state) {
  const { cases } = state;
  return {
    cases,
    state,
  };
}

// function mapDispatchToProps(dispatch) {
//     return bindActionCreators({}, dispatch);
// }

export default connect(mapStateToProps, null)(MapComponent);

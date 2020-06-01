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
import { buffer } from 'ol/extent';
import Feature from 'ol/Feature';
import { addSelected } from '../../ducks/selectedPoints';
import LayerSwitcher from 'ol-layerlist';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import ContextMenu from 'ol-contextmenu';
import 'ol-contextmenu/dist/ol-contextmenu.css';
import { loadBaseMaps, styleEntryFeature } from './utils';
import Track from './trackPath';
import { getFilteredTrackPath } from '../../selectors';
import styles from './styles.module.scss';
import 'ol/ol.css';
import 'ol-layerlist/src/ol-layerlist.css';
import moment from 'moment';
import { setMapCoordinate } from '../../ducks/map';
import cases from '../../ducks/cases';
import { connect } from 'react-redux';
import { MultiSelectControl } from './multiSelect';
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
    this.contextmenu = null;
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
    this.addContextMenu();
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
      if (nextProps.selectedPoints !== this.props.selectedPoints) {
        const source = this.trackLayer.getSource();
        const features = source.getFeatures();
        features.forEach(feature => {
          if (nextProps.selectedPoints.indexOf(feature.get('id')) > -1) {
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
      const { selectedPoints } = this.props;

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
      features.forEach(f => {
        if (selectedPoints.indexOf(f.get('id')) > -1) {
          f.set('selected', 'true');
        }
      });
      if (features.length > 1) {
        this.map.getView().fit(buffer(trackSource.getExtent(), 50000));
      } else if (features.length === 1) {
        this.map
          .getView()
          .setCenter(features[0].getGeometry().getCoordinates());
        this.map.getView().setZoom(this.state.viewport.zoom);
      }
    }
  };

  selectMultiple(feature) {
    const geom = feature.getGeometry();
    const source = this.trackLayer.getSource();
    const features = source.getFeatures();
    const selected = [];
    const { selectedPoints, dispatch } = this.props;

    const newSelect = [];
    features.forEach(f => {
      if (geom.intersectsCoordinate(f.getGeometry().getCoordinates())) {
        const id = f.get('id');
        if (newSelect.indexOf(id) < 0) {
          newSelect.push(id);
        }
      }
    });
    dispatch(addSelected([]));
    dispatch(addSelected([...newSelect]));
  }

  initMap() {
    try {
      const { viewport } = this.state;
      const multiSelectCtrl = new MultiSelectControl();
      this.map = new Map({
        controls: defaultControls().extend([multiSelectCtrl]),
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
      multiSelectCtrl.on('drawend', feature => {
        this.selectMultiple(feature);
      });
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
      // this.map.on('pointermove', curobj.handleMapOver.bind(this));
    } catch (e) {
      console.log(e);
    }
  }

  removeMarker = obj => {
    const { dispatch } = this.props;
    dispatch(cases.actions.removeEntry(obj.data.marker.get('id')));
  };

  editMarker = obj => {
    const { dispatch, history, currentEntryId } = this.props;
    const id = obj.data.marker.get('id');
    dispatch(addSelected([id]));
    history.push(`/${currentEntryId}/edit/${id}`);
  };

  addContextMenu() {
    this.map.getViewport().addEventListener('contextmenu', function (evt) {
      evt.preventDefault();
    });
    const removeMarkerItem = {
      text: 'Remove',
      classname: `${styles.contextIcon} ${styles.removeIcon}`,
      callback: this.removeMarker.bind(this),
    };
    const editMarkerItem = {
      text: 'Edit',
      classname: `${styles.contextIcon} ${styles.editIcon}`,
      callback: this.editMarker.bind(this),
    };
    const contextmenu = new ContextMenu({
      width: 170,
      defaultItems: true, // defaultItems are (for now) Zoom In/Zoom Out
      items: [],
    });
    const curobj = this;
    this.contextmenu = contextmenu;
    contextmenu.on('beforeopen', function (evt) {
      var feature = curobj.map.forEachFeatureAtPixel(evt.pixel, function (
        ft,
        layer,
      ) {
        return ft;
      });
      if (feature && feature.get('id') !== undefined) {
        const {
          cases: { entries },
          currentEntryId,
        } = curobj.props;
        contextmenu.enable();
        contextmenu.clear();
        removeMarkerItem.data = { marker: feature };
        editMarkerItem.data = { marker: feature };
        const point = entries[currentEntryId].points[feature.get('id')];
        if (point !== undefined && entries[currentEntryId] !== undefined) {
          const text = `<div class="${styles.contextTitle}"><small>${
            point.street
          }</small>
          <p>${moment(new Date(point.time)).format(
            'ddd, MMM D, YYYY HH:mm',
          )}</p></div>`;
          const details = {
            text: text,
            classname: styles.contextTitle,
          };

          contextmenu.push(details);
          contextmenu.push('-');
        }

        contextmenu.push(removeMarkerItem);
        contextmenu.push(editMarkerItem);
        contextmenu.extend(contextmenu.getDefaultItems());
      } else {
        contextmenu.clear();
        contextmenu.disable();
        contextmenu.extend(contextmenu.getDefaultItems());
        contextmenu.close();
      }
      //  else if (restore) {
      //   contextmenu.clear();
      //   contextmenu.extend(contextmenu_items);
      //   contextmenu.extend(contextmenu.getDefaultItems());
      //   restore = false;
      // }
    });
    this.map.addControl(contextmenu);
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

  disableContextMenu = () => {
    this.contextmenu.clear();
    this.contextmenu.disable();
    this.contextmenu.extend(this.contextmenu.getDefaultItems());
    this.contextmenu.close();
  };

  handleMapClick = e => {
    const { currentPointId } = this.state;
    this.disableContextMenu();
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
  const { cases, selectedPoints } = state;
  return {
    cases,
    state,
    selectedPoints,
  };
}

// function mapDispatchToProps(dispatch) {
//     return bindActionCreators({}, dispatch);
// }

export default connect(mapStateToProps, null)(MapComponent);

import * as React from 'react';
import { Control } from 'ol/control';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Draw, { createBox } from 'ol/interaction/Draw';
import { platformModifierKeyOnly, shiftKeyOnly } from 'ol/events/condition';
import ToggleButton from 'react-toggle-button';

const element = document.createElement('div');

export class MultiSelectControl extends Control {
  eventListeners = {};
  expanded = false;
  containerElement;

  constructor(options = { enabled: false }) {
    super({ element: element });
    this.state = { enabled: options.enabled };
    this.draw = null;
    element.innerHTML = ''; // it may contain the previous element
    element.className = 'ol-control ol-multiselect';
    element.appendChild(this.getButtonHTML());
    this.source = null;
    this.vector = null;
  }

  on(eventName, listener, option?): any {
    this.eventListeners[eventName] = listener;
    return listener;
  }

  enable = options => {
    // let lonLat: [number, number] = [parseFloat(options.lon), parseFloat(options.lat)];
    // let projection = this.getMap().getView().getProjection();
    // let coord = ol.proj.transform(lonLat, 'EPSG:4326', projection);
    const view = this.getMap().getView();
    console.log(view);
    // let duration = options.duration || 500;
    // let resolution = options.resolution || 2.388657133911758;

    // view.animate(
    //     { duration: duration, resolution: resolution },
    //     { duration: duration, center: coord }
    // );
  };

  renderDrawingTool() {
    const divEle = document.createElement('div');
    divEle.className = 'ol-drawtype';
    const buttonCircle = document.createElement('button');
    buttonCircle.onclick = this.handleDrawType.bind(this);
    buttonCircle.className = 'circle';
    buttonCircle.setAttribute('data', 'Circle');
    divEle.appendChild(buttonCircle);
    const buttonRactangle = document.createElement('button');
    buttonRactangle.onclick = this.handleDrawType.bind(this);
    buttonRactangle.className = 'ractangle';
    buttonRactangle.setAttribute('data', 'Ractangle');
    divEle.appendChild(buttonRactangle);
    const buttonFreehand = document.createElement('button');
    buttonFreehand.onclick = this.handleDrawType.bind(this);
    buttonFreehand.className = 'freehand';
    buttonFreehand.setAttribute('data', 'Polygon');
    divEle.appendChild(buttonFreehand);
    return divEle;
  }

  handleDrawType(e) {
    if (this.vector === null) {
      this.source = new VectorSource({ wrapX: false });
      this.vector = new VectorLayer({
        source: this.source,
      });
      this.getMap().addLayer(this.vector);
    }
    this.addIntraction(e.target.getAttribute('data'));
  }

  addIntraction(value) {
    const map = this.getMap();
    if (this.draw != null) {
      this.source.clear();
      map.removeInteraction(this.draw);
      this.draw = null;
    }

    if (value !== 'None') {
      if (value === 'Ractangle') {
        this.draw = new Draw({
          source: this.source,
          type: value,
          geometryFunction: createBox(),
        });
      } else {
        this.draw = new Draw({
          source: this.source,
          type: value,
        });
      }
      this.draw.on('drawend', e => {
        if (this.eventListeners.drawend) {
          this.eventListeners.drawend(e.feature);
        }
      });
      this.draw.on('drawstart', e => {
        this.source.clear();
        this.vector.setSource(this.source);
      });
      map.addInteraction(this.draw);
    }
  }

  renderNotificationMessage() {
    const dismissEle = document.createElement('strong');
    dismissEle.innerHTML = 'DISMISS';
    const divEle = document.createElement('div');

    divEle.className = 'enabled-notification';
    divEle.innerHTML =
      '<span style="background-color:#fff;color:#000;">🛈</span> You are selecting multiple points. To move the map, Please turn off the "Select Multiple Points" tool.';
    divEle.appendChild(dismissEle);

    dismissEle.onclick = function (evt) {
      divEle.style.display = 'none';
    };
    return divEle;
  }

  getButtonHTML() {
    const curobj = this;
    const divEle = document.createElement('div');
    divEle.appendChild(this.renderDrawingTool());
    const divP = document.createElement('p');

    divP.innerHTML = 'Select Multiple Points';
    const button = document.createElement('button');
    element.setAttribute('data', 'off');
    button.setAttribute('data', 'off');
    button.onclick = function (e) {
      if (element.getAttribute('data') === 'on') {
        document.getElementsByClassName(
          'enabled-notification',
        )[0].style.display = '';
        element.setAttribute('data', 'off');
        button.setAttribute('data', 'off');
        curobj.addIntraction('None');
      } else {
        element.setAttribute('data', 'on');
        button.setAttribute('data', 'on');
      }
    };
    divEle.appendChild(divP);
    divEle.appendChild(button);
    divEle.appendChild(this.renderNotificationMessage());
    return divEle;
  }
}

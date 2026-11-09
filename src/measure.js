import Draw from 'ol/interaction/Draw.js';
import Overlay from 'ol/Overlay.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { getArea, getLength } from 'ol/sphere.js';
import { unByKey } from 'ol/Observable.js';
import { Circle, Fill, Stroke, Style } from 'ol/style.js';
import { formatArea, formatLength } from './util.js';

/** 측정 도형 기본 스타일: 파란 점선 */
const DEFAULT_STYLE = new Style({
  fill: new Fill({ color: 'rgba(37, 99, 235, 0.12)' }),
  stroke: new Stroke({ color: '#2563eb', width: 2.5, lineDash: [8, 6] }),
  image: new Circle({ radius: 4, fill: new Fill({ color: '#2563eb' }) }),
});

/**
 * 거리·면적 측정 도구.
 *
 * 그린 도형마다 결과 라벨이 지도에 남고, clear() 로 한 번에 지운다.
 * 측정값은 구면 계산(ol/sphere)이라 투영 왜곡 없이 실제 거리·면적에 가깝다.
 *
 * 도형 스타일은 opts.style 로 바꾼다 (ol/style 의 Style 또는 스타일 함수).
 *
 * @param {import('ol/Map.js').default} map
 * @param {{onMeasure?: (r: {type: string, value: number, text: string, feature: any}) => void,
 *          format?: {length?: (m: number) => string, area?: (m2: number) => string},
 *          style?: any}} [opts]
 */
export function createMeasureTool(map, { onMeasure, format = {}, style = DEFAULT_STYLE } = {}) {
  const fmt = { length: format.length ?? formatLength, area: format.area ?? formatArea };
  const source = new VectorSource();
  const layer = new VectorLayer({ source, style, zIndex: 1000 });
  layer.set('kitInternal', true);
  map.addLayer(layer);

  const overlays = [];
  let draw = null;
  let activeType = null;
  let liveOverlay = null;
  let geometryKey = null;

  const projection = () => map.getView().getProjection();
  const measureOf = (type, geom) => (type === 'length'
    ? getLength(geom, { projection: projection() })
    : getArea(geom, { projection: projection() }));
  const anchorOf = (type, geom) => (type === 'length'
    ? geom.getLastCoordinate()
    : geom.getInteriorPoint().getCoordinates());

  function makeOverlay(live) {
    const el = document.createElement('div');
    el.className = live ? 'omk-tip omk-tip--live' : 'omk-tip';
    const overlay = new Overlay({ element: el, offset: [0, -12], positioning: 'bottom-center', stopEvent: false });
    map.addOverlay(overlay);
    return overlay;
  }

  function stop() {
    if (draw) {
      map.removeInteraction(draw);
      draw = null;
    }
    if (geometryKey) unByKey(geometryKey);
    geometryKey = null;
    if (liveOverlay) map.removeOverlay(liveOverlay);
    liveOverlay = null;
    activeType = null;
  }

  /** @param {'length'|'area'} type */
  function start(type) {
    if (type !== 'length' && type !== 'area') throw new Error(`[ol-map-kit] unknown measure type "${type}"`);
    stop();
    activeType = type;
    draw = new Draw({ source, type: type === 'length' ? 'LineString' : 'Polygon' });
    map.addInteraction(draw);

    draw.on('drawstart', (evt) => {
      liveOverlay = makeOverlay(true);
      const geom = evt.feature.getGeometry();
      geometryKey = geom.on('change', () => {
        liveOverlay.getElement().textContent = fmt[type](measureOf(type, geom));
        liveOverlay.setPosition(anchorOf(type, geom));
      });
    });

    draw.on('drawend', (evt) => {
      const geom = evt.feature.getGeometry();
      const value = measureOf(type, geom);
      const text = fmt[type](value);
      if (geometryKey) unByKey(geometryKey);
      geometryKey = null;
      if (liveOverlay) map.removeOverlay(liveOverlay);
      liveOverlay = null;

      const fixed = makeOverlay(false);
      fixed.getElement().textContent = text;
      fixed.setPosition(anchorOf(type, geom));
      overlays.push(fixed);
      if (onMeasure) onMeasure({ type, value, text, feature: evt.feature });
    });
  }

  function clear() {
    stop();
    source.clear();
    overlays.splice(0).forEach((o) => map.removeOverlay(o));
  }

  function destroy() {
    clear();
    map.removeLayer(layer);
  }

  return { start, stop, clear, destroy, isActive: () => draw !== null, type: () => activeType };
}

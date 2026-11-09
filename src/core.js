import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import { fromLonLat } from 'ol/proj.js';
import { unByKey } from 'ol/Observable.js';
import { createHooks, mergeOptions } from './util.js';
import { createLayerRegistry } from './layers.js';
import { createMeasureTool } from './measure.js';
import { createToolbar } from './toolbar.js';

export const DEFAULTS = {
  center: [126.978, 37.5665], // 경도, 위도
  zoom: 12,
  minZoom: undefined,
  maxZoom: 20,
  projection: 'EPSG:3857',
  base: 'osm', // 'osm' | false | ol 레이어 인스턴스
  layers: [],
  tools: {
    measure: true,
    layerSwitcher: true,
  },
  labels: {},
  hooks: {},
};

function baseLayerFrom(base) {
  if (base === false || base === null) return null;
  if (base === 'osm') {
    const layer = new TileLayer({ source: new OSM() });
    layer.set('kitInternal', true);
    return layer;
  }
  return base;
}

/**
 * 옵션 하나로 지도를 만든다.
 *
 * 화면마다 지도 초기화·레이어·측정 도구·툴바를 각자 복사해 두던 구조를
 * "공통은 여기, 화면별 차이는 hooks 로" 나누기 위한 진입점이다.
 *
 * hooks
 *  - beforeLayerAdd(def)          레이어 정의를 바꾸거나 false 로 막는다
 *  - onFeatureClick(feature, layer, event)
 *  - onMeasure({type, value, text, feature})
 *  - onReady(kit)
 *
 * @param {string|HTMLElement} target
 * @param {Partial<typeof DEFAULTS>} [options]
 */
export function createMap(target, options = {}) {
  const opts = mergeOptions(DEFAULTS, options);
  const hooks = createHooks(opts.hooks);

  const view = new View({
    projection: opts.projection,
    center: opts.projection === 'EPSG:3857' ? fromLonLat(opts.center) : opts.center,
    zoom: opts.zoom,
    minZoom: opts.minZoom,
    maxZoom: opts.maxZoom,
  });

  const base = baseLayerFrom(opts.base);
  const map = new Map({
    target,
    view,
    layers: base ? [base] : [],
    controls: defaultControls({ rotate: false }),
  });

  const layers = createLayerRegistry(map, { projection: opts.projection, hooks });
  opts.layers.forEach((def) => layers.add(def));

  const measure = opts.tools.measure
    ? createMeasureTool(map, { onMeasure: (r) => hooks.run('onMeasure', r) })
    : null;

  const toolbar = (measure || opts.tools.layerSwitcher)
    ? createToolbar({ measure, layers: opts.tools.layerSwitcher ? layers : null, labels: opts.labels })
    : null;
  if (toolbar) map.addControl(toolbar);

  const clickKey = map.on('singleclick', (event) => {
    if (measure?.isActive()) return;
    const hit = map.forEachFeatureAtPixel(
      event.pixel,
      (feature, layer) => ({ feature, layer }),
      { layerFilter: (layer) => !layer.get('kitInternal') },
    );
    if (hit) hooks.run('onFeatureClick', hit.feature, hit.layer, event);
  });

  /** 지정한 레이어(없으면 등록된 모든 레이어)의 범위로 화면을 맞춘다. */
  function fitTo(id, padding = [40, 40, 40, 40]) {
    const targets = id ? [layers.get(id)].filter(Boolean) : layers.list().map((l) => layers.get(l.id));
    let extent = null;
    targets.forEach((layer) => {
      const e = layer.getSource?.()?.getExtent?.();
      if (!e || !Number.isFinite(e[0])) return;
      extent = extent ? [Math.min(extent[0], e[0]), Math.min(extent[1], e[1]), Math.max(extent[2], e[2]), Math.max(extent[3], e[3])] : [...e];
    });
    if (extent) view.fit(extent, { padding, maxZoom: 18, duration: 250 });
    return Boolean(extent);
  }

  function destroy() {
    unByKey(clickKey);
    if (toolbar) toolbar.destroy();
    if (measure) measure.destroy();
    layers.clear();
    map.setTarget(undefined);
  }

  const kit = { map, view, layers, measure, fitTo, destroy, options: opts };
  hooks.run('onReady', kit);
  return kit;
}

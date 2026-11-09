import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';

/**
 * id 로 레이어를 관리하는 등록부.
 *
 * 화면마다 레이어를 직접 만들고 map.getLayers() 를 뒤져 찾던 코드를
 * add / get / setVisible / toggle / remove 로 통일한다.
 *
 * @param {{addLayer: Function, removeLayer: Function}} map  ol/Map (테스트에서는 같은 메서드를 가진 객체)
 * @param {{projection?: string, hooks?: ReturnType<import('./util.js').createHooks>}} [opts]
 */
export function createLayerRegistry(map, { projection = 'EPSG:3857', hooks } = {}) {
  const entries = new Map();
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(list()));

  function buildLayer(def) {
    if (def.layer) return def.layer;
    const format = new GeoJSON({ featureProjection: projection });
    let source;
    if (def.url) {
      source = new VectorSource({ url: def.url, format });
    } else {
      source = new VectorSource({ features: def.data ? format.readFeatures(def.data) : [] });
    }
    return new VectorLayer({ source, style: def.style });
  }

  /**
   * @param {{id: string, title?: string, data?: object, url?: string, layer?: import('ol/layer/Base.js').default,
   *          style?: any, visible?: boolean, zIndex?: number, switchable?: boolean}} input
   */
  function add(input) {
    if (!input || !input.id) throw new Error('[ol-map-kit] layer needs an id');
    if (entries.has(input.id)) throw new Error(`[ol-map-kit] layer "${input.id}" already exists`);

    let def = { visible: true, switchable: true, ...input };
    if (hooks) {
      const changed = hooks.run('beforeLayerAdd', def);
      if (changed === false) return null;
      if (changed && typeof changed === 'object') def = changed;
    }

    const layer = buildLayer(def);
    layer.set('kitId', def.id);
    layer.set('title', def.title ?? def.id);
    layer.setVisible(def.visible !== false);
    if (def.zIndex !== undefined) layer.setZIndex(def.zIndex);

    map.addLayer(layer);
    entries.set(def.id, { def, layer });
    notify();
    return layer;
  }

  function get(id) {
    return entries.get(id)?.layer ?? null;
  }

  function remove(id) {
    const entry = entries.get(id);
    if (!entry) return false;
    map.removeLayer(entry.layer);
    entries.delete(id);
    notify();
    return true;
  }

  function setVisible(id, visible) {
    const layer = get(id);
    if (!layer) return false;
    layer.setVisible(Boolean(visible));
    notify();
    return true;
  }

  function toggle(id) {
    const layer = get(id);
    return layer ? setVisible(id, !layer.getVisible()) : false;
  }

  function list() {
    return [...entries.values()].map(({ def, layer }) => ({
      id: def.id,
      title: layer.get('title'),
      visible: layer.getVisible(),
      switchable: def.switchable !== false,
    }));
  }

  /** 레이어 구성이나 표시 여부가 바뀔 때마다 list() 결과를 받는다. 해제 함수를 돌려준다. */
  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function clear() {
    [...entries.keys()].forEach((id) => {
      map.removeLayer(entries.get(id).layer);
      entries.delete(id);
    });
    notify();
  }

  return { add, get, remove, setVisible, toggle, list, onChange, clear };
}

import { describe, expect, it, vi } from 'vitest';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { createLayerRegistry } from '../src/layers.js';
import { createHooks } from '../src/util.js';

/** 렌더링 없이 addLayer/removeLayer 만 기록하는 가짜 지도 */
function fakeMap() {
  const layers = [];
  return {
    layers,
    addLayer: (l) => layers.push(l),
    removeLayer: (l) => layers.splice(layers.indexOf(l), 1),
  };
}

const square = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'A' },
    geometry: { type: 'Polygon', coordinates: [[[127, 37], [127.01, 37], [127.01, 37.01], [127, 37.01], [127, 37]]] },
  }],
};

describe('createLayerRegistry', () => {
  it('GeoJSON 으로 레이어를 만들어 지도에 올린다', () => {
    const map = fakeMap();
    const reg = createLayerRegistry(map);
    const layer = reg.add({ id: 'parcels', title: '필지', data: square });

    expect(map.layers).toContain(layer);
    expect(layer.getSource().getFeatures()).toHaveLength(1);
    expect(layer.get('kitId')).toBe('parcels');
    expect(reg.list()).toEqual([{ id: 'parcels', title: '필지', visible: true, switchable: true }]);
  });

  it('GeoJSON 좌표를 지도 투영(EPSG:3857)으로 바꿔 읽는다', () => {
    const reg = createLayerRegistry(fakeMap());
    const [x] = reg.add({ id: 'p', data: square }).getSource().getFeatures()[0]
      .getGeometry().getCoordinates()[0][0];
    expect(x).toBeGreaterThan(1.4e7); // 경도 127 → 약 14,137,575 m
  });

  it('이미 만든 ol 레이어도 그대로 등록한다', () => {
    const reg = createLayerRegistry(fakeMap());
    const own = new VectorLayer({ source: new VectorSource() });
    expect(reg.add({ id: 'own', layer: own })).toBe(own);
    expect(reg.get('own')).toBe(own);
  });

  it('id 가 없거나 겹치면 예외', () => {
    const reg = createLayerRegistry(fakeMap());
    expect(() => reg.add({})).toThrow(/needs an id/);
    reg.add({ id: 'a' });
    expect(() => reg.add({ id: 'a' })).toThrow(/already exists/);
  });

  it('표시 전환과 변경 알림', () => {
    const reg = createLayerRegistry(fakeMap());
    const seen = vi.fn();
    reg.onChange(seen);
    reg.add({ id: 'a', visible: false });

    expect(reg.get('a').getVisible()).toBe(false);
    expect(reg.toggle('a')).toBe(true);
    expect(reg.get('a').getVisible()).toBe(true);
    expect(seen).toHaveBeenCalledTimes(2);
    expect(reg.toggle('missing')).toBe(false);
  });

  it('remove 와 clear 는 지도에서도 내린다', () => {
    const map = fakeMap();
    const reg = createLayerRegistry(map);
    reg.add({ id: 'a' });
    reg.add({ id: 'b' });
    expect(reg.remove('a')).toBe(true);
    expect(reg.remove('a')).toBe(false);
    reg.clear();
    expect(map.layers).toHaveLength(0);
    expect(reg.list()).toEqual([]);
  });

  it('beforeLayerAdd 훅으로 정의를 바꾸거나 막는다', () => {
    const hooks = createHooks({
      beforeLayerAdd: (def) => (def.id === 'blocked' ? false : { ...def, title: `[${def.id}]` }),
    });
    const map = fakeMap();
    const reg = createLayerRegistry(map, { hooks });

    expect(reg.add({ id: 'blocked' })).toBeNull();
    expect(map.layers).toHaveLength(0);
    expect(reg.add({ id: 'ok' }).get('title')).toBe('[ok]');
  });

  it('switchable:false 는 목록에 표시 대상이 아님을 알린다', () => {
    const reg = createLayerRegistry(fakeMap());
    reg.add({ id: 'bg', switchable: false });
    expect(reg.list()[0].switchable).toBe(false);
  });
});

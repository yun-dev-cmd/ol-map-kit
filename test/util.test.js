import { describe, expect, it, vi } from 'vitest';
import { createHooks, formatArea, formatLength, mergeOptions } from '../src/util.js';

describe('mergeOptions', () => {
  it('합치되 기본값 객체를 바꾸지 않는다', () => {
    const defaults = { zoom: 12, tools: { measure: true, layerSwitcher: true } };
    const out = mergeOptions(defaults, { tools: { measure: false } });
    expect(out).toEqual({ zoom: 12, tools: { measure: false, layerSwitcher: true } });
    expect(defaults.tools.measure).toBe(true);
  });

  it('배열은 합치지 않고 바꾼다', () => {
    expect(mergeOptions({ layers: [1, 2] }, { layers: [3] }).layers).toEqual([3]);
  });

  it('undefined 는 기본값을 유지한다', () => {
    expect(mergeOptions({ zoom: 12 }, { zoom: undefined }).zoom).toBe(12);
  });

  it('클래스 인스턴스는 통째로 넘긴다', () => {
    class Layer { constructor() { this.a = 1; } }
    const layer = new Layer();
    expect(mergeOptions({ base: 'osm' }, { base: layer }).base).toBe(layer);
  });
});

describe('formatLength', () => {
  it.each([
    [0, '0 m'],
    [-5, '0 m'],
    [NaN, '0 m'],
    [12.345, '12.3 m'],
    [999.9, '999.9 m'],
    [1000, '1.00 km'],
    [15320, '15.32 km'],
  ])('%s → %s', (input, expected) => {
    expect(formatLength(input)).toBe(expected);
  });
});

describe('formatArea', () => {
  it.each([
    [0, '0 m²'],
    [530.4, '530 m²'],
    [9999, '9,999 m²'],
    [10000, '1.00 ha'],
    [250000, '25.00 ha'],
    [1e6, '1.00 km²'],
    [3.5e6, '3.50 km²'],
  ])('%s → %s', (input, expected) => {
    expect(formatArea(input)).toBe(expected);
  });
});

describe('createHooks', () => {
  it('등록된 훅을 실행하고 반환값을 돌려준다', () => {
    const hooks = createHooks({ twice: (n) => n * 2 });
    expect(hooks.has('twice')).toBe(true);
    expect(hooks.run('twice', 4)).toBe(8);
  });

  it('없는 훅은 undefined', () => {
    expect(createHooks().run('nope')).toBeUndefined();
  });

  it('훅 예외는 삼키고 기록한다', () => {
    const logger = { error: vi.fn() };
    const hooks = createHooks({ boom: () => { throw new Error('x'); } }, logger);
    expect(hooks.run('boom')).toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

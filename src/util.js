/**
 * 의존성 없는 작은 함수들. 지도 없이 테스트할 수 있도록 core 에서 분리했다.
 */

const isPlainObject = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

/**
 * 기본값 위에 사용자 옵션을 덮어쓴다.
 * 평범한 객체만 재귀로 합치고, 배열·함수·OpenLayers 객체는 통째로 바꾼다.
 */
export function mergeOptions(defaults, options) {
  const out = { ...defaults };
  if (!isPlainObject(options)) return out;
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value) && isPlainObject(defaults[key])
      ? mergeOptions(defaults[key], value)
      : value;
  }
  return out;
}

/** 미터 단위 길이를 사람이 읽는 문자열로. 1 km 이상은 km. */
export function formatLength(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${(Math.round(meters * 10) / 10).toLocaleString('en-US')} m`;
}

/** 제곱미터 면적을 문자열로. 1 ha 미만은 m², 1 km² 미만은 ha, 그 이상은 km². */
export function formatArea(squareMeters) {
  if (!Number.isFinite(squareMeters) || squareMeters <= 0) return '0 m²';
  if (squareMeters >= 1e6) return `${(squareMeters / 1e6).toFixed(2)} km²`;
  if (squareMeters >= 1e4) return `${(squareMeters / 1e4).toFixed(2)} ha`;
  return `${Math.round(squareMeters).toLocaleString('en-US')} m²`;
}

/**
 * 이름으로 부르는 훅 묶음. 훅 하나가 예외를 던져도 지도 전체가 멈추지 않게 잡아서 기록만 한다.
 */
export function createHooks(hooks = {}, logger = console) {
  return {
    has: (name) => typeof hooks[name] === 'function',
    run(name, ...args) {
      const fn = hooks[name];
      if (typeof fn !== 'function') return undefined;
      try {
        return fn(...args);
      } catch (err) {
        logger.error(`[ol-map-kit] hook "${name}" failed`, err);
        return undefined;
      }
    },
  };
}

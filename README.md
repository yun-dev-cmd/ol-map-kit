# ol-map-kit

[![CI](https://github.com/yun-dev-cmd/ol-map-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/yun-dev-cmd/ol-map-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README_ENG.md)

OpenLayers 지도를 **옵션 하나로** 만들고, 화면마다 다른 부분은 **훅(hooks)** 으로만 바꾸는 작은 모듈입니다.

지도 화면이 여러 개인 프로젝트에서는 지도 생성, 레이어, 측정 도구, 툴바 코드를 화면마다 복사해 두기 쉽습니다. 그러면 측정 도구 버그 하나를 화면 수만큼 고쳐야 합니다. ol-map-kit 은 공통 부분을 한곳에 두고, 화면별 차이만 옵션과 훅으로 넘기도록 나눴습니다.

**[데모 보기](https://yun-dev-cmd.github.io/ol-map-kit/demo/)**

## 기능

- `createMap()` 하나로 지도 · 기본 배경(OSM) · 레이어 · 도구 생성
- **레이어 등록부**: id 로 `add` / `get` / `toggle` / `remove`, GeoJSON 바로 등록
- **거리 · 면적 측정**: 구면 계산(`ol/sphere`)으로 실제 거리에 가깝게, 결과 라벨 유지
- **툴바**: 측정 버튼과 레이어 체크박스, 문구 교체(한국어 프리셋 포함)
- **훅**: `beforeLayerAdd`, `onFeatureClick`, `onMeasure`, `onReady`
- **CSS 우선순위 0**: 모든 선택자를 `:where()` 로 감싸 기존 화면 스타일을 건드리지 않음

## 설치

```bash
npm install ol ol-map-kit
```

`ol` (OpenLayers 9 이상)은 peer dependency 입니다.

## 사용법

```js
import 'ol/ol.css';
import 'ol-map-kit/style.css';
import { createMap, KO_LABELS } from 'ol-map-kit';

const kit = createMap('map', {
  center: [126.978, 37.5665], // 경도, 위도
  zoom: 14,
  labels: KO_LABELS,
  layers: [
    { id: 'zones', title: '구역', url: '/data/zones.geojson' },
    { id: 'points', title: '지점', data: pointsGeoJson, visible: false },
  ],
  hooks: {
    onFeatureClick: (feature, layer) => openPopup(feature.get('name')),
    onMeasure: ({ type, text }) => console.log(type, text),
  },
});

kit.layers.toggle('points');
kit.fitTo('zones');
```

화면마다 측정 도구가 필요 없다면 옵션만 끕니다.

```js
createMap('map', { tools: { measure: false } });
```

## 옵션

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `center` | `[126.978, 37.5665]` | 중심 좌표. `EPSG:3857` 이면 경도·위도로 받아 변환 |
| `zoom` | `12` | 시작 줌 |
| `minZoom` / `maxZoom` | `undefined` / `20` | 줌 범위 |
| `projection` | `'EPSG:3857'` | 지도 투영 |
| `base` | `'osm'` | 배경 지도. `false` 면 없음, ol 레이어를 넘기면 그대로 사용 |
| `layers` | `[]` | 처음에 올릴 레이어 정의 목록 (아래 표) |
| `tools.measure` | `true` | 거리 · 면적 측정 |
| `tools.layerSwitcher` | `true` | 툴바의 레이어 목록 |
| `labels` | 영어 | 툴바 문구. `KO_LABELS` 또는 `{ length, area, clear, layers }` |
| `hooks` | `{}` | 아래 훅 표 |

### 레이어 정의

| 키 | 설명 |
| --- | --- |
| `id` | 필수. 등록부에서 찾는 이름 |
| `title` | 레이어 목록에 보일 이름 (없으면 id) |
| `data` / `url` | GeoJSON 객체 또는 주소 (경도·위도 좌표) |
| `layer` | 직접 만든 ol 레이어 (data/url 대신) |
| `style` | ol 스타일 또는 스타일 함수 |
| `visible` | 처음 표시 여부, 기본 `true` |
| `zIndex` | 그리는 순서 |
| `switchable` | `false` 면 레이어 목록에서 숨김 |

### 훅

| 훅 | 인자 | 용도 |
| --- | --- | --- |
| `beforeLayerAdd` | `def` | 정의를 바꿔 돌려주거나 `false` 로 등록을 막음 |
| `onFeatureClick` | `feature, layer, event` | 도형 클릭 (측정 중에는 실행 안 함) |
| `onMeasure` | `{ type, value, text, feature }` | 측정 완료 |
| `onReady` | `kit` | 지도 준비 완료 |

훅 안에서 예외가 나도 지도는 멈추지 않고 콘솔에 기록만 남깁니다.

### 반환값 `kit`

| 속성 | 설명 |
| --- | --- |
| `map`, `view` | OpenLayers 객체 그대로 |
| `layers` | `add`, `get`, `remove`, `setVisible`, `toggle`, `list`, `onChange`, `clear` |
| `measure` | `start('length' \| 'area')`, `stop`, `clear`, `isActive`, `type` (끄면 `null`) |
| `fitTo(id?)` | 레이어(없으면 전체) 범위로 화면 이동 |
| `destroy()` | 이벤트 · 레이어 · 도구 정리 후 지도 해제 |

필요한 부분만 따로 쓸 수도 있습니다: `createLayerRegistry`, `createMeasureTool`, `createToolbar`, `formatLength`, `formatArea`.

## 스타일 바꾸기

CSS 변수로 색과 모양을 바꿉니다.

```css
:root {
  --omk-accent: #c03a2c;
  --omk-radius: 2px;
}
```

선택자 우선순위가 0 이라 `.omk-btn { ... }` 처럼 클래스 하나로도 덮어쓸 수 있습니다.

## 개발

```bash
npm install
npm test
npx http-server . -p 5180   # http://localhost:5180/demo/
```

## 라이선스

[MIT](LICENSE)

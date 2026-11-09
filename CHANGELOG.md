# Changelog

## 0.1.0

- `createMap()`: 옵션 하나로 지도, OSM 배경, 레이어, 측정 도구, 툴바 생성
- 레이어 등록부: id 기반 add / get / toggle / remove, GeoJSON 등록, 변경 알림
- 거리 · 면적 측정: 구면 계산, 결과 라벨 유지, 기본 점선 스타일
- 툴바: 측정 버튼, 레이어 체크박스, 영어 · 한국어 문구
- 훅: beforeLayerAdd, onFeatureClick, onMeasure, onReady
- `:where()` 기반 우선순위 0 CSS, CSS 변수

# ol-map-kit

[![CI](https://github.com/yun-dev-cmd/ol-map-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/yun-dev-cmd/ol-map-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[한국어](README.md)

A small module that builds an OpenLayers map from **one options object** and lets each page change only what differs through **hooks**.

Projects with many map pages tend to copy map setup, layers, measure tools and toolbars into every page, so a single measure bug has to be fixed once per page. ol-map-kit keeps the shared parts in one place and pushes per-page differences into options and hooks.

**[Live demo](https://yun-dev-cmd.github.io/ol-map-kit/demo/)**

## Features

- `createMap()` creates the map, an OSM base layer, your layers and tools
- **Layer registry**: `add` / `get` / `toggle` / `remove` by id, GeoJSON in one line
- **Distance and area measurement** using spherical math (`ol/sphere`), with labels that stay on the map
- **Toolbar** with measure buttons and layer checkboxes; replaceable labels (Korean preset included)
- **Hooks**: `beforeLayerAdd`, `onFeatureClick`, `onMeasure`, `onReady`
- **Zero-specificity CSS**: every selector is wrapped in `:where()` so it never overrides your styles

## Install

```bash
npm install ol ol-map-kit
```

`ol` (OpenLayers 9+) is a peer dependency.

## Usage

```js
import 'ol/ol.css';
import 'ol-map-kit/style.css';
import { createMap } from 'ol-map-kit';

const kit = createMap('map', {
  center: [126.978, 37.5665], // lon, lat
  zoom: 14,
  layers: [
    { id: 'zones', title: 'Zones', url: '/data/zones.geojson' },
    { id: 'points', title: 'Points', data: pointsGeoJson, visible: false },
  ],
  hooks: {
    onFeatureClick: (feature, layer) => openPopup(feature.get('name')),
    onMeasure: ({ type, text }) => console.log(type, text),
  },
});

kit.layers.toggle('points');
kit.fitTo('zones');
```

Turn off what a page does not need:

```js
createMap('map', { tools: { measure: false } });
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `center` | `[126.978, 37.5665]` | Center. With `EPSG:3857` it is given as lon/lat and converted |
| `zoom` | `12` | Initial zoom |
| `minZoom` / `maxZoom` | `undefined` / `20` | Zoom range |
| `projection` | `'EPSG:3857'` | Map projection |
| `base` | `'osm'` | Base map. `false` for none, or pass your own ol layer |
| `layers` | `[]` | Layer definitions to add on start (see below) |
| `tools.measure` | `true` | Distance and area measurement |
| `tools.layerSwitcher` | `true` | Layer list in the toolbar |
| `labels` | English | Toolbar text: `KO_LABELS` or `{ length, area, clear, layers }` |
| `hooks` | `{}` | See hooks below |

### Layer definition

| Key | Description |
| --- | --- |
| `id` | Required. Name used by the registry |
| `title` | Name in the layer list (defaults to id) |
| `data` / `url` | GeoJSON object or URL (lon/lat coordinates) |
| `layer` | Your own ol layer instead of data/url |
| `style` | ol style or style function |
| `visible` | Initial visibility, default `true` |
| `zIndex` | Draw order |
| `switchable` | `false` hides it from the layer list |

### Hooks

| Hook | Arguments | Use |
| --- | --- | --- |
| `beforeLayerAdd` | `def` | Return a changed definition, or `false` to skip the layer |
| `onFeatureClick` | `feature, layer, event` | Feature click (not fired while measuring) |
| `onMeasure` | `{ type, value, text, feature }` | Measurement finished |
| `onReady` | `kit` | Map is ready |

An exception inside a hook is logged to the console and does not break the map.

### Returned `kit`

| Property | Description |
| --- | --- |
| `map`, `view` | The OpenLayers objects |
| `layers` | `add`, `get`, `remove`, `setVisible`, `toggle`, `list`, `onChange`, `clear` |
| `measure` | `start('length' \| 'area')`, `stop`, `clear`, `isActive`, `type` (`null` when disabled) |
| `fitTo(id?)` | Fit the view to one layer, or to all registered layers |
| `destroy()` | Remove listeners, layers and tools, then detach the map |

Parts can be used on their own: `createLayerRegistry`, `createMeasureTool`, `createToolbar`, `formatLength`, `formatArea`.

## Styling

Override CSS variables:

```css
:root {
  --omk-accent: #c03a2c;
  --omk-radius: 2px;
}
```

Because selector specificity is zero, a single class such as `.omk-btn { ... }` is enough to override.

## Development

```bash
npm install
npm test
npx http-server . -p 5180   # http://localhost:5180/demo/
```

## License

[MIT](LICENSE)

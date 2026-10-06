// Vintage "back-room chart" map style, drawn from free OpenStreetMap-based vector tiles (OpenFreeMap).
const TILES = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

const label = ['coalesce', ['get', 'name:latin'], ['get', 'name']];
const width = (a, b, c) => ['interpolate', ['exponential', 1.4], ['zoom'], 10, a, 14, b, 18, c];
const road = (id, classes, color, w) => ({
  id, type: 'line', source: 'omt', 'source-layer': 'transportation',
  filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', classes]]],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': color, 'line-width': width(...w) },
});

export const mapStyle = {
  version: 8,
  glyphs: GLYPHS,
  sources: { omt: { type: 'vector', url: TILES } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#1d1611' } },
    { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]], paint: { 'fill-color': '#222015' } },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#27241a' } },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#0f1a20' } },
    { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
      paint: { 'fill-color': '#2a2019', 'fill-opacity': 0.8 } },
    road('road-minor', ['minor', 'service', 'track', 'path'], '#33271e', [0.4, 1.2, 5]),
    road('road-mid', ['tertiary', 'secondary'], '#4a392a', [0.8, 2, 9]),
    road('road-major', ['primary', 'trunk', 'motorway'], '#6b5236', [1.2, 3, 12]),
    { id: 'water-label', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9,
      layout: { 'text-field': label, 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-letter-spacing': 0.2 },
      paint: { 'text-color': '#5f7a85', 'text-halo-color': '#0f1a20', 'text-halo-width': 1 } },
    { id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 13,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: { 'text-field': label, 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 13, 12, 20],
        'text-transform': 'uppercase', 'text-letter-spacing': 0.18 },
      paint: { 'text-color': '#b8893a', 'text-halo-color': '#17120f', 'text-halo-width': 1.6 } },
    { id: 'place-hood', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
      layout: { 'text-field': label, 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 },
      paint: { 'text-color': '#a8977c', 'text-halo-color': '#17120f', 'text-halo-width': 1.4 } },
  ],
};

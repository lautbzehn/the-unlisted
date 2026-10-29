// Map styles drawn from free OpenStreetMap-based vector tiles (OpenFreeMap):
// "night" (the site's look since v2.0: faint streets on true black, water a shade colder than land),
// "paper" (ink streets on newsprint) and "sepia" (the v1 look, aged-paper streets on dark brown).
const TILES = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

const THEMES = {
  night: { bg: '#000000', land: '#050505', park: '#060807', water: '#02070a', building: '#0c0c0d', minor: '#151517', mid: '#222225', major: '#34343a', label: '#8a867f', city: '#d9d5cd', halo: '#000000', waterLabel: '#4a6c7a' },
  paper: { bg: '#ece3d0', land: '#e2d9c3', park: '#d9d5bd', water: '#c6cdc8', building: '#ddd3bd', minor: '#cfc3a9', mid: '#b5a789', major: '#8c7d63', label: '#3b332a', city: '#1b1712', halo: '#ece3d0', waterLabel: '#5f7179' },
  sepia: { bg: '#1a140e', land: '#1d1710', park: '#1f1c11', water: '#0f0b07', building: '#231b13', minor: '#2d241a', mid: '#433526', major: '#634e36', label: '#b5a68a', city: '#eee2c8', halo: '#15110c', waterLabel: '#7d6c55' },
};

const label = ['coalesce', ['get', 'name:latin'], ['get', 'name']];
const width = (a, b, c) => ['interpolate', ['exponential', 1.4], ['zoom'], 10, a, 14, b, 18, c];
const road = (id, classes, color, w) => ({
  id, type: 'line', source: 'omt', 'source-layer': 'transportation',
  filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', classes]]],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': color, 'line-width': width(...w) },
});

export function mapStyle(themeName = 'night') {
  const t = THEMES[themeName];
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { omt: { type: 'vector', url: TILES } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': t.bg } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]], paint: { 'fill-color': t.land } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': t.park } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': t.water } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': t.building } },
      road('road-minor', ['minor', 'service', 'track', 'path'], t.minor, [0.3, 1, 4]),
      road('road-mid', ['tertiary', 'secondary'], t.mid, [0.6, 1.6, 7]),
      road('road-major', ['primary', 'trunk', 'motorway'], t.major, [0.9, 2.4, 10]),
      { id: 'water-label', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9,
        layout: { 'text-field': label, 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-letter-spacing': 0.2 },
        paint: { 'text-color': t.waterLabel, 'text-halo-color': t.water, 'text-halo-width': 1 } },
      { id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 13,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: { 'text-field': label, 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 13, 12, 20],
          'text-transform': 'uppercase', 'text-letter-spacing': 0.2 },
        paint: { 'text-color': t.city, 'text-halo-color': t.halo, 'text-halo-width': 1.6 } },
      { id: 'place-hood', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11,
        filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
        layout: { 'text-field': label, 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-transform': 'uppercase', 'text-letter-spacing': 0.14 },
        paint: { 'text-color': t.label, 'text-halo-color': t.halo, 'text-halo-width': 1.4 } },
    ],
  };
}

// Map view. Loaded lazily the first time someone opens the Map tab.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapStyle } from '../lib/mapStyle.js';

maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs'); // copied by scripts/copy-maplibre-worker.mjs

const places = JSON.parse(document.getElementById('places-data').textContent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const darkMode = matchMedia('(prefers-color-scheme: dark)');
const theme = () => (darkMode.matches ? 'ink' : 'paper');
const STATUS_TEXT = { none: '', knock: ' On your Knock List.', ledger: ' In your Ledger.' };

let map;
const markers = new Map(); // id -> { marker, el }
let last = { state: {}, filter: 'all' };

function popupContent(p) {
  const wrap = document.createElement('div');
  wrap.className = 'pop';
  const h = document.createElement('strong');
  h.textContent = p.name;
  const m = document.createElement('div');
  m.className = 'pop-meta';
  m.textContent = `${p.area} · ${p.kind} · Gem ${p.score}`;
  const a = document.createElement('a');
  a.href = `/place/${p.id}/`;
  a.textContent = 'Open the file →';
  wrap.append(h, m, a);
  return wrap;
}

function build() {
  map = new maplibregl.Map({
    container: 'map',
    style: mapStyle(theme()),
    center: [-122.35, 37.78],
    zoom: 9.5,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  darkMode.addEventListener('change', () => map.setStyle(mapStyle(theme()))); // follow light/dark switches live
  map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), 'top-right');

  for (const p of places) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pin';
    el.dataset.status = 'none';
    const popup = new maplibregl.Popup({ offset: 22, closeButton: true, maxWidth: '260px' }).setDOMContent(popupContent(p));
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
    markers.set(p.id, { marker, el, p });
  }
}

function sync(fit = true) {
  const { state, filter, time } = last;
  const shown = [];
  for (const [id, { el, p }] of markers) {
    const status = state[id]?.status || 'none';
    const visible = (filter === 'all' || status === filter) && (!time || (p.when ?? []).includes(time));
    el.dataset.status = status;
    el.style.display = visible ? '' : 'none';
    el.setAttribute('aria-label', `${p.name}, ${p.area}, Gem score ${p.score}.${STATUS_TEXT[status]}`);
    if (visible) shown.push([p.lng, p.lat]);
  }
  if (!fit || !shown.length) return;
  const b = shown.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(shown[0], shown[0]));
  map.fitBounds(b, { padding: { top: 70, bottom: 70, left: 70, right: 140 }, maxZoom: 13, duration: reduceMotion ? 0 : 700 });
}

export function showMap(detail) {
  last = detail;
  if (!map) build();
  else map.resize();
  sync();
}

export function updateMap(detail) {
  const filterChanged = detail.filter !== last.filter || detail.time !== last.time;
  last = detail;
  if (map) sync(filterChanged); // don't re-center the map when you just mark a place
}

export function focusPlace(id) {
  const m = markers.get(id);
  if (!map || !m) return;
  map.stop();
  const to = { center: [m.p.lng, m.p.lat], zoom: 14 };
  if (reduceMotion) map.jumpTo(to); else map.flyTo({ ...to, duration: 1200 });
  if (!m.marker.getPopup().isOpen()) m.marker.togglePopup();
}

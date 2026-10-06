// Maps. Loaded lazily, only when a map is actually shown (it's the heaviest part of the site).
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapStyle } from '../lib/mapStyle.js';

maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs'); // copied by scripts/copy-maplibre-worker.mjs

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATUS_TEXT = { none: '', knock: ' On your Bucket List.', ledger: ' Stamped.' };
const BAY = { center: [-122.35, 37.78], zoom: 9.5 };

function baseMap(container, view = BAY) {
  const map = new maplibregl.Map({ container, style: mapStyle('sepia'), ...view, attributionControl: { compact: true } });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  return map;
}

function pinEl(p) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'pin';
  el.dataset.status = 'none';
  el.setAttribute('aria-label', `${p.name}, ${p.area}, Gem score ${p.score}`);
  return el;
}

// The big map: every place that matches the filters, with a pop-up per pin.
// onShowInList(id) is called when someone taps "Show in list" in a pop-up.
export function createMap(container, places, { onShowInList } = {}) {
  const map = baseMap(container);
  map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), 'top-right');
  const markers = new Map(); // id -> { marker, el, p }

  for (const p of places) {
    const wrap = document.createElement('div');
    wrap.className = 'pop';
    const h = document.createElement('strong');
    h.textContent = p.name;
    const m = document.createElement('div');
    m.className = 'pop-meta';
    m.textContent = `${p.area} · ${p.kind} · Gem ${p.score}`;
    const links = document.createElement('div');
    links.className = 'pop-links';
    const show = document.createElement('button');
    show.type = 'button';
    show.textContent = 'Show in list';
    show.addEventListener('click', () => onShowInList?.(p.id));
    const a = document.createElement('a');
    a.href = `/place/${p.id}/`;
    a.textContent = 'Open the file →';
    links.append(show, a);
    wrap.append(h, m, links);

    const el = pinEl(p);
    const popup = new maplibregl.Popup({ offset: 22, closeButton: true, maxWidth: '270px' }).setDOMContent(wrap);
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
    markers.set(p.id, { marker, el, p });
  }

  let lastIds = null;
  // Show only the pins in `ids` (a Set), colored by your lists. Re-frames the map when the set changes.
  function sync({ state, ids }) {
    const changed = !lastIds || ids.size !== lastIds.size || [...ids].some((id) => !lastIds.has(id));
    lastIds = ids;
    const shown = [];
    for (const [id, { el, p }] of markers) {
      const status = state[id]?.status || 'none';
      el.dataset.status = status;
      el.style.display = ids.has(id) ? '' : 'none';
      el.setAttribute('aria-label', `${p.name}, ${p.area}, Gem score ${p.score}.${STATUS_TEXT[status]}`);
      if (ids.has(id)) shown.push([p.lng, p.lat]);
    }
    if (!changed || !shown.length) return;
    const b = shown.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(shown[0], shown[0]));
    map.fitBounds(b, { padding: 60, maxZoom: 14, duration: reduceMotion ? 0 : 600 });
  }

  function focus(id, { popup = true } = {}) {
    const m = markers.get(id);
    if (!m) return;
    m.el.style.display = '';
    map.stop();
    const to = { center: [m.p.lng, m.p.lat], zoom: Math.max(map.getZoom(), 14) };
    if (reduceMotion) map.jumpTo(to); else map.easeTo({ ...to, duration: 800 });
    markers.forEach((x) => { if (x !== m && x.marker.getPopup().isOpen()) x.marker.togglePopup(); });
    if (popup && !m.marker.getPopup().isOpen()) m.marker.togglePopup();
  }

  // Light up one pin while its entry in the list is hovered.
  function highlight(id) {
    for (const [mid, { el }] of markers) el.classList.toggle('hot', mid === id);
  }

  return { sync, focus, highlight, resize: () => map.resize() };
}

// The small map in the slide-up sheet: one place, one pin.
let sheet;
export function showOne(container, p) {
  if (!sheet) {
    const map = baseMap(container, { center: [p.lng, p.lat], zoom: 15 });
    const el = pinEl(p);
    el.classList.add('hot');
    el.tabIndex = -1;
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
    sheet = { map, marker, el };
  } else {
    sheet.map.resize();
    sheet.marker.setLngLat([p.lng, p.lat]);
    sheet.map.jumpTo({ center: [p.lng, p.lat], zoom: 15 });
  }
  sheet.el.setAttribute('aria-label', `${p.name}, ${p.area}`);
}

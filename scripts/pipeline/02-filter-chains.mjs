// Step 2: drop chains and famous landmarks, keep independent places, label each with an approximate area.
// Input: data/pipeline/osm-raw.json  Output: data/pipeline/independents.json + printed summary.
import { readFileSync, writeFileSync } from 'node:fs';
import { M } from './metros.mjs';

const raw = JSON.parse(readFileSync(new URL(`../../${M.pipelineDir}/osm-raw.json`, import.meta.url)));

// Rough anchors so we can group places by area even when OSM has no city tag (43% don't). Approximate on purpose.
const ANCHORS = M.anchors;
const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180, h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const nearestArea = (p) => Object.entries(ANCHORS).reduce((best, [n, c]) => { const d = km(p, c); return d < best[1] ? [n, d] : best; }, ['', Infinity])[0];

// "Joe's Pizza - Mission" and "Joe's Pizza (Oakland)" count as the same name.
const key = (name) => name.toLowerCase().replace(/\s*[-–(].*$/, '').replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');

const places = raw.elements
  .map((e) => ({ e, t: e.tags, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon }))
  .filter((p) => p.lat != null && p.lng != null);

const freq = {};
for (const p of places) freq[key(p.t.name)] = (freq[key(p.t.name)] || 0) + 1;

const steps = [['Named food & drink places', () => true],
  ['Not tagged as a brand', (p) => !p.t.brand && !p.t['brand:wikidata'] && !p.t['operator:wikidata']],
  ['Name appears fewer than 4 times', (p) => freq[key(p.t.name)] < 4],
];  // famous places (Wikidata) are kept but flagged: legends like Swan Oyster Depot belong here

let pool = places;
const log = [];
for (const [label, keep] of steps) { pool = pool.filter(keep); log.push([label, pool.length]); }

const out = pool.map(({ e, t, lat, lng }) => ({
  osm: `${e.type}/${e.id}`, name: t.name, amenity: t.amenity || t.shop, cuisine: t.cuisine || null,
  lat: +lat.toFixed(5), lng: +lng.toFixed(5), area: nearestArea([lat, lng]),
  city: t['addr:city'] || null, website: t.website || t['contact:website'] || null, phone: t.phone || null,
  hours: t.opening_hours || null, smallChain: freq[key(t.name)] >= 2, famous: !!(t.wikidata || t.wikipedia) || undefined, cashOnly: t['payment:cash'] === 'only' || undefined,
}));
writeFileSync(new URL(`../../${M.pipelineDir}/independents.json`, import.meta.url), JSON.stringify(out));

console.log('\nFilter steps');
for (const [l, n] of log) console.log(String(n).padStart(7), ' ', l);
const count = (f) => Object.entries(out.reduce((a, p) => ((a[f(p)] = (a[f(p)] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
console.log('\nBy kind  ', count((p) => p.amenity).map((x) => x.join(': ')).join(', '));
console.log('Small chains kept (2-3 locations):', out.filter((p) => p.smallChain).length);
console.log('\nBy area (approx)'); count((p) => p.area).forEach(([a, n]) => console.log(String(n).padStart(7), ' ', a));
console.log('\nTop cuisines'); count((p) => p.cuisine?.split(';')[0] || '(none)').slice(0, 15).forEach(([a, n]) => console.log(String(n).padStart(7), ' ', a));

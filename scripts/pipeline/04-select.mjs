// Step 4 (free, no AI): clean up discovery results and pick the places to research.
// Dedupes, drops what's already in the guide, matches each to OpenStreetMap for exact coordinates,
// falls back to OSM's address search (Nominatim), then picks a balanced shortlist.
//   node scripts/pipeline/04-select.mjs 180
import { readJson, writeJson, slug } from './lib/claude.mjs';
import { M, METROS } from './metros.mjs';

const target = Number(process.argv[2] ?? 180);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');
const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180, h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

// skip what's already in the guide, this city's seed list (researched separately) and earlier batches
const existing = new Set([...readJson('src/data/places.json', []), ...readJson(M.seeds, [])].map((p) => norm(p.name)));
const osm = readJson(`${M.pipelineDir}/independents.json`, []);
const osmByName = new Map();
for (const p of osm) (osmByName.get(norm(p.name)) ?? osmByName.set(norm(p.name), []).get(norm(p.name))).push(p);

// 1. dedupe + drop existing
const seen = new Set();
const unique = readJson(`${M.reviewDir}/discovered.json`, []).filter((c) => {
  const k = norm(c.name) + '|' + norm(c.city ?? '');
  if (!c.name || existing.has(norm(c.name)) || seen.has(k)) return false;
  seen.add(k);
  return true;
});

// 2. coordinates: OSM name match first, then Nominatim address lookup (1 request per second, per its usage policy).
// Nominatim rate-limits cloud machines (429), so fall back to the US Census geocoder (exact house numbers, scoped to the
// metro's state), then Photon (OSM-based, sometimes lands on the wrong block).
const UA = { 'User-Agent': 'the-unlisted-portfolio/0.1 (hello@icarianforge.com)' };
const getJson = async (url) => {
  try { const res = await fetch(url, { headers: UA }); return res.ok ? await res.json() : null; } catch { return null; }
};
async function geocode(address) {
  const [hit] = (await getJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`)) ?? [];
  await new Promise((r) => setTimeout(r, 1100));
  if (hit) return [+hit.lat, +hit.lon];
  const census = await getJson(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=${encodeURIComponent(`${address}, ${M.state.code}`)}`);
  const m = census?.result?.addressMatches?.[0];
  if (m) return [m.coordinates.y, m.coordinates.x];
  const photon = await getJson(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(address)}`);
  const f = photon?.features?.[0];
  return f?.properties?.housenumber ? [f.geometry.coordinates[1], f.geometry.coordinates[0]] : null;
}

const cache = readJson(`${M.pipelineDir}/geocode-cache.json`, {});
const placed = [];
for (const c of unique) {
  const matches = osmByName.get(norm(c.name)) ?? [];
  let lat, lng, osmId = null;
  const addrKey = `${c.address}, ${c.city}`;
  const geo = c.address ? (cache[addrKey] ??= await geocode(addrKey)) : null;
  const best = geo ? matches.sort((a, b) => km(geo, [a.lat, a.lng]) - km(geo, [b.lat, b.lng]))[0] : matches.length === 1 ? matches[0] : null;
  if (best && (!geo || km(geo, [best.lat, best.lng]) < 0.5)) ({ lat, lng } = best), (osmId = best.osm);
  else if (geo) [lat, lng] = geo;
  if (lat == null) continue; // can't place it on the map, skip
  placed.push({ ...c, id: slug(c.name), lat: +(+lat).toFixed(5), lng: +(+lng).toFixed(5), osm: osmId });
}
writeJson(`${M.pipelineDir}/geocode-cache.json`, cache);

// 3. balanced pick: round-robin across discovery requests (area × day/night), deep cuts first within each
const rank = { 'deep-cut': 0, 'open-secret': 1, 'local-legend': 2 };
const groups = Object.values(Object.groupBy(placed, (c) => c.from)).map((g) => g.sort((a, b) => rank[a.fame] - rank[b.fame]));
const picked = [];
while (picked.length < target && groups.some((g) => g.length)) for (const g of groups) if (g.length && picked.length < target) picked.push(g.shift());

// ids become web addresses (/place/<id>/), so they must be unique across every city and batch
import { readdirSync, existsSync } from 'node:fs';
const ids = new Set(readJson('src/data/places.json', []).map((p) => p.id));
for (const dir of new Set(Object.values(METROS).map((m) => m.reviewDir))) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => /^batch-\d+\.json$/.test(n))) for (const d of readJson(`${dir}/${f}`, [])) ids.add(d.id);
}
for (const p of picked) { let id = p.id, n = 2; while (ids.has(id)) id = `${p.id}-${n++}`; p.id = id; ids.add(id); }
writeJson(`${M.reviewDir}/candidates.json`, picked);

const tally = (f) => Object.entries(Object.groupBy(picked, f)).map(([k, v]) => `${k} ${v.length}`).join(' · ');
console.log(`${unique.length} unique candidates, ${placed.length} placed on the map, ${picked.length} selected.`);
console.log(`Fame: ${tally((p) => p.fame)}\nCity: ${tally((p) => p.city)}\nMatched to OSM: ${picked.filter((p) => p.osm).length}`);

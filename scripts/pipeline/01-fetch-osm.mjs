// Step 1: download every named restaurant, bar, pub, cafe, fast-food counter, ice cream shop,
// bakery, deli, coffee roaster and sweet shop in the nine Bay Area counties
// from OpenStreetMap (via the public Overpass API). Output: data/pipeline/osm-raw.json (not committed).
// Data © OpenStreetMap contributors, ODbL. Run once; be gentle with the public server.
import { writeFileSync, mkdirSync } from 'node:fs';
import { M, METRO } from './metros.mjs';

const COUNTIES = M.counties.join('|');
const query = `[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="6"]["name"~"^(${COUNTIES})$"]->.a;
(
  nwr(area.a)["amenity"~"^(restaurant|bar|pub|cafe|fast_food|ice_cream)$"]["name"];
  nwr(area.a)["shop"~"^(bakery|deli|pastry|coffee|confectionery|butcher)$"]["name"];
);
out center tags;`;

// If the main server refuses cloud machines, point at a mirror: OVERPASS_URL=https://maps.mail.ru/osm/tools/overpass/api/interpreter
const res = await fetch(process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'User-Agent': 'the-unlisted-portfolio/0.1 (hello@icarianforge.com)', Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) throw new Error(`Overpass said ${res.status}`);
const json = await res.json();
mkdirSync(new URL(`../../${M.pipelineDir}/`, import.meta.url), { recursive: true });
writeFileSync(new URL(`../../${M.pipelineDir}/osm-raw.json`, import.meta.url), JSON.stringify({ fetched: new Date().toISOString(), elements: json.elements }));
console.log(`${M.label}: saved ${json.elements.length} places (OSM data timestamp ${json.osm3s?.timestamp_osm_base}).`);

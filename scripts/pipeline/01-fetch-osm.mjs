// Step 1: download every named restaurant, bar, pub, cafe, fast-food counter, ice cream shop,
// bakery, deli, coffee roaster and sweet shop in the metro's counties (scripts/pipeline/metros.mjs)
// from OpenStreetMap (via the public Overpass API). Output: <pipelineDir>/osm-raw.json (not committed).
// Data © OpenStreetMap contributors, ODbL. Run once; be gentle with the public server.
import { writeFileSync, mkdirSync } from 'node:fs';
import { M, METRO } from './metros.mjs';

const COUNTIES = M.counties.join('|');
// Counties are looked up inside the metro's state, so "Washington County" means the one in Oregon, not all thirty.
const query = `[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="4"]["name"="${M.state.name}"]->.state;
rel(area.state)["boundary"="administrative"]["admin_level"="6"]["name"~"^(${COUNTIES})$"];
map_to_area->.a;
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
if (!json.elements?.length) throw new Error(`Overpass returned no places for ${M.label}. Check the county names in metros.mjs against OpenStreetMap, or try OVERPASS_URL.`);
mkdirSync(new URL(`../../${M.pipelineDir}/`, import.meta.url), { recursive: true });
writeFileSync(new URL(`../../${M.pipelineDir}/osm-raw.json`, import.meta.url), JSON.stringify({ fetched: new Date().toISOString(), elements: json.elements }));
console.log(`${M.label}: saved ${json.elements.length} places (OSM data timestamp ${json.osm3s?.timestamp_osm_base}).`);

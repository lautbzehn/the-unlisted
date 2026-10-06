// Step 1: download every named restaurant, bar, pub, cafe and fast-food place in the nine Bay Area counties
// from OpenStreetMap (via the public Overpass API). Output: data/pipeline/osm-raw.json (not committed).
// Data © OpenStreetMap contributors, ODbL. Run once; be gentle with the public server.
import { writeFileSync, mkdirSync } from 'node:fs';

const COUNTIES = 'San Francisco|Alameda County|Contra Costa County|Marin County|San Mateo County|Santa Clara County|Napa County|Sonoma County|Solano County';
const query = `[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="6"]["name"~"^(${COUNTIES})$"]->.a;
nwr(area.a)["amenity"~"^(restaurant|bar|pub|cafe|fast_food)$"]["name"];
out center tags;`;

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'User-Agent': 'the-unlisted-portfolio/0.1 (hello@icarianforge.com)', Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) throw new Error(`Overpass said ${res.status}`);
const json = await res.json();
mkdirSync(new URL('../../data/pipeline/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../data/pipeline/osm-raw.json', import.meta.url), JSON.stringify({ fetched: new Date().toISOString(), elements: json.elements }));
console.log(`Saved ${json.elements.length} places (OSM data timestamp ${json.osm3s?.timestamp_osm_base}).`);

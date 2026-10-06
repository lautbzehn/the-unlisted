// Step 3: discovery. Ask Claude (with web search) to propose candidate places, one area and time of day at a time.
//   node --env-file=.env scripts/pipeline/03-discover.mjs --estimate   (free: shows the plan and worst-case cost)
//   node --env-file=.env scripts/pipeline/03-discover.mjs --submit     (sends one batch)
//   node --env-file=.env scripts/pipeline/03-discover.mjs --collect    (waits, then saves data/review/discovered.json)
import { MODEL, submitBatch, collectBatch, ledger, extractJson, readJson, writeJson, budgetReport } from './lib/claude.mjs';

const AREAS = [
  ['Mission District & Bernal Heights', 'San Francisco'],
  ['Tenderloin, Little Saigon & Civic Center', 'San Francisco'],
  ['Chinatown & North Beach', 'San Francisco'],
  ['Richmond District', 'San Francisco'],
  ['Sunset District & Parkside', 'San Francisco'],
  ['SoMa, Dogpatch & Potrero Hill', 'San Francisco'],
  ['Excelsior, Outer Mission, Visitacion Valley & Bayview', 'San Francisco'],
  ['Haight, Western Addition, Japantown & Polk', 'San Francisco'],
  ['Downtown Oakland, Oakland Chinatown & Uptown', 'Oakland'],
  ['Fruitvale, East Oakland & San Leandro', 'Oakland'],
  ['Temescal, Rockridge & North Oakland', 'Oakland'],
  ['Berkeley & Albany', 'Berkeley'],
  ['Alameda, Richmond & El Cerrito', 'East Bay'],
  ['Daly City, South San Francisco & San Mateo', 'Peninsula'],
  ['San Jose (Japantown, East San Jose, downtown)', 'San Jose'],
  ['Santa Clara, Sunnyvale & Mountain View', 'South Bay'],
];
const SHIFTS = {
  day: 'daytime places: breakfast counters, diners, bakeries, donut shops, coffee, delis, sandwich shops, lunch counters, dim sum, taquerias',
  night: 'evening and late-night places: family dinner spots, noodle and dumpling houses, late-night counters, taquerias, dive bars that serve food',
};

const SYSTEM = `You help curate "The Unlisted", a guide to Bay Area hole-in-the-wall food and drink: small, independent places with
character, a story, and one thing worth ordering. Not a popularity list. Rules:
- Only places that are open now: look for evidence from the last 12 months. Skip anything closed or rumored closed.
- Independent only: no chains, and no groups with more than 3 locations.
- Skip upscale, reservation-driven or hype-driven restaurants. Counters, windows, family rooms and old-timers are the target.
- Mix well-known institutions with places that have barely been written about. Deep cuts are especially valuable.
- Never use Google Maps or Yelp as a source. Local press, neighborhood blogs, the place's own site and interviews are fine.
- Write the "why" in your own words. Do not copy sentences.
Return ONLY a JSON array in a \`\`\`json fence, no other text.`;

const known = () => {
  const names = new Set();
  for (const p of readJson('src/data/places.json', [])) names.add(p.name);
  for (const p of readJson('data/review/discovered.json', [])) names.add(p.name);
  return [...names];
};

function requests() {
  const skip = known().join('; ');
  return AREAS.flatMap(([area, city], i) =>
    Object.entries(SHIFTS).map(([shift, focus]) => ({
      custom_id: `disc-${String(i).padStart(2, '0')}-${shift}`,
      params: {
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
        messages: [{
          role: 'user',
          content: `Area: ${area} (${city}). Focus: ${focus}.
Find up to 10 candidates. Already in the guide, so skip these: ${skip}.
For each: {"name", "neighborhood", "city", "address", "kind" (2-4 words), "when" (any of "morning","midday","evening","late"),
"fame" ("deep-cut" | "open-secret" | "local-legend"), "why" (max 25 words), "source_url", "open_evidence" (what shows it is open, with a date)}`,
        }],
      },
    })),
  );
}

const RESERVE = 0.6; // worst-case dollars per discovery request
const arg = process.argv[2];
const reqs = requests();

if (arg === '--estimate' || !arg) {
  console.log(`${reqs.length} discovery requests (${AREAS.length} areas × day/night), up to 10 candidates each.`);
  console.log(`Worst case reserved: $${(reqs.length * RESERVE).toFixed(2)}. Expected: roughly $0.15-0.30 each. ${budgetReport()}`);
} else if (arg === '--submit') {
  await submitBatch('discovery', reqs, RESERVE);
} else if (arg === '--collect') {
  const pending = ledger().batches.filter((b) => b.kind === 'discovery' && b.status === 'submitted');
  const found = readJson('data/review/discovered.json', []);
  const failed = [];
  for (const b of pending) {
    await collectBatch(b.id, (id, msg, err) => {
      const list = msg && extractJson(msg);
      if (!Array.isArray(list)) return failed.push(`${id}: ${err ?? msg?.stop_reason ?? 'no JSON'}`);
      for (const c of list) found.push({ ...c, from: id });
    });
  }
  writeJson('data/review/discovered.json', found);
  console.log(`Saved ${found.length} candidates to data/review/discovered.json.${failed.length ? `\nFailed: ${failed.join(', ')}` : ''}`);
}

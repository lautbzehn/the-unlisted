// Step 5: enrichment. Claude researches each selected place (web search + fetch) and drafts its card,
// following prompts/enrich-place.md. Drafts land in data/review/<name>.json for human review.
//   node --env-file=.env scripts/pipeline/05-enrich.mjs --estimate
//   node --env-file=.env scripts/pipeline/05-enrich.mjs --submit 10      (next 10 not-yet-drafted places: the pilot)
//   node --env-file=.env scripts/pipeline/05-enrich.mjs --collect batch-02
import { readFileSync } from 'node:fs';
import { MODEL, submitBatch, collectBatch, ledger, extractJson, readJson, writeJson, file, budgetReport } from './lib/claude.mjs';

const RUBRIC = readFileSync(file('prompts/enrich-place.md'), 'utf8');
const SYSTEM = `${RUBRIC}

## How to answer
Research the place with web search (and web fetch for its own site or a key article). Then reply with ONLY one JSON object in a
\`\`\`json fence with these keys: name, area, city, kind, when, fame, breakdown {uniqueness, atmosphere, story, signature},
why, story, order, practical (array), hours (string or null), sources (array of URLs), flags (array).
If the place is closed, is a chain, or is not a fit for the guide, reply with {"skip": true, "reason": "..."} instead.`;

const RESERVE = 0.9; // worst-case dollars per place
const FAME = ['deep-cut', 'open-secret', 'local-legend'];
const WHEN = ['morning', 'midday', 'evening', 'late'];

const drafted = () => {
  const ids = new Set(readJson('src/data/places.json', []).map((p) => p.id));
  for (const b of ledger().batches.filter((b) => b.kind === 'enrich')) for (const id of b.ids ?? []) ids.add(id);
  return ids;
};

function request(c) {
  return {
    custom_id: c.id,
    params: {
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2, max_content_tokens: 6000 },
      ],
      messages: [{
        role: 'user',
        content: `Place: ${c.name}
Address: ${c.address ?? 'unknown'} (${c.neighborhood ?? ''}, ${c.city ?? ''})
What we think it is: ${c.kind ?? 'unknown'}. Lead: ${c.why ?? ''}
A source that mentioned it: ${c.source_url ?? 'none'}
Today is ${new Date().toISOString().slice(0, 10)}.`,
      }],
    },
  };
}

function check(d) {
  const problems = [];
  for (const k of ['name', 'kind', 'story', 'order', 'why']) if (typeof d[k] !== 'string' || !d[k].trim()) problems.push(`missing ${k}`);
  if (!FAME.includes(d.fame)) problems.push('bad fame');
  if (!Array.isArray(d.when) || !d.when.length || d.when.some((w) => !WHEN.includes(w))) problems.push('bad when');
  for (const k of ['uniqueness', 'atmosphere', 'story', 'signature']) {
    const v = d.breakdown?.[k];
    if (!Number.isInteger(v) || v < 0 || v > 100) problems.push(`bad mark ${k}`);
  }
  if (!Array.isArray(d.sources) || !d.sources.length) problems.push('no sources');
  return problems;
}

const [arg, val] = process.argv.slice(2);
const done = drafted();
const todo = readJson('data/review/candidates.json', []).filter((c) => !done.has(c.id));

if (!arg || arg === '--estimate') {
  console.log(`${todo.length} places waiting for research. Worst case $${RESERVE}/place reserved; expect roughly $0.25-0.45.`);
  console.log(`Worst case for all of them: $${(todo.length * RESERVE).toFixed(2)}. ${budgetReport()}`);
} else if (arg === '--submit') {
  const batch = todo.slice(0, Number(val ?? 10));
  if (!batch.length) process.exit(console.log('Nothing left to research.'));
  const id = await submitBatch('enrich', batch.map(request), RESERVE);
  const l = ledger();
  l.batches.find((b) => b.id === id).ids = batch.map((c) => c.id);
  writeJson('data/review/spend.json', l);
} else if (arg === '--collect') {
  const name = val ?? `batch-${String(ledger().batches.filter((b) => b.kind === 'enrich' && b.status === 'collected').length + 2).padStart(2, '0')}`;
  const cands = Object.fromEntries(readJson('data/review/candidates.json', []).map((c) => [c.id, c]));
  const drafts = readJson(`data/review/${name}.json`, []);
  const skipped = readJson('data/review/skipped.json', []);
  for (const b of ledger().batches.filter((b) => b.kind === 'enrich' && b.status === 'submitted')) {
    await collectBatch(b.id, (id, msg, err) => {
      const c = cands[id];
      const d = msg && extractJson(msg);
      if (!d) return skipped.push({ id, name: c?.name, reason: `no usable answer (${err ?? msg?.stop_reason})` });
      if (d.skip) return skipped.push({ id, name: c?.name, reason: d.reason });
      const problems = check(d);
      drafts.push({
        id, seed: false, status: 'draft', ...d,
        lat: c.lat, lng: c.lng, osm: c.osm ?? null, verified: new Date().toISOString().slice(0, 7),
        flags: [...(d.flags ?? []), ...problems.map((p) => `Format problem: ${p}`)],
      });
    });
  }
  writeJson(`data/review/${name}.json`, drafts);
  writeJson('data/review/skipped.json', skipped);
  console.log(`${drafts.length} drafts in data/review/${name}.json, ${skipped.length} skipped so far (see skipped.json).`);
}

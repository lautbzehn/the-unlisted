// Step 7 (free, no AI): sort a city's drafts for human review.
//   METRO=san-diego node scripts/pipeline/07-triage.mjs   -> <reviewDir>/TRIAGE.md
// Must check: might be closed or moving, or rests on a single source.
// Skim: one detail in the story (a year, an owner) is unconfirmed.
// Low risk: everything else; approve in bulk unless something jumps out.
import { readdirSync, writeFileSync } from 'node:fs';
import { readJson, file } from './lib/claude.mjs';
import { M } from './metros.mjs';

// Doubts about a place's status, not mentions of a closed day or an old location ("Closed Tuesdays", "the cart closed in 2018").
const CLOSED = /status unclear|may (be|have) (closed|moved)|might (be|have) closed|out of business|permanently closed|closed for good|closing for good|uncertain whether/;
const UNCONFIRMED = /not confirm|unverified|could not verify|couldn.t verify|unconfirmed/;
const ABOUT_FACTS = /found|owner|founded|year|history/;

const drafts = readdirSync(file(`${M.reviewDir}/`))
  .filter((n) => /^batch-\d+\.json$/.test(n)).sort()
  .flatMap((f) => readJson(`${M.reviewDir}/${f}`, []));

const rows = drafts.map((d) => {
  const flags = (d.flags ?? []).join(' ').toLowerCase();
  return {
    d,
    closed: CLOSED.test(flags),
    single: (d.sources ?? []).length <= 1 || flags.includes('community sources only'),
    fact: UNCONFIRMED.test(flags) && ABOUT_FACTS.test(flags),
  };
});
const must = rows.filter((r) => r.closed || r.single);
const skim = rows.filter((r) => !(r.closed || r.single) && r.fact);
const low = rows.length - must.length - skim.length;
const where = (d) => [d.area, d.city].filter(Boolean).join(', ');

const md = [
  `# Review triage: ${M.label}`, '',
  `${rows.length} drafts.`, '',
  `- **Must check (${must.length})**: might be closed, or rests on a single source. Approve, fix or drop each one.`,
  `- **Skim (${skim.length})**: one detail in the story (a year, an owner) is unconfirmed. Keep it, or ask to cut the sentence.`,
  `- **Low risk (${low})**: approve in bulk unless something jumps out.`, '',
  `## Must check (${must.length})`, '', '| Place | Area | Why | Your pick? |', '|---|---|---|---|',
  ...must.map(({ d, closed, single }) => `| ${d.name} | ${where(d)} | ${[closed && 'may be closed or moving', single && 'single source'].filter(Boolean).join('; ')} | ${d.seed ? 'yes' : ''} |`),
  '', `## Skim (${skim.length})`, '', '| Place | Area | Your pick? |', '|---|---|---|',
  ...skim.map(({ d }) => `| ${d.name} | ${where(d)} | ${d.seed ? 'yes' : ''} |`), '',
].join('\n');
writeFileSync(file(`${M.reviewDir}/TRIAGE.md`), md);
console.log(`${M.label}: ${rows.length} drafts | must check ${must.length} | skim ${skim.length} | low risk ${low} -> ${M.reviewDir}/TRIAGE.md`);

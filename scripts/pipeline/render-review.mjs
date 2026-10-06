// Turns a batch of AI drafts into a readable review sheet for the human editor.
// Usage: node scripts/pipeline/render-review.mjs data/review/trial-01.json
import { readFileSync, writeFileSync } from 'node:fs';
import { gemScore, MARKS } from '../../src/lib/scoring.js';

const file = process.argv[2];
const drafts = JSON.parse(readFileSync(file, 'utf8'));
const FAME = { 'deep-cut': 'Deep cut', 'open-secret': 'Open secret', 'local-legend': 'Local legend' };
const tally = (f) => Object.entries(drafts.reduce((a, d) => ((a[f(d)] = (a[f(d)] || 0) + 1), a), {})).map(([k, n]) => `${k} ${n}`).join(' · ');

let md = `# Review sheet: ${file.split('/').pop()}\n\n`;
md += `${drafts.length} drafts · your picks: ${drafts.filter((d) => d.seed).length} · found by research: ${drafts.filter((d) => !d.seed).length}\n\n`;
md += `**Fame:** ${tally((d) => FAME[d.fame])}  \n**Time of day:** ${tally((d) => d.when.join('+'))}  \n`;
md += `**Flags to check:** ${drafts.reduce((s, d) => s + d.flags.length, 0)} · **Sources:** ${drafts.reduce((s, d) => s + d.sources.length, 0)} (internal only)\n\n`;
md += `For each place, reply with **approve**, **edit:** (what to change) or **drop**.\n\n---\n`;

for (const d of drafts) {
  const marks = MARKS.map((m) => `${m.label} ${d.breakdown[m.key]}`).join(' · ');
  md += `\n## ${d.name} — Gem ${gemScore(d.breakdown)}${d.seed ? ' · *your pick*' : ''}\n`;
  md += `*${d.kind} · ${d.area}, ${d.city} · ${FAME[d.fame]} · ${d.when.join(', ')}*\n\n`;
  md += `**Story.** ${d.story}\n\n**Order this.** ${d.order}\n\n**Why this score.** ${d.why}  \n${marks}\n\n`;
  md += `**Practical.** ${d.practical.join(' · ') || '—'}  \n**Hours.** ${d.hours ?? 'not found'}\n\n`;
  md += `**Check before approving:**\n${d.flags.map((f) => `- [ ] ${f}`).join('\n')}\n\n`;
  md += `<details><summary>Sources (${d.sources.length})</summary>\n\n${d.sources.map((s) => `- ${s}`).join('\n')}\n</details>\n\n---\n`;
}
const out = file.replace(/\.json$/, '.md');
writeFileSync(out, md);
console.log(`Wrote ${out}`);

// Step 6 (free, no AI): keep the "deep cut" label honest.
// Editorial rule: a place covered by 2 or more different press outlets is an "open secret", not a "deep cut".
// Rewrites every data/review/batch-*.json in place and adds a review flag to each place it changes.
//   node scripts/pipeline/06-fix-fame.mjs
import { readdirSync } from 'node:fs';
import { readJson, writeJson } from './lib/claude.mjs';
import { M } from './metros.mjs';

const PRESS = [
  'theinfatuation.com', 'sfchronicle.com', 'sfgate.com', 'eater.com', 'nytimes.com', 'sfstandard.com', 'missionlocal.org',
  'berkeleyside.org', 'oaklandside.org', 'kqed.org', '7x7.com', 'timeout.com', 'guide.michelin.com', 'thrillist.com',
  'secretsanfrancisco.com', 'hoodline.com', 'eastbayexpress.com', 'sfist.com', 'mercurynews.com', 'sanjosespotlight.com',
  'sfweekly.com', 'latimes.com', 'bonappetit.com', 'eastbaytimes.com', 'sfexaminer.com',
  // San Diego
  'sandiegouniontribune.com', 'sandiegoreader.com', 'sdcitybeat.com', 'sandiegomagazine.com', 'sandiegoville.com',
  'kpbs.org', 'nbcsandiego.com', 'voiceofsandiego.org', 'pacificsandiego.com', 'sdvoyager.com', 'timesofsandiego.com',
];
const outlet = (url) => {
  const host = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  return PRESS.find((p) => host === p || host.endsWith(`.${p}`));
};

let changed = 0;
for (const f of readdirSync(new URL(`../../${M.reviewDir}/`, import.meta.url)).filter((n) => /^batch-\d+\.json$/.test(n))) {
  const drafts = readJson(`${M.reviewDir}/${f}`, []);
  for (const d of drafts) {
    if (d.fame !== 'deep-cut') continue;
    const outlets = [...new Set((d.sources ?? []).map(outlet).filter(Boolean))];
    if (outlets.length < 2) continue;
    d.fame = 'open-secret';
    d.flags = [...(d.flags ?? []), `Relabeled deep cut -> open secret: covered by ${outlets.join(' and ')}.`];
    changed++;
    console.log(`${f}: ${d.name} (${outlets.join(', ')})`);
  }
  writeJson(`${M.reviewDir}/${f}`, drafts);
}
console.log(`\n${changed} place(s) relabeled.`);

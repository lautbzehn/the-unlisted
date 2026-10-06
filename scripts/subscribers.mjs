// The newsletter list (runs against the live database through Wrangler).
//   npm run subscribers           -> how many, where they eat, what they're after, newest sign-ups
//   npm run subscribers -- csv    -> every active subscriber as CSV, ready for a newsletter tool
import { execFileSync } from 'node:child_process';
import SIGNUP from '../src/data/signup-options.json' with { type: 'json' };

const db = process.env.LOCAL ? '--local' : '--remote'; // LOCAL=1 reads the test database on this computer
const q = (sql) => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'the-unlisted', db, '--json', '--command', sql], { encoding: 'utf8' }))[0].results;
const rows = q('SELECT email, name, area, interests, source, created_at FROM subscribers WHERE unsubscribed_at IS NULL ORDER BY id DESC');

if (process.argv[2] === 'csv') {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  console.log('email,name,area,interests,source,signed_up');
  for (const r of rows) console.log([r.email, r.name, r.area, r.interests, r.source, r.created_at].map(cell).join(','));
  process.exit(0);
}

const label = Object.fromEntries([...SIGNUP.areas, ...SIGNUP.interests]);
const tally = (values) => {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `   ${String(n).padStart(4)}  ${label[k] ?? k ?? '(not given)'}`).join('\n');
};
console.log(`\nSUBSCRIBERS: ${rows.length}`);
console.log(`\nWhere they eat\n${tally(rows.map((r) => r.area))}`);
console.log(`\nWhat they're after\n${tally(rows.flatMap((r) => (r.interests ? r.interests.split(',') : [null])))}`);
console.log(`\nSigned up from\n${tally(rows.map((r) => r.source))}`);
console.log('\nNewest');
for (const r of rows.slice(0, 10)) console.log(`   ${r.created_at}  ${r.email}${r.name ? ` (${r.name})` : ''}`);

// Review city suggestions (runs against the live database through Wrangler).
//   npm run cities                 -> list pending suggestions
//   npm run cities approve <slug>  -> put it on the public board
//   npm run cities reject <slug>   -> hide it
import { execFileSync } from 'node:child_process';

const [action = 'pending', slug] = process.argv.slice(2);
const run = (sql) => execFileSync('npx', ['wrangler', 'd1', 'execute', 'the-unlisted', '--remote', '--json', '--command', sql], { encoding: 'utf8' });
const safe = (s) => String(s).replace(/[^a-z0-9-]/g, '');

if (action === 'pending') {
  const [{ results }] = JSON.parse(run("SELECT slug, name, region, votes, created_at FROM cities WHERE status = 'pending' ORDER BY votes DESC"));
  if (!results.length) console.log('Nothing waiting for review.');
  for (const c of results) console.log(`${c.slug.padEnd(28)} ${c.name}${c.region ? `, ${c.region}` : ''}  (${c.votes} votes, ${c.created_at})`);
} else if ((action === 'approve' || action === 'reject') && slug) {
  run(`UPDATE cities SET status = '${action === 'approve' ? 'approved' : 'rejected'}' WHERE slug = '${safe(slug)}'`);
  console.log(`${safe(slug)}: ${action}d.`);
} else {
  console.log('Usage: npm run cities [pending | approve <slug> | reject <slug>]');
}

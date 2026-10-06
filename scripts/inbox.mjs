// Read what visitors sent (runs against the live database through Wrangler).
//   npm run inbox            -> new messages and place tips
//   npm run inbox -- all     -> everything, newest first
import { execFileSync } from 'node:child_process';

const all = process.argv[2] === 'all';
const q = (sql) => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'the-unlisted', '--remote', '--json', '--command', sql], { encoding: 'utf8' }))[0].results;
const where = all ? '' : "WHERE status = 'new'";

const msgs = q(`SELECT id, created_at, topic, name, email, message FROM messages ${where} ORDER BY id DESC LIMIT 50`);
console.log(`\nMESSAGES (${msgs.length})`);
for (const m of msgs) console.log(`#${m.id} ${m.created_at} [${m.topic}] ${m.name ?? ''} ${m.email ?? ''}\n   ${m.message}`);

const tips = q(`SELECT id, created_at, metro, name, area, why, link FROM place_suggestions ${where} ORDER BY id DESC LIMIT 50`);
console.log(`\nPLACE TIPS (${tips.length})`);
for (const t of tips) console.log(`#${t.id} ${t.created_at} [${t.metro}] ${t.name}${t.area ? ` (${t.area})` : ''}\n   ${t.why}${t.link ? `\n   ${t.link}` : ''}`);

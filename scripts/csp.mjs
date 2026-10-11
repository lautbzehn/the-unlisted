// Runs after `astro build`. Astro inlines a few small scripts into the pages, so the content policy allows
// exactly those by their SHA-256 hash (and nothing else inline). This fills the hashes into dist/_headers.
// It fails the build if a page uses an inline event handler (onclick= and friends), which the policy blocks.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const TOKEN = '{{INLINE_SCRIPT_HASHES}}';

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(dist);

const hashes = new Set();
const handlers = [];
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, attrs = '', body] of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script[^>]*>/gi)) {
    if (/\ssrc=/i.test(attrs) || /type="application\/(ld\+)?json"/i.test(attrs)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
  // Look for handlers in the markup only, outside script bodies.
  const markup = html.split(/<script\b[\s\S]*?<\/script[^>]*>/i);
  if (markup.some((part) => /<[a-z][^>]*\son[a-z]+\s*=/i.test(part))) handlers.push(page.slice(dist.length));
}
if (handlers.length) {
  console.error(`Inline event handlers are blocked by the content policy. Move them into a script: ${handlers.join(', ')}`);
  process.exit(1);
}

const file = join(dist, '_headers');
const headers = readFileSync(file, 'utf8');
if (!headers.includes(TOKEN)) { console.error(`dist/_headers is missing ${TOKEN}`); process.exit(1); }
writeFileSync(file, headers.replace(TOKEN, [...hashes].sort().join(' ')));
console.log(`Content policy: ${hashes.size} inline scripts allowed by hash across ${pages.length} pages.`);

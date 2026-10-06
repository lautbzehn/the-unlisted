// The Unlisted: tiny API for the city board. Everything that isn't /api/* is the static site.
//   GET  /api/cities           -> { coming: [...], board: [...] }
//   POST /api/cities/vote      { slug, token }          one vote per city per person
//   POST /api/cities/suggest   { name, region, token }  held for review before it appears
// Spam protection: every POST needs a Cloudflare Turnstile token. People are identified only by a keyed
// hash of their IP address (the address itself is never stored).

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tidy = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const VALID = /^[\p{L}][\p{L} .'’-]{1,58}$/u; // letters, spaces and a little punctuation, 2-60 chars

async function voterId(request, env) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.TURNSTILE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return [...new Uint8Array(sig)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function human(request, env, token) {
  if (!token || !env.TURNSTILE_SECRET) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  form.append('remoteip', request.headers.get('cf-connecting-ip') ?? '');
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

async function listCities(env) {
  const { results } = await env.DB.prepare(
    "SELECT slug, name, region, status, votes FROM cities WHERE status IN ('approved','coming') ORDER BY votes DESC, name",
  ).all();
  return { coming: results.filter((c) => c.status === 'coming'), board: results.filter((c) => c.status === 'approved') };
}

async function castVote(env, cityId, voter) {
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO votes (city_id, voter) VALUES (?, ?)').bind(cityId, voter).run();
  if (ins.meta.changes) await env.DB.prepare('UPDATE cities SET votes = votes + 1 WHERE id = ?').bind(cityId).run();
  return ins.meta.changes > 0;
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function api(request, env, path) {
  if (path === '/api/cities' && request.method === 'GET') return json(await listCities(env));
  if (request.method !== 'POST') return json({ error: 'Not found' }, 404);

  const body = await readBody(request);
  if (!(await human(request, env, body.token))) return json({ error: 'Please complete the "not a bot" check and try again.' }, 403);
  const voter = await voterId(request, env);

  if (path === '/api/cities/vote') {
    const city = await env.DB.prepare("SELECT id, votes FROM cities WHERE slug = ? AND status IN ('approved','coming')").bind(String(body.slug ?? '')).first();
    if (!city) return json({ error: 'That city isn’t on the board.' }, 404);
    const counted = await castVote(env, city.id, voter);
    return json({ counted, votes: city.votes + (counted ? 1 : 0), message: counted ? 'Vote counted.' : 'You already voted for this one.' });
  }

  if (path === '/api/cities/suggest') {
    const name = tidy(body.name);
    const region = tidy(body.region);
    if (!VALID.test(name) || (region && !VALID.test(region))) return json({ error: 'Please enter a real city name (letters only).' }, 400);

    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM suggestion_log WHERE voter = ? AND created_at > datetime('now', '-1 day')").bind(voter).first();
    if (recent.n >= 5) return json({ error: 'That’s plenty of suggestions for today. Thank you!' }, 429);
    await env.DB.prepare('INSERT INTO suggestion_log (voter) VALUES (?)').bind(voter).run();

    const slug = slugify(region ? `${name} ${region}` : name);
    const existing = await env.DB.prepare('SELECT id, status FROM cities WHERE slug = ?').bind(slug).first();
    if (existing) {
      await castVote(env, existing.id, voter);
      const msg = existing.status === 'pending' ? 'Someone suggested that one too. It’s waiting for review, and your vote is counted.'
        : existing.status === 'rejected' ? 'Thanks. That one isn’t on the board right now.'
        : 'Already on the board. We counted your vote.';
      return json({ message: msg });
    }
    const created = await env.DB.prepare('INSERT INTO cities (slug, name, region, status) VALUES (?, ?, ?, ?) RETURNING id')
      .bind(slug, name, region || null, 'pending').first();
    await castVote(env, created.id, voter);
    return json({ message: `Thanks. ${name} will appear on the board after a quick human check.` });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) {
      try { return await api(request, env, path); }
      catch (e) { console.error(e); return json({ error: 'Something went wrong. Try again in a minute.' }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};

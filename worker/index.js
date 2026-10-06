// The Unlisted: tiny API for the city board. Everything that isn't /api/* is the static site.
//   GET  /api/cities           -> { coming: [...], board: [...] }
//   POST /api/cities/vote      { slug, token }          one vote per city per person
//   POST /api/cities/suggest   { slug, token }          a city from the fixed list (src/data/city-options.json)
//   POST /api/contact          { name?, email?, topic, message, token }      saved privately + emailed to Dan
//   POST /api/places/suggest   { metro, name, area?, why, link?, token }   saved privately + emailed to Dan
//   POST /api/subscribe        { email, name?, area?, interests?, source, token }   newsletter list (private)
// Spam protection: every POST needs a Cloudflare Turnstile token. People are identified only by a keyed
// hash of their IP address (the address itself is never stored).

import CITY_OPTIONS from '../src/data/city-options.json';
import SIGNUP from '../src/data/signup-options.json';
const OPTIONS = new Map(CITY_OPTIONS.map((c) => [c.slug, c]));
const AREAS = new Set(SIGNUP.areas.map(([k]) => k));
const INTERESTS = new Set(SIGNUP.interests.map(([k]) => k));
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });


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

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const clipText = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);

// Daily cap per person per form. Returns true when this person has hit it.
async function overCap(env, voter, kind, max) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM form_log WHERE voter = ? AND kind = ? AND created_at > datetime('now', '-1 day')").bind(voter, kind).first();
  if (r.n >= max) return true;
  await env.DB.prepare('INSERT INTO form_log (voter, kind) VALUES (?, ?)').bind(voter, kind).run();
  return false;
}

// Email Dan a copy. The binding can only send to his verified address, so the form can't be used to mail anyone else.
// A failed email never loses the submission: it's already saved in the database.
async function notify(env, subject, text) {
  if (!env.EMAIL) return;
  try { await env.EMAIL.send({ to: 'hello@icarianforge.com', from: 'noreply@icarianforge.com', subject, text }); }
  catch (e) { console.error('email failed', e); }
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
    const pick = OPTIONS.get(String(body.slug ?? ''));
    if (!pick) return json({ error: 'Please pick a city from the list.' }, 400);

    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM suggestion_log WHERE voter = ? AND created_at > datetime('now', '-1 day')").bind(voter).first();
    if (recent.n >= 5) return json({ error: 'That’s plenty of suggestions for today. Thank you!' }, 429);
    await env.DB.prepare('INSERT INTO suggestion_log (voter) VALUES (?)').bind(voter).run();

    const existing = await env.DB.prepare('SELECT id, status FROM cities WHERE slug = ?').bind(pick.slug).first();
    if (existing?.status === 'rejected') return json({ message: `Thanks. ${pick.name} isn’t on the board right now.` });
    if (existing?.status === 'coming') return json({ message: `${pick.name} is already booked. It’s coming soon.` });
    // Cities come from a fixed list, so they can go straight onto the board: no free text to review.
    const city = existing ?? await env.DB.prepare("INSERT INTO cities (slug, name, region, status) VALUES (?, ?, ?, 'approved') RETURNING id")
      .bind(pick.slug, pick.name, pick.region).first();
    const counted = await castVote(env, city.id, voter);
    const where = `${pick.name}, ${pick.region}`;
    return json({ message: existing ? (counted ? `${where} is already on the board. Your vote is counted.` : `You already voted for ${where}.`) : `${where} is on the board with your vote.` });
  }

  if (path === '/api/contact') {
    const topics = ['hello', 'correction', 'closed', 'owner', 'other'];
    const msg = { name: clip(body.name, 80), email: clip(body.email, 120), topic: topics.includes(body.topic) ? body.topic : 'other', message: clipText(body.message, 2000) };
    if (msg.message.length < 2) return json({ error: 'Please write a message.' }, 400);
    if (msg.email && !EMAIL_RE.test(msg.email)) return json({ error: 'That email address doesn’t look right.' }, 400);
    if (await overCap(env, voter, 'contact', 3)) return json({ error: 'That’s a lot of messages for one day. Try again tomorrow.' }, 429);
    await env.DB.prepare('INSERT INTO messages (name, email, topic, message) VALUES (?, ?, ?, ?)').bind(msg.name || null, msg.email || null, msg.topic, msg.message).run();
    await notify(env, `The Unlisted: new message (${msg.topic})`, `From: ${msg.name || '(no name)'}\nReply to: ${msg.email || '(no email given)'}\nTopic: ${msg.topic}\n\n${msg.message}`);
    return json({ message: 'Sent.' });
  }

  if (path === '/api/places/suggest') {
    const metros = { 'bay-area': 'Bay Area', 'san-diego': 'San Diego' };
    const tip = { metro: body.metro in metros ? body.metro : null, name: clip(body.name, 100), area: clip(body.area, 80), why: clipText(body.why, 600), link: clip(body.link, 300) };
    if (!tip.metro) return json({ error: 'Please pick a city.' }, 400);
    if (tip.name.length < 2) return json({ error: 'Please add the name of the place.' }, 400);
    if (tip.why.length < 10) return json({ error: 'Tell us a little about why it’s special.' }, 400);
    if (tip.link && !/^https?:\/\/\S+$/i.test(tip.link)) return json({ error: 'The link should start with http:// or https://.' }, 400);
    if (await overCap(env, voter, 'place', 5)) return json({ error: 'That’s plenty of tips for today. Thank you!' }, 429);
    await env.DB.prepare('INSERT INTO place_suggestions (metro, name, area, why, link) VALUES (?, ?, ?, ?, ?)').bind(tip.metro, tip.name, tip.area || null, tip.why, tip.link || null).run();
    await notify(env, `The Unlisted: place tip for ${metros[tip.metro]}`, `${tip.name}${tip.area ? ` (${tip.area})` : ''}\n${metros[tip.metro]}\n\nWhy: ${tip.why}\n${tip.link ? `Link: ${tip.link}` : ''}`);
    return json({ message: 'Got it.' });
  }

  if (path === '/api/subscribe') {
    const sub = {
      email: clip(body.email, 254).toLowerCase(),
      name: clip(body.name, 60),
      area: AREAS.has(body.area) ? body.area : null,
      interests: [...new Set([].concat(body.interests ?? []))].filter((k) => INTERESTS.has(k)).join(',') || null,
      source: SIGNUP.sources.includes(body.source) ? body.source : 'footer',
    };
    if (!EMAIL_RE.test(sub.email)) return json({ error: 'That email address doesn’t look right.' }, 400);
    if (await overCap(env, voter, 'subscribe', 5)) return json({ error: 'That’s a lot of sign-ups for one day. Try again tomorrow.' }, 429);
    // Signing up again just updates the answers (and re-subscribes). The reply is the same either way,
    // so the form can't be used to check whether someone is on the list.
    await env.DB.prepare(`INSERT INTO subscribers (email, name, area, interests, source) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (email) DO UPDATE SET name = coalesce(excluded.name, name), area = coalesce(excluded.area, area),
        interests = coalesce(excluded.interests, interests), updated_at = datetime('now'), unsubscribed_at = NULL`)
      .bind(sub.email, sub.name || null, sub.area, sub.interests, sub.source).run();
    return json({ message: 'You’re on the list.' });
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

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import worker from '../index.js';

const SITE = 'https://unlisted.icarianforge.com';
const fakeDb = {
  prepare: () => ({
    all: async () => ({ results: [{ slug: 'austin-tx', name: 'Austin', region: 'TX', status: 'approved', votes: 3 }, { slug: 'san-diego-ca', name: 'San Diego', region: 'CA', status: 'coming', votes: 0 }, { slug: 'portland-or', name: 'Portland', region: 'OR', status: 'coming', votes: 0 }] }),
  }),
};
const env = { DB: fakeDb, TURNSTILE_SECRET: '0x4AAAAAAAlivesecretvalue', ASSETS: { fetch: async () => new Response('page') } };
const call = (path, init = {}) => worker.fetch(new Request(`${SITE}${path}`, init), env);
const post = (path, body, headers = {}) =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE, ...headers }, body });

describe('router', () => {
  test('serves the site for anything outside /api/', async () => assert.equal(await (await call('/explore/')).text(), 'page'));
  test('lists the city board, leaving open cities off', async () => {
    const res = await call('/api/cities');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await res.json()).board.map((c) => c.slug), ['austin-tx']);
  });
  test('answers unknown routes and methods with 404', async () => {
    assert.equal((await call('/api/nope')).status, 404);
    assert.equal((await call('/api/contact')).status, 404);
  });
  test('runs the guards before any handler: origin, then content type, then size, then Turnstile', async () => {
    assert.equal((await post('/api/contact', '{}', { origin: 'https://evil.example' })).status, 403);
    assert.equal((await post('/api/contact', '{}', { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await post('/api/contact', JSON.stringify({ m: 'x'.repeat(20_000) }))).status, 413);
    const noToken = await post('/api/contact', JSON.stringify({ message: 'hi there' }));
    assert.equal(noToken.status, 403);
    assert.match((await noToken.json()).error, /not a bot/);
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { HttpError } from '../http.js';
import { verifyHuman, visitorId } from '../security.js';

const request = new Request('https://unlisted.icarianforge.com/api/contact', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.7' } });
const LIVE = { TURNSTILE_SECRET: '0x4AAAAAAAlivesecretvalue' };
const reply = (verdict) => async () => new Response(JSON.stringify(verdict));
const rejectsWith = (promise, status) => assert.rejects(promise, (e) => e instanceof HttpError && e.status === status);

describe('verifyHuman', () => {
  test('passes a successful check issued on this site', () =>
    verifyHuman(request, LIVE, 'token', reply({ success: true, hostname: 'unlisted.icarianforge.com' })));
  test('rejects a successful check issued on another site (403)', () =>
    rejectsWith(verifyHuman(request, LIVE, 'token', reply({ success: true, hostname: 'evil.example' })), 403));
  test('rejects a failed check, a missing token, or a missing secret (403)', async () => {
    await rejectsWith(verifyHuman(request, LIVE, 'token', reply({ success: false })), 403);
    await rejectsWith(verifyHuman(request, LIVE, '', reply({ success: true })), 403);
    await rejectsWith(verifyHuman(request, {}, 'token', reply({ success: true })), 403);
  });
  test('reports an outage instead of blaming the visitor (503)', () =>
    rejectsWith(verifyHuman(request, LIVE, 'token', async () => { throw new TypeError('network'); }), 503));
  test('accepts Cloudflare test keys, whose verdicts report a placeholder hostname', () =>
    verifyHuman(request, { TURNSTILE_SECRET: '1x0000000000000000000000000000000AA' }, 'token', reply({ success: true, hostname: 'example.com' })));
});

describe('visitorId', () => {
  test('is stable per IP, anonymous, and keyed', async () => {
    const a = await visitorId(request, LIVE);
    assert.match(a, /^[0-9a-f]{32}$/);
    assert.equal(a, await visitorId(request, LIVE));
    assert.notEqual(a, await visitorId(request, { TURNSTILE_SECRET: 'another-key' }));
    assert.ok(!a.includes('203'));
  });
});

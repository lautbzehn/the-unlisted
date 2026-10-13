import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { assertSameOrigin, HttpError, MAX_BODY_BYTES, readJson } from '../http.js';

const post = (body, headers = {}) =>
  new Request('https://unlisted.icarianforge.com/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

const rejectsWith = (promise, status) => assert.rejects(promise, (e) => e instanceof HttpError && e.status === status);

describe('readJson', () => {
  test('parses a JSON object', async () => assert.deepEqual(await readJson(post('{"a":1}')), { a: 1 }));
  test('requires a JSON content type (415)', () => rejectsWith(readJson(post('{}', { 'content-type': 'text/plain' })), 415));
  test('rejects bodies over the limit (413)', () => rejectsWith(readJson(post(JSON.stringify({ m: 'x'.repeat(MAX_BODY_BYTES) }))), 413));
  test('rejects malformed JSON (400)', () => rejectsWith(readJson(post('{oops')), 400));
  test('rejects JSON that is not an object (400)', async () => {
    await rejectsWith(readJson(post('[1,2]')), 400);
    await rejectsWith(readJson(post('null')), 400);
  });
});

describe('assertSameOrigin', () => {
  test('allows the site itself and clients without an Origin header', () => {
    assert.doesNotThrow(() => assertSameOrigin(post('{}', { origin: 'https://unlisted.icarianforge.com' })));
    assert.doesNotThrow(() => assertSameOrigin(post('{}')));
  });
  test('blocks other sites (403)', () => {
    assert.throws(() => assertSameOrigin(post('{}', { origin: 'https://evil.example' })), (e) => e.status === 403);
  });
});

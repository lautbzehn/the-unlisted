import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { line, parseContact, parsePlaceTip, parseSlug, parseSubscriber, text } from '../validate.js';

describe('field normalization', () => {
  test('line collapses whitespace and enforces the length limit', () => {
    assert.equal(line('  Café \n  Luna  ', 80), 'Café Luna');
    assert.equal(line('x'.repeat(500), 100).length, 100);
    assert.equal(line(undefined, 10), '');
  });
  test('text keeps line breaks but drops carriage returns', () => {
    assert.equal(text(' one\r\ntwo ', 100), 'one\ntwo');
  });
});

describe('contact form', () => {
  test('accepts a message and defaults unknown topics', () => {
    const r = parseContact({ message: 'Hello there', topic: 'nonsense', email: 'a@b.co' });
    assert.equal(r.ok, true);
    assert.equal(r.value.topic, 'other');
  });
  test('rejects an empty message or a malformed email', () => {
    assert.equal(parseContact({ message: ' ' }).ok, false);
    assert.equal(parseContact({ message: 'Hi there', email: 'not an email' }).ok, false);
  });
  test('ignores fields that are not strings', () => {
    const r = parseContact({ message: { $gt: '' } });
    assert.equal(r.ok, true);
    assert.equal(r.value.message, '[object Object]');
  });
});

describe('place tips', () => {
  const tip = { metro: 'bay-area', name: 'Golden Boy', why: 'Square slices since 1978.' };
  test('accepts a complete tip', () => assert.equal(parsePlaceTip(tip).ok, true));
  test('only accepts known metros, never inherited object keys', () => {
    assert.equal(parsePlaceTip({ ...tip, metro: 'toString' }).ok, false);
    assert.equal(parsePlaceTip({ ...tip, metro: '__proto__' }).ok, false);
  });
  test('rejects non-http links, such as javascript: URLs', () => {
    assert.equal(parsePlaceTip({ ...tip, link: 'javascript:alert(1)' }).ok, false);
    assert.equal(parsePlaceTip({ ...tip, link: 'https://example.com/x' }).ok, true);
  });
  test('requires a reason of at least ten characters', () => {
    assert.equal(parsePlaceTip({ ...tip, why: 'good' }).ok, false);
  });
});

describe('newsletter sign-up', () => {
  const options = { areas: new Set(['sf']), interests: new Set(['coffee', 'tacos']), sources: ['footer', 'passport'] };
  test('normalizes email and keeps only known choices', () => {
    const r = parseSubscriber({ email: ' Dan@Example.COM ', area: 'mars', interests: ['coffee', 'coffee', 'evil'], source: 'passport' }, options);
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { email: 'dan@example.com', name: '', area: null, interests: 'coffee', source: 'passport' });
  });
  test('rejects a missing email', () => assert.equal(parseSubscriber({}, options).ok, false));
});

describe('city slugs', () => {
  test('accepts list-style slugs only', () => {
    assert.equal(parseSlug('austin-tx'), 'austin-tx');
    assert.equal(parseSlug("x' OR 1=1 --"), null);
    assert.equal(parseSlug('A'), null);
  });
});

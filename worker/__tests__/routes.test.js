import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { BUSY, LIMITS, sendMessage } from '../routes.js';
import { createD1 } from './d1-sqlite.js';

const MIGRATIONS = new URL('../../migrations/', import.meta.url);
let env, sent;
beforeEach(() => {
  sent = [];
  env = { DB: createD1(MIGRATIONS), NOTIFY_TO: 'owner@example.com', EMAIL: { send: async (m) => sent.push(m) } };
});
const message = { topic: 'hello', message: 'Loved the guide, thank you.' };
const contact = (voter) => sendMessage({ body: message, voter, env });
const rejects = (promise, status, text) => assert.rejects(promise, (e) => e.status === status && e.message === text);

describe('form limits', () => {
  test('a visitor over their own limit is turned away politely', async () => {
    for (let i = 0; i < LIMITS.contact.perVisitor; i++) await contact('v');
    await rejects(contact('v'), 429, LIMITS.contact.tooMany);
  });
  test('a flood from many addresses stops at the site-wide limit, with one heads-up email', async () => {
    for (let i = 0; i < LIMITS.contact.siteWide; i++) await contact(`v${i}`);
    assert.equal(sent.length, LIMITS.contact.siteWide);
    await rejects(contact('late-1'), 429, BUSY);
    await rejects(contact('late-2'), 429, BUSY);
    assert.equal(sent.length, LIMITS.contact.siteWide + 1);
    assert.match(sent.at(-1).subject, /paused for today/);
    assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM messages').get().n, LIMITS.contact.siteWide);
  });
});

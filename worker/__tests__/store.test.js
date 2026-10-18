import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { castVote, claimSlot, findVotableCity, firstLimitNotice, listCities, upsertSubscriber } from '../store.js';
import { createD1 } from './d1-sqlite.js';

const MIGRATIONS = new URL('../../migrations/', import.meta.url);
let db;
beforeEach(() => {
  db = createD1(MIGRATIONS);
  db.sqlite.exec("DELETE FROM cities; INSERT INTO cities (id, slug, name, region, status, votes) VALUES (1, 'austin-tx', 'Austin', 'TX', 'approved', 7)");
});

describe('castVote', () => {
  test('counts one vote per visitor, on top of any existing tally', async () => {
    assert.deepEqual(await castVote(db, 1, 'visitor-a'), { counted: true, votes: 8 });
    assert.deepEqual(await castVote(db, 1, 'visitor-a'), { counted: false, votes: 8 });
    assert.deepEqual(await castVote(db, 1, 'visitor-b'), { counted: true, votes: 9 });
  });
  test('the board reflects the votes', async () => {
    await castVote(db, 1, 'visitor-a');
    assert.equal((await findVotableCity(db, 'austin-tx')).votes, 8);
    assert.equal((await listCities(db)).board[0].votes, 8);
  });
});

describe('claimSlot', () => {
  const limits = { perVisitor: 3, siteWide: 5 };
  test('allows each visitor up to their own limit', async () => {
    for (let i = 0; i < 3; i++) assert.equal(await claimSlot(db, 'v', 'contact', limits), 'ok');
    assert.equal(await claimSlot(db, 'v', 'contact', limits), 'visitor');
    assert.equal(await claimSlot(db, 'other', 'contact', limits), 'ok');
  });
  test('stops everyone at the site-wide limit, however many addresses send', async () => {
    for (let i = 0; i < 5; i++) assert.equal(await claimSlot(db, `v${i}`, 'contact', limits), 'ok');
    assert.equal(await claimSlot(db, 'new-visitor', 'contact', limits), 'site');
  });
  test('keeps each form separate', async () => {
    for (let i = 0; i < 5; i++) await claimSlot(db, `v${i}`, 'contact', limits);
    assert.equal(await claimSlot(db, 'v0', 'place', limits), 'ok');
  });
  test('only counts the last 24 hours', async () => {
    db.sqlite.exec("INSERT INTO form_log (voter, kind, created_at) VALUES ('v', 'contact', datetime('now', '-2 days')), ('v', 'contact', datetime('now', '-2 days')), ('v', 'contact', datetime('now', '-2 days'))");
    assert.equal(await claimSlot(db, 'v', 'contact', limits), 'ok');
  });
});

describe('firstLimitNotice', () => {
  test('is true once per form per day', async () => {
    assert.equal(await firstLimitNotice(db, 'contact'), true);
    assert.equal(await firstLimitNotice(db, 'contact'), false);
    assert.equal(await firstLimitNotice(db, 'place'), true);
  });
});

describe('upsertSubscriber', () => {
  test('signing up twice updates rather than duplicating', async () => {
    const sub = { email: 'a@b.co', name: 'A', area: null, interests: null, source: 'footer' };
    await upsertSubscriber(db, sub);
    await upsertSubscriber(db, { ...sub, name: 'Alex' });
    const rows = db.sqlite.prepare('SELECT email, name FROM subscribers').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Alex');
  });
});

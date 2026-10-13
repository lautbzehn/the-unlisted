import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { castVote, findVotableCity, listCities, overDailyCap, upsertSubscriber } from '../store.js';
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

describe('overDailyCap', () => {
  test('allows up to the cap, then blocks', async () => {
    for (let i = 0; i < 3; i++) assert.equal(await overDailyCap(db, 'v', 'contact', 3), false);
    assert.equal(await overDailyCap(db, 'v', 'contact', 3), true);
    assert.equal(await overDailyCap(db, 'other', 'contact', 3), false);
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

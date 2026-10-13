/**
 * Data access for the forms API (Cloudflare D1). Every query uses bound parameters; multi-step writes run
 * as a single D1 batch, which executes as one transaction.
 * @module worker/store
 */

/** Cities the guide already covers. Kept here rather than as a database status, so the board's table stays as it is. */
export const OPEN_CITIES = new Set(['san-diego-ca']);

/**
 * The city board: cities coming soon and cities collecting votes. Open cities appear on neither list.
 * @param {D1Database} db
 */
export async function listCities(db) {
  const { results } = await db
    .prepare("SELECT slug, name, region, status, votes FROM cities WHERE status IN ('approved','coming') ORDER BY votes DESC, name")
    .all();
  const shown = results.filter((c) => !OPEN_CITIES.has(c.slug));
  return { coming: shown.filter((c) => c.status === 'coming'), board: shown.filter((c) => c.status === 'approved') };
}

/** A city that can receive votes, or null. */
export function findVotableCity(db, slug) {
  return db.prepare("SELECT id, votes FROM cities WHERE slug = ? AND status IN ('approved','coming')").bind(slug).first();
}

/** Any city by slug, whatever its status, or null. */
export function findCity(db, slug) {
  return db.prepare('SELECT id, status FROM cities WHERE slug = ?').bind(slug).first();
}

/** Adds a city to the board from the fixed list and returns its id. */
export async function addCity(db, { slug, name, region }) {
  const row = await db.prepare("INSERT INTO cities (slug, name, region, status) VALUES (?, ?, ?, 'approved') RETURNING id").bind(slug, name, region).first();
  return row.id;
}

/**
 * Records one vote per visitor per city. The insert and the counter update run in one transaction,
 * and the counter only moves when the insert actually added a row, so concurrent votes cannot drift it.
 * @returns {Promise<{ counted: boolean, votes: number }>}
 */
export async function castVote(db, cityId, voter) {
  const [insert, , current] = await db.batch([
    db.prepare('INSERT OR IGNORE INTO votes (city_id, voter) VALUES (?, ?)').bind(cityId, voter),
    db.prepare('UPDATE cities SET votes = votes + 1 WHERE id = ? AND changes() > 0').bind(cityId),
    db.prepare('SELECT votes FROM cities WHERE id = ?').bind(cityId),
  ]);
  return { counted: insert.meta.changes > 0, votes: current.results[0]?.votes ?? 0 };
}

/**
 * A rolling 24-hour cap per visitor and form. Logs this attempt when it is allowed.
 * @param {string} kind A form name, such as "contact".
 * @returns {Promise<boolean>} True when the visitor has reached the cap.
 */
export async function overDailyCap(db, voter, kind, max) {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM form_log WHERE voter = ? AND kind = ? AND created_at > datetime('now', '-1 day')").bind(voter, kind).first();
  if (r.n >= max) return true;
  await db.prepare('INSERT INTO form_log (voter, kind) VALUES (?, ?)').bind(voter, kind).run();
  return false;
}

/** City suggestions keep their own log, so the cap survives independently of other forms. */
export async function overSuggestionCap(db, voter, max) {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM suggestion_log WHERE voter = ? AND created_at > datetime('now', '-1 day')").bind(voter).first();
  if (r.n >= max) return true;
  await db.prepare('INSERT INTO suggestion_log (voter) VALUES (?)').bind(voter).run();
  return false;
}

export function saveMessage(db, m) {
  return db.prepare('INSERT INTO messages (name, email, topic, message) VALUES (?, ?, ?, ?)').bind(m.name || null, m.email || null, m.topic, m.message).run();
}

export function savePlaceTip(db, t) {
  return db.prepare('INSERT INTO place_suggestions (metro, name, area, why, link) VALUES (?, ?, ?, ?, ?)').bind(t.metro, t.name, t.area || null, t.why, t.link || null).run();
}

/**
 * Adds or refreshes a newsletter subscriber. Signing up again updates the answers and re-subscribes,
 * and the caller replies the same way either way, so the form cannot reveal who is on the list.
 */
export function upsertSubscriber(db, s) {
  return db
    .prepare(`INSERT INTO subscribers (email, name, area, interests, source) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (email) DO UPDATE SET name = coalesce(excluded.name, name), area = coalesce(excluded.area, area),
        interests = coalesce(excluded.interests, interests), updated_at = datetime('now'), unsubscribed_at = NULL`)
    .bind(s.email, s.name || null, s.area, s.interests, s.source)
    .run();
}

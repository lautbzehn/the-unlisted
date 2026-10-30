/**
 * Data access for the forms API (Cloudflare D1). Every query uses bound parameters; multi-step writes run
 * as a single D1 batch, which executes as one transaction.
 * @module worker/store
 */

/** Cities the guide already covers. Kept here rather than as a database status, so the board's table stays as it is. */
export const OPEN_CITIES = new Set(['san-diego-ca', 'portland-or']);

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

/** Rolling 24-hour window shared by the limits below. */
const LAST_DAY = "created_at > datetime('now', '-1 day')";

/**
 * Claims one submission for a form: allowed while this visitor is under their own limit and the form as a
 * whole is under its site-wide limit, both over the last 24 hours. The check and the log entry are a single
 * SQL statement, so a burst of simultaneous requests cannot slip past either limit.
 * @param {D1Database} db
 * @param {string} voter Anonymous visitor id.
 * @param {string} kind A form name, such as "contact".
 * @param {{ perVisitor: number, siteWide: number }} limits
 * @returns {Promise<'ok' | 'visitor' | 'site'>} 'ok' when allowed (and logged), otherwise which limit was reached.
 */
export async function claimSlot(db, voter, kind, { perVisitor, siteWide }) {
  const { meta } = await db
    .prepare(
      `INSERT INTO form_log (voter, kind) SELECT ?1, ?2
       WHERE (SELECT COUNT(*) FROM form_log WHERE voter = ?1 AND kind = ?2 AND ${LAST_DAY}) < ?3
         AND (SELECT COUNT(*) FROM form_log WHERE kind = ?2 AND ${LAST_DAY}) < ?4`,
    )
    .bind(voter, kind, perVisitor, siteWide)
    .run();
  if (meta.changes > 0) return 'ok';
  const { n } = await db.prepare(`SELECT COUNT(*) AS n FROM form_log WHERE kind = ? AND ${LAST_DAY}`).bind(kind).first();
  return n >= siteWide ? 'site' : 'visitor';
}

/**
 * Notes that a form reached its site-wide limit. True only the first time in 24 hours, so the owner gets one
 * heads-up rather than one email per blocked attempt.
 * @param {D1Database} db
 * @param {string} kind
 */
export async function firstLimitNotice(db, kind) {
  const { meta } = await db
    .prepare(`INSERT INTO form_log (voter, kind) SELECT 'site', ?1 WHERE NOT EXISTS (SELECT 1 FROM form_log WHERE kind = ?1 AND ${LAST_DAY})`)
    .bind(`limit:${kind}`)
    .run();
  return meta.changes > 0;
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

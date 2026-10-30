/**
 * Pure input validation for every form the API accepts. Nothing here touches the network or the database,
 * so each rule is unit-tested directly (see `worker/__tests__/validate.test.js`).
 *
 * Each parser returns `{ ok: true, value }` with normalized, length-limited fields, or
 * `{ ok: false, error }` with a message that is safe to show to the visitor.
 * Database writes always use bound parameters; this layer keeps stored data clean and bounded.
 * @module worker/validate
 */

/** A deliberately simple address check: one `@`, no spaces, and a dot in the domain. */
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HTTP_URL_RE = /^https?:\/\/\S+$/i;

export const CONTACT_TOPICS = ['feedback', 'hello', 'correction', 'closed', 'owner', 'other'];
export const METROS = { 'bay-area': 'Bay Area', 'san-diego': 'San Diego', portland: 'Portland' };

/**
 * A single-line field: collapses whitespace and trims to a maximum length.
 * @param {unknown} value
 * @param {number} max
 */
export const line = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * A multi-line field: keeps line breaks, drops carriage returns, and trims to a maximum length.
 * @param {unknown} value
 * @param {number} max
 */
export const text = (value, max) => String(value ?? '').replace(/\r/g, '').trim().slice(0, max);

const ok = (value) => ({ ok: true, value });
const fail = (error) => ({ ok: false, error });

/**
 * The contact form.
 * @param {Record<string, unknown>} body
 */
export function parseContact(body) {
  const msg = {
    name: line(body.name, 80),
    email: line(body.email, 120),
    topic: CONTACT_TOPICS.includes(body.topic) ? body.topic : 'other',
    message: text(body.message, 2000),
  };
  if (msg.message.length < 2) return fail('Please write a message.');
  if (msg.email && !EMAIL_RE.test(msg.email)) return fail('That email address doesn’t look right.');
  return ok(msg);
}

/**
 * The "suggest a place" form.
 * @param {Record<string, unknown>} body
 */
export function parsePlaceTip(body) {
  const tip = {
    metro: Object.hasOwn(METROS, body.metro) ? body.metro : null,
    name: line(body.name, 100),
    area: line(body.area, 80),
    why: text(body.why, 600),
    link: line(body.link, 300),
  };
  if (!tip.metro) return fail('Please pick a city.');
  if (tip.name.length < 2) return fail('Please add the name of the place.');
  if (tip.why.length < 10) return fail('Tell us a little about why it’s special.');
  if (tip.link && !HTTP_URL_RE.test(tip.link)) return fail('The link should start with http:// or https://.');
  return ok(tip);
}

/**
 * The newsletter sign-up. Choices are checked against the same option lists the form is built from.
 * @param {Record<string, unknown>} body
 * @param {{ areas: Set<string>, interests: Set<string>, sources: string[] }} options
 */
export function parseSubscriber(body, options) {
  const sub = {
    email: line(body.email, 254).toLowerCase(),
    name: line(body.name, 60),
    area: options.areas.has(body.area) ? body.area : null,
    interests: [...new Set([].concat(body.interests ?? []))].filter((k) => options.interests.has(k)).join(',') || null,
    source: options.sources.includes(body.source) ? body.source : 'footer',
  };
  if (!EMAIL_RE.test(sub.email)) return fail('That email address doesn’t look right.');
  return ok(sub);
}

/**
 * A city slug for voting or suggesting: short, lowercase letters, digits, and hyphens only.
 * @param {unknown} value
 * @returns {string | null}
 */
export function parseSlug(value) {
  const slug = String(value ?? '');
  return /^[a-z0-9-]{2,64}$/.test(slug) ? slug : null;
}

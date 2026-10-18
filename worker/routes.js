/**
 * Route handlers for the forms API. Each handler is thin: validate the input, claim a slot under the form's daily
 * limits, write through the store, notify the owner when relevant, and reply in plain language.
 * Request-level guards (same origin, body limits, Turnstile) run in the router before any handler.
 * @module worker/routes
 */

import CITY_OPTIONS from '../src/data/city-options.json' with { type: 'json' };
import SIGNUP from '../src/data/signup-options.json' with { type: 'json' };
import { HttpError } from './http.js';
import { notifyOwner } from './notify.js';
import * as store from './store.js';
import { METROS, parseContact, parsePlaceTip, parseSlug, parseSubscriber } from './validate.js';

const CITY_CHOICES = new Map(CITY_OPTIONS.map((c) => [c.slug, c]));
const SIGNUP_OPTIONS = {
  areas: new Set(SIGNUP.areas.map(([key]) => key)),
  interests: new Set(SIGNUP.interests.map(([key]) => key)),
  sources: SIGNUP.sources,
};

/**
 * Daily limits for each form over a rolling 24 hours: one per visitor, and one for everyone together, so even a
 * flood from many addresses stops at a known number. Set well above normal use.
 */
export const LIMITS = {
  contact: { perVisitor: 3, siteWide: 20, name: 'contact form', tooMany: 'That’s a lot of messages for one day. Try again tomorrow.' },
  place: { perVisitor: 5, siteWide: 30, name: 'place tips form', tooMany: 'That’s plenty of tips for today. Thank you!' },
  subscribe: { perVisitor: 5, siteWide: 100, name: 'newsletter sign-up', tooMany: 'That’s a lot of sign-ups for one day. Try again tomorrow.' },
  city: { perVisitor: 5, siteWide: 30, name: 'city suggestions', tooMany: 'That’s plenty of suggestions for today. Thank you!' },
  vote: { perVisitor: 30, siteWide: 300, name: 'city votes', tooMany: 'That’s a lot of votes for one day. Try again tomorrow.' },
};
export const BUSY = 'We’re getting a lot more than usual right now. Please try again tomorrow.';

/**
 * Claims one submission under a form's limits, or refuses with a 429. The first time a form reaches its
 * site-wide limit in a day, the owner gets one email about it.
 * @param {Context} context
 * @param {keyof typeof LIMITS} kind
 */
async function claim({ voter, env }, kind) {
  const limit = LIMITS[kind];
  const verdict = await store.claimSlot(env.DB, voter, kind, limit);
  if (verdict === 'ok') return;
  if (verdict === 'visitor') throw new HttpError(429, limit.tooMany);
  if (await store.firstLimitNotice(env.DB, kind)) {
    await notifyOwner(env, `The Unlisted: ${limit.name} paused for today`,
      `The ${limit.name} reached its limit of ${limit.siteWide} in 24 hours, so it is turning visitors away for now. It reopens on its own as the day rolls over.\n\nIf this wasn’t a busy day, it was probably a spam attempt. Nothing was lost, and nothing is needed from you.`);
  }
  throw new HttpError(429, BUSY);
}

/** Unwraps a validator result, turning a rejection into a 400 with the visitor-facing message. */
function valid(result) {
  if (!result.ok) throw new HttpError(400, result.error);
  return result.value;
}

/**
 * @typedef {object} Context
 * @property {Record<string, unknown>} body The parsed JSON body.
 * @property {string} voter The visitor's anonymous identifier.
 * @property {{ DB: D1Database }} env
 */

/** GET /api/cities */
export const getCities = async ({ env }) => store.listCities(env.DB);

/** POST /api/cities/vote */
export async function voteForCity({ body, voter, env }) {
  const slug = parseSlug(body.slug);
  const city = slug && (await store.findVotableCity(env.DB, slug));
  if (!city) throw new HttpError(404, 'That city isn’t on the board.');
  await claim({ voter, env }, 'vote');
  const { counted, votes } = await store.castVote(env.DB, city.id, voter);
  return { counted, votes, message: counted ? 'Vote counted.' : 'You already voted for this one.' };
}

/** POST /api/cities/suggest: cities come from a fixed list, so a suggestion goes straight onto the board. */
export async function suggestCity({ body, voter, env }) {
  const pick = CITY_CHOICES.get(parseSlug(body.slug));
  if (!pick) throw new HttpError(400, 'Please pick a city from the list.');
  if (store.OPEN_CITIES.has(pick.slug)) return { message: `${pick.name} is already open on The Unlisted.` };
  await claim({ voter, env }, 'city');

  const existing = await store.findCity(env.DB, pick.slug);
  if (existing?.status === 'rejected') return { message: `Thanks. ${pick.name} isn’t on the board right now.` };
  if (existing?.status === 'coming') return { message: `${pick.name} is already booked. It’s coming soon.` };
  const cityId = existing?.id ?? (await store.addCity(env.DB, pick));
  const { counted } = await store.castVote(env.DB, cityId, voter);
  const where = `${pick.name}, ${pick.region}`;
  if (!existing) return { message: `${where} is on the board with your vote.` };
  return { message: counted ? `${where} is already on the board. Your vote is counted.` : `You already voted for ${where}.` };
}

/** POST /api/contact */
export async function sendMessage({ body, voter, env }) {
  const msg = valid(parseContact(body));
  await claim({ voter, env }, 'contact');
  await store.saveMessage(env.DB, msg);
  await notifyOwner(env, `The Unlisted: new message (${msg.topic})`,
    `From: ${msg.name || '(no name)'}\nReply to: ${msg.email || '(no email given)'}\nTopic: ${msg.topic}\n\n${msg.message}`);
  return { message: 'Sent.' };
}

/** POST /api/places/suggest */
export async function suggestPlace({ body, voter, env }) {
  const tip = valid(parsePlaceTip(body));
  await claim({ voter, env }, 'place');
  await store.savePlaceTip(env.DB, tip);
  await notifyOwner(env, `The Unlisted: place tip for ${METROS[tip.metro]}`,
    `${tip.name}${tip.area ? ` (${tip.area})` : ''}\n${METROS[tip.metro]}\n\nWhy: ${tip.why}\n${tip.link ? `Link: ${tip.link}` : ''}`);
  return { message: 'Got it.' };
}

/** POST /api/subscribe */
export async function subscribe({ body, voter, env }) {
  const sub = valid(parseSubscriber(body, SIGNUP_OPTIONS));
  await claim({ voter, env }, 'subscribe');
  await store.upsertSubscriber(env.DB, sub);
  return { message: 'You’re on the list.' };
}

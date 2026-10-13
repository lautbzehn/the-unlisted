/**
 * Route handlers for the forms API. Each handler is thin: validate the input, apply the visitor's daily cap,
 * write through the store, notify the owner when relevant, and reply in plain language.
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
  const { counted, votes } = await store.castVote(env.DB, city.id, voter);
  return { counted, votes, message: counted ? 'Vote counted.' : 'You already voted for this one.' };
}

/** POST /api/cities/suggest: cities come from a fixed list, so a suggestion goes straight onto the board. */
export async function suggestCity({ body, voter, env }) {
  const pick = CITY_CHOICES.get(parseSlug(body.slug));
  if (!pick) throw new HttpError(400, 'Please pick a city from the list.');
  if (store.OPEN_CITIES.has(pick.slug)) return { message: `${pick.name} is already open on The Unlisted.` };
  if (await store.overSuggestionCap(env.DB, voter, 5)) throw new HttpError(429, 'That’s plenty of suggestions for today. Thank you!');

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
  if (await store.overDailyCap(env.DB, voter, 'contact', 3)) throw new HttpError(429, 'That’s a lot of messages for one day. Try again tomorrow.');
  await store.saveMessage(env.DB, msg);
  await notifyOwner(env, `The Unlisted: new message (${msg.topic})`,
    `From: ${msg.name || '(no name)'}\nReply to: ${msg.email || '(no email given)'}\nTopic: ${msg.topic}\n\n${msg.message}`);
  return { message: 'Sent.' };
}

/** POST /api/places/suggest */
export async function suggestPlace({ body, voter, env }) {
  const tip = valid(parsePlaceTip(body));
  if (await store.overDailyCap(env.DB, voter, 'place', 5)) throw new HttpError(429, 'That’s plenty of tips for today. Thank you!');
  await store.savePlaceTip(env.DB, tip);
  await notifyOwner(env, `The Unlisted: place tip for ${METROS[tip.metro]}`,
    `${tip.name}${tip.area ? ` (${tip.area})` : ''}\n${METROS[tip.metro]}\n\nWhy: ${tip.why}\n${tip.link ? `Link: ${tip.link}` : ''}`);
  return { message: 'Got it.' };
}

/** POST /api/subscribe */
export async function subscribe({ body, voter, env }) {
  const sub = valid(parseSubscriber(body, SIGNUP_OPTIONS));
  if (await store.overDailyCap(env.DB, voter, 'subscribe', 5)) throw new HttpError(429, 'That’s a lot of sign-ups for one day. Try again tomorrow.');
  await store.upsertSubscriber(env.DB, sub);
  return { message: 'You’re on the list.' };
}

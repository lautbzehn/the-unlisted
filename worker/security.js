/**
 * Visitor verification: Cloudflare Turnstile checks and anonymous visitor identifiers.
 * @module worker/security
 */

import { HttpError } from './http.js';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare's published Turnstile test secrets. Their verdicts report a placeholder hostname. */
const TEST_SECRET = /^[123]x0{20,}A{2}$/;

/**
 * Confirms a Turnstile token with Cloudflare, and that it was issued on this site.
 * @param {Request} request The incoming request (supplies the visitor's IP and the expected hostname).
 * @param {{ TURNSTILE_SECRET?: string }} env
 * @param {unknown} token The token the page received from the Turnstile widget.
 * @param {typeof fetch} [fetchImpl=fetch] Injectable for tests.
 * @throws {HttpError} 403 when the check fails, 503 when Cloudflare cannot be reached.
 */
export async function verifyHuman(request, env, token, fetchImpl = fetch) {
  const fail = () => new HttpError(403, 'Please complete the "not a bot" check and try again.');
  if (typeof token !== 'string' || !token || token.length > 2048 || !env.TURNSTILE_SECRET) throw fail();
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  form.append('remoteip', request.headers.get('cf-connecting-ip') ?? '');
  let verdict;
  try {
    verdict = await (await fetchImpl(SITEVERIFY, { method: 'POST', body: form })).json();
  } catch {
    throw new HttpError(503, 'The "not a bot" check is unavailable. Try again in a minute.');
  }
  if (verdict?.success !== true) throw fail();
  // A token minted on another site using the same widget must not count here.
  const expected = new URL(request.url).hostname;
  if (!TEST_SECRET.test(env.TURNSTILE_SECRET) && verdict.hostname !== expected) throw fail();
}

/**
 * A stable, anonymous identifier for a visitor: a keyed hash of their IP address, truncated to 128 bits.
 * The address itself is never stored, and the key keeps the hash from being reversed by brute force.
 * @param {Request} request
 * @param {{ TURNSTILE_SECRET: string }} env The secret doubles as the hashing key.
 * @returns {Promise<string>} 32 hex characters.
 */
export async function visitorId(request, env) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.TURNSTILE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return [...new Uint8Array(sig)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

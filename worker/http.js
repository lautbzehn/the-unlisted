/**
 * HTTP primitives for the Worker's JSON API: responses, typed errors, and request guards.
 * Every guard fails closed with an {@link HttpError}, which the router turns into a JSON error response.
 * @module worker/http
 */

/** Largest request body the API accepts. Form payloads are a few hundred bytes; this leaves generous headroom. */
export const MAX_BODY_BYTES = 16 * 1024;

/** An error with an HTTP status and a message that is safe to show to the visitor. */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code.
   * @param {string} message Visitor-facing explanation.
   */
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/**
 * A JSON response that is never cached.
 * @param {unknown} data Response body.
 * @param {number} [status=200]
 * @returns {Response}
 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * Rejects cross-site requests. Browsers always send `Origin` on a cross-origin POST, so a mismatch
 * means another site is trying to submit on a visitor's behalf. Requests without `Origin` (non-browser
 * clients) are still subject to the Turnstile check and daily caps.
 * @param {Request} request
 * @throws {HttpError} 403 when the request comes from another origin.
 */
export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Not allowed.');
}

/**
 * Reads a JSON object body with a size limit and a content-type check, before any parsing happens.
 * @param {Request} request
 * @param {number} [maxBytes=MAX_BODY_BYTES]
 * @returns {Promise<Record<string, unknown>>} The parsed object.
 * @throws {HttpError} 415 for non-JSON, 413 when too large, 400 when malformed or not an object.
 */
export async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Requests must be JSON.');
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, 'That request is too large.');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new HttpError(413, 'That request is too large.');
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'That request could not be read.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'That request could not be read.');
  return body;
}

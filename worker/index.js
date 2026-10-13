/**
 * The Unlisted's Cloudflare Worker. Static pages are served from the assets binding; only `/api/*` runs code.
 *
 *   GET  /api/cities           { coming, board }    cities already open are listed on neither
 *   POST /api/cities/vote      { slug, token }      one vote per city per visitor
 *   POST /api/cities/suggest   { slug, token }      a city from the fixed list (src/data/city-options.json)
 *   POST /api/contact          { name?, email?, topic, message, token }        saved privately, owner notified
 *   POST /api/places/suggest   { metro, name, area?, why, link?, token }     saved privately, owner notified
 *   POST /api/subscribe        { email, name?, area?, interests?, source, token }   newsletter list (private)
 *
 * Every POST passes the same guards, in order: same origin, JSON only, a 16 KB body limit, and a
 * Cloudflare Turnstile check. Visitors are identified only by a keyed hash of their IP address.
 * @module worker
 */

import { assertSameOrigin, HttpError, json, readJson } from './http.js';
import * as routes from './routes.js';
import { verifyHuman, visitorId } from './security.js';

/** Route table: one handler per method and path. */
const ROUTES = {
  'GET /api/cities': { handler: routes.getCities, guarded: false },
  'POST /api/cities/vote': { handler: routes.voteForCity, guarded: true },
  'POST /api/cities/suggest': { handler: routes.suggestCity, guarded: true },
  'POST /api/contact': { handler: routes.sendMessage, guarded: true },
  'POST /api/places/suggest': { handler: routes.suggestPlace, guarded: true },
  'POST /api/subscribe': { handler: routes.subscribe, guarded: true },
};

/**
 * Runs one API request through its guards and handler.
 * @param {Request} request
 * @param {object} env Worker bindings and secrets.
 * @param {string} path
 */
async function handleApi(request, env, path) {
  const route = ROUTES[`${request.method} ${path}`];
  if (!route) throw new HttpError(404, 'Not found');
  if (!route.guarded) return json(await route.handler({ env }));

  assertSameOrigin(request);
  const body = await readJson(request);
  await verifyHuman(request, env, body.token);
  const voter = await visitorId(request, env);
  return json(await route.handler({ body, voter, env }));
}

export default {
  /**
   * @param {Request} request
   * @param {object} env
   */
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env, path);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error('api: unexpected error', error);
      return json({ error: 'Something went wrong. Try again in a minute.' }, 500);
    }
  },
};

# Architecture

**v1.2 · 10.17.2026** · The Unlisted 1.5

## Goals

| Goal | Consequence |
|---|---|
| Fast and nearly free to run | Every page is pre-rendered at build time; only the forms run server code. |
| No accounts, real privacy | The passport lives in the visitor's browser. Forms store only what the visitor typed. |
| A guide people trust | Data and scores come from one reviewed source of truth and one shared formula. |

## System overview

```mermaid
flowchart LR
  subgraph Build["Build · Astro"]
    P[("src/data/places.json")] --> Pages["Pre-rendered pages"]
    P --> OG["Share images per place"]
    Score["src/lib/scoring.js"] --> Pages
  end
  Pages --> CDN["Cloudflare static assets"]
  Browser["Browser"] --> CDN
  Browser -- "forms" --> W["Worker · worker/index.js"]
  W --> T["Turnstile"]
  W --> DB[("D1 · cities, inbox, subscribers")]
  W --> E["Email alert to the owner"]
```

## Front end

- **Astro 7** renders the front page, Explore, place pages, the passport, Our Story, Help, and "How the score works" as static HTML, with small scripts for interaction.
- **Map:** MapLibre GL with OpenFreeMap tiles and a custom vintage style, lazy-loaded.
- **Passport, notes, and ratings:** `localStorage`, on the visitor's device only.
- **Share images:** generated per place at build time.

## Server

One Cloudflare Worker handles `/api/*`, split by responsibility:

| Module | Responsibility |
|---|---|
| `worker/index.js` | Route table and error boundary. Every POST runs the same guards in order before its handler. |
| `worker/http.js` | JSON responses, `HttpError`, the same-origin check, and body parsing with a 16 KB limit and a JSON-only rule. |
| `worker/security.js` | Turnstile verification (including the issuing hostname) and the anonymous keyed visitor hash. |
| `worker/validate.js` | Pure input validation and normalization for each form. |
| `worker/store.js` | All D1 queries, with bound parameters. A vote is one transaction, so concurrent votes cannot drift the count, and a form's limit check and log entry are one statement, so bursts cannot slip past it. |
| `worker/routes.js` | Thin handlers: validate, claim a slot under the form's daily limits, store, notify, reply. |
| `worker/notify.js` | Best-effort owner email through Cloudflare's email binding, addressed by the `NOTIFY_TO` secret. |

- **Forms:** contact, suggest a place, sign up, and city votes and suggestions.
- **Protection:** same origin, JSON under 16 KB, a Turnstile check issued for this hostname, an anonymous keyed visitor hash, and two daily limits per form: one per visitor and one site-wide, so a flood from many addresses still stops at a known number. The first time a form reaches its site-wide limit in a day, the owner gets one email. The limits are in `LIMITS` in `worker/routes.js`.
- **Storage:** D1, with schema in [`migrations/`](../migrations).
- **Tests:** `npm test` runs 39 unit tests with Node's built-in runner, including the store's SQL against the real migrations in an in-memory SQLite.

## Data

Places come from the [research pipeline](data-pipeline_v1.0_10.11.2026.md). Only approved places are written to `src/data/places.json`, which is the single source the build reads.

## Delivery

- **CI** tests and builds every pull request and push to `main`.
- **Release:** `npm run deploy` (build, then `wrangler deploy`) from the owner's release session.
- **Hardening:** security headers from `public/_headers`, including a content security policy whose inline-script hashes are filled in by `scripts/csp.mjs` after each build.

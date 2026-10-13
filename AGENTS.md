# The Unlisted: working agreement

Live at [unlisted.icarianforge.com](https://unlisted.icarianforge.com). Owner: Dan West. This file guides anyone, human or AI agent, who changes this repository. `CLAUDE.md` is a link to this file.

`main` is what's live. Always start from the latest `main`.

## How changes ship

- Work on a branch, open a pull request, and merge only when CI (tests and a full build) passes. Never push straight to `main`.
- "Ship" means merge the pull request, then deploy with `npm run deploy`.
- Never put secrets in the repository or in chat. Runtime secrets (`TURNSTILE_SECRET`, `NOTIFY_TO`) live in Cloudflare; see `.dev.vars.example`. The research pipeline's key lives in a local `.env`; see `.env.example`.

## Editorial rules

- Independents only: no chains, no paid placement.
- Every published place is reviewed by a person. AI drafts stay hidden until approved ([ADR 0002](docs/adr/0002-ai-researches-people-decide_v1.0_10.11.2026.md)).
- The Hidden Gem Score comes from one shared formula and is never typed in by hand ([ADR 0003](docs/adr/0003-one-score-formula_v1.0_10.11.2026.md)).
- Copy is plain, warm, and human. No em dashes.

## Engineering rules

- The site is static first ([ADR 0001](docs/adr/0001-static-first_v1.0_10.11.2026.md)). The only server code is the forms API in `worker/`.
- Every API input is validated in `worker/validate.js` (pure functions with unit tests) before it reaches the database, and every query uses bound parameters.
- Pages run only their own scripts. `scripts/csp.mjs` allows Astro's inline scripts by hash after each build and fails the build on inline event handlers, so keep JavaScript in `<script>` blocks or files, never `onclick=` attributes.
- Pipeline steps that call a paid API offer a free `--estimate` first and stop at the budget cap in `scripts/pipeline/lib/claude.mjs`.
- Documents carry a version and date (`vX.X` and `mm.dd.yyyy`) in the file name and on the document.

## Commands

```bash
npm ci
npm run dev          # http://localhost:4321
npm test             # forms API unit tests (Node's built-in test runner)
npm run build        # static site, share images, content policy
npm run deploy       # build, then publish to Cloudflare
npm run inbox        # read messages and place tips (private)
npm run subscribers  # read the newsletter list (private)
```

## Where things are

The architecture is in [docs/architecture](docs/architecture_v1.1_10.13.2026.md) and the research pipeline in [docs/data-pipeline](docs/data-pipeline_v1.0_10.11.2026.md). The reasoning behind the bigger choices is in [docs/adr](docs/adr).

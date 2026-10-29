# Changelog

Notable changes to The Unlisted. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Portland, Oregon is ready to research: a `portland` metro in the pipeline (Multnomah, Washington and Clackamas counties, 17 areas, Portland press for the fame check), a county lookup scoped to the metro's state, a metro-aware enrich step, the cloud research brief `prompts/cloud-research-portland.md` and the plan `docs/portland-expansion-plan_v1.1_10.29.2026.md`. Nothing on the live site changes yet.
- Anonymous visit counts for Dan, the same as on www.icarianforge.com: the pages you open, how long, how far down, links off the site, and the tagged link (?via=) if there was one. Never the Bucket List, stamps, ratings or notes, never buttons, and never anything typed. No cookies, and nothing at all under Global Privacy Control. The privacy page has a new "Visit counts" section. The script is `public/insights.js`, reporting to www.icarianforge.com/api/i.

## [1.5.0] · 2026-10-17

### Security
- Every form now has a site-wide daily limit on top of the per-visitor one, so a flood from many addresses still stops at a known number. The first time a form reaches its limit in a day, the owner gets one email instead of a flood. City votes have daily limits for the first time.
- A form's limit check and its log entry are a single SQL statement, so a burst of simultaneous requests cannot slip past either limit.

### Changed
- The link out from each place now reads "Business info" instead of "Google Maps". It opens the same Google Maps search as before.
- City suggestions use the same limit log as every other form. Migration `0005` adds the index the site-wide counts use.
- 39 unit tests. Architecture doc v1.2.

## [1.4.0] · 2026-10-13

### Security
- A strict Content Security Policy: only the site's own scripts run, Astro's few inline scripts are allowed by hash (computed after every build), and the build fails if a page adds an inline event handler. Also adds `Cross-Origin-Opener-Policy` and extends HSTS to subdomains.
- Forms API hardening: requests must come from the site itself, be JSON, and stay under 16 KB. A Turnstile check only counts when it was issued for this hostname, and an outage at Cloudflare now returns a clear 503 instead of a generic error.
- Place tips only accept known metros as their own keys, never inherited object properties such as `toString`.
- A vote and its counter update run in one transaction, so simultaneous votes cannot drift the tally.
- Wrangler 4.149 (patches a sharp advisory in local tooling) and the share-image renderer's compression library pinned to the patched fflate 0.7.5. `npm audit` is clean.

### Changed
- The Worker is split by responsibility: router, request guards, verification, validation, data access, handlers, and notifications.
- 33 unit tests for the API (validation, guards, and SQL against the real migrations), run in CI with Node's built-in test runner.
- `.dev.vars.example` and `.env.example` document every setting. `AGENTS.md` is now a real working agreement; it had been overwritten through the `CLAUDE.md` link.
- Architecture doc v1.1.

## [1.3.0] · 2026-10-10

### Changed
- Public-ready repository: a real README, architecture and data-pipeline docs, decision records, a security policy, and GitHub templates.
- The owner's notification address moved out of the code into a Cloudflare secret.

### Added
- Security headers on every page and file.

## [1.2.0] · 2026-10-08

### Added
- **San Diego is open:** 98 researched places, its own front page and Explore, and a Bay Area · San Diego switch.
- A ticket-booth restyle: tonight's doors, a swipeable Surprise me deck, passport stamps, and an "An Icarian Forge product" mark.

## [1.1.0] · 2026-10-06

### Added
- Passport Noir redesign with a sepia, letterpress feel; the Gem door score graphic; a welcome gate; Our Story; Help.
- Contact, suggest-a-place, and sign-up forms backed by D1, email alerts, and Turnstile.
- Research run: 180 Bay Area candidates researched into 145 drafts, triaged by hand.

## [1.0.0] · 2026-10-05

### Added
- First working guide: cards, a map, Surprise me, place pages with share images, and "How the score works."
- The budget-capped research pipeline: discover, select, and enrich via the Batch API, with drafts visible in development only.

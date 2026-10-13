# Changelog

Notable changes to The Unlisted. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security
- Forms API hardening: requests must come from the site itself, be JSON, and stay under 16 KB. A Turnstile check only counts when it was issued for this hostname, and an outage at Cloudflare now returns a clear 503 instead of a generic error.
- Place tips only accept known metros as their own keys, never inherited object properties such as `toString`.
- A vote and its counter update run in one transaction, so simultaneous votes cannot drift the tally.

### Changed
- The Worker is split by responsibility: router, request guards, verification, validation, data access, handlers, and notifications.
- 33 unit tests for the API (validation, guards, and SQL against the real migrations), run in CI with Node's built-in test runner.
- `.dev.vars.example` and `.env.example` document every setting. `AGENTS.md` is now a real working agreement; it had been overwritten through the `CLAUDE.md` link.
- Architecture doc v1.1.

### Security
- A strict Content Security Policy: only the site's own scripts run, Astro's few inline scripts are allowed by hash (computed after every build), and the build fails if a page adds an inline event handler. Also adds `Cross-Origin-Opener-Policy` and extends HSTS to subdomains.
- Wrangler 4.149 (patches a sharp advisory in local tooling) and the share-image renderer's compression library pinned to the patched fflate 0.7.5. `npm audit` is clean.

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

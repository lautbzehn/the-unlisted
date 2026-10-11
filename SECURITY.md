# Security

## Reporting a vulnerability

Please email **hello@icarianforge.com** with "Security" in the subject line. Do not open a public issue. Include what you found and how to reproduce it. I aim to reply within a few days and will credit you if you'd like.

**In scope:** this repository and `unlisted.icarianforge.com`.

## How the project is protected

| Area | Control |
|---|---|
| Secrets | None in the repository. `TURNSTILE_SECRET` and the notification address (`NOTIFY_TO`) are Cloudflare secrets. |
| Forms | Every submission passes a Cloudflare Turnstile check. Visitors are identified only by an anonymous keyed hash, and each form has a daily cap per visitor. |
| Data | No accounts and no tracking. Passport stamps, notes, and ratings stay in the visitor's browser. Form submissions are stored in D1 and visible only to the owner. |
| Browser | A Content Security Policy that runs only the site's own scripts (Astro's few inline scripts are allowed by SHA-256 hash, computed by `scripts/csp.mjs` after every build, which also fails the build on inline event handlers), plus Cloudflare Turnstile and Web Analytics; HSTS, `nosniff`, `Cross-Origin-Opener-Policy: same-origin`, same-origin framing, `strict-origin-when-cross-origin` referrers, and camera, microphone, and payment access disabled. Location is allowed for this site only. |
| Supply chain | Dependabot watches npm and GitHub Actions; CI installs from the lockfile. |

## Supported versions

Only the latest `main`, which is what the live site serves.

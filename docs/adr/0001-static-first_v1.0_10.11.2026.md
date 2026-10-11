# 0001 · Pre-render the guide; run server code only for forms

**Status:** Accepted · **v1.0 · 10.11.2026**

## Context
A guide is read far more than it is written. It should load instantly, cost almost nothing, and have very little to attack.

## Decision
Astro pre-renders every page and share image at build time. A single Cloudflare Worker handles only the forms, backed by D1.

## Consequences
- Fast pages on a global network, with near-zero hosting cost.
- Adding or changing places means a rebuild and redeploy, which suits a reviewed guide.

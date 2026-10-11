# 0003 · One shared score formula, never hand-typed scores

**Status:** Accepted · **v1.0 · 10.11.2026**

## Context
A score people can't explain is just another star rating. Hand-typed scores also drift.

## Decision
The Hidden Gem Score is a weighted average of five visible marks (Uniqueness 25%, Atmosphere 20%, Story 20%, Signature item 15%, Under the radar 20%), computed by `src/lib/scoring.js` everywhere it appears, including a live calculator on "How the score works."

## Consequences
- Every score is explainable and consistent.
- Changing a weight changes every score at once, so weights change rarely and deliberately.

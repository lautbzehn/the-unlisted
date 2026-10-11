# 0002 · AI researches; a person approves every place

**Status:** Accepted · **v1.0 · 10.11.2026**

## Context
AI with web search can read far more than a person, but it can also be confidently wrong, and a food guide lives or dies on trust.

## Decision
Claude discovers and researches candidates and drafts each card by a written rubric. Drafts stay hidden until a person approves, edits, or skips them. Free, rule-based steps (chain filtering, map matching, the "open secret" rule) run before and after the AI steps, and every paid step has a free cost estimate first.

## Consequences
- 253 published places, every one reviewed, for about $70 of research.
- Throughput is limited by review time, on purpose.

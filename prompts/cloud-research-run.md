# Cloud research run: 180 more places

Brief for a Claude Code **cloud session** working on this repo. It runs on Dan's cloud session credit, then on his plan.
Work in small batches and save after each one, so hitting a usage limit never loses work.

## Ground rules
- Work on the branch `research/places-200`. Never commit to `main`. Don't touch anything under `src/`.
- Follow `prompts/enrich-place.md` exactly (no invented facts, own words, sources, flags). Read it first.
- Never use Google Maps or Yelp as a source.
- Keep it lean: at most 3 web searches and 1 page fetch per place, and make one of the searches a Reddit search
  (`site:reddit.com "<name>" <neighborhood>`). If a place needs more, flag it and move on.
- Reddit rules are in `prompts/enrich-place.md` (rule 5): use it for what regulars order, the feel of the room and
  "still open?" signals; facts like founding years need a non-Reddit source or a flag. Never quote or name Reddit users.
- Nothing is approved here. Every place stays `"status": "draft"`; Dan reviews them in the app.

## Setup (free, once)
```
npm ci
node scripts/pipeline/01-fetch-osm.mjs
node scripts/pipeline/02-filter-chains.mjs
```

## Step 1: discovery (about 250 names)
Use the 16 areas and the day/night focus in `scripts/pipeline/03-discover.mjs` (the `AREAS` and `SHIFTS` lists and the
`SYSTEM` rules). For each area and shift, search for up to 10 candidates not already in `src/data/places.json`.
Start each area with a Reddit search (for example `site:reddit.com hole in the wall <area>` or `site:reddit.com best
breakfast counter <area>`): that's where the deep cuts are. Aim for at least a third of the picks to be deep cuts.
Append them to `data/review/discovered.json` in the same shape the script describes:
`{name, neighborhood, city, address, kind, when, fame, why, source_url, open_evidence, from}`, with `from` = `disc-<area index>-<day|night>`.
Commit and push after every 4 areas.

Then pick the shortlist (free, no AI):
```
node scripts/pipeline/04-select.mjs 180
```
Commit and push `data/review/candidates.json`.

## Step 2: research, 20 places per batch
Take the next 20 places from `data/review/candidates.json` that aren't in an earlier batch file. Research each one and write
the drafts to `data/review/batch-NN.json` (NN = 02, 03, ...), in the exact shape of `data/review/trial-01.json`. Keep the
candidate's `id`, `lat`, `lng` and `osm`, set `"status": "draft"`, `"seed": false`, `"verified": "2026-10"`.
If a place turns out closed, a chain or a poor fit, leave it out and add `{id, name, reason}` to `data/review/skipped.json`.

After each batch:
```
node scripts/pipeline/render-review.mjs data/review/batch-NN.json
git add data/review && git commit -m "Research batch NN" && git push
```
Then start the next batch. Stop after 180 drafts, or earlier if told to.

## Report at the end of each batch
One line: batch number, drafts written, skips, and anything Dan should know.

# Cloud research run: San Diego, first 100 places

Brief for a Claude Code **cloud session** on this repo. It runs on Dan's cloud credit, then his plan.
Goal: **about 100 San Diego places** = Dan's 20 picks + about 80 found by research. Built so a later round can take
San Diego to 200 with the same steps. Work in small batches and save after each one.

## Ground rules
- Work on the branch `research/san-diego`. If you can't use that name, say which branch you're on in your first message.
  Never commit to `main`. Don't touch anything under `src/`, `worker/`, or the Bay Area files in `data/review/` (top level).
- Read `prompts/enrich-place.md` first and follow it exactly: no invented facts, your own words, sources, honest flags.
- Fame labels: a place covered by **2 or more press outlets is not a deep cut**. Use `open-secret` or `local-legend`.
- Keep it lean: at most 3 web searches and 1 page fetch per place. If a place needs more, flag it and move on.
- Nothing is approved here. Every place stays `"status": "draft"`; Dan reviews them in the app.
- Every draft gets `"metro": "san-diego"`.

## Setup (free, once)
```
npm ci
METRO=san-diego node scripts/pipeline/01-fetch-osm.mjs
METRO=san-diego node scripts/pipeline/02-filter-chains.mjs
```
If OpenStreetMap can't be reached from the cloud, say so and continue: step 04 falls back to address lookup.

**Reddit check:** for the first place you research, try one search like `site:reddit.com "Aero Club" San Diego`.
If Reddit results come back, use one Reddit search per place (subreddits in `scripts/pipeline/metros.mjs`).
If they don't, stop trying Reddit for the rest of the run and note it in your report. Don't spend searches on it.

## Step 1: Dan's 20 picks first
Research every place in `data/seeds-san-diego.json`. Its `lead` field is Dan's description: treat it as a lead to
verify, not a fact. Only state what sources support.
Write the drafts to `data/review/san-diego/batch-01.json` in the exact shape of `data/review/trial-01.json`, with
`"seed": true`, `"metro": "san-diego"`, `"status": "draft"`, `"verified": "2026-10"`, plus `lat`/`lng` from the
address (OpenStreetMap address search) and `osm` if you matched it. Use the place's slug as `id`, and add `-sd` if that
id already exists in `src/data/places.json` or any `data/review/**/batch-*.json`.
If one of Dan's picks is closed or is a chain, leave it out and add `{id, name, reason}` to
`data/review/san-diego/skipped.json`. Dan will want to know.

Then run:
```
METRO=san-diego node scripts/pipeline/06-fix-fame.mjs
node scripts/pipeline/render-review.mjs data/review/san-diego/batch-01.json
git add data/review/san-diego && git commit -m "San Diego batch 01 (Dan's picks)" && git push
```

**CHECKPOINT: stop here.** Post a short summary (drafts written, skips, anything surprising) and wait for Dan to say
"continue". He checks the credit meter at this point.

## Step 2: discovery (about 120 names)
Use the 12 San Diego areas and the day/night focus in `scripts/pipeline/metros.mjs` (`san-diego`), and the rules in
the `SYSTEM` prompt of `scripts/pipeline/03-discover.mjs`. For each area and shift, find **up to 6** candidates that
aren't Dan's picks and aren't already in the guide. Start each area with a Reddit search if Reddit works.
Append them to `data/review/san-diego/discovered.json` in the shape the script describes, with `from` =
`disc-<area index>-<day|night>`. Commit and push after every 4 areas.

Balance the list while you go:
- No more than about a third coffee shops and bakeries (Dan's picks already lean that way). Favor food counters,
  family restaurants, taquerias, delis, dive bars with food, markets with kitchens.
- Aim for at least a third honest deep cuts.
- Cover every area, including National City/Chula Vista and La Mesa/El Cajon.

Then pick the shortlist (free, no AI):
```
METRO=san-diego node scripts/pipeline/04-select.mjs 100
```
Commit and push `data/review/san-diego/candidates.json`.

## Step 3: research, 20 places per batch
Take the next 20 places from `data/review/san-diego/candidates.json` that aren't in an earlier batch file and research
each one into `data/review/san-diego/batch-NN.json` (NN = 02, 03, ...), same shape and fields as step 1 but
`"seed": false`. Closed, chain or poor-fit places go to `skipped.json` with a reason.
After each batch:
```
METRO=san-diego node scripts/pipeline/06-fix-fame.mjs
node scripts/pipeline/render-review.mjs data/review/san-diego/batch-NN.json
git add data/review/san-diego && git commit -m "San Diego batch NN" && git push
```
**Stop when there are about 80 drafts across batches 02 and up** (so about 100 with Dan's picks), or when told to stop.

## Report at the end of each batch
One line: batch number, drafts written, skips, and anything Dan should know.

# Cloud research run: Portland, about 200 places

> **How to start (for Dan):** in the Claude desktop app, start a new session, choose **cloud**, pick the
> **the-unlisted** repository and **Opus 5.5**, then paste this one line:
>
> `Follow prompts/cloud-research-portland.md. Start with the Network check, then Setup, then Step 1.`
>
> Everything below is the cloud session's own instructions. You don't need to paste it.
> The plan behind this brief is `docs/portland-expansion-plan_v1.0_10.29.2026.md`.

Brief for a Claude Code **cloud session** on this repo. It runs on Dan's cloud credit, then his plan.
Goal: **about 200 Portland places** that survive Dan's review. That means about **220 drafts**: Dan's picks (if any) plus
places found by research. The run has two halves with a checkpoint between them, so Dan can open Portland at about
100 places and finish the second half later if the credit meter says so. Work in small batches and save after each one.

## Ground rules
- Work on the branch `research/portland`. If you can't use that name, say which branch you're on in your first message.
  Never commit to `main`. Don't touch anything under `src/`, `worker/`, or the Bay Area and San Diego files in `data/review/`.
- Read `prompts/enrich-place.md` first and follow it exactly: no invented facts, your own words, sources, honest flags.
  Every draft needs a `tagline` (max 50 characters, no period), so the launch doesn't need a second pass.
- Fame labels: a place covered by **2 or more press outlets is not a deep cut**. Use `open-secret` or `local-legend`.
  Portland press is listed in `scripts/pipeline/06-fix-fame.mjs` (Willamette Week, Portland Monthly, The Oregonian,
  the Mercury, Eater Portland, OPB and the rest); the script relabels for you after each batch.
- Keep it lean: at most 3 web searches and 1 page fetch per place. If a place needs more, flag it and move on.
- Nothing is approved here. Every place stays `"status": "draft"`; Dan reviews them.
- Every draft gets `"metro": "portland"` and `"verified"` set to the current month as `YYYY-MM`.
- The Hidden Gem Score is never typed in. You give the four research marks in `breakdown`; the site computes the rest
  from `src/lib/scoring.js`. Use the full 0-100 range and the calibration anchors in the rubric.

### Portland rules (on top of the rubric)
- **Food carts count, with care.** Carts are a real part of how Portland eats, and many of the best deep cuts are carts.
  Include a cart only when it has a fixed pod or lot with a street address, has been there (or had a storefront)
  for roughly two years or more by a source, and shows it is open within the last **6 months** (carts move and pods close).
  Put the pod's name in `practical` (for example "In the Hawthorne Asylum pod"). Keep carts to about **a fifth of the
  list**: around 40 of 220.
- **Small local groups.** Portland has many two- and three-shop names. The guide's limit is three locations; four or
  more is a chain for our purposes, however local. Say so in `skipped.json` when that's the reason.
- **Balance.** No more than about a third coffee, bakeries, donuts and ice cream; Portland leans that way on every list.
  Favor old-timers, family restaurants, lunch counters, taquerias, delis, fish counters, markets with kitchens, dive bars
  with food, and the kitchens of the city's immigrant corridors: Vietnamese, Chinese, Lao and Thai along SE 82nd and in
  outer east; Korean and Japanese in Beaverton; Mexican in Hillsboro, Cornelius, Rockwood and Gresham; Russian and
  Ukrainian in outer Southeast; Somali and Ethiopian in Northeast.
- **Late means late.** `late` is only for places open past 10 pm. Portland closes early; expect fewer of them than
  San Francisco had, and don't stretch the label.
- Aim for at least a third honest deep cuts. Cover every area, including outer east (Lents, Gateway, Rockwood) and the
  suburbs. The guide should not stop at SE 82nd.

## Network check (free, first)
Run `METRO=portland node scripts/pipeline/01-fetch-osm.mjs`. If it fails with a connection error, the environment's
network policy blocks `overpass-api.de`. Step 04 also needs `nominatim.openstreetmap.org`,
`geocoding.geo.census.gov` and `photon.komoot.io` to put candidates on the map. Say in your first message which of the
four hosts you can reach. If none of the three geocoders is reachable, you can still do discovery, but **stop before
Step 3** and ask Dan to allow those hosts in the environment's Network access settings: without coordinates nothing
can be placed on the map, and coordinates are never guessed.

## Setup (free, once)
```
npm ci
METRO=portland node scripts/pipeline/01-fetch-osm.mjs
METRO=portland node scripts/pipeline/02-filter-chains.mjs
```
Report the counts (venues, independents, by area). If the fetch returns nothing, the county names in
`scripts/pipeline/metros.mjs` may not match OpenStreetMap; say so and continue, step 04 falls back to address lookup.

**Reddit check:** for the first place you research, try one search like `site:reddit.com "Fuller's Coffee Shop" Portland`.
If Reddit results come back, use one Reddit search per place (subreddits in `scripts/pipeline/metros.mjs`: r/Portland,
r/askportland, r/PortlandFood). If they don't, stop trying Reddit for the rest of the run and note it in your report.
Don't spend searches on it.

## Step 1: Dan's picks first (if there are any)
`data/seeds-portland.json` holds Dan's own picks as `{name, area, lead}`. If the file is an empty list, say so and go
to Step 2. Otherwise research every place in it. The `lead` field is Dan's description: treat it as a lead to verify,
not a fact. Only state what sources support.
Write the drafts to `data/review/portland/batch-01.json` in the exact shape of `data/review/trial-01.json`, with
`"seed": true`, `"metro": "portland"`, `"status": "draft"`, plus `lat`/`lng` from the address (OpenStreetMap address
search) and `osm` if you matched it. Use the place's slug as `id`, and add `-pdx` if that id already exists in
`src/data/places.json` or any `data/review/**/batch-*.json`.
If one of Dan's picks is closed or is a chain, leave it out and add `{id, name, reason}` to
`data/review/portland/skipped.json`. Dan will want to know.

Then run:
```
METRO=portland node scripts/pipeline/06-fix-fame.mjs
node scripts/pipeline/render-review.mjs data/review/portland/batch-01.json
git add data/review/portland && git commit -m "Portland batch 01 (Dan's picks)" && git push
```

## Step 2: discovery (about 320 names)
Use the 17 Portland areas and the day/night focus in `scripts/pipeline/metros.mjs` (`portland`), and the rules in the
`SYSTEM` prompt of `scripts/pipeline/03-discover.mjs`. For each area and shift, find **up to 10** candidates that
aren't Dan's picks and aren't already in the guide. Start each area with a Reddit search if Reddit works
(`site:reddit.com hole in the wall <area>`, `site:reddit.com best breakfast counter <area>`): that's where the deep
cuts are. Append them to `data/review/portland/discovered.json` in the shape the script describes:
`{name, neighborhood, city, address, kind, when, fame, why, source_url, open_evidence}`, with `from` =
`disc-<two-digit area index>-<day|night>` (so `disc-00-day` for the first area's daytime list).
`city` is the municipality the place is in (Portland, Beaverton, Gresham, Milwaukie...), never "Washington County".
Commit and push after every 4 areas.

Keep the Portland rules above in mind while you go: carts to a fifth, coffee and sweets to a third, a third deep
cuts, every area covered. Then pick the shortlist (free, no AI):
```
METRO=portland node scripts/pipeline/04-select.mjs 260
```
Commit and push `data/review/portland/candidates.json`. Report what the script prints: unique, placed, selected, the
fame split and the city split. If "placed" is far below "unique", the geocoders are blocked; see the Network check.

## Step 3: research, 20 places per batch
Take the next 20 places from `data/review/portland/candidates.json` that aren't in an earlier batch file and research
each one into `data/review/portland/batch-NN.json` (NN = 02, 03, ...), same shape and fields as Step 1 but
`"seed": false`. Closed, chain or poor-fit places go to `skipped.json` with a reason.
After each batch:
```
METRO=portland node scripts/pipeline/06-fix-fame.mjs
node scripts/pipeline/render-review.mjs data/review/portland/batch-NN.json
git add data/review/portland && git commit -m "Portland batch NN" && git push
```

**CHECKPOINT 1: stop after batch 02** (the first 20 researched places). Post a short summary (drafts, skips, the
fame split so far, anything surprising) and wait for Dan to say "continue". He checks the credit meter here and
decides how many batches to run.

**CHECKPOINT 2: stop at about 100 drafts** (roughly after batch 06). Run the triage (Step 4), commit it, and post
the summary. Dan decides whether to open Portland at about 100 places now and finish the second half later, or to
keep going. Wait for "continue".

**Stop at about 220 drafts across all batches**, or when told to stop. With skips, that is usually batches 02 to 13.

## Step 4: triage (free)
```
METRO=portland node scripts/pipeline/07-triage.mjs
git add data/review/portland && git commit -m "Portland triage" && git push
```
`data/review/portland/TRIAGE.md` sorts the drafts into must-check, skim and low-risk for Dan's review.

## Report at the end of each batch
One line: batch number, drafts written, skips, carts so far, coffee-and-sweets share so far, and anything Dan
should know.

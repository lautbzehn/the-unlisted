# Portland expansion plan

**v1.0 · 10.29.2026** · The Unlisted · Owner: Dan West

## In one minute

- **Goal:** open Portland, Oregon as the guide's third city with **about 200 human-reviewed places**, found and drafted the same way San Diego was: a Claude Code cloud session on Dan's cloud credits, following a brief, saving after every batch.
- **Same score, same rules.** The Hidden Gem Score formula in `src/lib/scoring.js` does not change. Drafts carry the four research marks; the site computes the fifth from the fame label. Independents only, every place reviewed by a person, drafts hidden until approved.
- **This branch does the wiring.** Portland is now a metro the pipeline knows, and the run brief is `prompts/cloud-research-portland.md`. Nothing is researched yet and nothing on the live site changes.
- **To start the run:** open a cloud session on this repo with Opus 5.5 and paste
  `Follow prompts/cloud-research-portland.md. Start with the Network check, then Setup, then Step 1.`
- **Two checkpoints** keep the credit spend in your hands: after the first 20 researched places, and at about 100 drafts, where you can open Portland early and finish the second half later.

## Phases

| Phase | What happens | Who | Output |
|---|---|---|---|
| 0. Wire (this branch) | Portland metro, state-scoped map fetch, Portland press list, metro-aware enrich step, run brief, this plan | done | pull request to `main` |
| 1. Research | Cloud session: setup, optional seeds, discovery across 17 areas, research in batches of 20, triage | cloud session, Dan at checkpoints | `data/review/portland/batch-*.json`, `TRIAGE.md` |
| 2. Review | Triage sorts drafts into must-check, skim and low-risk; Dan approves, edits or drops | Dan | about 200 approved places in `src/data/places.json` |
| 3. Launch | Portland front page, Explore, city switch, forms, copy, docs; merge and deploy | a short engineering session | release 1.6.0 |

## How 200 comes out of the pipeline

The yield at each step, from the two runs so far, and the Portland targets set from them:

| Step | Bay Area (round 2) | San Diego | Portland target |
|---|---|---|---|
| Discovery slots (areas × day/night) | 32 | 24 | 34 |
| Names found | about 250 | 89 (up to 6 per slot) | about 320 (up to 10 per slot) |
| Shortlist researched | 180 | 89 | 260 |
| Drafts written | 145 (19% skipped) | 78, plus 20 of Dan's picks | about 220 (15% skipped) |
| After review | some dropped per batch | all 98 approved | about 200 |

So the brief asks for a shortlist of 260 and stops at about 220 drafts. Review drops have run from none (San Diego) to a handful per batch (Bay Area), so 220 drafts is the right cushion for 200 live places. If the drop rate at review turns out higher, the shortlist has 40 unresearched names in reserve.

## What this branch changes

| File | Change |
|---|---|
| `scripts/pipeline/metros.mjs` | A `portland` metro: Multnomah, Washington and Clackamas counties, three subreddits, 54 neighborhood anchors, 17 discovery areas, its own folders. Every metro now names its state. |
| `scripts/pipeline/01-fetch-osm.mjs` | The county lookup is scoped to the metro's state. Without that, "Washington County" matches about thirty counties across the country. Fails loudly if the fetch returns nothing. |
| `scripts/pipeline/04-select.mjs` | The Census geocoder gets the metro's state instead of a hard-coded CA. Place ids are checked against every metro's review folder, not a hand-written list. |
| `scripts/pipeline/05-enrich.mjs` | Reads and writes the metro's own review folder and stamps `metro` on each draft, so the Batch API path works as a fallback for Portland. The spend ledger stays shared. |
| `scripts/pipeline/06-fix-fame.mjs` | Portland press outlets for the "two outlets means open secret" rule: Willamette Week, Portland Monthly, The Oregonian, the Mercury, OPB, the Tribune, the TV stations, Travel Portland and a few more. Eater Portland was already covered. |
| `prompts/cloud-research-portland.md` | The run brief, in the shape of the San Diego one. |
| `data/seeds-portland.json`, `data/review/portland/` | An empty seed list for Dan's picks, and the review folder. |

Checked here: syntax, the free `--estimate` modes (34 discovery requests), the fame fixer on the empty folder, and the 39 unit tests. The full build was not run here: the container's Node is older than Astro requires, so CI runs it on the pull request. None of these changes touch files the build reads.

**Not checked here, and why.** This session's network policy refuses `overpass-api.de` (and its mirrors), `nominatim.openstreetmap.org`, `geocoding.geo.census.gov` and `photon.komoot.io`. So the Portland map fetch and the geocoder fallbacks could not be run, and the new state-scoped Overpass query has not been tried against the live server. The research session needs those four hosts: allow them under Network access in the cloud environment it runs in (or use a broader access level). The brief starts with a network check and stops before research if candidates cannot be placed on the map, because coordinates are never guessed.

## The research run

The brief carries the full instructions. The parts that are Portland's own:

- **17 areas**, each searched for daytime and evening places: Downtown, Old Town and the Pearl · Northwest, Slabtown and Goose Hollow · Central Eastside, Buckman and Kerns · Hawthorne, Belmont and Sunnyside · Division, Clinton and Richmond · Sellwood-Moreland and Brooklyn · Woodstock, Foster-Powell and Mt. Scott · Montavilla, Mt. Tabor and the Jade District · Lents and outer Southeast · Hollywood, Laurelhurst and Beaumont-Wilshire · Alberta, Concordia, King and Vernon · Mississippi, Williams and Lower Albina · St. Johns, Kenton and North Portland · Cully, Parkrose and Gateway · Multnomah Village, Hillsdale and Southwest · Beaverton, Aloha and Hillsboro · Milwaukie, Oregon City, Clackamas and Gresham.
- **Food carts are in, with a cap and tighter evidence.** A cart needs a fixed pod with a street address, roughly two years in place by a source, and proof it is open within six months rather than twelve. About a fifth of the list at most. The pod's name goes in the practical notes.
- **Small local groups** stop at three locations, the guide's existing rule. Portland has many four-shop names that feel local; they are chains for our purposes.
- **Balance targets:** coffee, bakeries, donuts and ice cream capped at about a third; at least a third deep cuts; the immigrant corridors (SE 82nd, outer east, Beaverton, Hillsboro, Rockwood, Gresham) covered on purpose; `late` only for doors open past 10 pm.
- **Checkpoint 1** after batch 02: the first 20 researched places show the per-batch credit burn. Multiply by the eleven batches left to see whether the full run fits.
- **Checkpoint 2** at about 100 drafts: triage runs, and you choose between opening Portland at 100 now and finishing later, or continuing to 220.
- **Fallback if credits run out:** the remaining candidates can go through the Batch API with `METRO=portland node --env-file=.env scripts/pipeline/05-enrich.mjs --estimate` first. Past runs cost roughly $0.25 to $0.45 per place under the $90 cap.

## Review

`METRO=portland node scripts/pipeline/07-triage.mjs` writes `data/review/portland/TRIAGE.md`. San Diego's split was 12% must-check, 6% skim and 82% low-risk, so expect roughly 25 to 30 drafts that need a real look, a dozen with one unconfirmed detail, and the rest to approve in bulk. Approving a place means setting `status` to `approved`, adding the `approved` date, and moving it into `src/data/places.json` with `"metro": "portland"`, as the San Diego drafts were. Sources and flags stay in the file; the build strips them.

One small improvement worth making before review starts: in development the app only shows drafts from the top-level `data/review/batch-*.json` files, so San Diego's drafts were reviewed from the markdown sheets. Widening that glob in `src/lib/places.js` to subfolders (with Portland added to its metro list) lets you review Portland drafts in the real app, which is what ADR 0002 intends.

## Launch checklist

The San Diego launch touched 25 files. Portland's launch is the same set, mostly one line each:

- `src/lib/places.js`: a `portland` entry in `METROS` (home `/portland/`, explore `/portland/explore/`, main city Portland, map centre about [-122.65, 45.52], zoom about 10.3); `metroOf` for `/portland` paths; the dev draft glob above.
- `src/pages/portland/index.astro` and `explore.astro`: two four-line files, as San Diego's.
- `src/components/Header.astro` (the city map in its script), `src/lib/nav.js` (`sectionFor`), `src/lib/mrz.js` (a `PDX` passport code).
- `worker/validate.js` (`METROS`), `worker/store.js` (`OPEN_CITIES` gets `portland-or` so it leaves the vote board), `worker/__tests__/router.test.js`, then `npm test`.
- `src/data/signup-options.json`: a Portland area for the newsletter.
- Copy that names the cities: `src/layouts/Base.astro` (default description), `src/pages/cities.astro`, `story.astro`, `help.astro`, `suggest.astro`, `src/components/Gate.astro`. The city switch and the share images already read from `METROS`; check the switch still fits a phone with three names.
- Taglines: the brief requires a `tagline` on every draft, so `src/data/taglines.json` should need nothing. Fill gaps there if any draft lacks one.
- Time of day needs no change: Portland is on Pacific time like both current cities.
- `README.md`, `package.json` description, the places badge, `docs/data-pipeline` (counts and cost), `CHANGELOG.md` (1.6.0), then merge and `npm run deploy`.

## Where I'd push back

1. **Give the run ten to twenty of your own picks.** Your San Diego picks were the best-sourced drafts and set the voice for the rest. `data/seeds-portland.json` is an empty list; add `{name, area, lead}` entries before starting, or leave it empty and the brief skips Step 1. If you don't know Portland first-hand, skipping is the honest choice.
2. **Treat the 100 checkpoint as a real decision, not a pause.** Two hundred places is more than the Bay Area has today, and 220 drafts is a full weekend of review at a few minutes each. Opening at 100 and growing to 200 in a second round costs nothing in credit and gets Portland live sooner.
3. **Carts are a deliberate editorial choice.** Leaving them out is simpler and avoids churn; including them with a cap is truer to the city. The brief includes them. Say the word and it becomes an exclusion.
4. **Vancouver, Washington is left out.** It would be an eighteenth area with Clark County in a second state, which the fetch does not support yet. Easy to add later as its own round.

## Risks

| Risk | How the plan handles it |
|---|---|
| Carts and small places close or move between research and launch | Six-month evidence for carts, twelve for the rest; triage flags "may be closed"; `verified` month on every draft |
| Reddit search blocked from the cloud | One test search at the start; the run continues without it and says so |
| Map and geocoder hosts blocked | Network check first; research never starts on candidates that cannot be placed |
| Credit runs out mid-run | Save after every batch; checkpoints; Batch API fallback under the $90 cap |
| Review load | Triage buckets; the 100 checkpoint |
| Duplicate ids across cities | `04-select` checks every metro's folder; seeds get a `-pdx` suffix on a clash |
| Press list gaps make a famous place a "deep cut" | Portland outlets added to the fixer; the reviewer still owns the label |

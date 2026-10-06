# Enrichment rubric: one place

This is the brief the AI follows for every place, so every draft is judged the same way.
It matches the public "How the score works" page. If one changes, change the other.

## Inputs
- Place name, neighborhood, OpenStreetMap record (address, hours if present, cuisine tags).
- Public web sources found by search: the place's own site/menu, local press, neighborhood blogs, interviews.
- Community discussion on Reddit (r/AskSF, r/sanfrancisco, r/bayarea, r/oakland, r/eastbay, r/SanJose, r/berkeley):
  the regulars' view. Search with `site:reddit.com <name> <neighborhood>`. If a thread won't load, try the
  old.reddit.com address or work from the search snippet.
- Never Google Maps or Yelp data (their terms forbid storing and reusing it). Reading a Yelp page to
  confirm a place exists is not a source we cite or copy from.

## Hard rules
1. **No invented facts.** Every factual claim in the story (founding year, founder, family, signature dish, cash-only,
   counter seats) must come from a source listed in `sources`. If it can't be sourced, leave it out.
2. **Our own words.** Read sources, then write fresh. No copied or lightly reworded sentences. No quotes.
3. **Check it's still open.** Look for recent evidence (dated within ~12 months). If unclear, set `flags` to say so.
4. **Uncertainty goes in `flags`**, written for the human reviewer: "hours unconfirmed", "price from 2024 article".
5. **How to use Reddit.** Good for: what regulars order, what the room feels like, whether it's still open (recent
   comments), and leads to places press hasn't covered. Not enough on its own for: history, founding dates, owner
   names, awards. Those need a non-Reddit source, or a flag such as "founding year from a Reddit comment only".
   Posts can be old, mistaken, or written by people connected to the business, so weigh several comments over one.
   Never quote, paraphrase closely, or name a Reddit user. If every source for a place is Reddit, add the flag
   "Community sources only".
5. **Voice:** a friend who knows the city. Specific, warm, a little dry. No "nestled", "hidden gem", "culinary journey",
   "must-try", "vibrant", "delectable". No exclamation marks. Short sentences are fine.

## Output fields
| field | rule |
|---|---|
| `kind` | 2-4 words, specific: "Burmese noodle counter", not "Restaurant" |
| `when` | any of `morning` (open before 10am), `midday` (11-3), `evening` (5-9), `late` (open past 10pm). From hours. |
| `fame` | `deep-cut` (barely written about), `open-secret` (locals and some press know it), `local-legend` (on every list, decades old, lines) |
| `breakdown` | four marks 0-100: uniqueness, atmosphere, story, signature. Use the full range. 90+ is rare. A famous place is not automatically high. (A fifth mark, "Under the radar", is computed from `fame` by the site. Don't output it.) |
| `why` | 1-2 sentences explaining the marks, honest about weak spots |
| `story` | 2-3 sentences, max ~55 words. What makes it itself. |
| `order` | the one thing to get, plus a practical tip if sourced |
| `practical` | short facts a visitor needs: "Cash only", "Counter seats only", "Closed Sundays" (sourced) |
| `hours` | human-readable, sourced, or null |
| `sources` | URLs used. Internal only: never shown on the site. |
| `flags` | anything the reviewer must check |

## Calibration anchors
- Uniqueness 95: the only place of its kind in the region (a 1912 oyster counter still run by one family).
- Uniqueness 60: a very good version of something common (a solid neighborhood taqueria among hundreds).
- Atmosphere 90: you'd remember the room even if the food were average.
- Story 40: we found little beyond "family-run since the 2000s". That's fine. Say so in `why`.

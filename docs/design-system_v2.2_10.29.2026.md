# The Unlisted design system

**v2.2 · 10.29.2026** · "After hours"

v2.1 added the map, the place page, and the share image. v2.2 covers every remaining page: the deck's throw physics, Our Story, My Passport, Cities, the About pages and the 404. The Gem door is retired; scores are cold bars everywhere.

A city at 2 a.m. True black, one red light over the door, one cold light for anything live. The tokens live in [`src/styles/tokens.css`](../src/styles/tokens.css); this page explains them.

## Color

| Token | Value | Use | Contrast on black |
|---|---|---|---|
| `--bg` | `#000` | Every page | |
| `--raise` / `--raise-2` | `#0c0c0d` / `#161618` | Panels, hover | |
| `--ink` | `#f4f1ea` | Text | 18.6:1 |
| `--mute` | `#a6a29a` | Secondary text | 8.3:1 |
| `--faint` | `#7e7a73` | Passport code lines, fine print | 4.9:1 |
| `--accent` | `#ff4636` | Stamp red: actions and "you are here" only | 6.2:1 |
| `--accent-fill` | `#d92b1f` | Button fill, with white text | 4.9:1 (white on it) |
| `--cold` | `#8fe3ff` | Live states, every score, "been there". Never actions | 14.6:1 |

Two accents, two jobs. If something is red, you can press it or you are on it. If something is cold, it's live or it's a measurement.

## Type

| Role | Face | Token |
|---|---|---|
| Display: headlines, place names, the hero | Instrument Serif (and its italic) | `--font-display` |
| Everything you read or scan: body, UI, data | Inter (variable) | `--font-ui` |
| Passport code lines, coordinates, kickers | IBM Plex Mono 500, uppercase, tracked | `--font-code`, `.mono` |

Body text is 17px (`--text`), up from 16. Display sizes are fluid: `--display-xl` (hero), `--display-l` (sections), `--display-m` (cards). All fonts are self-hosted from `@fontsource`; the two first-screen faces are preloaded. Inter has no italic loaded on purpose: italics are always the display serif.

## Shape and space

Pill buttons, hairline rules (`--line`, `--line-strong`), square grids on rails with crosshair corners, 14px radius on big cards. `--gutter` scales from 16 to 40px, `--max` is 1280px.

## Motion

| Pattern | Where | How | Reduced motion |
|---|---|---|---|
| Shutter title | Home hero | CSS mask slats (registered `--open`) plus a red scan line | Static title |
| Live film grain | Home hero | WebGL shader, 24 fps, pointer-reactive, pauses off screen, skipped on software GPUs and behind the welcome gate | Still red and cold gradient |
| Rails spotlight and crosshairs | Grids | Light drawn under the grid shows through translucent rails; red crosshairs on the hovered cell | No spotlight; crosshairs on focus only |
| Score bars | Every score | Motion (`inView`), number counts up with the bar | Bars at full value |
| Stacking cards | Deep cuts, Our Story | `.stack` in components.css (sticky), `initStack` in rails.js (Motion `scroll()`) sinks the card beneath | Plain list |
| Throw physics | Surprise me deck | A thrown card keeps your speed and direction and falls a little as it goes; one let go short springs home with a small overshoot (a damped spring). Undo springs the card back from where it left | Cards move instantly |
| Neon sign | Each place's name: place page, deep cuts, share image | `lib/neon.js` picks from the place id: tube color (red or cold), lettering (script or block), tilt, the letter that flickers | No flicker |
| Stamp thump | Stamp it, on a place's page | The red stamp drops onto the sign, the wall jolts, a ring of ink spreads, the tube blinks, phones tap once | Stamp appears, no motion |
| Glowing markers | Explore and place maps | A lit point with a halo: warm white for places, red for your Bucket List, cold for Stamped. The one you point at flares and pings | No ping |

Easing is `--ease` (arrives fast, settles slow) for almost everything. Motion is the small WAAPI build (`motion/mini`) plus `inView`, `scroll` and `stagger`.

## Pages

- **Page heads:** a mono kicker, an oversized serif title, a larger sub line. Section heads are serif too.
- **About pages:** a mono tab bar with a red underline for the page you're on; glossaries and steps on hairline rules.
- **Neon signs** also hang the next cities (Austin, New York) on Cities, and "Locked" on the 404.
- **Forms:** mono field labels, pill choices, a white focus ring. Errors in red, success in cold.

## Maps

The night basemap (`lib/mapStyle.js`, theme `night`) draws faint streets on true black from OpenFreeMap tiles, with water a shade colder than land. Maps frame themselves with hairlines and crosshair corners. The map on a place's page downloads only when it's about to scroll into view, and it takes two fingers (or ctrl and scroll) to move, so it never traps the page's scrolling.

## Share images

Each place's share image (`pages/og/[id].png.ts`) is its neon sign on a black wall, with where it is, the one-line why, and the Gem score as a cold bar. The image renderer pays seconds per image for each wide blur, so the sign uses two glows and a wall gradient for the wide halo. That keeps the build under a minute.

## Budget

Mobile Lighthouse 90 or better on every template. Measured on 10.29.2026 (local preview, mobile):

| Page | Performance | Accessibility | SEO |
|---|---|---|---|
| Home | 97 to 98 | 100 | 100 |
| Explore, Bay Area | 94 to 96 | 100 | 100 |
| Explore, San Diego | 97 to 98 | 100 | 100 |
| A place | 99 | 100 | 100 |
| My Passport | 98 | 100 | 100 |
| Our Story, Cities, Help, How the score works, Suggest, Contact, Privacy | 99 | 100 | 100 |

The Explore list is long, so its rows use `content-visibility: auto`: rows off screen skip layout and paint.

# The Unlisted design system

**v2.0 · 10.29.2026** · "After hours"

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
| Stacking cards | Deep cuts | `position: sticky`, Motion `scroll()` sinks the card beneath | Plain list |
| Neon sign | Each place's name | Generated from the place id: tube color (red or cold), lettering (script or block), tilt, the letter that flickers | No flicker |

Easing is `--ease` (arrives fast, settles slow) for almost everything. Motion is the small WAAPI build (`motion/mini`) plus `inView`, `scroll` and `stagger`.

## Budget

Mobile Lighthouse 90 or better on every template. The home page measured 98 (TBT 20 to 90 ms, LCP 2.2 s, CLS 0.03) on 10.29.2026.

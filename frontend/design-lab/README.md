# Wanderfile Design Lab — Four Sites

Four complete multi-page website prototypes for stakeholder review.

## Run

From `frontend/`:

```bash
npm run design-lab
```

Then open http://localhost:5179/

## The four sites

| # | Name | Direction |
|---|------|-----------|
| 01 | [Voyager](sites/01-voyager/) | Bright adventure atlas — rounded, forest green, photo-first |
| 02 | [Almanac](sites/02-almanac/) | Warm editorial magazine — cream, terracotta, Fraunces |
| 03 | [Memo](sites/03-memo/) | Dark luxury travel house — espresso, gold, Instrument Serif |
| 04 | [Volume](sites/04-volume/) | Bento-hero product home — orange tiles; Places & Posts panels below |

Each of Voyager / Almanac / Memo has distinct pages: Home, Posts, Places, Post detail, Place detail, Add, Trips, Search.

**Volume** keeps the bento hero permanently on Discover. Places and Posts expand as panels under the tabs, using the same atlas / lantern browse UI tinted to the Volume palette. Bento photo tiles prefer thumbnails from the signed-in user’s reels, then fall back to curated Unsplash images.

Posts and Places match the live app browse UI (lantern timeline / country-covers atlas). Each of sites 01–03 also keeps the original grid demos as **classic** variants: `posts-classic.html` and `places-classic.html` (mock data only; linked from the live/sample banner on the new pages).

Core product patterns are shared across all sites. Everything else — chrome, typography, color, layout — is rethought per site.

## Shared assets

- `sites/shared/mock.js` — places, posts, visits, Unsplash imagery (fallback)
- `sites/shared/api.js` — TravelPlanner-dev fetch via Vite `/api` proxy + Clerk session
- `sites/shared/posts-browse.js` + `posts-browse.css` — lantern timeline / filters matching `/posts`
- `sites/shared/places-browse.js` + `places-browse.css` + `place-atlas.js` — country-covers atlas matching `/places`
- `sites/shared/site-nav.css` + `site-nav.js` — sticky review banner to jump between sites

Posts and Places pages load your real library when you're signed in with the same Clerk account as the main app (`http://localhost:5173`). Otherwise they fall back to sample data.

## Filter Lab

Separate gallery of **20 quieter places-filter patterns** (toolbars, drawers, command palette, sentence filters, etc.) that does not change the complete sites:

http://localhost:5179/filters/

## Places Page Lab

**20 Almanac places-page structures** — same filters and place covers, different page framing (bare ledger, bleed hero, split atrium, letterbox, passport, type monument, etc.):

http://localhost:5179/places-page/

Reference page: http://localhost:5179/sites/02-almanac/places.html

Bento hero reference: http://localhost:5179/places-page/demos/01-bento-hero.html

## Sign-in Lab

**10 signed-out gate options** — the same gate the deployed site shows (wordmark, one-line
subtitle, `Sign in` primary + `Sign up` secondary, in that order) reframed ten ways. No new
steps, fields, or button copy; only the surface changes. Ordered smallest edit → most
opinionated. Arrow keys flip between options.

http://localhost:5179/sign-in/

| # | Option | Direction |
|---|--------|-----------|
| 01 | [Paper card](sign-in/demos/01-paper-card.html) | Today's layout in a white card with a wordmark tile |
| 02 | [Split atlas](sign-in/demos/02-split-atlas.html) | Copy left, photo mosaic of saved places right |
| 03 | [Photo bleed](sign-in/demos/03-photo-bleed.html) | Full-bleed photo under a dark scrim |
| 04 | [Aurora glass](sign-in/demos/04-aurora-glass.html) | Mint/forest mesh gradient + frosted card |
| 05 | [Forest night](sign-in/demos/05-forest-night.html) | Dark forest ground, mint accents |
| 06 | [Editorial masthead](sign-in/demos/06-editorial-masthead.html) | Fraunces masthead with hairline rules |
| 07 | [Postcard](sign-in/demos/07-postcard.html) | Deckle border, stamp, postmark |
| 08 | [Contour map](sign-in/demos/08-contour-map.html) | SVG topo lines behind a plain panel |
| 09 | [Reel stack](sign-in/demos/09-reel-stack.html) | Tilted reel cards showing the product |
| 10 | [Boarding pass](sign-in/demos/10-boarding-pass.html) | Perforated ticket with a vertical stub |

Production reference: `SignedOutGate` in `frontend/src/main.tsx`. Brand tokens in
`sign-in/shared/gate.css` mirror `frontend/src/wf-tokens.css`.

## Home Skins Lab

**10 skins of the Volume home** — same page, same UX. Every skin loads
`sites/04-volume/styles.css` and `sites/04-volume/app.js`, so the bento hero, the rotating
profile photos, the Saved / Visited tiles, the Places / Posts shelf cards and the shared
filter panel behave exactly as they do on the site. Only palette, type, and surface
treatment change. Ordered smallest edit → most opinionated. Arrow keys flip between skins.

http://localhost:5179/home-page/

| # | Skin | Direction |
|---|------|-----------|
| 01 | [Paper coral](home-page/demos/01-paper-coral.html) | Today's Volume, quieted — flat coral, hairline tiles |
| 02 | [Forest ledger](home-page/demos/02-forest-ledger.html) | Forest leads, coral demoted to an accent |
| 03 | [Midnight reel](home-page/demos/03-midnight-reel.html) | Near-black ground, amber numerals |
| 04 | [Sand & clay](home-page/demos/04-sand-clay.html) | Matte sand and clay, no gradients or shadows |
| 05 | [Nordic light](home-page/demos/05-nordic-light.html) | Cool grey, blue accent, sans display, 12px corners |
| 06 | [Aurora mint](home-page/demos/06-aurora-mint.html) | Mint/aqua mesh behind frosted tiles |
| 07 | [Mono press](home-page/demos/07-mono-press.html) | Newsprint greyscale, mono labels, red-ink counts |
| 08 | [Kraft zine](home-page/demos/08-kraft-zine.html) | Kraft paper, black outlines, offset shadows |
| 09 | [Slate product](home-page/demos/09-slate-product.html) | Near-white slate, violet accent, dashboard crispness |
| 10 | [Dusk gradient](home-page/demos/10-dusk-gradient.html) | Plum-to-magenta gradients, indigo stat tiles |

Reference page: http://localhost:5179/sites/04-volume/index.html

Skins are generated — edit the skin in `home-page/_generate.mjs` (metadata in
`home-page/shared/options.js`), then rerun:

```bash
node frontend/design-lab/home-page/_generate.mjs
```

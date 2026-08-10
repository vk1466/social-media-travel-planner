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

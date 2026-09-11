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

## Dashboard Lab

**10 interactive dashboard structures** for making Posts, Travel, Food, Movies, and
History feel like one library. Unlike the Home Skins Lab, these vary information
architecture and navigation: shelf-first, returning-user summary, adaptive rail, category
bento, universal search, activity stream, split workspace, horizontal shelves, compact
index, and mobile dock.

http://localhost:5179/dashboard/

All concepts use the same sample data, support category switching and search where
applicable, adapt to narrow screens, honor reduced motion, and can be reviewed with the
left/right arrow keys. Option 01, Shelf first, is the recommended production direction.

### Category Pages Lab

**10 additional navigation systems** built around dedicated category pages rather than a
single dashboard panel. Every system includes separate Home, Posts, Travel, Food, Movies,
and History documents—60 generated pages total—with category-specific content and tools.

http://localhost:5179/dashboard-pages/

Option 01, Top tabs, is the recommended hybrid: a light dashboard overview plus stable
category routes. Other systems test sidebars, an icon rail, portal cards, editorial
mastheads, command navigation, a dense workspace bar, floating navigation, breadcrumbs,
and mobile bottom tabs.

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

## Category Nav Lab

**10 treatments of the cards under the header** — the `CategoryStrip` that routes to
Posts, Travel, Food, Movies, and History. Cover portals, type monuments, color rooms,
a sliding dock, folder tabs, index plaques, board stacks, terminal signs, metric
tickets, and night glass. Click a card to change the page stub; arrow keys change
direction. The earlier [library cover-card lab](library-cards/index.html) is unchanged.

http://localhost:5179/category-nav/

## Page Header Lab

**10 compact page-header directions** for replacing the oversized, unclear page heading
with a direct `Saved posts` title and useful controls or context. Each option is shown inside the current top-tabs page
chrome with the filter toolbar directly below it, so alignment and first-viewport density
can be compared in context. Option 01, Quiet stack, is the recommended low-risk direction.
Arrow keys move between concepts.

http://localhost:5179/page-headers/

## Posts Archive Lab

**20 layouts for a library of hundreds to thousands of saved posts.** Time rails,
Photos-style timelines, year zoom, collection hubs, Pinterest masonry, Are.na channels,
Letterboxd diaries, map + filmstrip, trip chapters, heat calendars, and more. Arrow keys
move between concepts.

http://localhost:5179/posts-archive/

## Content System Lab

**10 complete typography and product-language systems** for Home, Posts, Travel, Food,
Movies, History, Add, and Search. Each direction pairs a deliberate type scale with a
distinct voice, while keeping the vocabulary for saves, places, plans, and visits coherent.
Option 01, Trail guide, is the recommended direction. Arrow keys move across systems and pages.

http://localhost:5179/content-system/

Research findings and the page-by-page recommendation live in
[`docs/design/content-system-audit.md`](../../docs/design/content-system-audit.md).

## Library Card Lab

**10 shared cover-card directions** for Posts, Travel, and Food — the three libraries
that currently share `CoverCard`. Each option renders the same three saves in one
system: cinema overlay, editorial folio, Pinterest pin, journey ticket, Polaroid,
glass dock, horizon listing, index row, stacked folio, and night reel. Arrow keys
move between directions; click a card to preview the open action.

http://localhost:5179/library-cards/

## Food Card Lab

**10 interactive recipe-card directions** — the same recipe data with ten different
information hierarchies: visual-first, editorial, weeknight decision support, compact
list, nutrition-led, social provenance, cookbook, bento actions, ingredients-first, and
reel-to-recipe. Use the recipe dots and card actions to test each state; arrow keys move
between directions. Opening any card reveals a shared recipe preview with Summary,
Ingredients, and Macros tabs plus a link back to the saved social post.

http://localhost:5179/food-card/

## Food Detail Lab

**10 interactive recipe-detail directions** — sidecar sheet, editorial spread, cook
command center, reel storyboard, ingredient workbench, step timeline, nutrition compass,
mise en place board, compact drawer, and recipe proof. Switch recipes, check ingredients,
scale servings, and test the primary actions while comparing information hierarchy.

http://localhost:5179/food-detail/

## Travel Section Lab

**10 complete travel-section directions** — atlas split, bento planner, travel journal,
map canvas, pocket itinerary, command center, journey line, postcard stack, Nordic utility,
and night flight. Every direction retains Places / Related posts / History switching,
atlas filters and map/covers, visit logging, Timeline and Instagram imports, review/reset
states, live-data fallback, and place/post detail navigation.

http://localhost:5179/travel-section/

## Travel Card + Detail Lab

**20 paired place-card and detail-modal directions** — landscape, adaptive, planning-first,
map-aware, compact, and portrait concepts. The four portrait formats are magazine cover,
pocket guide, journey ticket, and night portrait.
Each card opens its matching responsive detail treatment with save and quick-action states.
Add `?open=1` through `?open=20` to link directly to an open concept.

http://localhost:5179/travel-card-modal/

## Place Hierarchy Lab

**10 interactive ways to browse the place tree** — guided shelves, focus + siblings,
column browser, globe + guides, functional multi-view index, proportional atlas,
map + bottom rail, universal search, geographic index, and adaptive bottom sheets.
Every concept uses the same flexible
World → Continent → Country → Region → City → Place model and supports drilling in,
backtracking through ancestors, and resetting to World.

http://localhost:5179/place-hierarchy/

### Place Hierarchy V3

**10 deliberately experimental hierarchy metaphors** — destination constellation,
nested worlds, geography metro, living passport, atlas bookshelf, geographic sentence,
destination solar system, travel filmstrip, cartographic strata, and atlas conversation.
V3 is additive; the practical, research-led V2 remains available for comparison.

http://localhost:5179/place-hierarchy-v3/

## Travel Map Experience Lab

**10 interactive map directions beyond the current cluster-and-pin implementation** —
editorial atlas, immersive terrain, trail heat and weather layers, collaborative field
map, journey replay, day route planner, community photo highlights, time-aware preview,
saved-versus-visited comparison, and mobile “search this area.”

http://localhost:5179/map-experiences/

## Source Switcher Lab

**10 interactive app-filter directions** — logo constellation, segmented tabs, labeled
tiles, icon rail, stacked menu, split card, selection badge, popover trigger, coral stamp,
and night mosaic. Every option supports multi-select Instagram, TikTok, YouTube, and Web
plus a clear Everything state, with no redundant “From” label.

http://localhost:5179/source-switcher/

Skins are generated — edit the skin in `home-page/_generate.mjs` (metadata in
`home-page/shared/options.js`), then rerun:

```bash
node frontend/design-lab/home-page/_generate.mjs
```

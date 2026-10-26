# Wanderfile UI Modernization Spec (v1, Oct 26 2026)

Applies to all three surfaces: the native app (mobile/), mobile web (frontend/ < 768px) and desktop (frontend/ >= 1024px). Keep every existing feature and route. This changes the visuals, not the behavior.

## 1. Research (live web, Oct 2026)
| App | Pattern to borrow | Source |
|---|---|---|
| Mapstr | Map/List toggle on the same data. List sorts by date added, distance, A–Z or rating. Colored tags with emoji filter both views. "To try"/"Tried" status. A share link opens in any browser | https://en.mapstr.com/fonctionnalites/trier-mes-adresses-favorites , https://apps.apple.com/us/app/mapstr-save-follow-places/id917288465 |
| Wanderlog | Desktop split: list panel on the left, map on the right. Numbered pins colored by list, and the map fits all places. Clicking a place opens a bottom sheet over the map with About/Photos/Mentions tabs | https://wanderlog.com/ , https://screenrove.com/wanderlog/flows |
| Airbnb 2025 | Softer and more dimensional: bigger radii, soft shadows, image-led cards with badge overlays, sticky full-width CTA, playful micro-motion on icons and tabs | https://news.airbnb.com/product-releases/airbnb-2025-summer-release , https://www.itsnicethat.com/articles/airbnb-app-redesign-140525 , https://krismgross.com/project/airbnb |
| Corner / Beli | Full-screen map with category filter chips. A distinct icon per category, used consistently everywhere instead of text labels. A floating action button and a view switcher | https://mobbin.com/explore/screens/a22e7281-587b-4142-8936-837ad6ac3333 , https://ixd.prattsi.org/2024/09/design-critique-beli-app/ |
| mymind | "Save it, AI organizes it". Visual masonry grid where each item renders by type. Search by color and keyword. A "Serendipity" resurfacing mode. No folders needed | https://mymind.com/ |
| Matter / Readwise Reader | Calm, typography-led queue with airy rows and small metadata. Warm off-white canvas, serif for content and sans for metadata, hairline dividers, black pill as the primary button | https://thesweetsetup.com/is-matter-or-readwise-reader-the-read-later-app-for-you/ , https://pageproofer.com/inspiration/warm-editorial/readwise/ |
| Pinterest | Masonry grid of variable-height image cards with adaptive columns | (general pattern, used in the Library) |

## 2. Direction: "Photo-first travel journal"
The current look has a green-on-cream editorial theme, three font families (Fraunces/Newsreader/Manrope/DM Sans), dark gradient placeholder heroes, many demo/variant CSS files, and a busy OSM basemap. That is what makes it feel dated.
New direction:
- **Imagery leads.** Every card uses the reel thumbnail or a place photo. Never use a plain gradient block. When there is no image, use a blurred thumbnail of the source reel, then the category icon on a tinted tile.
- **Neutral canvas, one vivid accent.** Use near-white and near-black neutrals with a single coral accent, as Airbnb, Wanderlog and Readwise do.
- **One sans family** (Inter, or SF Pro natively) for UI, plus one serif (Newsreader) used only for place titles and the reel caption pull quote.
- **Soft depth.** 16–24px radii, layered soft shadows, sheets instead of modals on mobile.
- **Map and list as one surface.** Toggle on mobile, split view on desktop, with a minimal basemap where pins are the hero.
- **Calm motion.** 150–250ms ease-out, spring sheets, shared-element thumbnail to detail. Respect reduced-motion.

## 3. Tokens
Put these in a single source: frontend/src/wf-tokens.css and mobile/src/theme.ts. Delete the old --theme-hero-* gradients, the tiktok/youtube colors and the unused demo CSS.

**Color**

| token | light | dark |
|---|---|---|
| bg | #FAFAF9 | #0E0F11 |
| surface | #FFFFFF | #17191C |
| surface-2 | #F3F3F1 | #1F2226 |
| ink | #16181B | #F2F2F0 |
| ink-2 (muted) | #5E636B | #A2A7AE |
| line | #E7E6E3 | #2A2D32 |
| accent (coral) | #FF5A4E | #FF6B5F |
| accent-ink | #FFFFFF | #16181B |
| success | #1F9D6B | #34C38A |
| warn | #E59A1A | #F2B544 |
| danger | #D93A3A | #F0605D |

Category hues are used for the chip dot, pin fill and icon tile at a 12% tint:

| category | hue |
|---|---|
| Food | #F2994A |
| Cafe | #A0703E |
| Sight | #2F80ED |
| Nature | #27AE60 |
| Stay | #9B51E0 |
| Nightlife | #EB5757 |
| Shopping | #D6A100 |
| Other | #6B7280 |

**Type** (Inter, tabular numerals for stats)

| style | size/line height | weight | notes |
|---|---|---|---|
| display | 32/38 | 700 | -0.02em |
| title-1 | 24/30 | 700 | |
| title-2 | 20/26 | 600 | |
| headline | 17/22 | 600 | |
| body | 15/22 | 400 | |
| callout | 14/20 | 500 | |
| caption | 12/16 | 500 | +0.01em |
| overline | 11/14 | 600 | uppercase, +0.06em |

Place titles on the detail hero use Newsreader 28/34 at weight 600.

**Spacing:** 4, 8, 12, 16, 20, 24, 32, 40, 56, 72. Screen gutter is 16 on mobile and 32 on desktop. Max content width is 1280.

**Radius:** xs 6, sm 10, md 14, lg 20, xl 28, pill 999. Cards use 20, sheets use 28 on the top corners, and chips are pills.

**Shadow (light):**
- sm: 0 1px 2px rgba(16,24,40,.06)
- md: 0 4px 12px rgba(16,24,40,.08), 0 1px 3px rgba(16,24,40,.06)
- lg: 0 16px 40px rgba(16,24,40,.14)

In dark mode, replace shadows with a 1px line border plus a surface-2 lift.

**Motion:** fast 150ms, base 220ms, slow 320ms, cubic-bezier(.2,.8,.2,1). Native sheets use a spring (damping 20).

**Dark mode:** follow the system, with an override in Settings. Required on all three surfaces.

## 4. Basemap (Vipul: the current OSM tiles are too busy)
- **Web (/map and the place-detail mini-map):** use MapLibre GL with the **OpenFreeMap Positron** style `https://tiles.openfreemap.org/styles/positron` in light mode. Hide every POI layer (`poi*`), transit and housenumber layers, and keep only the place/city labels plus major road labels at z>=12. For dark mode, use an OpenFreeMap dark style if one is available (for example `.../styles/dark`, check the current list). Otherwise use **CARTO Dark Matter** (`https://{a-d}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png`, with `light_nolabels` / `light_all` for light). Either option is keyless. If you keep Leaflet, use the CARTO `light_nolabels`/`dark_nolabels` raster instead.
- **Attribution must always be visible but small:** "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors", or "© CARTO © OpenStreetMap contributors".
- **Native (react-native-maps):** apply a custom map style JSON on Google (hide poi, transit and business labels, use desaturated land/water) and `pointsOfInterestFilter={[]}` / `showsPointsOfInterest={false}` on Apple. Switch the style with the color scheme. If you use MapLibre RN, reuse the OpenFreeMap style.
- **Pins are the focus.** Use a 32px circle in the category hue with a white 2px ring and a white category glyph. The selected pin scales to 1.2 with an accent ring and a shadow-md. Clusters are an ink circle (dark: surface-2) with a white count, sized 32/40/48 by count, plus a 6px translucent halo. Fit to all places on load with 48px padding. Use the same tokens on all three surfaces.

## 5. Components
- **PlaceCard (grid):** a 4:5 image with radius 20. A bottom gradient scrim (0 to 60% black) carries the title (headline, white) and "City · Country" (caption). The top-left has a category chip (icon + label on a white 90% blur pill), and the top-right has a heart/visited toggle. Below the image sits a creator row: a 20px avatar, @handle and "from 1 reel". Press scales to 0.98.
- **PlaceRow (list/map panel):** a 64px thumbnail (radius 14), then title, then category dot · city, then a one-line tip from the pipeline. Distance or a number goes on the right.
- **ReelCard (Library):** masonry, using the real thumbnail at its natural aspect ratio. Overlay an IG glyph, the place-count badge ("4 places") and the creator. The caption shows 2 lines below the image.
- **Chip:** a 32px pill. Unselected is surface-2 with ink-2 text, and selected is ink with bg text. Horizontal scroll, no wrapping on mobile.
- **Sheet (mobile):** snap points at 25%, 55% and 92%, with a grabber, radius 28 and the backdrop at 40%.
- **Buttons:** the primary is an accent pill, 48px tall on mobile and 40px on desktop. The secondary is a surface pill with a line border. Use ghost style for icon buttons, 40px.
- **Empty state:** a single line illustration or icon at 64px, a title-2 heading, one sentence and one primary CTA. No grey boxes.
- **Skeletons:** shimmer blocks that match the card shapes. Never use spinners in grids.
- **Toasts:** bottom-center on mobile and bottom-left on desktop, with an Undo action on delete.

## 6. Navigation
- **Native and mobile web:** bottom tab bar with 4 tabs (Home, Library, Map, Collections) plus a central accent "+" FAB for Save. Settings opens from the avatar on Home. Tabs are 56px with a blurred surface and active icon fill in ink plus a label. Mobile web mirrors this with a fixed bottom nav and safe-area padding.
- **Desktop:** a 240px left sidebar (logo, the 4 sections, Collections listed below them, and the avatar/Settings at the bottom), with a ⌘K search/paste bar at the top of the content. Remove the top tab chrome.

## 7. Screens (each item applies to native, mobile web and desktop unless noted)
1. **Home:** a greeting plus the paste bar ("Paste an Instagram reel link"). Then "Recently saved" as a horizontal rail of ReelCards with live processing state. Then "Your places" with a stat strip (places · cities · countries), a "Top cities" rail (city photo cards with counts), and "Rediscover" (mymind-style serendipity: 3 random older places). On desktop this becomes a 12-column layout: the rails span full width, and the stats and a mini map sit on the right.
2. **Library:** segmented Reels | Places, with filter chips (category, city, creator) and Sort (Recent, A–Z, City). Reels use masonry (2 columns on mobile, 4–5 on desktop). Places use the PlaceCard grid (2 / 4 columns) with a toggle to the list view. Search is inline.
3. **Map:** a full-bleed minimal basemap (§4). Category chips float at the top. On mobile, a bottom sheet holds the PlaceRow list (the 25% snap shows "N places in view"), and tapping a pin raises a compact PlaceCard. On desktop, a 400px left list panel sits beside the map; list hover highlights the pin and pin click scrolls the list. Only the panel scrolls. Fit to all on load.
4. **Collections:** a grid of collection cards, each a 2×2 thumbnail mosaic with name and count. Auto-collections come from pipeline data (by city, by category, by creator) above the user collections. The detail view is a header mosaic, then a list/map toggle, then "Share link" (Mapstr-style).
5. **Place detail:** a hero of photos and reel thumbnails as a swipeable carousel, 16:10, with radius 0 on mobile and 20 on desktop. Then the title (serif), category chip and "City, Region, Country". An action row offers Directions (Google/Apple, shown once), Save to collection and Mark visited. Then come these sections:
   - "Why it was saved": the reel caption pull quote with the creator avatar and handle, plus a link to the reel.
   - "Tips from the reel": pipeline tips as a bullet list with an icon per tip, and nothing shown when there are none. No filler text.
   - "Mentioned in": ReelCards.
   - The mini-map: the minimal basemap, 200px tall, non-interactive until tapped.
   - "Nearby saved places": a rail.

   On desktop this is two columns, with content (8) beside a sticky info/map card (4).
6. **Reel/post detail:** the thumbnail with a play link to IG, the creator row and full caption (expandable), then "Places in this reel" as a numbered list with a map of those pins (numbered pins in Wanderlog style), plus categories and tips.
7. **Save modal → sheet:** a sheet on mobile and a centered 520px dialog on desktop. It has a paste field with auto-detect from the clipboard, and a preview card (thumbnail, creator, caption, 2 lines) that appears in about 1s. States: checking (skeleton), available (accent "Save" button), unavailable (danger inline message, Save disabled), not Instagram (inline). After Save, show a progress card in the Home rail with steps "Fetching → Finding places → Done (N places)". Do not validate while the user is still typing.
8. **Settings:** grouped inset lists (iOS style): Account (avatar, email, sign out), Appearance (System/Light/Dark), Map (units), Data (export CSV, delete all with confirm) and About. Remove any TikTok/YouTube/movies/recipes leftovers.
9. **Auth / signed out:** a full-bleed collage of travel reel thumbnails (blurred 8px with a dark scrim). The value prop is "Turn saved reels into a map you'll actually use." Show the Clerk card styled with the tokens (radius 20, accent button, Inter).
10. **Empty states:**
    - Home: "Save your first reel", with a paste field and a 3-step illustration.
    - Library: "Nothing here yet".
    - Map: a blank minimal map with a sheet saying "Places from your reels appear here".
    - Collections: "Group places for a trip", with a Create button.
    - Search with no results.
    - Errors: friendly copy plus Retry.
11. **Admin:** keep the functionality and apply the tokens only.

## 8. Using the pipeline data
Use what each reel already gives us:
- thumbnail: cards, hero, auth collage, collection mosaics
- creator handle/avatar: creator rows and creator filters/collections
- caption: the pull quote and search
- places[] with category/city/country/lat/lng: pins, chips, stats and auto-collections
- tips: the tips section and the PlaceRow subtitle

**Pipeline asks (non-blocking, see docs/data_audit.md):** store the creator avatar URL, cache thumbnails to our storage (IG CDN URLs expire, which is why previews go black), normalize the category enum to the 8 hues above, and add a place photo (Google Places/Wikimedia) as a fallback.

## 9. Cleanup and acceptance
- Delete the unused design-demo components/CSS (`*DesignDemos*`, FlipDetailCardDemos, BentoMotionPicker, and others) once nothing references them.
- **Acceptance:**
  - Screenshots of every screen at 390px, 768px and 1440px in light and dark.
  - Native screenshots on iOS or Android.
  - No horizontal scroll.
  - Contrast AA.
  - The basemap shows no POI labels.
  - Attribution is visible.
  - All existing flows still work: save, retry, delete, map, place detail, collections and admin.

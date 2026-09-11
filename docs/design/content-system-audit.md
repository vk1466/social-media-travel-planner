# Wanderfile content and typography audit

## Outcome

Wanderfile should sound like a calm travel companion: curious when presenting inspiration,
precise when helping someone act. The recommended direction is **01 · Trail guide**—Newsreader
for expressive headings, Source Sans 3 for everything functional, a 16px body baseline, and
plain action labels.

The product promise used throughout the demos is:

> Turn reels, posts, and guides into places you can map, plan, and remember.

This connects the full loop without making ingestion technology the story:
**save inspiration → find places → plan travel → remember visits**.

## Current review

### System-wide

- The current pairing (Instrument Serif / DM Sans) has personality, but it is not applied from
  one scale. `wf-tokens.css` names Fraunces as the headline font while `top-tabs.css` overrides it
  with Instrument Serif. A component can therefore change personality depending on its route.
- Navigation, filter pills, and supporting labels frequently use 9–11px text. These sizes make
  core controls look like annotation and are especially fragile on mobile. Reserve 11–12px for
  nonessential metadata; use 13–14px for controls and 16px for body copy.
- Several pages explain the design or implementation instead of helping the traveler. Examples:
  “Each one has its own page and URL,” “actions instead of generic post metadata,” and “filters
  stay put, only the atlas body changes.” This language belongs in design documentation.
- The app alternates among **Posts / Saves**, **Travel / Places / Atlas**, and **History / Visits**.
  Use one term for each intent: **saves** are sources, **places** are resolved destinations,
  **travel history** contains visits. Navigation can remain Posts / Travel / Food / Movies /
  History, but the page copy should explain the noun once instead of introducing another brand.
- “Add,” “Add links,” “Save URLs,” and “Ingesting” describe the same flow inconsistently.
  Prefer **Add inspiration**, **Save links**, and **Saving…**. Keep “ingest” in jobs/admin only.
- Search placeholders vary from terse fragments to long examples. Use a consistent pattern:
  `Search [content]` for general fields and one short example only when it adds meaning.

### Page-by-page

| Page | Current issue | Recommended content hierarchy |
|---|---|---|
| Home | “Each one has its own page and URL” exposes IA; “Your library” is generic. | “Your travel library” → “Save the spark. Plan the trip.” → resume one destination. |
| Posts | Posts, saves, reels, and sources compete as labels. | Nav: Posts; heading: All saves; filters: Category, Date, Visit status; view: Timeline / Grid. |
| Travel | Travel, Places, and Atlas are all used as page names. | Nav: Travel; heading: Places to go; views: Covers / Map; statuses: Want to go / Visited. |
| Food | Current lede talks about metadata and actions. | “Recipes from your saves” → “Food worth making” → time, cuisine, ingredients, source. |
| Movies | Current lede describes the page design. | “Titles from your saves” → “Movies worth watching” → streaming and filming locations. |
| History | “stable personal timeline” is system language; import and manual visit forms compete. | “Places you’ve been” → “Travel history”; primary: Log a visit; secondary: Import history. |
| Add | “Inbox” is an unexplained metaphor; URL count is useful. | “Add to Wanderfile” → supported sources → paste field → `Save 2 links` → per-link progress. |
| Search | “Jump” and “without leaving the library” add little. | “Search Wanderfile” → one field → results grouped by Saves, Places, Recipes, Movies, Visits. |
| Detail sheets | Heading levels and verbs vary across content types. | Title → essential metadata → primary action → sections → “View original post” as provenance. |
| Empty/error/loading | Some states blame filters or use internal terminology. | State what happened, then give one recovery: “No places match these filters. Clear filters.” |

## Recommended type rules

| Role | Desktop | Compact | Rule |
|---|---:|---:|---|
| Display title | 56–88px | 44–56px | One per page; serif is allowed here only. |
| Section title | 28–36px | 26–32px | Use the same display family and sentence case. |
| Card title | 18–22px | 18–20px | Two lines maximum before truncation. |
| Body / lede | 16–18px | 16–17px | 1.5–1.65 line height; 65–75 characters wide. |
| Control label | 13–14px | 14–16px | Never use eyebrow styling for an action. |
| Metadata | 12–13px | 12–13px | Secondary information, not required to act. |
| Eyebrow | 11–12px | 11–12px | Uppercase is optional; keep tracking under .16em. |

Use sentence case everywhere. Use title case only for the Wanderfile name and proper nouns.
Buttons begin with verbs and predict the result: **View map**, **Log a visit**, **Build grocery
list**, **View original post**. Counts use consistent nouns and pluralization.

## Ten demo directions

The interactive lab at `/content-system/` shows all eight core pages for every option.

1. **Trail guide — recommended:** editorial but usable; closest fit for inspiration becoming plans.
2. **Clear compass:** one sans family; safest accessibility and implementation choice.
3. **Field notes:** personal, journal-like Wanderfile identity without sacrificing clear controls.
4. **Atlas index:** precise reference-book voice for a place-heavy product.
5. **Social native:** fast and familiar for users arriving directly from reels and short videos.
6. **Quiet escape:** premium, spacious, and destination-led; less efficient for dense screens.
7. **Wayfinder:** explicit and operational; strongest for frequent itinerary-building sessions.
8. **Postcard journal:** most emotional; strongest for history and memory, weaker for filters.
9. **Utility ledger:** best for power users and large libraries, least aspirational.
10. **Warm human:** approachable guidance for new users, with slightly more conversational copy.

## Research notes

- Apple’s interface guidance treats labels as context and action cues, recommends legibility when
  custom fonts are used, and asks navigation labels to remain visible and concise.
- Material’s writing guidance favors present tense, common words, and direct language.
- Nielsen Norman Group’s “4S” test for links—specific, sincere, substantial, succinct—is useful
  for replacing vague “Open” and “See all” actions with destination-specific labels.
- Pinterest distinguishes saving ideas from organizing them, while Airbnb wishlists keep saved
  items “top of mind.” Both support a low-friction capture step before deeper planning.
- Polarsteps presents planning, tracking, and reliving as one travel lifecycle. Wanderfile’s
  differentiator should be the step before those products: converting social inspiration into
  structured places and plans.

Sources: [Apple labels](https://developer.apple.com/design/human-interface-guidelines/labels),
[Apple UI design basics](https://developer.apple.com/design/tips/),
[Material writing](https://m1.material.io/style/writing.html),
[NN/g link labels](https://www.nngroup.com/articles/better-link-labels/),
[Pinterest boards](https://help.pinterest.com/en/article/organize-your-boards),
[Airbnb wishlists](https://www.airbnb.com/help/article/1236), and
[Polarsteps](https://www.polarsteps.com/).

# Product Feature List — Place Pipeline & Travel Product

Product features that make ingested travel content accurate, structured, and useful — then turn that library into trip planning.

**Approach:** fixed pipeline (extract → locate → resolve → enrich → link → validate), not a multi-agent swarm. LLM for understanding; code/APIs for identity, schema, and validation.

Builds on: reel extraction (`extract.py`), geocode → upsert (`places.py`), hierarchy (`hierarchy.py`), visits (`visits.py`), and [place-enrichment-plan.md](./place-enrichment-plan.md), [place-hierarchy-plan.md](./place-hierarchy-plan.md), [primary-place-plan.md](./primary-place-plan.md).

---

## Priority groups

| Priority | Theme | When |
|----------|--------|------|
| **P0 — Foundation** | Correct places and structure; without these, later features lie | First |
| **P1 — Place usefulness** | Facts, tips, and links that make a place page trustworthy | Right after foundation |
| **P2 — Trip product** | Turn the library into planning (itinerary, visits, map) | After P0–P1 |
| **P3 — Trust & polish** | Consensus, conflicts, confidence, share UX | Once the core loop works |
| **P4 — Differentiating / later** | Similarity, offline, group trips, personalization | After product-market fit on P2 |

---

## P0 — Foundation

| # | Feature | What the user gets | Status |
|---|---------|-------------------|--------|
| 1 | **Accurate place pins** | Places land on the correct map location; duplicates merged; fewer mentions lost when geocode fails | Not started — [breakdown](#accurate-place-pins) |
| 1h | **Post & carousel image text (OCR)** | Place names on static posts and carousel slides (overlays, maps, signage) feed the same extract → locate path as reel captions/transcripts | Not started — [breakdown](#post--carousel-image-text-ocr) |
| 2 | **Attraction categories** | Typed for browse/filter (hike, viewpoint, park, hotel, restaurant, …). One category + attributes; UI groups by category | Phase 1 done — [plan](./attraction-categories-plan.md) · [implementation](./attraction-categories-implementation.md) |
| 3 | **Region buckets & hierarchy** | Linked attractions under the same region root (national park, state park, city, neighborhood). Trails/spots nest under parents | In progress — category-aware roots + `parent_category` / OSM |

**Why first:** Wrong pins and flat/wrong trees poison enrichment, relations, itineraries, and maps. Image-only posts/carousels without OCR never produce places to pin.

---

## P1 — Place usefulness

| # | Feature | What the user gets | Status |
|---|---------|-------------------|--------|
| 4 | **Related attractions** | Reel relationships preserved (e.g. lake **accessed via** a hike); shown on both place pages | Not started |
| 5 | **Better tips** | Short, actionable tip lists; near-duplicates removed; noise from many reels summarized | Not started |
| 6 | **Type-specific place facts** | Objective facts by category — hike: distance, elevation, duration; park: fee, hours; hotel: price range, type — separate from reel tips | Not started |

**Why next:** Makes each place page worth opening; relations feed access/logistics and itineraries.

---

## P2 — Trip product

| # | Feature | What the user gets | Status |
|---|---------|-------------------|--------|
| 7 | **Itinerary from a reel / cluster** | Turn a region root + children into a day plan (order by tips, access links, tags) | Not started |
| 8 | **Visit / want-to-go status** | Want to go · Visited · Skip on places; filter the library by status (builds on existing `Visit`) | In progress — Visited one-tap + optional dates + Instagram profile import; Want/Skip + filters TBD |
| 9 | **Map-first trip view** | Map filtered by region root or tag; pins by category; tap → tips + facts | Partially done — maps exist; trip-scoped / root-filtered view TBD |
| 10 | **Access & logistics pack** | Derived view: trailhead, fees, duration, “need this hike to reach this lake” from relations + facts | Not started |

**Why here:** This is the product payoff of P0–P1 — planning, not just a nicer database.

---

## P3 — Trust & polish

| # | Feature | What the user gets | Status |
|---|---------|-------------------|--------|
| 11 | **Confidence / needs review** | Weak geocode or missing parent flagged so junk roots don’t dominate browse | Not started |
| 12 | **Cross-reel consensus** | “Mentioned in 12 reels · top tip repeated 5×” — trust from volume | Not started |
| 13 | **Conflict surfacing** | “Reels disagree: free vs $5” on enriched facts | Not started |
| 14 | **Best season / conditions** | Aggregate tips + `posted_at` into season/timing signals | Not started |
| 15 | **Share-to-save confirmation** | After IG share-in: clear “Saved under Smith Rock · 3 spots” | Not started |
| 16 | **Anti-hype place blurbs** | Neutral place summaries (extend `reel_summary` style to places) | Not started |

**Why later:** Improves trust and mobile delight once the core save → browse → plan loop works.

---

## P4 — Differentiating / later

| # | Feature | What the user gets | Status |
|---|---------|-------------------|--------|
| 17 | **Similar places** | “If you liked Smith Rock, try …” via tags, region, tip similarity (may need embeddings) | Not started |
| 18 | **Offline day sheet** | Export one park’s children + tips + hours as a phone checklist | Not started |
| 19 | **Group trip layer** | Shared bucket per trip; friends vote on hikes/restaurants inside a region root | Not started |
| 20 | **Don’t-bother / skip learning** | Skips and dislikes shape what the library surfaces | Not started |

**Why last:** High upside, higher scope; depend on solid P0–P2 data and UX.

---

## Accurate place pins

P0 feature #1. Goal: every place from a reel lands on the **right map spot**, appears **once** (not as duplicates), and is **not lost** when geocoding is hard.

Mark the P0 parent row **Done** when 1a–1e below are done (or explicitly deferred). P3 #11 (confidence / needs review) can surface flags from 1a and 1c in the UI once those exist.

### What we do today

After a reel is saved, we collect place names from the Instagram location tag (sometimes with lat/long) and from LLM extraction. Each name goes through Nominatim: reverse-geocode if we already have coordinates, otherwise forward-geocode with a few query shapes (name + city + state + country, then simpler). Non-visitable hits (states, countries, random offices) are dropped. Successful results are upserted — same identity key merges into one place; pins within ~50m also merge. Failed or low-confidence lookups are kept as `PlaceCandidate` records (retryable without re-fetching the reel).

### Progress

| # | Work item | Status |
|---|-----------|--------|
| 1a | Keep failed lookups | Done — `PlaceCandidate` + retry |
| 1b | Better location clues | In progress — parent viewbox + multi-candidate ranking |
| 1c | Validate pin vs name | In progress — confidence scoring + category weights |
| 1d | Smarter duplicate merge | In progress — name-aware resolve |
| 1e | Specific pin over big region | In progress — parent geo filter |
| 1f | **Google geocode fallback** | Not started — when Nominatim unresolved / low-confidence |
| 1g | **LLM candidate picker fallback** | Done — pick among Nominatim hits when ranking is ambiguous; see [locate-v3-validation.md](./locate-v3-validation.md) (historical) |
| 1h | **Post & carousel image text (OCR)** | Not started — [breakdown](#post--carousel-image-text-ocr) |

### 1f. Google geocode fallback

**Problem:** Nominatim sometimes lacks the right POI indexing (or returns only admin boundaries). A commercial geocoder often has the pin.

**Improve:** Behind `clients/geocoder`, when locate is unresolved or low-confidence after Nominatim, call Google Geocoding / Places (gated on `GOOGLE_MAPS_API_KEY`). Map into the same `GeocodeResult` shape and re-run ranking. Do **not** invent coordinates in the LLM.

### 1g. LLM candidate picker fallback

**Problem:** When several Nominatim hits score close together (or the top hit is weak), a deterministic heuristic can pick the wrong one.

**Improve:** If ranking is ambiguous or below the high-confidence threshold and we have ≥2 candidates, ask the LLM to **choose an index** from the candidate list (or reject all). The LLM never invents lat/lon — it only selects among real geocode results. Skip when OpenAI is unavailable; fall through to existing confidence gates.

**How to retest:** [locate-v3-validation.md](./locate-v3-validation.md) (historical) — unit + `scripts/validate_locate_v3.py`.

---

### 1a. Keep failed lookups

**Problem:** When Nominatim cannot resolve a name, we drop that mention entirely. The user never sees that the reel talked about a place, and we never get a second chance without re-running the whole ingest.

**Improve:** Persist unresolved mentions (tied to the source post) with a clear “needs review” or “unresolved” state. Retry later with simpler queries, extra context from the reel, or a different geocoder — without re-fetching the Instagram post. Failed lookups become recoverable work, not silent data loss.

### 1b. Better location clues

**Problem:** We mostly search free text. Weak or ambiguous names (“Angel’s Landing”, “the gorge”) often miss or land in the wrong country/city. We underuse clues we already have on the post.

**Improve:** Prefer Instagram lat/long whenever the location tag provides them. Fold city, state, country, and known parent/park from extraction into every geocode attempt. When OSM is unsure or returns a weak match, fall back to Google (1f) and/or an LLM pick among candidates (1g) behind the same geocoder / locate boundary so identity stays provider-agnostic.

### 1c. Validate pin vs name

**Problem:** The first “visitable” geocode result wins. That can pin a travel name onto the wrong POI (a shop, office, or similarly named place) with no check that the result actually matches what the reel meant.

**Improve:** After geocode, score or gate the result: name similarity, tourism/attraction types preferred over commercial offices, reject clear mismatches. Low-confidence matches should be flagged rather than saved as trusted pins — so maps stay clean and review can catch edge cases.

### 1d. Smarter duplicate merge

**Problem:** We merge on a slug identity key or coordinates within ~50m. That misses same-place aliases with different geocode results, and can wrongly merge two different attractions that sit close together (two trailheads, a viewpoint and a parking lot).

**Improve:** Also merge when names/aliases match in the same region (country / state / city or parent park). Tighten near-dup rules so proximity alone is not enough when names clearly disagree. Result: one library card per real-world place, without collapsing neighbors into each other.

### 1e. Specific pin over big region

**Problem:** A reel that says “Misery Ridge at Smith Rock” (or a viewpoint inside a national park) can end up pinned on the whole park or city instead of the trail/spot the creator meant. Maps and itineraries then point at the wrong scale.

**Improve:** When extraction names a specific child place plus a parent region, geocode and save the **specific** pin, and link it under the parent (hierarchy / primary-place work). Prefer the pin-able attraction over dropping a single pin on the broad region — so the map shows where someone would actually go.

---

## Post & carousel image text (OCR)

P0 feature **1h**. Goal: static Instagram **posts** and **carousel** slides contribute place mentions the same way reel captions / Supadata transcripts do today — via text we can pass into the existing extract → locate → resolve pipeline.

Mark **1h** done when media URLs are available in the fetch path, image text is extracted for each relevant frame/slide, and that text is folded into place extraction without a separate geocode/vision path.

### What we do today

Reels can get a Supadata transcript. For image posts and carousels we only use caption, comments, hashtags, and the Instagram location tag. Overlay text on slides (place names, maps, “day 1 / day 2” labels, signage) is ignored, so many travel carousels save with weak or empty place lists.

### Approach

1. **Media inputs** — From EnsembleData (or equivalent), collect displayable image URL(s): single-image posts and each carousel child. Cap slides per post (config) so cost/latency stay bounded.
2. **OCR (preferred first)** — Run a cheap text-detection API (e.g. Google Vision Text Detection, ~$1.50/1k images after free tier) on each image. Concatenate OCR strings into a post-scoped `image_text` (or per-slide snippets) stored on the post / passed into extract.
3. **Feed existing extract** — Treat `image_text` like caption/transcript context for the place LLM (same schema). Do **not** invent lat/lon from pixels; locate stays Nominatim → optional Google (1f) → LLM pick (1g).
4. **Optional vision LLM later** — If OCR text is empty or useless (stylized fonts, maps without labels), optionally call a vision model for place-name candidates only. Gate behind flag; expect higher $/image than OCR.
5. **Skip when unnecessary** — If location tag + caption already yield strong places, OCR can be deferred or skipped to save cost (same spirit as not re-fetching transcripts).

**Cost note:** OCR is pennies per thousand images; vision LLM is roughly cents per image. Volume at MVP is not the constraint — media URL availability and latency are.

**Out of scope for 1h:** video-frame sampling inside reels (transcript covers spoken places); full multimodal “describe this photo” enrichment tips (belongs closer to P1 tips/facts).

---

## Explicitly not prioritizing yet

- Multi-agent research copilots for ingest
- Social feed / creator follows
- Booking integrations (hotels, restaurants, tours)

---

## Cross-cutting: validation

Not a standalone product feature. Code gates ship with foundation and usefulness work:

- Extraction schema and field sanity
- Visitable-place filter after geocode
- Hierarchy / relation graph checks
- Property key whitelists and basic ranges
- Locate: deterministic ranking first; LLM may only **pick among geocode candidates** (1g), not invent pins
- Google geocode as optional provider fallback (1f)
- Image OCR / vision (1h) may only produce **text or place-name candidates** for extract — never coordinates

No open-ended LLM “geocoder agent” that invents coordinates for MVP.

---

## Suggested build order (summary)

```text
P0  1 pins (1a keep fails → 1b/1e clues → 1c validate → 1g LLM pick → 1f Google → 1d merge)
    → 1h post/carousel OCR (media URLs → OCR → extract; vision LLM optional)
    → 2 categories → 3 hierarchy
P1  4 relations → 5 tips → 6 type-specific facts
P2  8 visits UI → 9 map-first trip → 7 itinerary → 10 logistics pack
P3  11 confidence → 15 share confirm → 12–14, 16 as needed
P4  pick from 17–20 based on user demand
```

When starting a feature, expand it into an implementation plan before coding.

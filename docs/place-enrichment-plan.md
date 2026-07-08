# Plan: Place Enrichment, Grouping, and Tagging

## Goal

Turn raw place mentions from ingested posts into a **canonical place library** that
can be browsed and filtered by location (continent → country → state/province →
city) and by activity/type tags (viewpoint, hike, waterfall, restaurant, etc.).

The same processing runs for **every** ingested link, regardless of platform.
Instagram, YouTube, TikTok, and future sources all feed one shared place pipeline.

```
Any link → fetch post → raw mentions → shared place pipeline → canonical places
```

---

## Core idea: two phases

| Phase | Question it answers | Platform-specific? |
|-------|---------------------|--------------------|
| **Ingest** | What did this post mention? | Yes — each fetcher collects raw hints |
| **Place processing** | What/where/what-kind are these places? | No — one shared pipeline |

Fetchers stay dumb: they collect hints (IG location tag, Supadata extraction) and
must **not** geocode, dedupe, or assign canonical identity. Everything after that
lives in `process_post_places(post)`, called from `pipeline.py` after each
successful fetch.

> Note: fetchers may still *run* Supadata extraction — it produces hints
> (`extracted_places`) and is already URL-based. Producing hints is ingest;
> resolving them into canonical places is place processing.

**Re-processing:** because place processing is decoupled from ingest, we can
re-run it on all saved posts when geocoding improves or tags expand — without
re-fetching links.

---

## Two sources of truth

### Posts (`data/posts/`)
"I saved this reel/post because…" — link, caption, platform metadata, and the
raw hints (`places`, `extracted_places`) as an audit trail. References canonical
places via `place_ids` instead of duplicating place data.

### Places (`data/places/`)
"Here's my travel library." — one record per real-world place, deduplicated
across posts, with normalized location, merged tags/tips, and the source posts
that mention it. UI/API grouping and filtering query this layer.

---

## Place processing pipeline

`process_post_places(post)` runs three steps, in order:

1. **Normalize** — map each raw hint (`Place`, `ExtractedPlace`, future sources)
   into one `PlaceMention` shape.
2. **Locate** — geocode each mention via the geocoder client to get a canonical
   `PlaceLocation` (or reverse-geocode when the IG tag already has lat/lng).
3. **Resolve & save** — match to an existing canonical place or create one; union
   tags, merge details/tips, append the source post; write
   `data/places/<place_id>.json`. Return `place_ids` back onto the post.

Tags come straight from the LLM extraction (controlled vocabulary) and are merged
here — there is no separate "tagging" step to build.

---

## Location: don't trust the LLM for geography

Names and spellings drift (`USA` vs `United States`, missing state). Use a hybrid:

| Source | Role |
|--------|------|
| LLM / video extraction | Find place names; infer city/country when spoken |
| Instagram location tag | Often provides lat/lng + city/country |
| Geocoder client | Canonical hierarchy: country, state/province, city, coordinates |

Flow: build a query from name + known hints → geocode (or reverse-geocode if
lat/lng present) → store normalized `PlaceLocation`. Derive **continent** from a
static `country_code → continent` map, not the geocoder (they rarely return it).

**Grouping is a query concern.** Store flat records with normalized location
fields; filter/group at read time. No nested folder trees on disk.

---

## Place identity & dedup (the hard part)

Identity must survive a geocoder swap, so it is **not** the raw provider ID:

- **Key:** `slug(country_code, state_province, city, display_name)` — stable and
  provider-independent. Store the provider's raw id (`osm_id` / Google place id)
  as an attribute for reference, not as the key.
- **Merge on match:** same key → union tags, append `source_post_id`, merge new
  details/tips.
- **Name drift:** keep an `aliases` list; a new name that geocodes to an existing
  key is added as an alias rather than creating a duplicate.
- **Near-duplicates:** if two mentions resolve to coordinates within ~50m and
  lack a shared key, treat as the same place (guards against tag spelling
  differences).

---

## Tags

A **controlled vocabulary** the LLM picks from during extraction (multi-select).
Start small (~15) and grow deliberately to avoid drift (`hike` vs `trail`):

```
viewpoint, hike, waterfall, beach, restaurant, cafe, bar, hotel,
museum, market, park, landmark, neighborhood, activity, nature
```

Defined once as a constant in `models.py` and embedded in the extraction schema.
Geocoder POI types may optionally reinforce a tag, but LLM context is primary for
travel-specific labels. Tags union across posts.

---

## Proposed structure

Aligns with the existing layering: a geocoder is a reusable API client (like
EnsembleData/Supadata), and the place domain gets one module (like `store.py`
owns posts).

```
travelplanner/
  models.py            # + PlaceMention, PlaceLocation, CanonicalPlace, TAGS
  clients/geocoder.py  # NEW: geocoding client (Nominatim now, swappable)
  places.py            # NEW: normalize → locate → resolve/upsert → load/list/filter
  pipeline.py          # call process_post_places after fetch (updated)
  extract.py           # extend schema with tags + state_province (updated)
  store.py             # posts gain place_ids (updated)
  sources/             # unchanged: collect hints only
```

Two new files instead of three. `cli.py` and `server/` keep calling
`pipeline.ingest_links`; place processing stays internal to the pipeline.

---

## Storage layout

```
data/
  posts/instagram/CofSzxwIgdq.json   # post + place_ids + raw hints (audit trail)
  places/us-or-portland-multnomah-falls.json
```

**Post record additions:** `place_ids: list[str]`. Keep existing `places` /
`extracted_places` as the raw audit trail.

**Place record (new `CanonicalPlace`):**

- `place_id` — the slug key above
- `display_name`, `aliases`
- `location` — `PlaceLocation` (continent, country, country_code, state_province,
  city, lat/lng, provider raw id)
- `tags` — controlled vocabulary, multi-value
- `details`, `tips` — merged across mentions
- `source_post_ids` — e.g. `["instagram:CofSzxwIgdq", "youtube:abc123"]`

`place_ids` (post→place) and `source_post_ids` (place→post) are a deliberate
bidirectional denormalization for cheap queries; `reprocess_all_places` rebuilds
both, so any drift is self-healing.

---

## Pipeline change

```
before:  ingest_link → fetcher → save_post
after:   ingest_link → fetcher → process_post_places → save_post + upsert places
```

`process_post_places(post) -> tuple[str, ...]`:

1. `mentions = mentions_from_post(post)`
2. `location = geocoder.locate(mention)` for each mention
3. `place_id = upsert_place(mention, location, source_post_id=f"{platform}:{post_id}")`
4. return the `place_ids`

Batch backfill entry point:

```python
def reprocess_all_places(platform: Platform | None = None) -> None
```

---

## Decisions

Settled for the first build; the abstractions keep each one swappable later.

- **Place identity:** a provider-independent slug key
  (`slug(country_code, state_province, city, display_name)`), not the geocoder's
  raw id — so switching geocoders never breaks identity. See *Place identity &
  dedup* above.
- **When enrichment runs:** at ingest time. Slower ingest, but places are ready
  immediately. Lazy/background can come later behind the same function.
- **Geocoder:** Nominatim (OSM) — free, good hierarchy, rate-limited — behind
  `clients/geocoder.py` so Google/Geoapify is a drop-in later.
- **Tag list:** the ~15 above; grow deliberately.
- **UI:** location-first browse, tag as a filter.

---

## API & UI (later phase)

- `GET /places` — list with optional `country` / `city` / `tag` filters
- `GET /places/{place_id}` — detail with source posts
- Frontend: location-grouped, tag-filterable place browser. Posts still link
  their places, but the library is the primary browse experience.

---

## Phased rollout

1. **Models & extraction** — add `PlaceMention`, `PlaceLocation`,
   `CanonicalPlace`, `TAGS`; extend the Supadata schema with `tags` +
   `state_province`.
2. **Client, store & wiring** — `clients/geocoder.py`; `places.py`
   (normalize, locate, resolve/upsert, load/list/filter); wire
   `process_post_places` into `pipeline.py`; add `place_ids` to posts.
3. **Backfill & API** — `reprocess_all_places`; `/places` endpoints; frontend
   place browser.
4. **Platform expansion** — new fetchers plug in without touching place
   processing; optional caption-only mentions and POI-type tag mapping.

---

## What we're not doing (for now)

- Nested geographic folder trees on disk
- Free-form LLM tags without a controlled vocabulary
- Place logic inside platform fetchers
- Duplicating full canonical place data on every post
- Provider IDs as canonical identity, or a pre-built geographic ontology

---

## Relationship to link ingestion

Builds on [link-ingestion-plan.md](./link-ingestion-plan.md). Ingest is done for
Instagram; this doc covers the next layer: turning saved posts into a structured,
grouped, tagged place library across all platforms.

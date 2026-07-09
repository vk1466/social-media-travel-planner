# Plan: Primary Places and Sub-Destinations

## Goal

The place library should always surface **concrete, plan-around destinations**
as the primary browseable unit — cities, state/national parks, neighborhoods —
not trails, hikes, or pin-level attractions when those belong inside a larger
place.

Sub-destinations (trails, waterfalls, viewpoints, specific restaurants inside a
park) stay in the library as **children** of that primary place, with their own
coordinates, tags, and tips from the source post.

**Example:** Misery Ridge Trail is a hike inside Smith Rock State Park.

| Level | Example | Role |
|-------|---------|------|
| **Primary place** | Smith Rock State Park | Root in browse UI; what you plan a day around |
| **Sub-destination** | Misery Ridge Trail | Child; recommended activity/spot within the park |

Builds on [place-enrichment-plan.md](./place-enrichment-plan.md) and
[place-hierarchy-plan.md](./place-hierarchy-plan.md). Hierarchy linking
(`parent_place_id`, `link_places()`) is already implemented. This plan closes
the gap between **extraction intent** and **what actually appears as a root**
in the library.

---

## Guiding principle: LLM for understanding, code for identity

| Phase | Tool | Responsibility |
|-------|------|----------------|
| **Extraction** | LLM (one call per reel) | Infer specific spot, container parent, role, tags, tips |
| **Locate** | Geocoder | Canonical geography for every mention, including synthesized parents |
| **Resolve** | Deterministic | Dedup, merge, upsert — unchanged |
| **Hierarchy** | Deterministic + optional LLM naming | Link children to parents; never let hikes become roots when a parent exists |

Do **not** add a second LLM pass per post for hierarchy. Extraction already has
full reel context (caption, transcript, comments, IG tag). A separate hierarchy
LLM would duplicate work, cost more, and can disagree with extraction.

Do **not** use the LLM for geocoding or canonical identity — same rule as
place-enrichment-plan.

---

## Current state

Already in place:

1. **`parent_place_name`** on `ExtractedPlace` — LLM hint during reel
   extraction (e.g. Misery Ridge Trail → Smith Rock State Park). See
   `travelplanner/extract.py`.
2. **`parent_place_id`** on `CanonicalPlace` — parent/child links after
   `link_places()` in `travelplanner/hierarchy.py`.
3. **Root-only browse** — `PlaceLibrary` filters to places with
   `parent_place_id is null`; children nest under parent cards and in
   `PlaceDetail`.
4. **`choose_group_name()`** — LLM picks the traveler-facing name for ambiguous
   clusters (e.g. Crater Lake vs Crater Lake Parkway).

Gaps:

| Gap | Effect |
|-----|--------|
| Parent not auto-created | If a reel only mentions the trail, Smith Rock State Park never gets upserted; linking fails and the trail stays a root |
| `parent_place_name` ignored at upsert | Hint is only read later by `link_places()` to match an **existing** place by name |
| No role/tag root policy | A hike can remain a root when clustering or naming heuristics don't fire |
| Children are full places, not "activities" | Works structurally, but UI copy ("Places within this attraction") doesn't reflect activity semantics |

---

## Target behavior

### Extraction (LLM — extend existing schema)

Keep one structured OpenAI call per reel. Add an explicit role field:

```python
destination_role: Literal["primary", "sub_destination"]
```

| Mentioned | place_name | destination_role | parent_place_name |
|-----------|------------|------------------|-------------------|
| Misery Ridge Trail at Smith Rock | Misery Ridge Trail | sub_destination | Smith Rock State Park |
| Smith Rock State Park reel | Smith Rock State Park | primary | null |
| Tunnel Falls in Columbia River Gorge | Tunnel Falls | sub_destination | Columbia River Gorge |
| Portland food crawl | Portland | primary | null |

Prompt rules (append to `REEL_EXTRACT_PROMPT` in `extract.py`):

- **primary** — concrete place a traveler plans around: city, town,
  state/national park, named neighborhood, large landmark area.
- **sub_destination** — specific spot or activity inside a primary place:
  trail, waterfall, viewpoint, museum wing, restaurant inside a park.
- When `destination_role` is `sub_destination`, `parent_place_name` must be
  set when inferable from caption, transcript, hashtags, or IG tag.
- `place_name` stays the **specific pin-able name** (for geocoding precision).
  Do not swap trail name into `place_name` when a parent exists — both records
  are needed.

Example extraction output:

```json
{
  "places": [{
    "place_name": "Misery Ridge Trail",
    "destination_role": "sub_destination",
    "parent_place_name": "Smith Rock State Park",
    "state_province": "Oregon",
    "country": "USA",
    "tags": ["hike"],
    "tips": ["Start early for parking"]
  }]
}
```

Persist `destination_role` on `ExtractedPlace` (and post JSON) so
`link_places()` and tests can read it without re-fetching.

### Parent materialization (deterministic — `process_post_places`)

After processing each child mention, if `parent_place_name` is set, synthesize
and upsert a parent mention:

```python
parent_mention = PlaceMention(
    place_name=extracted.parent_place_name,
    state_province=extracted.state_province,
    country=extracted.country,
    tags=("park",) if "park" in extracted.parent_place_name.lower() else (),
)
# locate_mention → is_visitable_place → upsert_place (same as any mention)
```

Rules:

- Inherit region hints (`state_province`, `country`) from the child so geocoding
  resolves the right Smith Rock, not a同名 elsewhere.
- Deduplicate: if the same post yields multiple children with the same
  `parent_place_name`, upsert the parent once.
- If parent geocoding fails, still save the child; hierarchy pass may link
  later when another post materializes the parent.
- Append parent `place_id` to the post's `place_ids` when successfully created.

This is the **highest-impact change** — no extra API cost, fixes the common case
where the caption names only the trail.

### Hierarchy strengthening (deterministic + existing LLM naming)

Keep `link_places()` as the single place hierarchy is decided (see
place-hierarchy-plan). Add **tag/role-aware root election** in Stage B, before
or alongside `choose_group_name()`:

| Signal | Prefer as root |
|--------|----------------|
| `destination_role == "primary"` | Yes |
| Tags: `park`, `neighborhood` | Yes |
| Tags: `hike`, `viewpoint`, `waterfall` with a resolvable parent in cluster | No — always child |
| Fewest name tokens (existing heuristic) | Tie-breaker |
| `choose_group_name()` LLM | Ambiguous clusters only (cross-post) |

Explicit hint linking (existing) becomes reliable once parents are materialized:

```
child (Misery Ridge Trail) + parent_place_name hint
  → match parent (Smith Rock State Park) in same region
  → cluster.union(child, parent)
```

### UI (small follow-up)

- Keep root-only list and nested children in `PlaceCard`.
- Rename detail section from "Places within this attraction" to
  **"Activities & spots here"** (or similar).
- Show child tags (`hike`) on sub-destination rows.

---

## End-to-end pipeline

```
ingest_link(url)
  → fetcher: places (IG tag) + extracted_places (one LLM pass)
  → process_post_places(post):
       for each mention from post.places + post.extracted_places:
           locate → filter → upsert
       for each extracted_places entry with parent_place_name:
           synthesize parent mention → locate → filter → upsert   # NEW
  → save_post

after batch (ingest_links) and inside reprocess_all_places:
  → link_places()   # role/tag-aware root election + existing clustering
```

Result for Misery Ridge reel:

```
Smith Rock State Park     parent_place_id: null     tags: [park]
  └── Misery Ridge Trail  parent_place_id: <park>   tags: [hike]
```

Browse shows Smith Rock; card lists Misery Ridge underneath.

---

## Module changes

| File | Change |
|------|--------|
| `models.py` | Add `destination_role` to `ExtractedPlace` |
| `extract.py` | Extend `PLACE_EXTRACT_SCHEMA` + `REEL_EXTRACT_PROMPT`; parse `destination_role` |
| `store.py` | Serialize/deserialize `destination_role` on posts |
| `places.py` | Parent materialization in `process_post_places` (or helper called from it) |
| `hierarchy.py` | Tag/role-aware root election; read `destination_role` from posts when linking |
| `server/schemas.py` | Expose `destination_role` on extracted-place schema if needed for API |
| `frontend/` | Optional copy tweak for child section label |
| `tests/` | Parent materialization; role prevents hike-as-root; Misery Ridge example |

`upsert_place` signature unchanged. Hierarchy stays out of upsert.

---

## Implementation order

| Step | Work | Impact |
|------|------|--------|
| **1** | Parent materialization in `process_post_places` | Fixes roots missing parents; uses existing `parent_place_name` |
| **2** | Tag-aware root rules in `link_places` | Hikes/trails won't surface as top-level when parent exists |
| **3** | Add `destination_role` to extraction schema + model | Makes LLM intent explicit and testable |
| **4** | Reprocess existing library (`reprocess_all_places`) | Retrofit saved posts |
| **5** | UI copy for child section | Polish |

Steps 1–2 deliver ~80% of the behavior with zero extra LLM cost.

---

## Test cases

1. **Misery Ridge only** — post mentions trail + `parent_place_name: Smith Rock
   State Park` → two canonical places; trail is child after `link_places`.
2. **Both named in caption** — park and trail extracted → same tree; parent
   upserted once (deduped).
3. **Standalone trail** — no `parent_place_name` → trail remains root (correct).
4. **Cross-post** — post A: Smith Rock; post B: Misery Ridge with parent hint →
   same cluster, Smith Rock root.
5. **Role override** — cluster has park + hike; hike never elected root even if
   it has more `source_post_ids`.
6. **Idempotent** — run `link_places` twice → no changes on second run.
7. **Parent geocode failure** — child saved; linking retried after another post
   creates the parent.

---

## Tradeoffs and edge cases

**Regional parents.** "Columbia River Gorge" is a region, not a pin-able park.
Geocoder may return a vague boundary. Mitigations:

- Prompt: prefer a named park over a region when both apply (e.g. "Multnomah
  Falls" → "Columbia River Gorge National Scenic Area" or nearest named area).
- `is_visitable_place()` may need a carve-out for large scenic areas, or
  extraction should prefer the most concrete container available.

**Cities vs parks.** A restaurant in Portland: `place_name` = restaurant,
`parent_place_name` = Portland, `destination_role` = sub_destination. Portland
is the root — matches the user's "concrete place" rule.

**LLM mistakes.** Wrong or missing `parent_place_name` → tag heuristics and
proximity clustering (existing) still help; role field improves over time with
prompt tuning. Deterministic fallbacks keep ingest working when OpenAI is down.

**Cost.** One extraction call per reel (unchanged). Parent materialization adds
one geocode lookup per distinct parent per post — cheap relative to LLM.

---

## What we are not doing (yet)

- A separate `place_kind` enum on `CanonicalPlace` — derivable from
  `parent_place_id` and tags.
- A lighter "activity" record type — children remain full `CanonicalPlace`
  nodes with coordinates; sufficient for map pins and tips.
- LLM geocoding or LLM-only hierarchy without materialized parent records.
- Promoting vague regions ("Pacific Northwest") to primary places — still
  filtered by `is_visitable_place()` and extraction rules.

---

## Success criteria

- Browsing the place library shows parks, cities, and neighborhoods — not
  isolated trail names when a parent was inferable from the source post.
- Opening Smith Rock State Park shows Misery Ridge Trail (and siblings) as
  sub-destinations with hike tags and reel tips.
- Re-processing saved posts rebuilds correct trees without re-fetching links.
- No additional LLM calls per ingest beyond the existing reel extraction pass.

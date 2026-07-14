# Plan: Accurate Place Pins

> **Status (cutover complete):** Legacy / v2 / v3 switching is gone. The former
> v3 locate + name-aware resolve path is now the sole pipeline under
> `travelplanner/places/`. This document remains as design history.

## Goal

Every place a reel mentions should land on the **right map spot**, appear
**once** (not as duplicates or wrongly-merged neighbors), and **never be
silently lost** when geocoding is hard.

This is P0 feature #1 from [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md#accurate-place-pins).
It builds on the existing locate → filter → resolve pipeline in
`travelplanner/places.py` and pairs with
[primary-place-plan.md](./primary-place-plan.md) (parent materialization) and
[place-hierarchy-plan.md](./place-hierarchy-plan.md) (linking).

**Delivery constraint:** ship the new locate/resolve path as a **separate
implementation**, selected by env config, so production can stay on legacy
while we A/B and compare. An **admin compare tool** runs both pipelines on the
same query side-by-side.

**Reframe from the roadmap's 1a–1e list.** In the code those five items
collapse to **four workstreams over one shared prerequisite**, because 1a/1c
share a record, 1b/1c share a geocoder result shape, and 1e is mostly an
outcome of 1b + 1c:

| Roadmap item | Where it lands in this plan |
|--------------|-----------------------------|
| 1b better clues, 1c validate | **Prerequisite:** normalized geocode result (§1) |
| 1a keep failed lookups, 1c flag low-confidence | **Workstream B:** one review-state record (§3) |
| 1b clues, 1e specific pin | **Workstream A:** parent/region context in the query (§2) |
| 1d smarter merge | **Workstream C:** name-aware match (§4) |

---

## Guiding principles

1. **Code for identity, LLM only for understanding** — same as enrichment /
   primary-place plans. Geocoders own lat/lon. The LLM may only **pick among
   real geocode candidates** when ranking is ambiguous (never invent pins).
2. **Parallel pipelines, not in-place rewrite** — leave `places.py` behavior
   intact as `legacy`. Build the improved path in a new module. Switch via env.
3. **Compare before cutover** — admin UI runs both pipelines on one query and
   shows the diff so we only flip the default when the new path wins.

---

## Current state

The pipeline today (`travelplanner/places.py`):

1. `mentions_from_post` collects mentions from IG location tags
   (`PlatformPlace`) and LLM extraction (`ExtractedPlace`), plus one synthetic
   parent mention per distinct `parent_place_name`.
2. `locate_mention` reverse-geocodes when a mention already has lat/long, else
   forward-geocodes over progressively simpler query shapes
   (`name, city, state, country` → `name, state, country` → `name, country`).
3. `is_visitable_place` drops admin regions and non-travel offices.
4. `upsert_place` merges on an exact `place_key` slug **or** any place within
   `NEAR_DUPLICATE_METERS` (50 m); otherwise creates a new `Place`.
5. A mention that fails to geocode is `continue`d — no record, no retry.

### Gaps this plan closes

| Gap | Evidence in code | Effect |
|-----|------------------|--------|
| Geocoder result is OSM-shaped, not provider-neutral | `_location_from_raw` reads `raw["address"]`, `class`, `type`; `is_visitable_place` gates on `osm_class`/`osm_type` | A second provider (Google/Geoapify) can't slot in "behind the boundary" as the roadmap claims |
| No name-vs-result validation | `locate_mention` returns the first visitable hit | A travel name can pin onto a same-named shop/office |
| Failed mentions vanish | `process_post_places` `continue`s on `None` | Reel-mentioned places are lost; no recoverable retry |
| Proximity merge ignores names | `_find_near_duplicate` returns first place ≤50 m regardless of name | Two trailheads / a viewpoint + its parking lot collapse into one |
| Parent context not used for the child query | `_geocode_queries` never includes `parent_place_name`; parent is only a *separate* mention | Ambiguous child ("Misery Ridge") pins on the wrong POI or the whole park |
| `PlatformPlace` has no state/province field | `place_hints.py` — only `city`, `country`, lat/long | Platform mentions can't contribute `state_province` to the query |

---

## §0 Parallel pipeline + env switch

Do **not** rewrite `travelplanner/places.py` in place. Keep the current
locate → filter → upsert path as the **legacy** implementation. Put the new
logic in a sibling module and select at the orchestration boundary.

### Layout

```
travelplanner/
  places.py                 # unchanged legacy locate/upsert (KEEP AS-IS)
  places_v2/                # NEW — accurate pins implementation
    __init__.py             # public: process_post_places, locate_mention, …
    geocode_result.py       # GeocodeResult + category mapping
    locate.py               # queries, parent bias, confidence gate
    resolve.py              # name-aware merge / upsert
    candidates.py           # PlaceCandidate persist + retry
  places_router.py          # NEW — thin dispatch by env
```

Shared helpers that both pipelines need (`slugify`, `place_key`,
`load_all_places`, `list_places`, continent map) can stay on `places.py` and be
imported by v2 — or move to a small `places_common.py` if imports get circular.
Do **not** change legacy locate/merge semantics while extracting commons.

### Env config

In `travelplanner/settings.py` + `.env.example`:

```bash
# legacy (default) | v2
PLACE_PIPELINE=legacy
```

```python
def place_pipeline() -> str:
  value = os.getenv("PLACE_PIPELINE", "legacy").strip().lower()
  if value not in {"legacy", "v2"}:
    raise RuntimeError(f"PLACE_PIPELINE must be 'legacy' or 'v2', got {value!r}")
  return value
```

### Dispatch

Callers (`pipeline.py`, `reprocess_all_places`, CLI) go through one entry:

```python
# places_router.py
def process_post_places(post: SavedPost) -> tuple[str, ...]:
  if settings.place_pipeline() == "v2":
    from travelplanner.places_v2 import process_post_places as impl
  else:
    from travelplanner.places import process_post_places as impl
  return impl(post)
```

Rules:

- **Default = `legacy`** until we deliberately flip (dev or prod).
- Ingest / reprocess / CLI all respect the same env — no mixed modes in one run.
- Compare endpoint (§5) **ignores** `PLACE_PIPELINE` and always runs both.
- Infra: pass `PLACE_PIPELINE` into Lambda env in CDK the same way as
  `ADMIN_USER_IDS`.

---

## §1 Prerequisite: normalized geocode result (v2 only)

Everything else is thin once the geocoder boundary stops leaking OSM structure.
Add a provider-neutral result used by **v2 only**. Legacy keeps calling
`geocode()` / `reverse_geocode()` and parsing `raw` as today — do not break it.

Prefer additive geocoder APIs so legacy stays untouched:

```python
# clients/geocoder.py — keep existing geocode/reverse_geocode returning Location

@dataclass(frozen=True)
class GeocodeResult:
    display_name: str
    latitude: float
    longitude: float
    country: str | None = None
    country_code: str | None = None
    state_province: str | None = None
    city: str | None = None
    provider_place_id: str | None = None
    category: str | None = None      # provider-neutral: "attraction", "natural",
                                     # "office", "administrative", "commercial", ...
    provider: str = "nominatim"
    raw: dict[str, Any] | None = None  # debug only; v2 must not branch on raw

def geocode_normalized(query: str) -> GeocodeResult | None: ...
def reverse_geocode_normalized(lat: float, lon: float) -> GeocodeResult | None: ...
```

- Nominatim adapter maps OSM `class`/`type` → `category` inside the client.
- v2 `is_visitable_place` gates on `category`, not `osm_class`/`osm_type`.
- **Fallback provider (roadmap 1b)** — optional second adapter behind
  `geocode_normalized` only; use when Nominatim is `None` or low-confidence.
  Legacy never sees it.

This is what makes "provider-agnostic behind the boundary" true for v2, and
gives confidence scoring a `category` to validate against.

---

## §2 Workstream A — better clues + specific pin (roadmap 1b, 1e)

All of this lives in `places_v2/locate.py`. Legacy query shapes stay unchanged.

### A1. Fold parent + full region into the query

v2 `_geocode_queries` accepts the extracted parent as context and adds
parent-qualified shapes **before** falling back to bare region:

```python
add(name, parent_place_name, city, state, country)   # NEW — most specific
add(name, city, state, country)
add(name, state, country)
add(name, country)
```

Carry `parent_place_name` onto `PlaceMention` (child mentions only) so the
locate step can use it. The parent is still upserted as its own mention (per
primary-place-plan); this only *biases the child's* geocode.

Shared hint shapes (`PlaceMention`, `PlatformPlace`) may gain optional fields —
additive, default `None` — so legacy callers keep working.

### A2. Give platform mentions a region

Add `state_province` to `PlatformPlace` in `place_hints.py` and set it in
v2's mention builder. Legacy can ignore the new field.

### A3. Prefer the specific attraction over the broad region (1e)

When a mention has a parent, reject a result whose `category` is
`administrative`/region **and** whose name matches the parent rather than the
child — i.e. don't let "Misery Ridge" silently resolve to "Smith Rock State
Park". Fall through to the next query shape or the fallback provider instead.
1e needs no separate storage — it's this rule plus A1 and the §3 name score.

---

## §3 Workstream B — validate + keep failures in one record (roadmap 1a, 1c)

1a and 1c need the **same** thing: a persisted record with a review state. Build
one `PlaceCandidate` concept in `places_v2/candidates.py` instead of two
mechanisms. Legacy continues to skip failed mentions.

### B1. Scoring / gating (1c)

After locate, compute a `match_confidence` from:

- **Name similarity** between the mention name (and aliases) and
  `result.display_name` (normalized; e.g. token-set ratio).
- **Category preference**: `attraction`/`natural`/`park` > generic >
  `office`/`commercial`.
- **Region agreement**: result country/state matches the mention's hints.

Classify:

| Outcome | Condition | Action |
|---------|-----------|--------|
| `resolved` | score ≥ high threshold | upsert as a trusted `Place` |
| `low_confidence` | mid score | upsert but flag for review (or hold as candidate) |
| `unresolved` | no visitable hit at all | persist candidate, no `Place` pin |

### B2. Persist candidates (1a)

Persist unresolved/low-confidence mentions tied to the source post so they're
recoverable work, not silent loss. Minimal shape:

```python
@dataclass(frozen=True)
class PlaceCandidate:
    candidate_id: str          # slug(post_id + place_name)
    source_post_id: str
    place_name: str
    hints: PlaceMention        # city/state/country/parent already captured
    status: str                # "unresolved" | "low_confidence"
    last_tried_at: str | None
    resolved_place_id: str | None = None
```

- New lightweight repo `db/place_candidates_repo.py` (mirror existing repos;
  see `docs/aws-dynamodb.md`). One table, PK `candidate_id`, optional GSI on
  `source_post_id`. Only written when `PLACE_PIPELINE=v2`.
- v2 `process_post_places` writes a candidate instead of `continue`ing on
  failure / low confidence.
- `retry_place_candidates()` (CLI + admin) re-runs v2 locate with stored hints
  — **no Instagram re-fetch**. On success: upsert `Place`, set
  `resolved_place_id`, link the post.

This feeds P3 #11 (confidence / needs review).

---

## §4 Workstream C — name-aware merge (roadmap 1d)

In `places_v2/resolve.py`, replace legacy's exact-key-OR-first-within-50m with
a single best-match scorer:

```python
def _find_existing_place(key, location, mention, candidates) -> Place | None:
    # 1. exact place_key hit  → merge
    # 2. name/alias match in same region (country/state/city or parent) → merge
    # 3. within NEAR_DUPLICATE_METERS AND names/aliases compatible → merge
    # else → new place
```

Rules:

- **Add** cross-geocode alias merge: same name/alias in the same region merges
  even when coordinates differ slightly (fixes missed dupes).
- **Tighten** proximity: a ≤50 m hit only merges when names/aliases are
  compatible (fixes wrongly-merged neighbors).
- Load library places **once per post** and pass them in (legacy
  `_find_near_duplicate` rescans every mention).

Name compatibility reuses the §3 name-similarity function.

Legacy `upsert_place` / `_find_near_duplicate` stay as they are.

---

## §5 Admin page + locate compare tool

Goal: while both pipelines exist, an admin can paste one place query (or pick a
saved post's mentions) and see **legacy vs v2** results side-by-side — without
writing to the place library.

### Backend

Admin-only endpoints (reuse `AdminUserId` / `require_admin` from `server/auth.py`):

```
POST /api/admin/places/compare-locate
GET  /api/admin/me   (optional: { is_admin: bool } so FE can show the nav)
```

Request body for compare:

```json
{
  "place_name": "Misery Ridge",
  "city": null,
  "state_province": "Oregon",
  "country": "USA",
  "parent_place_name": "Smith Rock State Park",
  "latitude": null,
  "longitude": null
}
```

Or optionally `{ "source_post_id": "instagram:…" }` to expand that post's
mentions and compare each.

Response (read-only; **no upsert**, **no candidate write**):

```json
{
  "query": { "...PlaceMention fields..." },
  "legacy": {
    "status": "resolved" | "unresolved",
    "location": { "display_name", "latitude", "longitude", "city", "…" } | null,
    "queries_tried": ["Misery Ridge, Oregon, USA", "…"],
    "notes": []
  },
  "v2": {
    "status": "resolved" | "low_confidence" | "unresolved",
    "location": { … } | null,
    "match_confidence": 0.82,
    "category": "attraction",
    "provider": "nominatim",
    "queries_tried": ["Misery Ridge, Smith Rock State Park, Oregon, USA", "…"],
    "notes": ["rejected parent-scale hit", "…"]
  },
  "diff": {
    "same_pin": false,
    "distance_meters": 1240.5,
    "name_match": false
  }
}
```

Implementation notes:

- Extract **pure locate functions** that return a structured result without
  side effects: `places.locate_mention_debug(mention)` and
  `places_v2.locate.locate_mention_debug(mention)`.
- Compare always invokes **both**, regardless of `PLACE_PIPELINE`.
- Rate-limit / sequential geocode calls (Nominatim 1 req/s) — expect the
  compare to take a few seconds; show that in the UI.

### Frontend

New admin surface (existing `DataMaintenance` stays on the main page for now,
or later move under Admin):

| Piece | Detail |
|-------|--------|
| Route | `/admin` (and `/admin/places/compare`) |
| Gate | Call `GET /api/admin/me` (or treat 403 on compare as non-admin). Hide nav link when not admin. When `ADMIN_USER_IDS` is empty (dev), any signed-in user is admin — same as today. |
| Nav | "Admin" link in the top bar or a quiet footer link — not a main library tab |
| Page | `frontend/src/components/AdminPage.tsx` shell with sections |
| Tool | `LocateCompareTool.tsx` — form + side-by-side result cards |

**Locate compare UI:**

1. Fields: place name (required), city, state/province, country, parent place,
   optional lat/long.
2. Shortcut: load mentions from a saved `post_id` and run compare per mention.
3. Submit → `POST /api/admin/places/compare-locate`.
4. Results: two columns (**Legacy** | **v2**), each showing pin name, lat/lon,
   status, queries tried, confidence (v2 only).
5. Diff strip: same pin? distance between pins; highlight when they disagree.
6. Optional small map with two markers (reuse `PlaceMap` / maps helpers) when
   both have coordinates.

Preserve existing app visual language; this is an internal tool, not a marketing
surface — keep it simple and scannable.

### API client

Add to `frontend/src/api.ts`:

```ts
compareLocate(mention: PlaceMentionInput): Promise<LocateCompareResult>
fetchAdminMe(): Promise<{ is_admin: boolean }>
```

---

## Module changes

| File | Change |
|------|--------|
| `travelplanner/settings.py` | `place_pipeline()` → `"legacy"` \| `"v2"` |
| `.env.example` | Document `PLACE_PIPELINE=legacy` |
| `infra/` (CDK) | Pass `PLACE_PIPELINE` into Lambda env; `PlaceCandidates` table |
| `travelplanner/places.py` | **Unchanged** locate/upsert semantics; optional shared helpers + `locate_mention_debug` for compare |
| `travelplanner/places_router.py` | **New** — dispatch `process_post_places` / reprocess by env |
| `travelplanner/places_v2/` | **New** — locate, resolve, candidates (all §1–§4) |
| `clients/geocoder.py` | Additive `GeocodeResult` + `*_normalized` APIs; keep legacy `Location` APIs |
| `place_hints.py` | Additive optional fields (`state_province` on `PlatformPlace`, `parent_place_name` on `PlaceMention`) |
| `db/place_candidates_repo.py` | **New** — only used by v2 |
| `pipeline.py` / CLI | Call `places_router` instead of `places` directly |
| `server/app.py` | `POST /api/admin/places/compare-locate`, optional `GET /api/admin/me` |
| `server/schemas.py` | Compare request/response schemas |
| `frontend/src/App.tsx` | `/admin` route + admin nav (gated) |
| `frontend/src/components/AdminPage.tsx` | Admin shell |
| `frontend/src/components/LocateCompareTool.tsx` | Side-by-side compare UI |
| `frontend/src/api.ts` | Compare + admin me clients |
| `tests/` | Legacy golden tests unchanged; new v2 + compare tests |

`upsert_place` public contract for the **active** pipeline stays; hierarchy
stays out of this path.

---

## Implementation order

| Step | Work | Why here |
|------|------|----------|
| **0** | §0 router + `PLACE_PIPELINE` env (both paths call legacy initially) | Safe switch shell before any behavior change |
| **1** | §1 `GeocodeResult` + `*_normalized` (additive) | Unblocks v2; legacy untouched |
| **2** | §2 parent/region queries in `places_v2` | Reduces failures before failure storage |
| **3** | §3 B1 confidence scoring in v2 | Stops wrong pins |
| **4** | §4 name-aware merge in v2 | Cleans dedup |
| **5** | §5 admin page + compare-locate endpoint/UI | Validate v2 against legacy on real queries |
| **6** | §3 B2 candidate persistence + retry (v2 only) | After compare proves locate quality |
| **7** | Fallback geocoder provider | Optional accuracy boost |
| **8** | Flip `PLACE_PIPELINE=v2` in dev → then prod when compare looks good | Cutover |

Do failure-**reducing** work before failure-**storing**. Ship the compare tool
before cutover so we have evidence.

---

## Test cases

1. **Env dispatch** — `PLACE_PIPELINE=legacy` and `=v2` route to the correct
   module; invalid value raises at settings read.
2. **Legacy unchanged** — existing place tests still pass with
   `PLACE_PIPELINE=legacy` (default).
3. **Provider-neutral v2** — normalized geocode fixtures map to expected
   `PlaceLocation` / category.
4. **Parent-biased query** — "Misery Ridge" + parent "Smith Rock State Park" +
   Oregon → trail pin, not park centroid (v2).
5. **Region qualification** — ambiguous name resolves correctly when hints
   present (v2).
6. **Name mismatch** — same-named office → `low_confidence` / not trusted (v2).
7. **Unresolved persisted** — failed geocode → `PlaceCandidate` (v2 only).
8. **Retry without re-fetch** — `retry_place_candidates` resolves and links.
9. **Alias merge / neighbor split** — name-aware merge rules (v2).
10. **Compare endpoint** — same mention returns both `legacy` and `v2` blocks;
    no writes to Places / Candidates tables.
11. **Admin gate** — non-admin gets 403 on compare; empty `ADMIN_USER_IDS`
    allows any auth user (dev).

---

## Tradeoffs and edge cases

- **Two codepaths to maintain** until cutover — intentional. Fold `places_v2`
  into `places.py` (or delete legacy locate) only after legacy is retired.
- **Confidence thresholds** are heuristic; start conservative. Named constants
  next to `NEAR_DUPLICATE_METERS` in v2.
- **Fallback provider cost/keys** — gate behind config; Nominatim default.
- **Candidate table** — only populated under v2; retries mark terminal states.
- **Compare latency** — both pipelines hit Nominatim; sequential rate limiting
  makes the tool slow; show a loading state, don't timeout the request short.
- **Region parents** ("Columbia River Gorge") — same carve-out as
  primary-place-plan; prefer concrete named area over vague boundary.

---

## What we are not doing (yet)

- Rewriting or deleting legacy `places.py` locate/merge in this phase.
- An LLM that invents coordinates (candidate picker among geocoder hits is OK).
- A user-facing "fix this pin" editor (P3 #11 polish).
- Embedding-based name matching.
- Multiple pins per `Place`.
- Auto-flipping `PLACE_PIPELINE` based on compare scores — human decides.

---

## Success criteria

- `PLACE_PIPELINE=legacy` (default) behaves exactly as today.
- `PLACE_PIPELINE=v2` uses the new locate/resolve path end-to-end.
- Admin `/admin` page (admin-gated) can compare legacy vs v2 for one query and
  show pin agreement / distance / confidence without mutating the library.
- Under v2: specific attractions win over enclosing parks when parent/region
  hints exist; failed mentions are recoverable; neighbors don't wrongly merge.
- Cutover to v2 in prod only after compare evidence on real reels looks good.

# Plan: Place Hierarchy, Caption Extraction, and Cross-Post Grouping

## Goal

Improve the canonical place library so that:

1. **Related places nest under a parent attraction** — Crater Lake is the
   attraction; Crater Lake Parkway and Wizard Island are children.
2. **Administrative regions are excluded** — Oregon (a state) is not a
   visitable place.
3. **Places are extracted from captions**, not only the IG location tag and
   video extraction — a Lake Tahoe reel whose caption lists 8 stops captures
   all of them.
4. **Grouping is global across posts** — if Post A mentions Crater Lake and
   Post B mentions Crater Lake Parkway, both land under one attraction.

Builds on [place-enrichment-plan.md](./place-enrichment-plan.md). The existing
pipeline (`normalize → locate → resolve/upsert`) stays exactly as-is. This doc
adds **three isolated pieces**, each with one responsibility:

| Piece | Where | Responsibility |
|-------|-------|----------------|
| **Reel extraction** | `extract.py` + `sources/instagram.py` | Collect all reel sources, one OpenAI pass |
| **Admin filter** | `places.py` (one predicate) | Drop states/countries after geocode |
| **Hierarchy pass** | new `hierarchy.py` | Group places + name the group (OpenAI) |

Two jobs use an LLM: mining places out of caption text, and choosing the
correct name for a group of related places. Both go through **OpenAI**, and
both are wrapped so the provider/logic can change later (see
[LLM usage](#llm-usage-one-isolated-client-swappable-functions)).

```
Any link → fetch post → bundle (tag + caption + hashtags + comments + transcript)
  → one OpenAI extraction pass → extracted_places
  → place pipeline (normalize → locate → filter → upsert)   # per post
  → hierarchy pass (parent linking over full library)        # global, once
```

---

## Guiding principle: isolate hierarchy from resolution

The single most important design choice: **hierarchy is never computed inside
`upsert_place`.** Upsert keeps doing identity + dedup + merge only. Parent links
are computed by a separate, idempotent pass over the whole `data/places/`
library after all upserts finish.

Why this matters:

- **One code path, not two.** The original plan linked parents incrementally at
  upsert *and* in a recluster pass, then reconciled them. Here there is exactly
  one place hierarchy is decided.
- **Order independence is free.** The pass recomputes every `parent_place_id`
  from scratch each run, so "Post B ingested before Post A" needs no special
  handling — it just works.
- **Cheap to test and reason about.** Given a fixed set of places + posts, the
  pass is a pure function of that input.

Both `ingest_links` (after a batch) and `reprocess_all_places` call the same
pass. Nothing else changes in the resolve path.

---

## LLM usage: one isolated client, swappable functions

Everything OpenAI is reachable through a single client factory and a couple of
plain functions, so the model, prompts, or even the whole provider can change
without touching callers.

```
clients/openai.py        get_client() -> OpenAI          # only file that imports openai
settings.py              openai_api_key(), openai_model() # env vars, same shape as the others
extract.py               fetch_places_from_reel(bundle)  # all reel sources -> ExtractedPlace[]
hierarchy.py             choose_group_name(names)        # cluster names -> best attraction name
```

Rules that keep this modular:

- **Only `clients/openai.py` imports the `openai` package.** Callers never see
  OpenAI request/response types.
- **The model is configurable.** `settings.openai_model()` reads `OPENAI_MODEL`
  and defaults to `gpt-4o-mini`. Both LLM functions pass
  `model=settings.openai_model()`, so switching models is an env change with no
  code edit.
- **Each LLM task is one function with plain in/out** (`str`/tuples/dataclasses).
  Swapping the model or prompt is a one-file change; swapping providers means
  editing only that function body + the client factory.
- **Every LLM step has a deterministic fallback.** If OpenAI is unavailable or
  returns nothing usable, extraction yields `()` and naming falls back to a
  deterministic election (below). So ingest and `link_places` still run —
  and stay testable — with no network.
- Structured output reuses the existing `PLACE_EXTRACT_SCHEMA` +
  `_parse_extracted_places`, so JSON parsing lives in one place regardless of
  which provider produced the JSON.

---

## Problems with the current system

| Issue | Example | Root cause |
|-------|---------|------------|
| Flat library | Crater Lake and its Parkway are siblings | No `parent_place_id` |
| Admin noise | Oregon appears as a place | No geocoder type filter after locate |
| Missing caption places | Reel lists 8 stops in caption; only the tag is saved | Caption stored but never mined; video extraction runs for reels only |
| Fragmented attractions | Same attraction split across posts | No global grouping |

---

## 1. Unified reel extraction (one AI pass over all sources)

### Current behavior

- IG location tag → `post.places` (one per post).
- Caption, hashtags, comments, and video transcript are collected into a
  `ReelBundle`.
- One OpenAI structured-output call → `post.extracted_places`.

### Change

Every post runs one extraction pass over the full bundle. For reels/videos,
Supadata provides the transcript; OpenAI does all place mining and hierarchy
hinting.

**`extract.py`** — bundle formatter + one OpenAI-backed function:

```python
@dataclass(frozen=True)
class ReelBundle:
    caption: str
    hashtags: tuple[str, ...] = ()
    top_comments: tuple[str, ...] = ()
    location_tag: Place | None = None
    transcript: str | None = None

def fetch_places_from_reel(bundle: ReelBundle) -> tuple[ExtractedPlace, ...]: ...
```

- Calls OpenAI via `clients.openai.get_client()` with strict structured output
  matching `ExtractedPlace` (`place_name`, geography, `details`, `tips`,
  `tags`, `parent_place_name`).
- Supadata is used only for `fetch_transcript(media_url)` — not for place
  extraction.
- On any failure, returns `()` (non-fatal).

Prompt tuned for reels:

> Extract every specific stop from caption, transcript, comments, hashtags, and
> location tag. Deduplicate across sources. Set `parent_place_name` for hierarchy.
> Keep `details` to one sentence and `tips` as short actionable phrases.

**`sources/instagram.py`** — build bundle and extract once:

```python
bundle = ReelBundle(
    caption=trimmed["caption"],
    hashtags=trimmed["hashtags"],
    top_comments=trimmed["top_comments"],
    location_tag=location_tag_from_ig_tag,
    transcript=fetch_transcript(media_url) if video/reel else None,
)
extracted_places = extract.fetch_places_from_reel(bundle)
```

No new mention fields are needed for this piece — `ExtractedPlace` already
carries `place_name`, `city`, `state_province`, `country`, `details`, `tips`,
`tags`.

---

## 2. Admin filter (one pure predicate)

Filter **after geocode**, using the Nominatim `raw` payload — do not trust the
LLM for rejection.

Extend `PlaceLocation` with the two fields the filter needs:

```python
osm_class: str | None = None   # e.g. "boundary", "natural", "highway"
osm_type: str | None = None    # e.g. "administrative", "water", "residential"
```

Populate them in `_location_from_raw()` (they come straight off `raw`).

Add one predicate in `places.py`:

```python
def is_visitable_place(location: PlaceLocation) -> bool: ...
```

### Reject rules (v1)

| Condition | Action |
|-----------|--------|
| `osm_class == "boundary"` and `osm_type == "administrative"` | reject |
| `osm_type` in `{state, region, country, continent}` | reject |
| `display_name` equals `state_province` or `country` (case-insensitive) | reject |

Wire it as a guard in `process_post_places`, right after `locate_mention`:

```python
location = locate_mention(mention)
if location is None or not is_visitable_place(location):
    continue
```

A rejected mention is skipped exactly like a failed geocode — non-fatal.
(Optional later: allowlist of good OSM classes instead of a denylist.)

---

## 3. Hierarchy pass (one global, idempotent function)

Add `parent_place_id` to `CanonicalPlace`:

```python
parent_place_id: str | None = None   # another canonical place, or null (root)
```

That's the only new model field for hierarchy. A place is an **attraction** iff
`parent_place_id is None`; everything else is a child. No `place_kind` enum —
it's derivable and was inconsistent in the original plan. (Add it later only if
the UI needs more than two levels.)

### The pass

New module `hierarchy.py` (kept out of `places.py`, which is already large):

```python
def link_places(
    *,
    posts_data_dir: Path = DEFAULT_DATA_DIR,
    places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> None:
    """Recompute every parent_place_id over the whole library. Idempotent:
    clears all parent links, then reassigns from scratch."""
```

The pass has two clearly separated stages — **cluster** (deterministic) then
**name** (LLM). Keeping them apart is what lets us change either later without
touching the other.

**Stage A — cluster** (all in memory after one `load_all_places` +
`load_all_posts`):

1. **Reset** — set `parent_place_id = None` on every place.
2. **Explicit hints** — a place whose mention carried a `parent_place_name`
   (see below) joins the cluster of the place matching that name within the
   same country/state.
3. **IG-tag anchor** — for each post, the place from its IG location tag anchors
   that post's cluster; other unclustered places from the same post join it.
4. **Name + proximity** — remaining places join a cluster when another member is
   a broader name match (token subset, e.g. `crater lake` ⊂
   `crater lake parkway`) within ~25 km.

**Stage B — name + root** (per cluster):

5. **Choose the group name** via `choose_group_name(member_names)` (OpenAI).
   Fallback if unavailable: deterministic election — fewest name tokens (most
   general) → most `source_post_ids` → lowest `place_id`.
6. **Elect the root**: the cluster member whose name matches the chosen group
   name (by slug). If none matches, keep the deterministically-elected member as
   root and set its `display_name` to the chosen name, preserving the original
   in `aliases`.
7. **Attach + save**: point every other member's `parent_place_id` at the root,
   collapse any chains so a child never points at another child, and save only
   places that changed.

Stage A is deterministic and order-independent. Stage B is isolated behind one
function, so `link_places` stays fully testable offline via the fallback.

### One optional hint field

To support step 2, extraction may set on `ExtractedPlace` (persisted on the
post, so the hierarchy pass can read it without re-fetching):

```python
parent_place_name: str | None = None   # LLM hint, e.g. "Lake Tahoe"
```

This is optional — steps 3–4 already link most cases from the IG tag and name
similarity alone. `is_primary` and `place_kind` from the original plan are
dropped: primary is inferred from the IG tag, kind is derived from parenthood.

### Choosing the group name (OpenAI, isolated)

Geocoder names are often the *wrong* label for a group — a cluster's most-linked
place might be "Crater Lake Parkway" or "Rim Village Visitor Center", not the
attraction people mean. So naming is its own swappable function, not baked into
the clustering logic:

```python
def choose_group_name(member_names: tuple[str, ...]) -> str | None:
    """Best attraction name for a cluster of related place names.
    OpenAI-backed; returns None to defer to deterministic election."""
```

- **Plain in/out** — takes only the member display names, returns one string.
  No coupling to storage or OpenAI types.
- **Prompt intent** — "these places belong to one attraction; return the single
  name a traveler would call the whole group (prefer the broadest real place,
  not a sub-location or facility)."
- **Fallback** — `None` (or any failure) → Stage B step 5 falls back to
  deterministic election, so the pass never depends on the network.
- **Change later** — tweak the prompt, switch models, or replace with a
  non-LLM heuristic by editing this one function.

### Cross-post example

```
Post A (reel):     Crater Lake, Wizard Island
Post B (carousel): Crater Lake Parkway, Rim Village
Post C (caption):  Oregon            → filtered out (step in §2)

Stage A clusters: {Crater Lake, Wizard Island, Crater Lake Parkway, Rim Village}
Stage B names:    choose_group_name(...) -> "Crater Lake"  (matches a member → root)

After link_places():
  Crater Lake                    parent_place_id = null   (group name from OpenAI)
    ├── Wizard Island            parent = Crater Lake
    ├── Crater Lake Parkway      parent = Crater Lake
    └── Rim Village              parent = Crater Lake
```

`source_post_ids` stay on each node; the UI can roll child counts up to the
parent.

---

## Proposed pipeline

```
ingest_link(url)
  → fetcher collects: places (IG tag) + extracted_places (one bundle pass)
  → process_post_places(post):        # unchanged except the filter guard
       for mention in mentions_from_post(post):
           location = locate_mention(mention)
           if not location or not is_visitable_place(location): continue
           place_id = upsert_place(mention, location, ...)   # hierarchy-free
  → save_post

after a batch (ingest_links) and inside reprocess_all_places:
  → link_places()                     # global parent assignment, idempotent
```

`upsert_place` signature and behavior are untouched. Hierarchy lives entirely in
`link_places`.

---

## Storage layout

Place JSON gains two optional fields (backward compatible — missing → null):

```json
{
  "place_id": "us-or-klamath-crater-lake",
  "display_name": "Crater Lake",
  "parent_place_id": null,
  "location": { "display_name": "Crater Lake", "osm_class": "natural", "osm_type": "water", "...": "..." },
  "...": "..."
}
```

```json
{
  "place_id": "us-or-klamath-crater-lake-parkway",
  "display_name": "Crater Lake Parkway",
  "parent_place_id": "us-or-klamath-crater-lake",
  "...": "..."
}
```

Posts are unchanged except a possibly richer `extracted_places` list (caption
stops, optional `parent_place_name`). No on-disk folder nesting.

---

## API & UI

### API

| Endpoint | Change |
|----------|--------|
| `GET /api/places` | Add `roots_only=true` — return only `parent_place_id is null` |
| `GET /api/places` | Add `parent_place_id=` — return children of an attraction |
| `GET /api/places/{id}` | Include `children` and `parent` |

### Frontend

Attraction-first browse replaces the flat grid:

```
Lake Tahoe (4 posts · 6 places)
  ├── Emerald Bay
  ├── Sand Harbor
  └── Heavenly Gondola
```

Geographic filters (country, state, tag) still apply; `PlaceDetail` shows
children + parent breadcrumb.

---

## Module changes

| File | Change |
|------|--------|
| `settings.py` | `openai_api_key()` + `openai_model()` (defaults to `gpt-4o-mini`) |
| `clients/openai.py` **(new)** | `get_client() -> OpenAI` — the only file that imports `openai` |
| `models.py` | `CanonicalPlace.parent_place_id`; `PlaceLocation.osm_class`/`osm_type`; optional `ExtractedPlace.parent_place_name` |
| `extract.py` | `ReelBundle`, `fetch_places_from_reel` (OpenAI strict schema); `fetch_transcript` in `clients/supadata.py` |
| `sources/instagram.py` | Build bundle from caption/hashtags/comments/tag/transcript; one extraction call |
| `places.py` | `is_visitable_place` predicate + one filter guard; populate `osm_class`/`osm_type` in `_location_from_raw` |
| `hierarchy.py` **(new)** | `link_places` (cluster) + `choose_group_name` (OpenAI naming) |
| `pipeline.py` | Call `link_places` after a batch |
| `server/schemas.py`, `server/app.py` | New fields; `roots_only` / `parent_place_id` params; children on detail |
| `frontend/` | Types + attraction grouping UI |
| `pyproject.toml` | Add `openai` dependency |
| `.env.example` | Add `OPENAI_API_KEY=` and `OPENAI_MODEL=gpt-4o-mini` |
| `tests/` | Filter, caption schema, cluster + naming (mock OpenAI) |

Layering unchanged: fetchers collect hints; `places.py` owns resolve + filter;
`hierarchy.py` owns grouping + naming; `clients/openai.py` is the sole OpenAI
boundary.

---

## Phased rollout

Each phase is independently shippable and testable.

| Phase | Scope | Risk |
|-------|-------|------|
| **0. OpenAI client** | `clients/openai.py`, `settings.openai_api_key`/`openai_model` (default `gpt-4o-mini`), dep + `.env.example` | Low |
| **1. Filter + model** | `osm_class`/`osm_type`, `is_visitable_place`, `parent_place_id` field (default null) | Low |
| **2. Reel extraction** | `fetch_places_from_reel` + transcript fetch; bundle in IG fetcher | Medium |
| **3. Hierarchy** | `link_places` clustering + `choose_group_name` (OpenAI); call from pipeline + `reprocess_all_places` | Medium |
| **4. API & UI** | `roots_only`, children, attraction grouping | Low |
| **5. Optional** | OSM class allowlist, Wikidata enrichment | — |

---

## Decisions

| Topic | Decision |
|-------|----------|
| Hierarchy computation | **One idempotent global pass**, never inside `upsert_place` |
| Clustering | Deterministic: explicit hint → IG-tag anchor → name/proximity |
| Group name | **OpenAI** via `choose_group_name`; deterministic election as fallback |
| Reel extraction | **One OpenAI pass** over caption + transcript + comments + tag; Supadata for transcript only |
| LLM isolation | Single `clients/openai.py`; one function per task; deterministic fallbacks |
| Model | Configurable via `OPENAI_MODEL`; defaults to `gpt-4o-mini` |
| `place_kind` | Dropped for v1 — derived from `parent_place_id is None` |
| Admin filter | Geocoder-first denylist; LLM not used to reject |
| Identity key | Unchanged — geocoder-derived slug + 50 m near-dup |

---

## What we're not doing (for now)

- Incremental parent linking at upsert (the whole point is one global pass).
- A `place_kind` enum or free-form kind strings.
- Nested folders on disk (`data/places/or/...`).
- Weighted / probabilistic parent scoring — deterministic rules only.
- Promoting vague regions ("Pacific Northwest") to attractions.
- Re-fetching links when the caption prompt changes (use `reprocess` if hints
  are stored; `refresh` to re-run extraction).

---

## Test plan

All LLM calls are mocked in tests; nothing hits the network.

1. **Admin filter** — mention "Oregon" → no canonical place created.
2. **Caption itinerary** — caption with 3 named stops (mock OpenAI) → 3 `extracted_places`.
3. **IG-tag anchor** — tag "Lake Tahoe" + caption stops → stops parented under Tahoe.
4. **Cross-post** — Crater Lake in Post A, Parkway in Post B → single parent, two children.
5. **Group naming** — cluster {Parkway, Rim Village}; mock `choose_group_name` → "Crater Lake" becomes the root's `display_name`, original kept as alias.
6. **Naming fallback** — `choose_group_name` returns `None` → deterministic election picks the root; pass still completes.
7. **Order independence** — ingest B before A, run `link_places` → same tree.
8. **Idempotent** — run `link_places` twice → no changes on the second run.
9. **API** — `roots_only=true` returns only attractions; detail includes children.
10. **Backward compat** — old place JSON without new fields loads with nulls.

---

## Relationship to other docs

- [link-ingestion-plan.md](./link-ingestion-plan.md) — ingest layer; caption becomes a hint source.
- [place-enrichment-plan.md](./place-enrichment-plan.md) — base pipeline; this doc adds filter + a separate hierarchy pass.

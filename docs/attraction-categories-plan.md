# Plan: Attraction Categories & Attributes

## Goal

Every place in the library has **exactly one category** (browse type, map icon,
fact schema) and zero or more **attributes** (secondary facets). Multi-tag bags
with equal weight go away.

**Example:** Misery Ridge Trail → `category=hike`, `attributes=[viewpoint]`.

Builds on P0 #2 in [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md). Complements
[primary-place-plan.md](./primary-place-plan.md) (hierarchy/role) — categories type
the pin; roles decide root vs child.

---

## Guiding principles

| Concern | Tool | Rule |
|---------|------|------|
| Infer type from reel | LLM (existing extract call) | Emit `category` + `attributes` |
| Allowlists / merge | Deterministic code | Validate enums; resolve conflicts |
| Ambiguous category tie | Optional LLM (gated) | Pick among candidates only — never invent |
| Subcategory | — | **Out of scope** for this plan |
| Dual category on one place | — | **Not allowed** — use attributes, hierarchy, or two pins |

LLM for understanding; code for schema and identity — same line as locate / primary-place.

---

## Current state

Already in place:

1. Controlled `TAGS` vocab in `travelplanner/models.py` (multi-select).
2. Extract schema requires `tags[]` from that enum; unknown values dropped.
3. Upsert **unions** tags onto `Place.tags` across reels.
4. Web: filter roots by `tags.includes`; chips display all tags. Mobile: chips only.
5. OSM class/type used in locate scoring only — not stored as browse type.

Gaps:

| Gap | Effect |
|-----|--------|
| No primary type | Can't group map/library by “what kind of place” |
| Vague tags (`nature`, `activity`, `landmark`) | Drift and weak filters |
| Union-only merge | One noisy reel permanently dirties the place |
| No category-scoped facets | `viewpoint` competes with `hike` as a peer tag |
| P1 facts have nothing to hang on | Need a single category for hike distance vs park fees |

---

## Target model

### Category (exactly one)

Flat enum — no subcategory axis:

```text
hike | viewpoint | waterfall | beach | park | landmark |
museum | market | restaurant | cafe | bar | hotel | neighborhood
```

Drop or demote from today’s tags: `nature`, `activity` (too vague to be categories).

### Attributes (multi, category-scoped)

Small allowlists per category. Start minimal; grow deliberately.

| Category | Example attributes (MVP seed) |
|----------|-------------------------------|
| `hike` | `viewpoint`, `waterfall`, `summit`, `loop` |
| `viewpoint` | `hike` |
| `waterfall` | `hike`, `viewpoint` |
| `beach` | `hike` |
| `landmark` | `hike`, `viewpoint` |
| `park` | *(none — keep parents clean)* |
| `restaurant` / `cafe` / `bar` | *(none for MVP; cuisine later)* |
| `hotel` | *(none for MVP)* |
| `museum` / `market` / `neighborhood` | *(none for MVP)* |
| shared (any) | *(defer — e.g. `free` — until enrichment)* |

If an attribute isn’t in the allowlist for the winning category, drop it on write.

### What “multi-type” means in practice

| Real-world feeling | Model |
|--------------------|--------|
| Trail with a view | `hike` + attr `viewpoint` |
| Overlook, no trail | `viewpoint` |
| Falls as the attraction | `waterfall` (trail is child or attr later) |
| Park containing trails | `park` parent; children are `hike` / etc. |
| Museum with a café | Prefer two places, or `museum` only for MVP |

---

## Identification

### Extract (Phase 1 — extend existing OpenAI call)

Replace `tags[]` with:

```python
category: str          # required, ∈ CATEGORIES
attributes: list[str]  # optional, filtered to allowlist[category]
```

Prompt rules (keep short and hard):

1. Category = what the **pin** is (visit action / venue type).
2. Attributes = extra facets, not a second category.
3. Parents → `park` / `neighborhood`; children → activity pin type.
4. If torn between two categories, pick the more specific visit action
   (`hike` > `park` for a trail pin).
5. Never emit two categories; never invent values outside the enums.

Parse: reject unknown category (skip or leave unset per pipeline policy);
filter attributes through `ATTRIBUTES_BY_CATEGORY[category]`.

### Optional later signal (Phase 3+)

Map OSM/geocode class → category **hint** for tie-break only. LLM still owns
first-pass extract. Do not invent pins from type mapping.

---

## Conflict resolution (same place, many reels)

Category and attributes merge differently.

### Category — single winner

**Phase 1 (ship with feature):** deterministic only.

| Situation | Rule |
|-----------|------|
| No category yet | Take incoming |
| Same as existing | No-op |
| Different | Precedence + sticky rule below |

**Precedence** (higher wins when close / vague vs specific):

```text
hike, waterfall, viewpoint, beach, museum, market,
restaurant, cafe, bar, hotel
  > landmark
  > park, neighborhood
```

**Sticky rule (MVP):**

- Do not overwrite a **specific** category with a **broader** one
  (`hike` ↚ `park`, `viewpoint` ↚ `landmark`).
- Broader may be replaced by specific (`park` → `hike` when the pin is clearly
  the trail — rare; prefer hierarchy so the park stays the parent place).
- Same band, first wins until Phase 2 votes exist.

**Phase 2:** vote counting from linked posts’ extractions (or a small
per-place category tally). Winner = highest count; ties → precedence; sticky
majority (≥2 agreeing) blocks a single outlier flip.

**Phase 3 (optional):** gated LLM tie-break — only when votes+precedence still
tie (or two specific categories are close). Prompt picks an **index** among
candidates (or keep current). No OpenAI / error → keep current. Same pattern as
locate `llm_pick` (1g).

### Attributes — union + clip

1. Union incoming attributes with existing.
2. Re-filter to allowlist of the **winning** category.
3. If category changes, drop attributes that no longer apply.

No LLM for attribute conflicts in this plan.

---

## Phased build

### Phase 1 — Core model + extract + simple merge + browse

**Outcome:** Places are typed; library can filter/group by category.

1. Add `CATEGORIES`, `ATTRIBUTES_BY_CATEGORY` (replace `TAGS` cleanly — no prod
   data to migrate).
2. Extend extract schema + prompt + `ExtractedPlace` / `PlaceMention`.
3. Add `Place.category` + `Place.attributes`; write path only (no legacy-tag
   mapping / backfill).
4. Upsert merge: sticky + precedence (no votes yet); attribute union+clip;
   fold overwritten category into attributes when allowlisted.
5. API schemas + web/mobile: filter by category (incl. Uncategorized); show
   category prominently; attributes as secondary chips.
6. Unit tests: parse allowlists, merge precedence, sticky broader-vs-specific.

**Status: done** (except extract-accuracy spot check before prod — see
implementation checklist 1.10).

**Done when:** new ingests write category; UI filters by category; vague-only
tags no longer the browse axis.

### Phase 2 — Votes, sticky majority

**Outcome:** Multi-reel places stabilize without flip-flops.

1. Category votes from source posts (recompute from extractions or store tally).
2. Sticky majority (≥2) vs single outlier.
3. Tests for vote ties + precedence.

**Done when:** re-ingest of conflicting reels keeps a stable, explainable winner.

### Phase 3 — Optional polish

**Outcome:** Hard ties and weak extract get better without dual-category.

1. Gated LLM category picker on true ties (candidate list only).
2. Optional OSM→category hint as soft prior in that gate.
3. Hierarchy: prefer not electing `hike`/`viewpoint` as roots when a `park`
   parent exists (coordinate with [primary-place-plan.md](./primary-place-plan.md)
   `destination_role` — do not duplicate role logic here).
4. Light conflict surfacing later (P3 roadmap) — “reels disagree on type”.

**Done when:** ties are rare and either resolved by LLM gate or left sticky with
a clear log note.

---

## Suggested file touch list

| Area | Files (expected) |
|------|------------------|
| Vocab / model | `travelplanner/models.py`, `place_hints.py` |
| Extract | `travelplanner/extract.py` |
| Upsert / merge | `travelplanner/places/resolve.py`, `pipeline.py` |
| Mentions | `travelplanner/places/mentions.py` |
| API | `server/schemas.py`, `server/app.py` (`/api/tags` → categories) |
| Web / mobile | `PlaceLibrary`, place cards/detail, `api.ts` |
| Tests | `tests/test_extract.py`, `tests/test_places.py`, new merge tests |
| Optional Phase 3 | `travelplanner/places/llm_pick.py` pattern or sibling helper |

---

## Explicitly out of scope

- Subcategory taxonomy (`restaurant → cafe` as nested type) — use sibling
  categories or later UI grouping only.
- Dual `category` on one `Place`.
- Booking/cuisine ontologies, amenity graphs.
- P1 type-specific facts (distance, fees) — they **consume** category later;
  define schemas in place-enrichment work, not here.
- Replacing locate / geocode with category inference.

---

## Relation to roadmap

| Roadmap item | This plan |
|--------------|-----------|
| P0 #2 Attraction categories | Phases 1–2 |
| P0 #3 Hierarchy / primary place | Phase 3 item 3 + primary-place-plan |
| P1 #6 Type-specific place facts | Needs Phase 1 category first |
| P3 Conflict surfacing | Phase 3 item 4 |

Implementation checklist (all phases):
[attraction-categories-implementation.md](./attraction-categories-implementation.md).

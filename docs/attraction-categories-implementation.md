# Implementation: Attraction Categories & Attributes

Actionable build checklist for all phases. Design context:
[attraction-categories-plan.md](./attraction-categories-plan.md). Roadmap: P0 #2 in
[mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md).

**Model reminder:** exactly one `category` per place; zero or more category-scoped
`attributes`; no subcategory; no dual category. Deterministic merge first; gated
LLM only in Phase 3 for true ties.

**Deployment context (not in prod yet):** there is no production data to migrate,
so `TAGS`/`tags` is removed cleanly and there is **no backfill or legacy-tag
mapping**. The prod-readiness bar shifts to: (a) get the permanent model right the
first time (category is sticky, no cheap fix later), and (b) validate extract
accuracy on real reels before launch (see 1.10 acceptance).

---

## Phase 1 — Core model, extract, simple merge, browse

**Outcome:** New ingests write `category` + `attributes`. Library filters/groups by
category; the `tags` browse axis is gone.

### 1.1 Vocab and helpers

- [x] In `travelplanner/models.py` (or a small `travelplanner/categories.py` if
  models gets crowded):
  - [x] Add `CATEGORIES: tuple[str, ...]`  
    `hike`, `viewpoint`, `waterfall`, `beach`, `park`, `landmark`, `museum`,
    `market`, `restaurant`, `cafe`, `bar`, `hotel`, `neighborhood`
  - [x] Add `ATTRIBUTES_BY_CATEGORY: dict[str, tuple[str, ...]]`  
    Seed: `hike → viewpoint, waterfall, summit, loop`; `viewpoint → hike`;
    `waterfall → hike, viewpoint`; `beach → hike`; `landmark → hike, viewpoint`;
    others `()` for MVP
  - [x] Add `CATEGORY_PRECEDENCE: dict[str, int]` (higher = more specific)  
    Specific band (e.g. 3): hike, waterfall, viewpoint, beach, museum, market,
    restaurant, cafe, bar, hotel  
    Mid (2): landmark  
    Broad (1): park, neighborhood
  - [x] Add helpers:
    - `normalize_category(value) -> str | None` (unknown/blank → `None`)
    - `filter_attributes(category, attrs) -> tuple[str, ...]` — clip to
      `ATTRIBUTES_BY_CATEGORY[category]`; **a category can never be its own
      attribute** (drop `attr == category`); `None` category → `()`
    - `resolve_category(existing, incoming, votes=None) -> str | None` — define
      the **vote-aware signature now** even though Phase 1 ignores `votes`
      (sticky + precedence; Phase 1 rules). Avoids rewriting call sites/tests in
      Phase 2.
  - [x] Remove `TAGS` and all `tags` usage cleanly in this PR (no backfill /
    prod data to preserve — see note at top of Phase 1)

### 1.2 Domain shapes

- [x] `travelplanner/place_hints.py`
  - [x] `ExtractedPlace`: add `category: str | None`, `attributes: tuple[str, ...]`;
    remove `tags`
  - [x] `PlaceMention`: same (`category`, `attributes` instead of `tags`)
- [x] `travelplanner/models.py` — `Place`:
  - [x] Add `category: str | None = None`
  - [x] Add `attributes: tuple[str, ...] = ()`
  - [x] Remove `tags` entirely (no prod data to preserve; wipe dev tables if
    stale rows exist)

### 1.3 Extract (LLM)

- [x] `travelplanner/extract.py`
  - [x] Replace schema `tags` array with:
    - `category`: string enum from `CATEGORIES` (required)
    - `attributes`: array of strings (optional; describe as category-scoped)
  - [x] Extend `REEL_EXTRACT_PROMPT` with the five rules from the design plan
    (pin type vs facet; parents vs children; specificity; no dual category)
  - [x] Parse path (decided): `category` is **required in the JSON schema**, but
    tolerate a bad response — if missing/unknown/invalid, `normalize_category`
    returns `None` and we **keep the place** (it shows under Uncategorized). Never
    drop an otherwise-valid place just for a missing category. `None` should be
    rare since the prompt forces a choice.
  - [x] Filter `attributes` via `filter_attributes`; when `category is None`,
    attributes → `()` (no allowlist to validate against)
- [x] Update `tests/test_extract.py` for new fields / unknown drops

### 1.4 Mentions → pipeline

- [x] `travelplanner/places/mentions.py` — copy `category` / `attributes` from
  `ExtractedPlace` onto `PlaceMention`; synthesized parent mentions: default
  `category=park` (or `neighborhood` when name looks like one — keep simple:
  `park` unless clearly a neighborhood later)
- [x] Any other builders of `PlaceMention` / `ExtractedPlace` in tests/fixtures

### 1.5 Persist / load

- [x] `travelplanner/db/places_repo.py`
  - [x] Serialize `category`, `attributes`; stop reading/writing `tags`
- [x] Post JSON that embeds extracted places (store path) — ensure
  `ExtractedPlace` round-trip includes `category` / `attributes`
  (`travelplanner/store.py` / post repo serialization). This is what Phase 2
  vote recompute reads, so it must persist from day one.

### 1.6 Upsert merge (Phase 1 rules)

- [x] `travelplanner/places/resolve.py`
  - [x] `_new_place`: set `category` / `attributes` from mention
  - [x] `_merge_place` (or equivalent):
    - Category: `resolve_category(existing.category, mention.category)`  
      — empty ← incoming; same → keep; else sticky+precedence (do not overwrite
      specific with broader; broader may upgrade to specific; same band → keep
      existing)
    - **On a category change (overwrite): fold the losing category into the
      attribute union** before clipping. It survives only if it's a valid
      attribute of the winner: `viewpoint → hike` keeps `viewpoint` as an
      attribute (in hike's allowlist); `park → hike` drops `park` (not in hike's
      allowlist).
    - Attributes: `filter_attributes(winning_category, union(existing, incoming,
      {losing_category}))`
  - [x] Stop merging `tags`
- [x] `tests/test_places.py` / new `tests/test_category_merge.py`:
  - [x] specific not overwritten by park
  - [x] park upgraded by hike when that is the pin merge case you allow
  - [x] overwritten category folded into attributes when allowlisted
    (`viewpoint` → `hike` yields attribute `viewpoint`)
  - [x] overwritten category dropped when not in winner's allowlist
  - [x] attributes clipped after category change
  - [x] a category never appears as its own attribute
  - [x] unknown attributes dropped

### 1.7 API

- [x] `server/schemas.py` — `Place` / extracted-place schemas: `category`,
  `attributes`; remove `tags`
- [x] `server/app.py`
  - [x] Replace `GET /api/tags` with `GET /api/categories` (return `CATEGORIES`)
  - [ ] Optional `GET /api/categories/{category}/attributes` or embed allowlists
    in categories response — only if UI needs it
  - [x] `list_places`: filter query param `tag=` → `category=` (exact match on
    `Place.category`). Reserve a sentinel value `uncategorized` that matches
    `category is None`; no `category=` param → return all.
- [x] `travelplanner/places/store.py` / `library.py` — `tag=` filter → `category=`;
  support the `uncategorized` sentinel (matches `None`)
- [x] Update `tests/test_api.py` (incl. `uncategorized` filter returns `None`-category places)

### 1.8 Frontend

- [x] `frontend/src/api.ts` — types + `fetchCategories`; place filter `category`
- [x] `PlaceLibrary.tsx` — category filter (not tag-contains). Filter options:
  **"All" (default, no param) + one chip per category + "Uncategorized"**
  (`category=uncategorized`). Show category on cards.
- [x] `PlaceCard` / `PlaceDetail` / `PlaceMap` popup — primary category label;
  attributes as secondary chips. `None`-category cards render an
  "Uncategorized" label + a neutral/fallback map icon.
- [x] `PostDetail` / any extracted-place display — category + attributes
- [x] `postDisplayUtils` — stop treating place tags as post chips source (use
  category or drop)

### 1.9 Mobile

- [x] `mobile/src/api.ts` — same type/API changes
- [x] Places tab filter by category — same **All / categories / Uncategorized** set
- [x] `PlaceCard` / place detail — category + attribute chips; Uncategorized fallback

### 1.10 Phase 1 acceptance

- [x] `pytest` green (extract, merge, API, places)
- [ ] Ingest a reel locally or via CLI → place has `category` set
- [ ] Web + mobile filter by category works; **"All" and "Uncategorized" both work**
- [ ] A place that extracts with no valid category is kept and shows under
  Uncategorized (not dropped)
  - [ ] **Extract-accuracy spot check (pre-prod gate):** run the new extraction over
  ~30–50 real reels and eyeball `category` correctness. Because category is sticky
  and there is no backfill, a wrong first extraction persists. If accuracy is weak,
  soften stickiness (allow re-extract to overwrite until a place has ≥2 source
  posts) or add a lightweight admin "recompute category" action before prod.
  - [x] Synthetic worldwide suite (`scripts/validate_categories.py`): **40/40 PASS**
    (2026-07-14, gpt-4o-mini) with category + attribute assertions. Allowlists
    expanded (`viewpoint`/`waterfall`/`beach`/`landmark` facets); extract prompt
    now lists allowlists + waterfall hard-rule. ~20/40 cases emit attributes.
    Artifact: [category-extract-validation.json](./category-extract-validation.json).
    Real-reel spot check still pending.

**Phase 1 done when:** browse axis is category; nothing depends on `tags`; extract
accuracy validated on real reels.

---

## Phase 2 — Votes, sticky majority

**Outcome:** Multi-reel conflicts stabilize (no flip-flop). Deferrable — Phase 1
can ship to prod first; recompute-from-posts works on live data whenever enabled.

### 2.1 Vote source

Pick one approach (prefer A for less schema churn):

- [ ] **A (recommended):** Recompute from `Place.source_post_ids` → load posts →
  match `extracted_places` by name/alias → collect `category` votes. Works for all
  data because posts persist `category` on `extracted_places` from Phase 1 (1.5) —
  no legacy path needed.
- [ ] **B:** Persist `category_votes: dict[str, int]` on `Place` updated at upsert  
  (faster reads; must stay consistent on merge)

### 2.2 Merge with votes

- [ ] Extend `resolve_category(existing, incoming, votes=...)` (signature already
  defined in 1.1):
  1. Tally votes (including incoming mention as +1 for its category)
  2. Winner = max count
  3. Ties → higher `CATEGORY_PRECEDENCE`
  4. Sticky majority: if existing category has count ≥ 2 and incoming is a
     different category with count 1 after tally, keep existing
  5. Still never replace specific with broader solely due to one broad vote
  6. Losing-category → attribute fold (from 1.6) still applies on any change
- [ ] Wire into `resolve.py` upsert path
- [ ] Tests: tie → precedence; 2× hike vs 1× viewpoint → hike; outlier park
  cannot flip hike

### 2.3 API / admin (optional but useful)

- [ ] Include `category` in admin place tooling if any
- [ ] No conflict UI yet (Phase 3)

### 2.4 Phase 2 acceptance

- [ ] Unit tests for vote + sticky majority
- [ ] Re-ingest conflicting fixture posts → stable winner

**Phase 2 done when:** re-processing multi-source places does not flip-flop.

---

## Phase 3 — Optional polish (gated LLM, OSM hint, hierarchy, surfacing)

**Outcome:** Rare hard ties resolved; hierarchy respects typed pins; optional
trust UX later.

### 3.1 Gated LLM category picker

- [ ] Add `travelplanner/places/llm_category.py` (mirror `llm_pick.py` style):
  - Input: place display name, short details/tips, candidate categories (2+)
  - Output: chosen index or “keep current”; never invent outside list
  - Skip if no `OPENAI_API_KEY`; on error → keep current
- [ ] Call **only when** after votes+precedence the top two are tied (same count
  and same precedence band) **or** two specific-band categories are within one
  vote
- [ ] Log note on place merge path (structured log is enough for MVP)
- [ ] Tests with mocked OpenAI: pick / reject / skip

### 3.2 OSM category hint (soft)

- [ ] Small map `osm_class`/`osm_type` → suggested `CATEGORIES` value (best-effort)
- [ ] Use only inside the Phase 3 gate (e.g. bias prompt or break tie toward hint)
- [ ] Never invent lat/lon; never override a clear vote majority
- [ ] Unit tests for a handful of OSM → category rows

### 3.3 Hierarchy coordination

- [ ] Do **not** re-implement `destination_role` here — track under
  [primary-place-plan.md](./primary-place-plan.md)
- [ ] Light touch only if needed: when electing cluster root, prefer places with
  `category` in `{park, neighborhood, landmark}` over `{hike, viewpoint,
  waterfall}` when scores otherwise equal
- [ ] Test: hike + park in cluster → park root when categories set

### 3.4 Conflict surfacing (roadmap P3 — can defer)

- [ ] API field e.g. `category_conflict: bool` or `category_votes` when top-2
  within one vote
- [ ] Admin or place detail copy: “Reels disagree: hike vs viewpoint”
- [ ] No user-facing resolution UI required in this phase

### 3.5 Phase 3 acceptance

- [ ] LLM gate covered by unit tests; no call on clear majority
- [ ] OSM hint never wins alone against sticky majority
- [ ] Hierarchy smoke test with categories
- [ ] (Optional) conflict flag visible in admin/detail

**Phase 3 done when:** ties are handled or left sticky with a log; no dual
category introduced.

---

## Cross-cutting checklist

| Item | Phase |
|------|-------|
| No subcategory field | all |
| Attributes always clipped to winning category | 1+ |
| A category is never its own attribute | 1 |
| Overwritten category folded into attributes (clip-gated) | 1 |
| `None` category kept + shown as Uncategorized (never dropped) | 1 |
| `tags` removed cleanly — no legacy mapping / backfill (not prod) | 1 |
| Extract accuracy validated on real reels before prod | 1 — pending |
| Frontend + mobile both updated | 1 |
| Locate / geocode unchanged | — |
| P1 type-specific facts | out of scope (consumes category later) |

---

## Suggested PR split

| PR | Scope |
|----|--------|
| **PR1** | Phase 1.1–1.9 (backend + API + web + mobile) — landed as one cutover |
| **PR2** | Phase 2 (votes) — deferrable after prod launch |
| **PR3** | Phase 3 (optional; can ship 3.1 alone, then 3.2–3.4) |

---

## Progress log

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Core | Done | Category + attributes replace tags end-to-end (extract, merge, API, web, mobile). Dev tables wiped. Extract-accuracy spot check still pending before prod. |
| 2 Votes | Not started | |
| 3 Polish | Not started | |

# Pipeline framework design

**Source of truth** for how ingest, Timeline, and future sources are structured.
Every agent working on `travelplanner/flow/`, `travelplanner/steps/`, personas,
visits, or place resolution must follow this document. If code and this doc
disagree, fix the code or update this doc in the same change — do not leave
them diverged.

Related roadmap: [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md).
Implementation plan: Cursor plan `composable_step_pipelines`.
Known deviations in today's code, to be closed by this design (deferred, do not
patch piecemeal): [place-logic-consistency.md](./place-logic-consistency.md).

---

## One-sentence summary

Pipelines are ordered compositions of steps. Steps come from a shared library
(generic when possible, platform-specific when the API or media requires it).
A small in-house runner supplies logging, retries, and failure stages.
Persona-specific prep and post-work stay **outside** the pipeline.

---

## Design rules (non-negotiable)

1. **Pipelines compose; steps do work.** A pipeline is an ordered list of steps
   plus config. No business branching inside a pipeline definition beyond
   choosing which steps to run.
2. **Generic by default.** Prefer a cross-platform step. Add a platform-specific
   step only when the platform’s API or media format forces it (e.g. detecting
   Instagram reel vs image).
3. **Personas stay outside.** Ingest-only and Timeline-only logic (URL discovery,
   home/chain gates, “link post” vs “record visit”) lives in the persona layer,
   not as `if timeline:` branches inside shared steps.
4. **No field carries two intents.** Every model / job / failure field means
   exactly one thing. Do not overload `source`, `status`, `notes`, or job
   identity fields. See [Single-intent fields](#single-intent-fields).
5. **Policy at the edge; outcomes in the middle.** Shared steps return explicit
   outcomes (`resolved`, `low_confidence`, `unresolved`, `rejected`). The
   caller (pipeline tail or persona) decides whether that becomes a place, a
   candidate, a skip counter, or a review queue item. No behavior flags like
   `record_candidates=` on shared steps.
6. **Contextual names.** Use domain terms (`place_name`, `post_url`,
   `IngestContext`, `VisitCluster`). Avoid generic names (`Context`, `WorkItem`,
   `types.py`, `Handler`, `Processor`).
7. **Server stays thin.** `server/` is JWT, validation, and job tracking only.
   Pipeline and persona logic belong in `travelplanner/`.
8. **Keep the framework small.** Plain functions + dataclasses + a runner.
   No plugin base classes, middleware stacks, or DAG engines unless this doc
   is updated first.
9. **New product behavior is feature-flagged.** Use `FeatureFlag.get/set` in
   `travelplanner/feature_flag.py` (default off). Do not add ad-hoc env checks
   for product features. See [Feature flags](#feature-flags).

---

## Feature flags

Module: [`travelplanner/feature_flag.py`](../travelplanner/feature_flag.py). Also documented
in [AGENTS.md](../AGENTS.md#feature-flags).

| Do | Don't |
|----|--------|
| Add a key to `FeatureFlag._flags` (default off) | Gate on a one-off `os.getenv("MY_THING")` |
| Call `FeatureFlag.get("my_flag")` | Invent a second flag system in server/frontend |
| Flip with `FeatureFlag.set(...)` in tests/ops | Turn risky paths on by default in prod |
| Ship incomplete steps (e.g. OCR) behind a flag | |

Examples already in this design: `extract_image_text`, `extract_video_analysis`,
and `extract_reel_frame_text` stay flagged off until validated; place-facts
enrichment uses `place_facts`. Post topic classification uses `content_categories`
(currently on in this environment): ingest stamps `SavedPost.content_category`
then dispatches close by category — **place** pipeline for travel (and unset),
**movie** pipeline for movies (extract films and TV series, then TMDB/OMDb
catalog facts). Fashion / hairstyle / food / other skip close until they have
their own pipelines. A shared Movie table is not live; catalog facts persist on
`SavedPost.resolved_movies`.

When adding a pipeline step that is not ready for all environments, register a
flag and keep the composition able to skip or no-op when the flag is off — do
not leave half-wired behavior always on.

---

## Layers

```text
Entry (API / CLI / mobile)
  → Persona preprocessing   (discover URLs, parse Timeline, apply gates)
  → Pipeline runner         (logging, retries, failure stage)
  → Pipeline                (composition of steps by platform + resource type)
  → Step library            (generic + platform-specific)
  → Persona postprocessing  (link user library, create visit / queue review)
  → Persistence             (db / store)
```

| Layer | Owns | Must not |
|-------|------|----------|
| **Persona** | Discovery, Timeline gates, “what to do with resolved places” | Geocode, dedupe, LLM extract of places |
| **Pipeline** | Which steps run for `(platform, resource_type)` and close for `content_category` | Ad-hoc business rules, visit creation |
| **Step** | One transformation or I/O | Decide product policy for weak pins |
| **Runner** | Logging, retries, failure recording | Domain logic |
| **clients/** | HTTP / API wrappers | Import steps, pipelines, or personas |
| **server/** | HTTP + jobs | Place resolve, extract, Timeline gates |

---

## Resource types

Pipelines are keyed by **platform + resource type**, not by “post” as a
catch-all. After classify, **close** is keyed by `content_category`.

| Platform | Resource types |
|----------|----------------|
| Instagram | `reel`, `video`, `image`, `carousel` |
| Google Timeline | `timeline_visit` |

Resource type is often known only **after** fetch. Dispatch is:

1. **Head (by platform):** seed post (platform + shortcode + resource type) → fetch media.
2. **Tail (by platform + resource type):** transcript and/or image text.
3. **Classify (flagged):** `classify_content` stamps `SavedPost.content_category`. No-op when `content_categories` is off.
4. **Close (by content category):**
   - `travel` or unset (classify skipped / failed) → **place pipeline:** extract places → locate → dedupe → upsert.
   - `movies` → **movie pipeline:** extract films and TV series onto `SavedPost.extracted_movies` (`kind` is `movie` or `tv`), then `resolve_movies` (TMDB movie or TV identity + details, OMDb IMDb/RT scores, optional review summary). Snapshot stored on `SavedPost.resolved_movies`. No geocode. Shared Movie upsert is not wired yet.
   - `fashion` / `hairstyle` / `food` / `other` → skip close (save the post only).

Timeline has no fetch head; it starts at locate (coordinates) with optional
nearby POI fallback, then the place close steps.

---

## Framework contract

Package: `travelplanner/flow/` (name `pipeline` is reserved for the old
orchestrator during rewrite; prefer `flow` for the framework).

### Step descriptor

Every step is a plain function wrapped with config the runner understands:

```python
@dataclass(frozen=True)
class Step:
  name: str  # also the failure stage recorded on error
  run: Callable[[IngestContext], IngestContext]
  retry_attempts: int = 0
  retry_backoff_seconds: float = 0.0
  retry_on: tuple[type[Exception], ...] = ()
  writes_data: bool = False
  idempotency_key: Callable[[IngestContext], str] | None = None
```

Rules:

- **Transient retries belong here**, not scattered in clients (consolidate
  OpenAI / Supadata / Overpass ad-hoc sleeps into step or client policy that
  the runner can reason about).
- A step with `writes_data=True` **must** declare `idempotency_key` if
  `retry_attempts > 0`. The runner fails at import/registration time otherwise.
  This prevents duplicate visits on a retried Timeline batch.
- Step Functions Map workers still swallow top-level exceptions so job status
  stays user-visible; they do not own per-step retry policy.

### Context and outcomes

- Use a domain-named context (`IngestContext` for social ingest;
  Timeline may use a parallel context or a shared base — do not invent
  `StepContext` / `WorkItem`).
- Locate / dedupe steps return an explicit **outcome type**, not a nullable
  place plus side effects. Example meanings:
  - `resolved` — pin trusted enough to upsert as a Place
  - `low_confidence` — pin weak; ingest may record a PlaceCandidate
  - `unresolved` — no usable location
  - `rejected` — found something but it is not a travel place (with reason)

Personas / pipeline tails map outcomes to product behavior. Shared steps never
write Visit rows.

### Pipeline result

Return a structured result with counters and identity fields. Do **not** pack
stats into a string and store them in `post_id` or any other identity field.

---

## Step library layout

```text
travelplanner/steps/
  classify_content.py        # generic — post topic; flag content_categories
  extract_places.py          # generic — LLM from ContentBundle
  extract_movies.py          # generic — film and TV titles from ContentBundle
  resolve_movies.py          # generic — TMDB movie/TV resolve + OMDb ratings
  locate_by_name.py          # generic
  locate_by_coordinates.py   # generic
  nearby_pois.py             # generic
  dedupe_resolve.py          # generic
  upsert_place.py            # generic — keyed, idempotent
  instagram/
    seed_instagram_post.py
    fetch_media.py
    fetch_transcript.py
    analyze_video.py         # Supadata multimodal; flag extract_video_analysis
    extract_reel_frame_text.py  # frame OCR; flag extract_reel_frame_text
    extract_image_text.py    # OCR for image/carousel; flag extract_image_text
```

### ContentBundle / ContentSnippet

Media-agnostic input to `extract_places` and `extract_movies`: a list of
`(source, text)` snippets (caption, hashtags, comments, location tag, transcript,
video analysis, image text, optional prior summary). `ContentBundle` is a
convenience shape that flattens into snippets. Prefer one extractor used by
every platform and resource type. Close dispatch picks **which** extractor
runs; it does not change the bundle.

### Adding a step

1. One file, one responsibility, contextual name.
2. Declare retry / write / idempotency metadata.
3. Prefer returning data on the context or an outcome object over mutating
   globals.
4. Do not import from `server/` or personas.
5. Add a unit test that does not require live network (mock clients).

### Adding a platform

1. Add platform-specific fetch / seed steps under `steps/<platform>/`.
2. Register pipeline compositions for each resource type.
3. Reuse generic extract / locate / dedupe / upsert unchanged.
4. Persona discovers URLs or other work items; it does not reimplement place
   logic.

---

## Persona layer

| Persona | Preprocessing | Pipeline | Postprocessing |
|---------|---------------|----------|----------------|
| Link / share / CLI ingest | Collect post URLs | Instagram (by resource type) | Link UserPosts / UserPlaces |
| Instagram profile import | List recent post URLs | **Same** Instagram pipelines | Same + optional visit recording |
| Timeline import | Parse export, cluster, home / routine / chain / semantic gates | `timeline_visit` | Create visit or queue review |

**Do not** force Timeline through Instagram fetch/extract. Timeline shares
**generic place steps only**.

**Do not** put `create_visit` or Timeline skip gates inside generic steps.

---

## Single-intent fields

When adding or changing a field, ask: “Does this name still mean one thing if
we add a new feature next month?” If not, split it.

| Wrong (overloaded) | Right |
|--------------------|--------|
| `Visit.source = timeline_review` (provenance + review state) | `source=timeline` + `status=needs_review` |
| Review suggestion stuffed into `notes` prose | `review_suggestion`, `review_reason`, `travel_kind` + free-text `notes` |
| Job `post_id` holding `imported=…;home=…` | Typed stats object on the job item |
| Job `post_url = timeline-batch:0` | Item reference with its own type; job `items` not fake `links` |
| `IngestFailure.status` and `stage` both meaning “unsupported” | `status` = outcome; `stage` = step name |
| `IngestResult.status` mixing saved/linked with error/unsupported | `outcome` + optional `reason` |
| `link_user_place(source="manual")` for Timeline places | Real provenance |

**Accepted exception:** `post_id` as `platform:native_id` is a composite
primary key encoding, not two product meanings. Keep `parse_post_id` /
`make_post_id`.

**Visit model (target):**

- `source`: `manual | instagram | timeline` — set once, never rewritten to mean
  review state.
- `status`: at least `confirmed | needs_review` (room for want-to-go / skip
  later without new fake sources).
- Structured review fields when `status=needs_review`.

---

## What agents must not do

- Reimplement locate / upsert inside Timeline or a new source “for speed.”
- Add `if source == "timeline"` inside generic place steps.
- Put product policy (`mark_visited`, skip home radius) inside the runner.
- Pack heterogeneous data into strings on identity fields for “schema
  convenience.”
- Introduce Step base classes, decorators that hide I/O, or a second parallel
  “v2 pipeline” package.
- Change Timeline skip *policy* under the guise of a structural refactor
  without updating the regression fixture and this doc.
- Leave `server/workers.py` as the home for visit-marking or place business
  logic.

---

## Regression and safety

Structural rewrites must keep product decisions stable unless the change is
explicitly product-scoped:

- Timeline gates: [`timeline-backfill-skip-list.json`](./timeline-backfill-skip-list.json)
  (and companion markdown) — same clusters → same keep / skip / review bucket.
- Extract: [`extract-validation.json`](./extract-validation.json) via
  `scripts/validate_extract.py`.

Before merging pipeline/step changes, run the relevant fixture and unit tests
under `tests/` for workers, extract, timeline import, and API.

---

## Checklist for a change

Copy this into the PR or agent summary when touching flow/steps/personas:

- [ ] Change belongs in the correct layer (persona vs pipeline vs step vs runner).
- [ ] New logic is a step or persona helper — not an `if` inside a shared step.
- [ ] Generic steps stay free of platform and persona branches.
- [ ] Write steps that retry declare an idempotency key.
- [ ] No new overloaded fields; splits follow the table above.
- [ ] Outcomes are explicit; policy stays at the edge.
- [ ] Names are contextual.
- [ ] New product behavior is behind a registered feature flag (default off), or is a pure bugfix / no-behavior refactor.
- [ ] Regression fixture still passes (or this doc + fixture updated together).
- [ ] `server/` only adapted, not given new business logic.

---

## Package map (target)

```text
travelplanner/
  flow/                 # runner, Step, pipeline registry
    pipelines/          # compositions only
  steps/                # step library (generic + per-platform)
  personas/             # preprocess / postprocess per product flow
  places/               # geocode / identity internals used by steps
  clients/              # external APIs
  db/                   # persistence
  models.py             # domain entities (single-intent fields)
```

During rewrite, delete superseded homes rather than wrapping them forever:
old `sources/` fetchers, monolithic `pipeline.py` orchestrator, and
Timeline-local resolve that duplicates place steps.

---

## Document maintenance

- Update this file in the same PR as any design-affecting change.
- Point agents here from [AGENTS.md](../AGENTS.md) and the Cursor rule
  `.cursor/rules/pipeline-framework.mdc`.
- Do not fork a second “architecture notes” doc; extend this one.

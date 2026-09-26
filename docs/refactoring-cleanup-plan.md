# Behavior-Preserving Refactoring Cleanup Plan

This document records cleanup opportunities that should improve maintainability
without changing current product behavior. The work should be delivered in small,
independently verifiable pull requests.

## Current verification baseline

At the time of this review:

- Python: `385` tests pass with `pytest -q`.
- Frontend: `npm run build` succeeds.
- Mobile: `npm run typecheck` succeeds.
- The Python suite emits `2,493` warnings, mostly a Botocore
  `datetime.utcnow()` deprecation warning.
- The frontend build reports a JavaScript chunk of approximately `778 KB` before
  gzip compression.

Every cleanup should preserve this baseline. Pipeline changes must continue to
follow [pipeline-framework-design.md](pipeline-framework-design.md).

## Phase 1: lowest-risk cleanup

### 1. Correct stale documentation and comments

Update comments that no longer describe the implementation:

- `travelplanner/content_categories.py` says that `food` has no close pipeline,
  but `food` is routed to the recipe pipeline.
- `travelplanner/feature_flag.py` describes category dispatch as place versus
  movie, omitting the recipe pipeline.

This should be an isolated documentation-only commit.

### 2. Add characterization tests for dispatch fallbacks

Before restructuring dispatch, explicitly preserve these existing behaviors:

- `travel`, and an unset or unrecognized category, use the place close pipeline.
- `movies` uses the movie close pipeline.
- `food` uses the recipe close pipeline.
- `fashion`, `hairstyle`, and `other` skip close processing but still save and
  link the post successfully.
- A classification failure does not fail ingest; it currently falls back to
  place processing.

The current unit tests cover most direct category mappings, but the save-only
path should also have an end-to-end ingest characterization test.

### 3. Centralize `ContentBundle` construction

The same `IngestContext` to `ContentBundle` conversion is repeated in:

- `travelplanner/steps/classify_content.py`
- `travelplanner/steps/extract_places.py`
- `travelplanner/steps/extract_movies.py`
- `travelplanner/steps/extract_recipe.py`

Introduce one small helper, such as `content_bundle_from_context(ctx)`, and use it
from these steps. The helper should cache the bundle on the context exactly as
the steps do today. This prevents a newly added content source from being
included in one category pipeline but omitted from another.

### 4. Move re-extraction out of live ingest orchestration

`travelplanner/personas/link_ingest.py` currently owns both live link ingest and
maintenance/backfill operations. Move `reextract_post` and
`reextract_all_posts` to a focused module such as
`travelplanner/personas/reextract.py`.

Keep compatibility re-exports during the move so the CLI and existing callers
continue to work unchanged.

### 5. Use the new persona modules directly inside the repository

`travelplanner/pipeline.py` is now a compatibility facade over
`travelplanner.personas.link_ingest`, but internal callers such as `cli.py` and
`server/app.py` still import through it.

Change internal imports to the owning persona modules. Retain
`travelplanner/pipeline.py` temporarily for compatibility with any callers
outside this repository.

### 6. Add conservative formatting and lint checks

Configure a Python formatter/linter, preferably Ruff, for:

- consistent formatting;
- import ordering;
- unused imports;
- basic correctness checks.

Adopt it conservatively and keep the initial formatting-only change separate
from logic changes. Also add explicit frontend and mobile type-check scripts to
the normal verification workflow.

Warning filtering should be narrow. Suppress known third-party warnings by
module and message rather than hiding all deprecation warnings.

## Phase 2: module-boundary cleanup

### 1. Correct the Instagram source/step dependency

`travelplanner/sources/instagram.py` imports media payload helpers from
`travelplanner/steps/instagram/media.py`. This contradicts the documented rule
that source fetchers must not depend on pipeline steps.

Move raw Mindcase/Instagram payload normalization to a neutral module that both
the legacy source and the Instagram steps may use. Do not duplicate the parser.
Migrate tests away from importing the legacy source's private
`_trim_post_info` alias.

### 2. Centralize Instagram post construction

The legacy Instagram source and `fetch_media` step both:

- normalize the raw response;
- construct a `SavedPost`;
- generate the fetched-at timestamp.

Extract the common mapping into a plain function. Keep fetching and pipeline
orchestration outside that mapper.

### 3. Clarify pipeline failure ownership

`PipelineResult` carries `failed_step` and `error_message`, while both pipeline
contexts also carry `error_stage` and `error_message`. This duplicates failure
state and creates two possible sources of truth.

After characterization tests confirm no external dependency on context error
fields, make `PipelineResult` the sole failure result. Do not combine this with
changes to retries or error semantics.

### 4. Audit compatibility aliases

Inventory and either retain intentionally, deprecate, or remove aliases such as:

- `travelplanner.pipeline` re-exports;
- `jobs_repo.update_link`;
- `settings.timeline_import_max_places`;
- `timeline.llm_gate.needs_llm_travel_gate`;
- reel-specific aliases in `travelplanner.extract`;
- old place-facts wrapper names.

Do not remove a compatibility name merely because it has no in-repository
caller. First decide whether the Python package has external consumers.

## Phase 3: server organization

`server/app.py` is approximately `965` lines and `server/schemas.py` is
approximately `580` lines. Split them along existing product boundaries:

```text
server/
  app.py                 # FastAPI construction and router registration
  routers/
    ingest.py
    jobs.py
    posts.py
    places.py
    visits.py
    admin.py
  schemas/
    ingest.py
    jobs.py
    posts.py
    places.py
    visits.py
    admin.py
```

This is a structural change only. Preserve paths, request and response schemas,
dependency injection, status codes, and error bodies. Snapshotting the OpenAPI
document before and after the move would provide a useful compatibility check.

## Phase 4: frontend and mobile sharing

### 1. Share Timeline parsing

`frontend/src/timelineParse.ts` and `mobile/src/timelineParse.ts` are currently
identical, each about `483` lines. Move the pure parsing implementation into a
shared TypeScript package or generated shared source and import it from both
clients.

Mobile changes must follow `mobile/AGENTS.md` and the exact Expo version used by
the project.

### 2. Share or generate API contracts

`frontend/src/api.ts` and `mobile/src/api.ts` duplicate most API interfaces and
request functions. Prefer generating shared TypeScript response/request types
from the FastAPI OpenAPI schema. Keep platform-specific transport code separate
where browser and React Native file uploads differ.

### 3. Split oversized UI modules

Several components are between roughly `700` and `1,000` lines. Divide them by
existing responsibilities, for example:

- data/view-model hooks;
- presentation components;
- modal or sheet content;
- pure formatting helpers.

Avoid introducing a generic component framework solely to reduce line counts.

### 4. Address bundle size separately

The frontend build reports a chunk larger than `500 KB`. After structural
cleanup, evaluate route-level lazy loading and carefully selected manual chunks.
Treat this as a performance task with before/after measurements, not as part of
the initial refactor.

## Behavior-sensitive items to defer

### Duplicate re-extraction call

`reextract_post` calls `fetch_places_from_content` and, when that returns no
places, calls `fetch_places_from_reel`. Today `ReelBundle` is an alias for
`ContentBundle`, and `fetch_places_from_reel` is an alias for
`fetch_places_from_content`, so this appears to repeat the same LLM operation.

Removing the second call could still change behavior because it currently acts
as an accidental second attempt and could return a different LLM response. Make
that a deliberate product/reliability decision rather than including it in a
behavior-preserving cleanup.

### Unknown-category fallback

Unknown category values normalize to unset, and unset currently selects the
place pipeline. Do not change this while reorganizing the category registry.
Changing it to the save-only path is a separate product decision.

### Retry and idempotency behavior

Do not alter step retry counts, retryable exception types, backoff timing, or
idempotency declarations during cleanup. Those changes affect runtime behavior
and should be reviewed independently.

## Recommended pull-request sequence

1. Documentation corrections and dispatch characterization tests.
2. Shared content-bundle helper and formatting normalization.
3. Re-extraction module split and direct internal persona imports.
4. Instagram payload normalization boundary cleanup.
5. Pipeline error-state cleanup.
6. FastAPI router/schema split.
7. Shared Timeline parser and generated/shared API contracts.

For each pull request, run at minimum:

```bash
pytest -q
cd frontend && npm run build
cd mobile && npm run typecheck
```

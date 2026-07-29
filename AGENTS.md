# Social Media Travel Planner

Ingest social media travel inspiration and build itineraries.

## Pipeline design (agents)

**Source of truth:** [docs/pipeline-framework-design.md](docs/pipeline-framework-design.md).

When changing ingest, Timeline, place resolution, visits, jobs, or workers, follow that
doc. Pipelines compose reusable steps; persona-specific prep/post stays outside
pipelines; no field may carry two intents. Cursor rule:
`.cursor/rules/pipeline-framework.mdc`.

Target layout:

```
travelplanner/
  flow/       runner + pipeline compositions
  steps/      step library (generic + per-platform)
  personas/   discover / gates / link-or-visit (outside pipelines)
  places/     geocode / identity internals used by steps
  clients/    external API wrappers
  features.py product feature flags (FEATURE_* env, default off)
  db/         persistence
```

## Layout (current)

```
travelplanner/ core library — no CLI, no web code
  flow/    Step runner + pipeline compositions by platform/resource type
  steps/   generic + Instagram steps (extract, locate, dedupe, upsert, fetch…)
  personas/ link ingest, profile import, Timeline gates + visit recording
  clients/ reusable API clients (EnsembleData, Supadata, geocoder)
  sources/ thin shims over steps (legacy PLATFORM_FETCHERS / tests)
  db/      DynamoDB client, table helpers, repos (Posts, Places, User*, Visits)
  models.py SavedPost, Place, Visit — domain entities (single-intent fields)
  place_hints.py internal pipeline shapes (PlatformPlace, ExtractedPlace, PlaceMention)
  links.py URL detection and post ID extraction
  pipeline.py compatibility re-export of personas.link_ingest
  store.py thin facade over Posts repo
  library.py user-scoped post/place listing
  extract.py ContentBundle LLM extract (shared across media kinds)
  places/ package — identity, geocode, resolve/upsert used by steps
  visits.py personal visit history against places (per user_id)
  timeline/ parse, semantic gates, trips, chains (persona uses these)
server/ FastAPI backend — thin adapter over travelplanner + Clerk JWT
frontend/ React + Vite UI — talks only to the API (+ Clerk)
mobile/ Expo (React Native) app — same API + Clerk; share-to-app for Instagram reels
infra/ Python CDK — TravelPlanner-dev / TravelPlanner-prod (DynamoDB, Lambda Function URL, SFN)
cli.py batch link ingestion + place reprocessing entry point
tests/
```

Layering: `cli.py` and `server/` call `personas` (via `pipeline` shim) and library/store
helpers. The frontend and mobile apps only know the JSON API. Persistence is DynamoDB via CDK stacks
(`docs/aws-dynamodb.md`). Table names are `{LogicalName}-{stage}-{region}`. Ingest uses
Step Functions + Lambda (`docs/serverless-deploy.md`). Local UI testing points at the
deployed **TravelPlanner-dev** API.

## Module rules

- **clients** — shared API client factories. No imports from sources, steps, or personas.
- **steps** — one transformation each. Prefer generic steps; platform steps only when the API/media requires it. Return explicit outcomes; no visit creation.
- **flow** — compositions + runner only (logging, retries, failure stage). No product policy.
- **personas** — URL discovery, Timeline gates, link-post vs create-visit. Outside pipelines.
- **sources** — thin legacy shims; new fetch logic belongs in `steps/<platform>/`.
- **pipeline** — compatibility re-export of `personas.link_ingest` during transition.
- **store / db** — persistence boundary. Shared Posts/Places; per-user membership and visits.
- **places** — geocode / identity / dedupe used by steps (`places/identity.py` is the shared helper home).
- **features** — see [Feature flags](#feature-flags) below.
- **server** — HTTP adapter only. JWT auth + validation and job tracking. No business logic beyond that.

## Feature flags

Config-gated product behavior lives in [`travelplanner/features.py`](travelplanner/features.py).
Agents must use this module — do not invent ad-hoc `os.getenv("SOME_FLAG")` checks for product features.

**Rules:**

- Register every new product capability in `_FLAGS` with a module-level constant
  (e.g. `PLACE_FACTS = "place_facts"`). Default is **off**.
- Gate call sites with `enabled(FLAG_CONSTANT)` (or `require(FLAG)` when the path
  must fail closed if disabled). Prefer the constant over a raw string so typos
  fail at import / `KeyError`.
- Env var name is always `FEATURE_<KEY>` in uppercase (e.g. `FEATURE_PLACE_FACTS=true`).
  Accepted values: `1` / `true` / `yes` / `on` and `0` / `false` / `no` / `off`.
- Use `legacy_env` only when renaming an older env var; do not add new bare env
  names for product features.
- Incomplete steps or risky paths (OCR, experimental locate, etc.) ship behind a
  flag until validated — wire the step, leave the flag off.
- Wire flags through CDK / Lambda env when the feature must be toggleable in
  deployed stages; document the var in `.env.example` when local override matters.
- Tests: assert both on and off paths when behavior differs; unknown keys must
  raise `KeyError`.

```python
from travelplanner.features import enabled, PLACE_FACTS

if enabled(PLACE_FACTS):
  ...
```

## Implementation

Keep it **simple, modular, and extendable**. Do not add layers you don't need yet.

- One clear responsibility per file.
- Add fields to existing dataclasses before creating new abstractions.
- Prefer plain functions and dataclasses over factories, base classes, or plugin systems.
- **Names must be contextual** — use domain terms (`place_name`, `post_url`, `day_number`) instead of generic ones (`id`, `value`, `parts`).
- **New product behavior** ships behind a registered feature flag (default off) unless it is a pure bugfix or refactor with no user-visible change.

## Run

```bash
# Web UI against TravelPlanner-dev
cd frontend
cp .env.example .env.local   # VITE_API_BASE_URL + VITE_CLERK_PUBLISHABLE_KEY
npm install && npm run dev

# Mobile (Expo) against TravelPlanner-dev
cd mobile
cp .env.example .env         # EXPO_PUBLIC_API_BASE_URL + EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
npm install && npx expo start
# Share-to-app requires a custom dev client — see mobile/README.md

# Unit tests (moto)
pip install -e ".[dev]"
pytest

# Optional CLI against AWS (needs creds + DYNAMODB_STAGE=dev)
python3 cli.py links.txt --user-id <clerk-user-id>
```

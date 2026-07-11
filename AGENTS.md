# Social Media Travel Planner

Ingest social media travel inspiration and build itineraries.

## Layout

```
travelplanner/ core library — no CLI, no web code
  clients/ reusable API clients (EnsembleData, Supadata, geocoder)
  sources/ platform-specific fetchers (one file per platform)
  db/      DynamoDB client, table bootstrap, repos (Posts, Places, User*, Visits)
  models.py SavedPost, Place, Visit, TAGS — domain entities
  place_hints.py internal pipeline shapes (PlatformPlace, ExtractedPlace, PlaceMention)
  links.py URL detection and post ID extraction
  pipeline.py orchestrator: route links → fetchers → place processing → store + user link
  store.py thin facade over Posts repo
  library.py user-scoped post/place listing
  extract.py Supadata extract wrapper (shared: IG now, YT later)
  places.py shared place pipeline: normalize → locate → resolve/upsert → load/list
  visits.py personal visit history against places (per user_id)
server/ FastAPI backend — thin adapter over travelplanner + Clerk JWT
frontend/ React + Vite UI — talks only to the API (+ Clerk)
cli.py batch link ingestion + place reprocessing entry point
tests/
```

Layering: `cli.py` and `server/` both call `pipeline.ingest_links` and library/store
helpers. The frontend only knows the JSON API. Persistence is DynamoDB (Local in
Docker for dev; real AWS in prod — see `docs/aws-dynamodb.md`). Production ingest
uses Step Functions + Lambda (`docs/serverless-deploy.md`); local uses
`INGEST_MODE=local` background tasks against the same Jobs table.

## Module rules

- **clients** — shared API client factories. No imports from sources or pipeline.
- **sources** — platform fetchers return `SavedPost`. Import `clients`, `extract`, `links`, `models` only. Collect raw place hints only — never geocode, dedupe, or tag.
- **pipeline** — platform-agnostic orchestration. Never imported by fetchers. Calls `places.process_post_places` after every successful fetch; links `UserPosts`/`UserPlaces` for the acting `user_id`.
- **store / db** — persistence boundary. Shared Posts/Places; per-user membership and visits.
- **places** — platform-agnostic place pipeline (identity, geocoding, dedup, tags). Runs the same for every platform; sources never do this work themselves.
- **server** — HTTP adapter only. JWT auth + validation and job tracking. No business logic beyond that.

## Implementation

Keep it **simple, modular, and extendable**. Do not add layers you don't need yet.

- One clear responsibility per file.
- Add fields to existing dataclasses before creating new abstractions.
- Prefer plain functions and dataclasses over factories, base classes, or plugin systems.
- **Names must be contextual** — use domain terms (`place_name`, `post_url`, `day_number`) instead of generic ones (`id`, `value`, `parts`).

## Run

```bash
pip install -e ".[dev]"
docker compose up -d
python -m travelplanner.db.bootstrap
uvicorn server.app:app --reload
cd frontend && npm install && npm run dev
python3 cli.py links.txt --user-id local-dev-user
pytest
```

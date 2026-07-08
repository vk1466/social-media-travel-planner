# Social Media Travel Planner

Ingest social media travel inspiration and build itineraries.

## Layout

```
travelplanner/   core library — no CLI, no web code
  clients/       reusable API clients (EnsembleData, Supadata, geocoder)
  sources/       platform-specific fetchers (one file per platform)
  models.py      SavedPost, Place, CanonicalPlace, TAGS — canonical record shapes
  links.py       URL detection and post ID extraction
  pipeline.py    orchestrator: route links → fetchers → place processing → store
  store.py       JSON-per-post persistence under data/posts/
  extract.py       Supadata extract wrapper (shared: IG now, YT later)
  places.py      shared place pipeline: normalize → locate → resolve/upsert → load/list
server/          FastAPI backend — thin adapter over travelplanner
frontend/        React + Vite UI — talks only to the API
cli.py           batch link ingestion + place reprocessing entry point
tests/
```

Layering: `cli.py` and `server/` both call `pipeline.ingest_links` and `store.load_all_posts`. The frontend only knows the JSON API.

## Module rules

- **clients** — shared API client factories. No imports from sources or pipeline.
- **sources** — platform fetchers return `SavedPost`. Import `clients`, `extract`, `links`, `models` only. Collect raw place hints only — never geocode, dedupe, or tag.
- **pipeline** — platform-agnostic orchestration. Never imported by fetchers. Calls `places.process_post_places` after every successful fetch.
- **store** — persistence boundary between ingestion and future planning.
- **places** — platform-agnostic place pipeline (identity, geocoding, dedup, tags) under `data/places/`. Runs the same for every platform; sources never do this work themselves.
- **server** — HTTP adapter only. No business logic beyond validation and job tracking.

## Implementation

Keep it **simple, modular, and extendable**. Do not add layers you don't need yet.

- One clear responsibility per file.
- Add fields to existing dataclasses before creating new abstractions.
- Prefer plain functions and dataclasses over factories, base classes, or plugin systems.
- **Names must be contextual** — use domain terms (`place_name`, `post_url`, `day_number`) instead of generic ones (`id`, `value`, `parts`).

## Run

```bash
pip install -e ".[dev]"
uvicorn server.app:app --reload
cd frontend && npm install && npm run dev
python3 cli.py links.txt
pytest
```

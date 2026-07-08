# Social Media Travel Planner

Ingest social media travel inspiration and build itineraries.

## Layout

```
travelplanner/   core library — models, pipeline, store, clients, sources
server/          FastAPI backend (thin adapter over travelplanner)
frontend/        React + Vite UI
cli.py           batch link ingestion entry point
data/posts/      ingested post records (gitignored)
```

`travelplanner/` knows nothing about HTTP or the CLI. Both `cli.py` and `server/` call the same pipeline.

## Quick start

### Backend + frontend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Terminal 1 — API
uvicorn server.app:app --reload

# Terminal 2 — UI
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

### CLI batch ingest

```bash
cp .env.example .env   # set ENSEMBLEDATA_TOKEN + SUPADATA_API_KEY
python3 cli.py links.txt
```

## Environment

- `ENSEMBLEDATA_TOKEN` — Instagram post details
- `SUPADATA_API_KEY` — video place extraction (Supadata Extract API)

## Tests

```bash
pytest
```

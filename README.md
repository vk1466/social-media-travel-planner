# Social Media Travel Planner

Ingest social media travel inspiration and build itineraries.

## Layout

```
travelplanner/   core library — models, pipeline, DynamoDB repos, clients, sources
server/          FastAPI backend (thin adapter over travelplanner + Clerk JWT)
frontend/        React + Vite UI (Clerk sign-in)
cli.py           batch link ingestion entry point
docker-compose.yml  DynamoDB Local
```

`travelplanner/` knows nothing about HTTP or Clerk. Both `cli.py` and `server/`
call the same pipeline. Shared `Posts` / `Places` are processed once; per-user
`UserPosts` / `UserPlaces` / `Visits` scope each library.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Local DynamoDB (host :8001; API stays on :8000)
docker compose up -d
cp .env.example .env   # fill API keys; DynamoDB local defaults are set
python -m travelplanner.db.bootstrap

# Optional: migrate existing JSON under data/
python scripts/migrate_json_to_dynamodb.py --user-id local-dev-user

# Terminal 1 — API
uvicorn server.app:app --reload

# Terminal 2 — UI
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

Without Clerk keys, the UI runs in local-dev mode (`X-User-Id: local-dev-user`).
Set `VITE_CLERK_PUBLISHABLE_KEY` (frontend) and `CLERK_ISSUER` (backend) for real auth.

### CLI batch ingest

```bash
python3 cli.py links.txt --user-id local-dev-user
```

## Environment

See [`.env.example`](.env.example). DynamoDB notes: [`docs/aws-dynamodb.md`](docs/aws-dynamodb.md).
Serverless (Vercel + Lambda + Step Functions): [`docs/serverless-deploy.md`](docs/serverless-deploy.md).

## Tests

```bash
pytest   # uses moto in-memory DynamoDB
```

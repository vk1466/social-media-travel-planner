# Wanderfile

Save reels, posts, videos, and articles in an AI-organized, searchable library.

Travel maps, recipes, and watchlists are specialized views within the broader
saved-content library. See the [product evolution roadmap](docs/product-evolution-roadmap.md)
for the staged expansion of AI organization features.

## Layout

```
travelplanner/   core library — models, pipeline, DynamoDB repos, clients, sources
server/          FastAPI backend (thin adapter over travelplanner + Clerk JWT)
frontend/        React + Vite UI (Clerk sign-in)
infra/           Python CDK (TravelPlanner-dev / TravelPlanner-prod)
cli.py           batch link ingestion entry point
```

`travelplanner/` knows nothing about HTTP or Clerk. Both `cli.py` and `server/`
call the same pipeline. Shared `Posts` / `Places` are processed once; per-user
`UserPosts` / `UserPlaces` / `Visits` scope each library.

## Quick start (UI against AWS)

Day-to-day: run the frontend locally against the deployed **TravelPlanner-dev** API.
No local DynamoDB or uvicorn.

1. Deploy (or reuse) `TravelPlanner-dev` — see [`docs/serverless-deploy.md`](docs/serverless-deploy.md).
2. Note the stack `ApiEndpoint` output.
3. Configure the frontend:

```bash
cd frontend
cp .env.example .env.local
# set VITE_API_BASE_URL and VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev
```

Open http://localhost:5173. Allow that origin in Clerk (same issuer as the API).

### CLI batch ingest (against AWS)

Uses your AWS credentials and the `dev` tables:

```bash
pip install -e ".[dev]"
cp .env.example .env   # fill API keys; set DYNAMODB_REGION / DYNAMODB_STAGE=dev
python3 cli.py links.txt --user-id <clerk-user-id>
```

## Environment

- Root [`.env.example`](.env.example) — API keys / CLI DynamoDB stage
- Frontend [`frontend/.env.example`](frontend/.env.example) — API URL + Clerk
- DynamoDB notes: [`docs/aws-dynamodb.md`](docs/aws-dynamodb.md)
- Serverless: [`docs/serverless-deploy.md`](docs/serverless-deploy.md)

## Tests

```bash
pytest   # uses moto in-memory DynamoDB
```

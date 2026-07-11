# Serverless deploy (Vercel + AWS)

Production layout:

- **Frontend:** Vercel (`frontend/`), production Git branch `production`
- **API:** API Gateway HTTP API → Lambda (Mangum / FastAPI)
- **Ingest:** Step Functions Map → ingest Lambda per link → finalize Lambda
- **Data:** DynamoDB (including `Jobs` for pollable progress)

Work lands on `feat/serverless`, then merges to `production` to deploy.

## One-time AWS setup

1. Create DynamoDB tables (including Jobs):

```bash
unset DYNAMODB_ENDPOINT_URL
export DYNAMODB_REGION=us-west-2
export DYNAMODB_TABLE_PREFIX=prod_
# credentials via SSO / env / role
python -m travelplanner.db.bootstrap
```

2. Create an IAM role for GitHub Actions OIDC that can deploy the SAM stack
   (CloudFormation, ECR, Lambda, IAM pass-role for the stack, S3 for artifacts,
   Step Functions). Store the role ARN as GitHub secret `AWS_DEPLOY_ROLE_ARN`.

3. Set GitHub Actions **variables**: `CORS_ORIGINS`, `CLERK_ISSUER`, optional
   `ADMIN_USER_IDS`, optional `DYNAMODB_TABLE_PREFIX` (default `prod_`).

4. Set GitHub Actions **secrets**: `ENSEMBLEDATA_TOKEN`, `SUPADATA_API_KEY`,
   `OPENAI_API_KEY`, `AWS_DEPLOY_ROLE_ARN`.

5. Deploy once manually (optional) to verify:

```bash
cd infra
sam build
sam deploy --guided
```

Note the `ApiEndpoint` output.

## Vercel

1. Import the repo; **Root Directory** = `frontend`.
2. **Production Branch** = `production`.
3. Environment variables (Production):
   - `VITE_API_BASE_URL` = API Gateway URL from SAM output (no trailing slash)
   - `VITE_CLERK_PUBLISHABLE_KEY` = Clerk production publishable key
4. Clerk production instance: allow the Vercel origin and API origin; set backend
   `CLERK_ISSUER` to match (via SAM `ClerkIssuer` / GitHub var).

Vercel deploys on push to `production` via its Git integration. The GitHub
workflow [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml)
runs tests and `sam deploy` on the same branch.

## Local development

Unchanged: DynamoDB Local + `INGEST_MODE=local` (default). Jobs persist in the
local `Jobs` table; workers run in-process via FastAPI background tasks.

```bash
docker compose up -d   # DynamoDB Local on host :8001
python -m travelplanner.db.bootstrap
uvicorn server.app:app --reload   # API on :8000
cd frontend && npm run dev
```

Leave `VITE_API_BASE_URL` unset so Vite proxies `/api` to localhost:8000.

## Push to production

```bash
git checkout production
git merge feat/serverless   # or open a PR into production
git push origin production
```

That triggers API deploy (GitHub Actions) and frontend deploy (Vercel).

# Serverless deploy (Vercel + AWS CDK)

Production layout:

- **Frontend:** Vercel (`frontend/`), production Git branch `production`
- **API:** Lambda Function URL → Mangum / FastAPI
- **Ingest:** Step Functions Map → ingest Lambda per link → finalize Lambda
- **Data:** DynamoDB tables owned by each CDK stack (`{Name}-{stage}-{region}`)

Work lands on `feat/serverless` / `main` (deploys **dev**), then merges to
`production` to deploy **prod**.

## One-time AWS setup

1. Bootstrap CDK in the account/region (once):

```bash
cd infra
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
npm install -g aws-cdk   # or use npx aws-cdk
cdk bootstrap aws://ACCOUNT_ID/us-west-2
```

Stacks always deploy to **us-west-2** (see `infra/app.py`). Override only with
`CDK_DEPLOY_REGION` if you intentionally need another region.

2. Create an IAM role for GitHub Actions OIDC that can deploy the CDK stacks
   (CloudFormation, ECR, Lambda, IAM pass-role for the stack, S3, Step Functions,
   DynamoDB). Store the role ARN as GitHub secret `AWS_DEPLOY_ROLE_ARN`.

3. Set GitHub Actions **variables**: `CORS_ORIGINS`, `CLERK_ISSUER`, optional
   `ADMIN_USER_IDS`. Include `http://localhost:5173` in `CORS_ORIGINS` if you
   run the Vite UI against the dev API.

4. Set GitHub Actions **secrets**: `ENSEMBLEDATA_TOKEN`, `SUPADATA_API_KEY`,
   `OPENAI_API_KEY`, `AWS_DEPLOY_ROLE_ARN`.

5. Deploy once manually (optional) to verify:

```bash
cd infra
source .venv/bin/activate
export CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
export CLERK_ISSUER=https://your-instance.clerk.accounts.dev
export ENSEMBLEDATA_TOKEN=...
export SUPADATA_API_KEY=...
export OPENAI_API_KEY=...
cdk deploy TravelPlanner-dev
# later:
cdk deploy TravelPlanner-prod
```

Note the `ApiEndpoint` output for each stack (Lambda Function URL). After
switching from API Gateway, update `VITE_API_BASE_URL` / Vercel to the new URL.

DynamoDB tables are created by the stack (e.g. `Posts-dev-us-west-2`). Do **not**
run `python -m travelplanner.db.bootstrap` against AWS.

## Local UI against TravelPlanner-dev

No local API or DynamoDB. Point Vite at the deployed stack:

```bash
cd frontend
cp .env.example .env.local
# VITE_API_BASE_URL=<ApiEndpoint from TravelPlanner-dev>
# VITE_CLERK_PUBLISHABLE_KEY=<Clerk key for that issuer>
npm install
npm run dev
```

Allow `http://localhost:5173` in Clerk. Ensure the dev stack `CORS_ORIGINS`
includes that origin.

## Vercel

1. Import the repo; **Root Directory** = `frontend`.
2. **Production Branch** = `production`.
3. Environment variables (Production):
   - `VITE_API_BASE_URL` = prod stack `ApiEndpoint` (no trailing slash)
   - `VITE_CLERK_PUBLISHABLE_KEY` = Clerk production publishable key
4. Clerk production instance: allow the Vercel origin and API origin; set backend
   `CLERK_ISSUER` to match (via GitHub var / deploy env).

Vercel deploys on push to `production` via its Git integration. GitHub workflows
deploy the API: [`.github/workflows/deploy-dev.yml`](../.github/workflows/deploy-dev.yml)
on `main` / `feat/serverless`, and
[`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml)
on `production`.

## Push to production

```bash
git checkout production
git merge feat/serverless   # or open a PR into production
git push origin production
```

That triggers API deploy (GitHub Actions → `TravelPlanner-prod`) and frontend
deploy (Vercel).

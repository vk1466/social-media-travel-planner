# AWS DynamoDB deployment

Local development uses DynamoDB Local via Docker (`docker compose up -d`).
Production uses the same boto3 code against real AWS DynamoDB — only env vars change.

## Local

```bash
docker compose up -d
export DYNAMODB_ENDPOINT_URL=http://localhost:8001
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local
export DYNAMODB_REGION=us-east-1
python -m travelplanner.db.bootstrap
```

## AWS

1. Unset `DYNAMODB_ENDPOINT_URL` (or leave it empty).
2. Set `DYNAMODB_REGION` to your region (e.g. `us-west-2`).
3. Optionally set `DYNAMODB_TABLE_PREFIX` (e.g. `prod_`) to isolate environments.
4. Provide credentials via an IAM role (preferred on ECS/Lambda) or
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
5. Create tables once:

```bash
python -m travelplanner.db.bootstrap
```

### IAM policy (least privilege)

Allow on the six tables (`Posts`, `Places`, `UserPosts`, `UserPlaces`, `Visits`,
`Jobs`, with your prefix):

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`
- `dynamodb:Scan`
- `dynamodb:BatchGetItem`
- `dynamodb:BatchWriteItem`
- `dynamodb:DescribeTable`
- `dynamodb:CreateTable` (bootstrap only; remove after tables exist)

### Clerk production

1. Create a Clerk production instance.
2. Set frontend `VITE_CLERK_PUBLISHABLE_KEY`.
3. Set backend `CLERK_ISSUER` (and optional `CLERK_AUDIENCE`).
4. Unset `AUTH_DISABLED`.
5. Add your API and frontend origins in Clerk allowed origins.
6. Optionally set `ADMIN_USER_IDS` to Clerk user ids allowed to run
   `/api/places/reprocess` and `/api/data/cleanup`.

### Hardening notes

- **Orphan GC:** `travelplanner.db.gc.garbage_collect_orphaned_posts()` deletes
  shared Posts with no `UserPosts` links. Call from an admin job when needed.
- **Places Scan:** hierarchy / near-duplicate detection still `Scan`s Places.
  Fine at small scale; add GSIs or a background index when the library grows.
- **Jobs:** stored in DynamoDB (`Jobs` table) with ~7 day TTL. Ingest runs via
  Step Functions in AWS (`INGEST_MODE=stepfunctions`); see
  [`serverless-deploy.md`](./serverless-deploy.md).
- **Rate limits:** consider per-user ingest limits before public launch.

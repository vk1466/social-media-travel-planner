# AWS DynamoDB deployment

All app environments use real DynamoDB created by CDK
(`TravelPlanner-dev` / `TravelPlanner-prod`). Table names are
`{LogicalName}-{stage}-{region}` (e.g. `Posts-dev-us-west-2`).

Unit tests use **moto** in-memory DynamoDB (`DYNAMODB_STAGE=test`); they do not
need Docker or AWS credentials.

## AWS (CDK)

Tables are created by the CDK stacks. See [`serverless-deploy.md`](./serverless-deploy.md).
Lambdas receive:

- `DYNAMODB_REGION` (stack region, e.g. `us-west-2`)
- `DYNAMODB_STAGE` (`dev` or `prod`)

Do not run `python -m travelplanner.db.bootstrap` against AWS unless you are
recovering a table outside CDK.

### CLI / scripts against a stage

```bash
export DYNAMODB_REGION=us-west-2
export DYNAMODB_STAGE=dev
# AWS credentials via profile / env
python3 cli.py links.txt --user-id <clerk-user-id>
```

### IAM policy (least privilege)

Allow on the app tables for that stage/region
(Posts, Places, PlaceCandidates, UserPosts, UserPlaces, Visits, Jobs):

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`
- `dynamodb:Scan`
- `dynamodb:BatchGetItem`
- `dynamodb:BatchWriteItem`
- `dynamodb:DescribeTable`

CDK grants these to the API and worker Lambdas automatically.

### Clerk

1. Create a Clerk instance for the stage.
2. Set frontend `VITE_CLERK_PUBLISHABLE_KEY` (local `.env.local` and/or Vercel).
3. Set backend `CLERK_ISSUER` (and optional `CLERK_AUDIENCE`) on the stack.
4. Add `http://localhost:5173`, the Vercel origin, and the API origin in Clerk allowed origins.
5. Optionally set `ADMIN_USER_IDS` to Clerk user ids allowed to run
   `/api/places/reprocess` and `/api/data/cleanup`.

### Hardening notes

- **Orphan GC:** `travelplanner.db.gc.garbage_collect_orphaned_posts()` deletes
  shared Posts with no `UserPosts` links. Call from an admin job when needed.
- **Places Scan:** hierarchy / near-duplicate detection still `Scan`s Places.
  Fine at small scale; add GSIs or a background index when the library grows.
- **Jobs:** stored in DynamoDB (`Jobs` table) with ~7 day TTL. Ingest runs via
  Step Functions; see [`serverless-deploy.md`](./serverless-deploy.md).
- **Rate limits:** consider per-user ingest limits before public launch.

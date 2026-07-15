from __future__ import annotations

from botocore.exceptions import ClientError

from travelplanner import settings
from travelplanner.db.client import get_dynamodb_resource

TABLE_NAMES = (
  "Posts",
  "Places",
  "PlaceCandidates",
  "IngestFailures",
  "UserPosts",
  "UserPlaces",
  "Visits",
  "Jobs",
)

SOURCE_POST_INDEX = "source_post_id-index"
JOBS_USER_CREATED_INDEX = "user_id-created_at-index"


def table_name(logical_name: str) -> str:
  """Physical name: {LogicalName}-{stage}-{region} (e.g. Posts-dev-us-west-2)."""
  return f"{logical_name}-{settings.dynamodb_stage()}-{settings.dynamodb_region()}"


def _create_simple_table(dynamodb, name: str, partition_key: str) -> None:
  dynamodb.create_table(
    TableName=name,
    KeySchema=[{"AttributeName": partition_key, "KeyType": "HASH"}],
    AttributeDefinitions=[{"AttributeName": partition_key, "AttributeType": "S"}],
    BillingMode="PAY_PER_REQUEST",
  )


def _create_composite_table(
  dynamodb,
  name: str,
  partition_key: str,
  sort_key: str,
) -> None:
  dynamodb.create_table(
    TableName=name,
    KeySchema=[
      {"AttributeName": partition_key, "KeyType": "HASH"},
      {"AttributeName": sort_key, "KeyType": "RANGE"},
    ],
    AttributeDefinitions=[
      {"AttributeName": partition_key, "AttributeType": "S"},
      {"AttributeName": sort_key, "AttributeType": "S"},
    ],
    BillingMode="PAY_PER_REQUEST",
  )


def _create_place_candidates_table(dynamodb, name: str) -> None:
  dynamodb.create_table(
    TableName=name,
    KeySchema=[{"AttributeName": "candidate_id", "KeyType": "HASH"}],
    AttributeDefinitions=[
      {"AttributeName": "candidate_id", "AttributeType": "S"},
      {"AttributeName": "source_post_id", "AttributeType": "S"},
    ],
    GlobalSecondaryIndexes=[
      {
        "IndexName": SOURCE_POST_INDEX,
        "KeySchema": [
          {"AttributeName": "source_post_id", "KeyType": "HASH"},
          {"AttributeName": "candidate_id", "KeyType": "RANGE"},
        ],
        "Projection": {"ProjectionType": "ALL"},
      }
    ],
    BillingMode="PAY_PER_REQUEST",
  )


def _create_jobs_table(dynamodb, name: str) -> None:
  dynamodb.create_table(
    TableName=name,
    KeySchema=[{"AttributeName": "job_id", "KeyType": "HASH"}],
    AttributeDefinitions=[
      {"AttributeName": "job_id", "AttributeType": "S"},
      {"AttributeName": "user_id", "AttributeType": "S"},
      {"AttributeName": "created_at", "AttributeType": "S"},
    ],
    GlobalSecondaryIndexes=[
      {
        "IndexName": JOBS_USER_CREATED_INDEX,
        "KeySchema": [
          {"AttributeName": "user_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"},
        ],
        "Projection": {"ProjectionType": "ALL"},
      }
    ],
    BillingMode="PAY_PER_REQUEST",
  )


def ensure_tables() -> list[str]:
  """Create all app tables if they do not already exist. Returns created names."""
  dynamodb = get_dynamodb_resource()
  existing = {table.name for table in dynamodb.tables.all()}
  created: list[str] = []

  specs: list[tuple[str, str, str | None]] = [
    ("Posts", "post_id", None),
    ("Places", "place_id", None),
    ("IngestFailures", "failure_id", None),
    ("UserPosts", "user_id", "post_id"),
    ("UserPlaces", "user_id", "place_id"),
    ("Visits", "user_id", "visit_id"),
  ]

  for logical, pk, sk in specs:
    name = table_name(logical)
    if name in existing:
      continue
    try:
      if sk is None:
        _create_simple_table(dynamodb, name, pk)
      else:
        _create_composite_table(dynamodb, name, pk, sk)
      created.append(name)
    except ClientError as exc:
      error_code = exc.response.get("Error", {}).get("Code", "")
      if error_code != "ResourceInUseException":
        raise

  candidates_name = table_name("PlaceCandidates")
  if candidates_name not in existing:
    try:
      _create_place_candidates_table(dynamodb, candidates_name)
      created.append(candidates_name)
    except ClientError as exc:
      error_code = exc.response.get("Error", {}).get("Code", "")
      if error_code != "ResourceInUseException":
        raise

  jobs_name = table_name("Jobs")
  if jobs_name not in existing:
    try:
      _create_jobs_table(dynamodb, jobs_name)
      created.append(jobs_name)
    except ClientError as exc:
      error_code = exc.response.get("Error", {}).get("Code", "")
      if error_code != "ResourceInUseException":
        raise

  _ensure_jobs_ttl()
  return created


def _ensure_jobs_ttl() -> None:
  """Best-effort TTL on Jobs (ignored when Local/moto does not support it)."""
  from travelplanner.db.client import get_dynamodb_client

  try:
    get_dynamodb_client().update_time_to_live(
      TableName=table_name("Jobs"),
      TimeToLiveSpecification={"Enabled": True, "AttributeName": "ttl"},
    )
  except ClientError:
    pass
  except Exception:
    pass


def get_table(logical_name: str):
  return get_dynamodb_resource().Table(table_name(logical_name))

from __future__ import annotations

from botocore.exceptions import ClientError

from travelplanner import settings
from travelplanner.db.client import get_dynamodb_resource

TABLE_NAMES = ("Posts", "Places", "UserPosts", "UserPlaces", "Visits", "Jobs")


def table_name(logical_name: str) -> str:
  return f"{settings.dynamodb_table_prefix()}{logical_name}"


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


def ensure_tables() -> list[str]:
  """Create all app tables if they do not already exist. Returns created names."""
  dynamodb = get_dynamodb_resource()
  existing = {table.name for table in dynamodb.tables.all()}
  created: list[str] = []

  specs: list[tuple[str, str, str | None]] = [
    ("Posts", "post_id", None),
    ("Places", "place_id", None),
    ("UserPosts", "user_id", "post_id"),
    ("UserPlaces", "user_id", "place_id"),
    ("Visits", "user_id", "visit_id"),
    ("Jobs", "job_id", None),
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

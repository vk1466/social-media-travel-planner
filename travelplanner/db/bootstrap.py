"""Create DynamoDB tables (recovery / moto). Prefer CDK for AWS stages.

Usage:
  python -m travelplanner.db.bootstrap
"""

from __future__ import annotations

from travelplanner.db.client import reset_client_cache
from travelplanner.db.tables import ensure_tables, table_name, TABLE_NAMES


def main() -> None:
  reset_client_cache()
  created = ensure_tables()
  print("Tables:")
  for logical in TABLE_NAMES:
    name = table_name(logical)
    marker = "created" if name in created else "exists"
    print(f"  [{marker}] {name}")


if __name__ == "__main__":
  main()

#!/usr/bin/env python3
"""Create DynamoDB tables. Prefer: python -m travelplanner.db.bootstrap"""

from travelplanner.db.bootstrap import main

if __name__ == "__main__":
  main()

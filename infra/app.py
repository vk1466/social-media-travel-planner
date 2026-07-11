#!/usr/bin/env python3
"""CDK app: TravelPlanner-dev and TravelPlanner-prod stacks."""

from __future__ import annotations

import os

from aws_cdk import App, Environment

from travel_planner_stack import TravelPlannerStack


def _env_str(name: str, default: str = "") -> str:
  return os.environ.get(name, default).strip()


app = App()

# Prefer explicit deploy region; default us-west-2 (ignore CLI default region).
aws_env = Environment(
  account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
  region=_env_str("CDK_DEPLOY_REGION", "us-west-2"),
)

shared = {
  "cors_origins": _env_str("CORS_ORIGINS", "http://localhost:5173"),
  "clerk_issuer": _env_str("CLERK_ISSUER"),
  "admin_user_ids": _env_str("ADMIN_USER_IDS"),
  "openai_model": _env_str("OPENAI_MODEL", "gpt-4o-mini"),
  "ensembledata_token": _env_str("ENSEMBLEDATA_TOKEN"),
  "supadata_api_key": _env_str("SUPADATA_API_KEY"),
  "openai_api_key": _env_str("OPENAI_API_KEY"),
  "env": aws_env,
}

TravelPlannerStack(app, "TravelPlanner-dev", stage="dev", **shared)
TravelPlannerStack(app, "TravelPlanner-prod", stage="prod", **shared)

app.synth()

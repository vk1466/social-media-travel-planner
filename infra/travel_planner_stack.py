"""Travel Planner stack: DynamoDB, Docker Lambdas, Function URL, Step Functions ingest."""

from __future__ import annotations

from pathlib import Path

from aws_cdk import (
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  aws_dynamodb as dynamodb,
  aws_ecr_assets as ecr_assets,
  aws_lambda as lambda_,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
)
from constructs import Construct

REPO_ROOT = Path(__file__).resolve().parent.parent
LAMBDA_PLATFORM = ecr_assets.Platform.LINUX_AMD64


class TravelPlannerStack(Stack):
  def __init__(
    self,
    scope: Construct,
    construct_id: str,
    *,
    stage: str,
    cors_origins: str = "http://localhost:5173",
    clerk_issuer: str = "",
    admin_user_ids: str = "",
    openai_model: str = "gpt-4o-mini",
    ensembledata_token: str = "",
    supadata_api_key: str = "",
    openai_api_key: str = "",
    **kwargs,
  ) -> None:
    super().__init__(scope, construct_id, **kwargs)

    region = Stack.of(self).region
    removal = RemovalPolicy.DESTROY if stage == "dev" else RemovalPolicy.RETAIN

    tables = self._create_tables(stage=stage, region=region, removal=removal)

    shared_env = {
      "DYNAMODB_REGION": region,
      "DYNAMODB_STAGE": stage,
      "OPENAI_MODEL": openai_model,
      "ENSEMBLEDATA_TOKEN": ensembledata_token,
      "SUPADATA_API_KEY": supadata_api_key,
      "OPENAI_API_KEY": openai_api_key,
      "LOG_LEVEL": "INFO",
    }

    ingest_fn = lambda_.DockerImageFunction(
      self,
      "IngestWorker",
      code=lambda_.DockerImageCode.from_image_asset(
        str(REPO_ROOT),
        file="infra/Dockerfile",
        cmd=["server.workers.ingest_one_link"],
        platform=LAMBDA_PLATFORM,
      ),
      architecture=lambda_.Architecture.X86_64,
      memory_size=1024,
      timeout=Duration.seconds(900),
      environment=shared_env,
    )

    finalize_fn = lambda_.DockerImageFunction(
      self,
      "FinalizeWorker",
      code=lambda_.DockerImageCode.from_image_asset(
        str(REPO_ROOT),
        file="infra/Dockerfile",
        cmd=["server.workers.finalize_job"],
        platform=LAMBDA_PLATFORM,
      ),
      architecture=lambda_.Architecture.X86_64,
      memory_size=1024,
      timeout=Duration.seconds(300),
      environment={
        "DYNAMODB_REGION": region,
        "DYNAMODB_STAGE": stage,
        "OPENAI_MODEL": openai_model,
        "OPENAI_API_KEY": openai_api_key,
        "LOG_LEVEL": "INFO",
      },
    )

    for table in tables.values():
      table.grant_read_write_data(ingest_fn)
      table.grant_read_write_data(finalize_fn)

    state_machine = self._create_state_machine(ingest_fn, finalize_fn)

    api_fn = lambda_.DockerImageFunction(
      self,
      "TravelApi",
      code=lambda_.DockerImageCode.from_image_asset(
        str(REPO_ROOT),
        file="infra/Dockerfile",
        cmd=["server.lambda_handler.handler"],
        platform=LAMBDA_PLATFORM,
      ),
      architecture=lambda_.Architecture.X86_64,
      memory_size=1024,
      timeout=Duration.seconds(90),
      environment={
        **shared_env,
        "STATE_MACHINE_ARN": state_machine.state_machine_arn,
        "CORS_ORIGINS": cors_origins,
        "CLERK_ISSUER": clerk_issuer,
        "ADMIN_USER_IDS": admin_user_ids,
      },
    )
    for table in tables.values():
      table.grant_read_write_data(api_fn)
    state_machine.grant_start_execution(api_fn)

    api_url = api_fn.add_function_url(
      auth_type=lambda_.FunctionUrlAuthType.NONE,
    )

    CfnOutput(
      self,
      "ApiEndpoint",
      description="Lambda Function URL (set as VITE_API_BASE_URL)",
      value=api_url.url,
    )
    CfnOutput(
      self,
      "StateMachineArn",
      description="Ingest Step Functions ARN",
      value=state_machine.state_machine_arn,
    )
    CfnOutput(
      self,
      "TravelApiFunctionArn",
      value=api_fn.function_arn,
    )

  def _create_tables(
    self,
    *,
    stage: str,
    region: str,
    removal: RemovalPolicy,
  ) -> dict[str, dynamodb.Table]:
    def physical(logical: str) -> str:
      return f"{logical}-{stage}-{region}"

    def simple(logical: str, partition_key: str, **extra) -> dynamodb.Table:
      return dynamodb.Table(
        self,
        logical,
        table_name=physical(logical),
        partition_key=dynamodb.Attribute(
          name=partition_key,
          type=dynamodb.AttributeType.STRING,
        ),
        billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        removal_policy=removal,
        **extra,
      )

    def composite(logical: str, partition_key: str, sort_key: str) -> dynamodb.Table:
      return dynamodb.Table(
        self,
        logical,
        table_name=physical(logical),
        partition_key=dynamodb.Attribute(
          name=partition_key,
          type=dynamodb.AttributeType.STRING,
        ),
        sort_key=dynamodb.Attribute(
          name=sort_key,
          type=dynamodb.AttributeType.STRING,
        ),
        billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        removal_policy=removal,
      )

    places_candidates = simple("PlaceCandidates", "candidate_id")
    places_candidates.add_global_secondary_index(
      index_name="source_post_id-index",
      partition_key=dynamodb.Attribute(
        name="source_post_id",
        type=dynamodb.AttributeType.STRING,
      ),
      sort_key=dynamodb.Attribute(
        name="candidate_id",
        type=dynamodb.AttributeType.STRING,
      ),
      projection_type=dynamodb.ProjectionType.ALL,
    )

    return {
      "Posts": simple("Posts", "post_id"),
      "Places": simple("Places", "place_id"),
      "PlaceCandidates": places_candidates,
      "UserPosts": composite("UserPosts", "user_id", "post_id"),
      "UserPlaces": composite("UserPlaces", "user_id", "place_id"),
      "Visits": composite("Visits", "user_id", "visit_id"),
      "Jobs": simple("Jobs", "job_id", time_to_live_attribute="ttl"),
    }

  def _create_state_machine(
    self,
    ingest_fn: lambda_.IFunction,
    finalize_fn: lambda_.IFunction,
  ) -> sfn.StateMachine:
    ingest_one = tasks.LambdaInvoke(
      self,
      "IngestOne",
      lambda_function=ingest_fn,
      payload_response_only=True,
    )

    ingest_links = sfn.Map(
      self,
      "IngestLinks",
      items_path="$.links",
      max_concurrency=2,
      item_selector={
        "job_id.$": "$.job_id",
        "user_id.$": "$.user_id",
        "refresh.$": "$.refresh",
        "post_url.$": "$$.Map.Item.Value.post_url",
      },
      result_path="$.ingest_results",
    )
    ingest_links.item_processor(ingest_one)

    finalize = tasks.LambdaInvoke(
      self,
      "Finalize",
      lambda_function=finalize_fn,
      payload=sfn.TaskInput.from_object({"job_id.$": "$.job_id"}),
      payload_response_only=True,
    )

    definition = ingest_links.next(finalize)

    return sfn.StateMachine(
      self,
      "IngestStateMachine",
      state_machine_name=f"{Stack.of(self).stack_name}-ingest",
      definition_body=sfn.DefinitionBody.from_chainable(definition),
    )

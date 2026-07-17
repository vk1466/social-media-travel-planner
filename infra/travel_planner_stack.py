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
  aws_iam as iam,
  aws_lambda as lambda_,
  aws_s3 as s3,
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

    timeline_bucket = s3.Bucket(
      self,
      "TimelineImports",
      bucket_name=f"travelplanner-timeline-{stage}-{region}-{Stack.of(self).account}",
      block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
      encryption=s3.BucketEncryption.S3_MANAGED,
      enforce_ssl=True,
      lifecycle_rules=[
        s3.LifecycleRule(expiration=Duration.days(1), enabled=True),
      ],
      removal_policy=removal,
      auto_delete_objects=stage == "dev",
      cors=[
        s3.CorsRule(
          allowed_methods=[s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowed_origins=[o.strip() for o in cors_origins.split(",") if o.strip()]
          or ["http://localhost:5173"],
          allowed_headers=["*"],
          exposed_headers=["ETag"],
          max_age=3000,
        )
      ],
    )

    shared_env = {
      "DYNAMODB_REGION": region,
      "DYNAMODB_STAGE": stage,
      "OPENAI_MODEL": openai_model,
      "ENSEMBLEDATA_TOKEN": ensembledata_token,
      "SUPADATA_API_KEY": supadata_api_key,
      "OPENAI_API_KEY": openai_api_key,
      "LOG_LEVEL": "INFO",
      "TIMELINE_IMPORTS_BUCKET": timeline_bucket.bucket_name,
      "TIMELINE_BATCH_SIZE": "100",
      "TIMELINE_HOME_EXCLUDE_KM": "30",
      "TIMELINE_MAX_PLACES_PER_CALL": "100",
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

    timeline_batch_fn = lambda_.DockerImageFunction(
      self,
      "TimelineBatchWorker",
      code=lambda_.DockerImageCode.from_image_asset(
        str(REPO_ROOT),
        file="infra/Dockerfile",
        cmd=["server.workers.process_timeline_batch"],
        platform=LAMBDA_PLATFORM,
      ),
      architecture=lambda_.Architecture.X86_64,
      memory_size=1024,
      timeout=Duration.seconds(900),
      environment=shared_env,
    )

    timeline_finalize_fn = lambda_.DockerImageFunction(
      self,
      "TimelineFinalizeWorker",
      code=lambda_.DockerImageCode.from_image_asset(
        str(REPO_ROOT),
        file="infra/Dockerfile",
        cmd=["server.workers.finalize_timeline_job"],
        platform=LAMBDA_PLATFORM,
      ),
      architecture=lambda_.Architecture.X86_64,
      memory_size=512,
      timeout=Duration.seconds(60),
      environment={
        "DYNAMODB_REGION": region,
        "DYNAMODB_STAGE": stage,
        "LOG_LEVEL": "INFO",
      },
    )

    for table in tables.values():
      table.grant_read_write_data(ingest_fn)
      table.grant_read_write_data(finalize_fn)
      table.grant_read_write_data(timeline_batch_fn)
      table.grant_read_write_data(timeline_finalize_fn)

    timeline_bucket.grant_read(timeline_batch_fn)

    state_machine = self._create_state_machine(ingest_fn, finalize_fn)
    timeline_state_machine = self._create_timeline_state_machine(
      timeline_batch_fn,
      timeline_finalize_fn,
    )

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
      timeout=Duration.seconds(900),
      environment={
        **shared_env,
        "STATE_MACHINE_ARN": state_machine.state_machine_arn,
        "TIMELINE_STATE_MACHINE_ARN": timeline_state_machine.state_machine_arn,
        "CORS_ORIGINS": cors_origins,
        "CLERK_ISSUER": clerk_issuer,
        "ADMIN_USER_IDS": admin_user_ids,
        "INSTAGRAM_PROFILE_POST_LIMIT": "5",
      },
    )
    for table in tables.values():
      table.grant_read_write_data(api_fn)
    state_machine.grant_start_execution(api_fn)
    timeline_state_machine.grant_start_execution(api_fn)
    timeline_bucket.grant_put(api_fn)
    timeline_bucket.grant_read(api_fn)
    # Presigned PUT from the browser needs the API role to sign PutObject.
    api_fn.add_to_role_policy(
      iam.PolicyStatement(
        actions=["s3:PutObject"],
        resources=[timeline_bucket.arn_for_objects("*")],
      )
    )

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
      "TimelineStateMachineArn",
      description="Timeline import Step Functions ARN",
      value=timeline_state_machine.state_machine_arn,
    )
    CfnOutput(
      self,
      "TimelineImportsBucket",
      value=timeline_bucket.bucket_name,
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

    jobs = simple("Jobs", "job_id", time_to_live_attribute="ttl")
    jobs.add_global_secondary_index(
      index_name="user_id-created_at-index",
      partition_key=dynamodb.Attribute(
        name="user_id",
        type=dynamodb.AttributeType.STRING,
      ),
      sort_key=dynamodb.Attribute(
        name="created_at",
        type=dynamodb.AttributeType.STRING,
      ),
      projection_type=dynamodb.ProjectionType.ALL,
    )

    return {
      "Posts": simple("Posts", "post_id"),
      "Places": simple("Places", "place_id"),
      "PlaceCandidates": places_candidates,
      "IngestFailures": simple("IngestFailures", "failure_id"),
      "UserPosts": composite("UserPosts", "user_id", "post_id"),
      "UserPlaces": composite("UserPlaces", "user_id", "place_id"),
      "Visits": composite("Visits", "user_id", "visit_id"),
      "Jobs": jobs,
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
        "mark_visited.$": "$.mark_visited",
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

  def _create_timeline_state_machine(
    self,
    batch_fn: lambda_.IFunction,
    finalize_fn: lambda_.IFunction,
  ) -> sfn.StateMachine:
    process_one = tasks.LambdaInvoke(
      self,
      "ProcessTimelineBatch",
      lambda_function=batch_fn,
      payload_response_only=True,
    )

    # maxConcurrency=1: Nominatim ~1 req/s global policy.
    process_batches = sfn.Map(
      self,
      "ProcessTimelineBatches",
      items_path="$.batches",
      max_concurrency=1,
      item_selector={
        "job_id.$": "$.job_id",
        "user_id.$": "$.user_id",
        "s3_key.$": "$.s3_key",
        "source_format.$": "$.source_format",
        "home_latitude.$": "$.home_latitude",
        "home_longitude.$": "$.home_longitude",
        "batch_index.$": "$$.Map.Item.Value.batch_index",
        "batch_start.$": "$$.Map.Item.Value.batch_start",
        "batch_count.$": "$$.Map.Item.Value.batch_count",
        "post_url.$": "$$.Map.Item.Value.post_url",
      },
      result_path="$.batch_results",
    )
    process_batches.item_processor(process_one)

    finalize = tasks.LambdaInvoke(
      self,
      "FinalizeTimeline",
      lambda_function=finalize_fn,
      payload=sfn.TaskInput.from_object({"job_id.$": "$.job_id"}),
      payload_response_only=True,
    )

    definition = process_batches.next(finalize)

    return sfn.StateMachine(
      self,
      "TimelineStateMachine",
      state_machine_name=f"{Stack.of(self).stack_name}-timeline",
      definition_body=sfn.DefinitionBody.from_chainable(definition),
    )

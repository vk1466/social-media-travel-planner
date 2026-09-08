from __future__ import annotations

from dataclasses import replace

from travelplanner.extract import content_bundle_from_post, snippets_from_bundle
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.recipe_extract import fetch_recipe_from_snippets
from travelplanner.recipe_hints import ExtractedRecipe


def extract_recipe(ctx: IngestContext) -> IngestContext:
  """Extract a source-grounded, possibly incomplete recipe from a food post."""
  if not FeatureFlag.get("food_recipes") or ctx.post is None:
    return ctx
  bundle = ctx.content_bundle or content_bundle_from_post(ctx.post, transcript=ctx.transcript, image_text=ctx.image_text, video_analysis=ctx.video_analysis)
  ctx.content_bundle = bundle
  return replace_context_post(ctx, fetch_recipe_from_snippets(snippets_from_bundle(bundle)))


def replace_context_post(ctx: IngestContext, recipe: ExtractedRecipe | None) -> IngestContext:
  if recipe is not None and ctx.post is not None:
    ctx.post = replace(ctx.post, extracted_recipe=recipe)
  return ctx


EXTRACT_RECIPE_STEP = Step(name="extract_recipe", run=extract_recipe, retry_attempts=2, retry_backoff_seconds=1.5, retry_on=(TimeoutError, ConnectionError, OSError))

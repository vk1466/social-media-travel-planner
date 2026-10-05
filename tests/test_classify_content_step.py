from unittest.mock import patch

import pytest

from travelplanner.content_category_jev import CategoryCheckError
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.steps.classify_content import classify_content


def _ctx() -> IngestContext:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/reel/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="Haircut tutorial for a bob",
  )
  return IngestContext(post_url=post.post_url, user_id="u1", post=post)


def test_classify_content_noops_when_flag_off() -> None:
  ctx = _ctx()
  try:
    FeatureFlag.set("content_categories", False)
    with patch(
      "travelplanner.steps.classify_content.category_from_text",
      return_value="hairstyle",
    ) as mock_classify:
      result = classify_content(ctx)
    mock_classify.assert_not_called()
    assert result.post is not None
    assert result.post.content_category is None
  finally:
    FeatureFlag.set("content_categories", True)


def test_classify_content_stamps_category_when_flag_on() -> None:
  ctx = _ctx()
  with patch(
    "travelplanner.steps.classify_content.category_from_text",
    return_value="hairstyle",
  ) as mock_classify:
    result = classify_content(ctx)
  mock_classify.assert_called_once()
  assert result.post is not None
  assert result.post.content_category == "hairstyle"


def test_classify_content_stops_when_jev_fails() -> None:
  ctx = _ctx()
  with patch(
    "travelplanner.steps.classify_content.category_from_text",
    side_effect=CategoryCheckError("JEV_API_KEY is not set"),
  ):
    with pytest.raises(CategoryCheckError):
      classify_content(ctx)
  assert ctx.post is not None
  assert ctx.post.content_category is None


def test_classify_content_stores_other_when_jev_is_unsure() -> None:
  ctx = _ctx()
  with patch(
    "travelplanner.steps.classify_content.category_from_text",
    return_value=None,
  ):
    result = classify_content(ctx)
  assert result.post is not None
  assert result.post.content_category == "other"

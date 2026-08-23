from unittest.mock import patch

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
      "travelplanner.steps.classify_content.classify_from_snippets",
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
    "travelplanner.steps.classify_content.classify_from_snippets",
    return_value="hairstyle",
  ) as mock_classify:
    result = classify_content(ctx)
  mock_classify.assert_called_once()
  assert result.post is not None
  assert result.post.content_category == "hairstyle"

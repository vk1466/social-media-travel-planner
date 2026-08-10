from __future__ import annotations

from unittest.mock import MagicMock, patch

import boto3
import pytest
from moto import mock_aws

from travelplanner.flow.context import IngestContext
from travelplanner.media.thumbnails import (
  object_key,
  persist_thumbnail,
  public_object_url,
  reset_s3_client_cache,
)
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.steps.instagram.persist_thumbnail import persist_post_thumbnail


@pytest.fixture()
def media_bucket(monkeypatch):
  monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
  monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
  monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
  monkeypatch.setenv("DYNAMODB_REGION", "us-east-1")
  monkeypatch.setenv("MEDIA_BUCKET", "travelplanner-media-test")

  with mock_aws():
    reset_s3_client_cache()
    client = boto3.client("s3", region_name="us-east-1")
    client.create_bucket(Bucket="travelplanner-media-test")
    yield "travelplanner-media-test"
    reset_s3_client_cache()


def test_object_key_and_public_url() -> None:
  post_id = make_post_id(Platform.INSTAGRAM, "AbC_123")
  key = object_key(post_id, content_type="image/webp")
  assert key == "thumbnails/instagram/AbC_123.webp"
  assert (
    public_object_url(bucket="b", key=key, region="us-west-2")
    == f"https://b.s3.us-west-2.amazonaws.com/{key}"
  )


def test_persist_thumbnail_skips_when_bucket_unset(monkeypatch) -> None:
  monkeypatch.delenv("MEDIA_BUCKET", raising=False)
  assert persist_thumbnail("instagram:abc", "https://cdn.example/a.jpg") is None


def test_persist_thumbnail_uploads(media_bucket: str) -> None:
  jpeg = b"\xff\xd8\xff" + b"fake-jpeg"

  mock_response = MagicMock()
  mock_response.__enter__.return_value = mock_response
  mock_response.__exit__.return_value = False
  mock_response.headers.get_content_type.return_value = "image/jpeg"
  mock_response.read.return_value = jpeg

  with patch(
    "travelplanner.media.thumbnails.urllib.request.urlopen",
    return_value=mock_response,
  ):
    url = persist_thumbnail("instagram:ShortCode1", "https://cdn.example/cover.jpg")

  assert url == (
    "https://travelplanner-media-test.s3.us-east-1.amazonaws.com/"
    "thumbnails/instagram/ShortCode1.jpg"
  )
  stored = boto3.client("s3", region_name="us-east-1").get_object(
    Bucket=media_bucket,
    Key="thumbnails/instagram/ShortCode1.jpg",
  )
  assert stored["Body"].read() == jpeg
  assert stored["ContentType"] == "image/jpeg"


def test_persist_thumbnail_returns_none_on_download_error(media_bucket: str) -> None:
  with patch(
    "travelplanner.media.thumbnails.urllib.request.urlopen",
    side_effect=OSError("boom"),
  ):
    assert persist_thumbnail("instagram:x", "https://cdn.example/a.jpg") is None


def test_persist_post_thumbnail_step_rewrites_url(media_bucket: str) -> None:
  post = SavedPost(
    post_id="instagram:StepCode",
    post_url="https://www.instagram.com/reel/StepCode/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="hi",
    thumbnail_url="https://cdninstagram.com/old.jpg",
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)

  with patch(
    "travelplanner.steps.instagram.persist_thumbnail.persist_thumbnail",
    return_value=(
      "https://travelplanner-media-test.s3.us-east-1.amazonaws.com/"
      "thumbnails/instagram/StepCode.jpg"
    ),
  ):
    out = persist_post_thumbnail(ctx)

  assert out.post is not None
  assert out.post.thumbnail_url and out.post.thumbnail_url.startswith(
    "https://travelplanner-media-test.s3."
  )


def test_persist_post_thumbnail_keeps_cdn_when_persist_fails() -> None:
  post = SavedPost(
    post_id="instagram:KeepCdn",
    post_url="https://www.instagram.com/reel/KeepCdn/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="hi",
    thumbnail_url="https://cdninstagram.com/keep.jpg",
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)

  with patch(
    "travelplanner.steps.instagram.persist_thumbnail.persist_thumbnail",
    return_value=None,
  ):
    out = persist_post_thumbnail(ctx)

  assert out.post is not None
  assert out.post.thumbnail_url == "https://cdninstagram.com/keep.jpg"

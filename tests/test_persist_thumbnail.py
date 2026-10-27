from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import boto3
import pytest
from moto import mock_aws

from travelplanner.flow.context import IngestContext
from travelplanner.media.thumbnails import (
  is_durable_media_url,
  object_key,
  persist_avatar,
  persist_thumbnail,
  public_object_url,
  reset_s3_client_cache,
)
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.steps.instagram.persist_thumbnail import persist_post_thumbnail


@pytest.fixture()
def media_bucket(monkeypatch):
  monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)
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


def test_is_durable_media_url() -> None:
  assert not is_durable_media_url("https://scontent.cdninstagram.com/v/t51/123.jpg")
  assert is_durable_media_url("https://travelplanner-media-dev.s3.us-east-1.amazonaws.com/thumbnails/x.jpg")
  assert is_durable_media_url("https://public.blob.vercel-storage.com/thumbnails/instagram/abc-123.jpg")


def test_persist_thumbnail_skips_when_bucket_unset(monkeypatch) -> None:
  monkeypatch.delenv("MEDIA_BUCKET", raising=False)
  monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)
  assert persist_thumbnail("instagram:abc", "https://cdn.example/a.jpg") is None


def test_persist_thumbnail_uploads_to_s3(media_bucket: str) -> None:
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


def test_persist_thumbnail_uploads_to_vercel_blob(monkeypatch) -> None:
  monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_fake_token")
  monkeypatch.delenv("MEDIA_BUCKET", raising=False)

  jpeg = b"\xff\xd8\xff" + b"fake-jpeg"

  # Response 1: download_image
  dl_response = MagicMock()
  dl_response.__enter__.return_value = dl_response
  dl_response.__exit__.return_value = False
  dl_response.headers.get_content_type.return_value = "image/jpeg"
  dl_response.read.return_value = jpeg

  # Response 2: Vercel Blob PUT
  blob_response = MagicMock()
  blob_response.__enter__.return_value = blob_response
  blob_response.__exit__.return_value = False
  blob_response.read.return_value = json.dumps({
    "url": "https://fake.public.blob.vercel-storage.com/thumbnails/instagram/BlobCode.jpg"
  }).encode("utf-8")

  with patch(
    "travelplanner.media.thumbnails.urllib.request.urlopen",
    side_effect=[dl_response, blob_response],
  ):
    url = persist_thumbnail("instagram:BlobCode", "https://cdn.example/cover.jpg")

  assert url == "https://fake.public.blob.vercel-storage.com/thumbnails/instagram/BlobCode.jpg"


def test_persist_avatar_uploads(media_bucket: str) -> None:
  jpeg = b"\xff\xd8\xff" + b"fake-avatar"

  mock_response = MagicMock()
  mock_response.__enter__.return_value = mock_response
  mock_response.__exit__.return_value = False
  mock_response.headers.get_content_type.return_value = "image/jpeg"
  mock_response.read.return_value = jpeg

  with patch(
    "travelplanner.media.thumbnails.urllib.request.urlopen",
    return_value=mock_response,
  ):
    url = persist_avatar("creator_user", "https://cdn.example/avatar.jpg")

  assert url == (
    "https://travelplanner-media-test.s3.us-east-1.amazonaws.com/"
    "avatars/creator_user.jpg"
  )


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
    author_avatar_url="https://cdninstagram.com/avatar.jpg",
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)

  with (
    patch(
      "travelplanner.steps.instagram.persist_thumbnail.persist_thumbnail",
      return_value="https://travelplanner-media-test.s3.us-east-1.amazonaws.com/thumbnails/instagram/StepCode.jpg",
    ),
    patch(
      "travelplanner.steps.instagram.persist_thumbnail.persist_avatar",
      return_value="https://travelplanner-media-test.s3.us-east-1.amazonaws.com/avatars/instagram_StepCode.jpg",
    ),
  ):
    out = persist_post_thumbnail(ctx)

  assert out.post is not None
  assert out.post.thumbnail_url and out.post.thumbnail_url.startswith(
    "https://travelplanner-media-test.s3."
  )
  assert out.post.author_avatar_url and out.post.author_avatar_url.startswith(
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


def test_refresh_post_thumbnail_dry_run() -> None:
  from scripts.backfill_post_thumbnails import refresh_post_thumbnail
  post = SavedPost(
    post_id="instagram:BackfillCode",
    post_url="https://www.instagram.com/reel/BackfillCode/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="hi",
    thumbnail_url="https://cdninstagram.com/live.jpg",
  )
  with patch("scripts.backfill_post_thumbnails.fetch_post", return_value={"display_url": "https://cdn.example/fresh.jpg"}):
    res = refresh_post_thumbnail(post, force=True, dry_run=True)
  assert res == "updated"


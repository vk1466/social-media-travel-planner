from travelplanner import store
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.pipeline import ingest_link, ingest_links
from travelplanner.sources import PLATFORM_FETCHERS
from travelplanner.store import load_post, save_post


def _use_tmp_store(monkeypatch, tmp_path) -> None:
  monkeypatch.setattr(
    "travelplanner.pipeline.save_post",
    lambda post: store.save_post(post, data_dir=tmp_path),
  )
  monkeypatch.setattr(
    "travelplanner.pipeline.has_post",
    lambda platform, post_id: store.has_post(platform, post_id, data_dir=tmp_path),
  )


def _fake_instagram_post(post_url: str) -> SavedPost:
  shortcode = post_url.rstrip("/").split("/")[-1]
  return SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, shortcode),
    post_url=post_url,
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="test caption",
    fetched_at="2026-07-06T21:15:04Z",
  )


def test_ingest_link_saved(monkeypatch, tmp_path) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  _use_tmp_store(monkeypatch, tmp_path)

  result = ingest_link("https://www.instagram.com/p/abc123/")
  assert result.status == "saved"
  assert result.post_id == "instagram:abc123"


def test_ingest_link_skipped_when_already_stored(monkeypatch, tmp_path) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing, data_dir=tmp_path)

  def fail_fetch(_: str) -> SavedPost:
    raise AssertionError("fetch should not run when post is already stored")

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, fail_fetch)
  _use_tmp_store(monkeypatch, tmp_path)

  result = ingest_link("https://www.instagram.com/p/abc123/")
  assert result.status == "skipped"
  assert result.post_id == "instagram:abc123"


def test_ingest_link_refresh(monkeypatch, tmp_path) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing, data_dir=tmp_path)

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  _use_tmp_store(monkeypatch, tmp_path)

  result = ingest_link("https://www.instagram.com/p/abc123/", refresh=True)
  assert result.status == "saved"


def test_ingest_link_unsupported() -> None:
  result = ingest_link("https://example.com/unknown")
  assert result.status == "unsupported"


def test_ingest_link_unrouted_platform() -> None:
  result = ingest_link("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  assert result.status == "unsupported"


def test_ingest_link_error_isolation(monkeypatch, tmp_path) -> None:
  def fetch_or_fail(post_url: str) -> SavedPost:
    if "bad123" in post_url:
      raise RuntimeError("API down")
    return _fake_instagram_post(post_url)

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, fetch_or_fail)
  _use_tmp_store(monkeypatch, tmp_path)

  results = ingest_links(
    [
      "https://www.instagram.com/p/good123/",
      "https://www.instagram.com/p/bad123/",
    ]
  )
  assert len(results) == 2
  assert results[0].status == "saved"
  assert results[1].status == "error"


def test_ingest_link_attaches_place_ids_from_place_processing(monkeypatch, tmp_path) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  _use_tmp_store(monkeypatch, tmp_path)
  monkeypatch.setattr(
    "travelplanner.pipeline.process_post_places",
    lambda post: ("us-or-portland-multnomah-falls",),
  )

  result = ingest_link("https://www.instagram.com/p/withplace/")
  assert result.status == "saved"

  saved = load_post(Platform.INSTAGRAM, "withplace", data_dir=tmp_path)
  assert saved is not None
  assert saved.place_ids == ("us-or-portland-multnomah-falls",)


def test_ingest_link_saves_post_even_when_place_processing_fails(monkeypatch, tmp_path) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  _use_tmp_store(monkeypatch, tmp_path)

  def fail_places(post: SavedPost):
    raise RuntimeError("geocoder unavailable")

  monkeypatch.setattr("travelplanner.pipeline.process_post_places", fail_places)

  result = ingest_link("https://www.instagram.com/p/noplace/")
  assert result.status == "saved"

  saved = load_post(Platform.INSTAGRAM, "noplace", data_dir=tmp_path)
  assert saved is not None
  assert saved.place_ids == ()


def test_ingest_links_on_result_callback(monkeypatch, tmp_path) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  _use_tmp_store(monkeypatch, tmp_path)

  seen: list[str] = []

  ingest_links(
    [
      "https://www.instagram.com/p/one/",
      "https://www.instagram.com/p/two/",
    ],
    on_result=lambda result: seen.append(result.post_url),
  )

  assert len(seen) == 2

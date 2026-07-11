from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.place_hints import ExtractedPlace, PlatformPlace
from travelplanner.store import delete_post, has_post, load_all_posts, load_post, save_post


def _sample_post(native_id: str = "CjDN1tzMIjR") -> SavedPost:
  return SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, native_id),
    post_url=f"https://www.instagram.com/reel/{native_id}/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="3 days in Lisbon #lisbon",
    hashtags=("lisbon",),
    author_handle="wanderlust_ana",
    posted_at="2026-05-14T09:30:00Z",
    like_count=100,
    comment_count=5,
    top_comments=("Great spot!",),
    places=(
      PlatformPlace(
        place_name="Alfama",
        city="Lisbon",
        country="Portugal",
        latitude=38.7131,
        longitude=-9.1279,
      ),
    ),
    extracted_places=(
      ExtractedPlace(
        place_name="Alfama",
        city="Lisbon",
        country="Portugal",
        details="Historic neighborhood to explore.",
        tips=("Go early before crowds",),
      ),
    ),
    fetched_at="2026-07-06T21:15:04Z",
  )


def test_store_round_trip(tmp_path) -> None:
  post = _sample_post()
  path = save_post(post, data_dir=tmp_path)

  assert path.exists()
  assert path.name == "CjDN1tzMIjR.json"
  assert has_post(Platform.INSTAGRAM, "CjDN1tzMIjR", data_dir=tmp_path)
  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path)

  loaded = load_post(Platform.INSTAGRAM, "CjDN1tzMIjR", data_dir=tmp_path)
  assert loaded == post

  all_posts = load_all_posts(data_dir=tmp_path)
  assert all_posts == [post]


def test_load_normalizes_legacy_native_post_id(tmp_path) -> None:
  """Old files stored bare shortcodes; load upgrades to global post_id."""
  platform_dir = tmp_path / "instagram"
  platform_dir.mkdir(parents=True)
  legacy_path = platform_dir / "legacy123.json"
  legacy_path.write_text(
    """{
  "post_id": "legacy123",
  "post_url": "https://www.instagram.com/p/legacy123/",
  "platform": "instagram",
  "media_kind": "image",
  "caption": "old",
  "hashtags": [],
  "top_comments": [],
  "places": [],
  "extracted_places": [],
  "place_ids": []
}
""",
    encoding="utf-8",
  )

  loaded = load_post(Platform.INSTAGRAM, "legacy123", data_dir=tmp_path)
  assert loaded is not None
  assert loaded.post_id == "instagram:legacy123"


def test_has_post_returns_false_on_platform_mismatch(tmp_path) -> None:
  post = _sample_post()
  save_post(post, data_dir=tmp_path)

  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path) is True
  assert has_post(Platform.YOUTUBE, post.post_id, data_dir=tmp_path) is False
  assert load_post(Platform.YOUTUBE, post.post_id, data_dir=tmp_path) is None
  assert (
    delete_post(
      Platform.YOUTUBE,
      post.post_id,
      data_dir=tmp_path,
      places_data_dir=tmp_path / "places",
    )
    is False
  )
  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path) is True


def test_delete_post(tmp_path) -> None:
  post = _sample_post()
  save_post(post, data_dir=tmp_path)

  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path)

  assert delete_post(Platform.INSTAGRAM, "CjDN1tzMIjR", data_dir=tmp_path, places_data_dir=tmp_path / "places") is True
  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path) is False
  assert delete_post(Platform.INSTAGRAM, "CjDN1tzMIjR", data_dir=tmp_path, places_data_dir=tmp_path / "places") is False

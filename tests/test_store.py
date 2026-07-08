from travelplanner.models import ExtractedPlace, Place, Platform, SavedPost
from travelplanner.store import delete_post, has_post, load_all_posts, load_post, save_post


def _sample_post(post_id: str = "CjDN1tzMIjR") -> SavedPost:
  return SavedPost(
    post_id=post_id,
    post_url=f"https://www.instagram.com/reel/{post_id}/",
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
      Place(
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
  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path)

  loaded = load_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path)
  assert loaded == post

  all_posts = load_all_posts(data_dir=tmp_path)
  assert all_posts == [post]

  save_post(_sample_post("AnotherPost1"), data_dir=tmp_path)
  instagram_posts = load_all_posts(platform=Platform.INSTAGRAM, data_dir=tmp_path)
  assert len(instagram_posts) == 2


def test_delete_post(tmp_path) -> None:
  post = _sample_post()
  save_post(post, data_dir=tmp_path)
  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path)

  assert delete_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path) is True
  assert has_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path) is False
  assert delete_post(Platform.INSTAGRAM, post.post_id, data_dir=tmp_path) is False

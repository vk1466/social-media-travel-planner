from dataclasses import replace

from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.movie_hints import ExtractedMovie, ResolvedMovie
from travelplanner.place_hints import ExtractedPlace, PlatformPlace
from travelplanner.store import delete_post, has_post, load_all_posts, load_post, post_from_dict, save_post


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


def test_store_round_trip(dynamodb) -> None:
  post = _sample_post()
  save_post(post)

  assert has_post(Platform.INSTAGRAM, "CjDN1tzMIjR")
  assert has_post(Platform.INSTAGRAM, post.post_id)

  loaded = load_post(Platform.INSTAGRAM, "CjDN1tzMIjR")
  assert loaded == post

  all_posts = load_all_posts()
  assert all_posts == [post]


def test_store_round_trip_content_category(dynamodb) -> None:
  post = replace(_sample_post(), content_category="fashion")
  save_post(post)
  loaded = load_post(Platform.INSTAGRAM, post.post_id)
  assert loaded is not None
  assert loaded.content_category == "fashion"


def test_store_round_trip_extracted_movies(dynamodb) -> None:
  post = replace(
    _sample_post(),
    content_category="movies",
    extracted_movies=(
      ExtractedMovie(title="Dune: Part Two", year=2024, details="Trailer."),
    ),
  )
  save_post(post)
  loaded = load_post(Platform.INSTAGRAM, post.post_id)
  assert loaded is not None
  assert loaded.extracted_movies == post.extracted_movies


def test_store_round_trip_resolved_movies(dynamodb) -> None:
  post = replace(
    _sample_post(),
    content_category="movies",
    resolved_movies=(
      ResolvedMovie(
        tmdb_id=424694,
        title="Bohemian Rhapsody",
        imdb_id="tt1727824",
        year=2018,
        runtime_minutes=135,
        original_language="en",
        genres=("Music", "Drama"),
        classification="PG-13",
        plot_summary="Queen origin story.",
        imdb_rating=7.9,
        rotten_tomatoes_percent=60,
        review_summary="Strong lead, mixed overall.",
      ),
    ),
  )
  save_post(post)
  loaded = load_post(Platform.INSTAGRAM, post.post_id)
  assert loaded is not None
  assert loaded.resolved_movies == post.resolved_movies


def test_store_round_trip_resolved_tv(dynamodb) -> None:
  post = replace(
    _sample_post(),
    content_category="movies",
    extracted_movies=(
      ExtractedMovie(title="Stranger Things", year=2016, kind="tv"),
    ),
    resolved_movies=(
      ResolvedMovie(
        tmdb_id=66732,
        title="Stranger Things",
        imdb_id="tt4574334",
        year=2016,
        runtime_minutes=50,
        original_language="en",
        genres=("Sci-Fi & Fantasy", "Drama"),
        classification="TV-14",
        plot_summary="Kids in Hawkins.",
        imdb_rating=8.7,
        rotten_tomatoes_percent=92,
        kind="tv",
        number_of_seasons=5,
      ),
    ),
  )
  save_post(post)
  loaded = load_post(Platform.INSTAGRAM, post.post_id)
  assert loaded is not None
  assert loaded.extracted_movies == post.extracted_movies
  assert loaded.resolved_movies == post.resolved_movies


def test_load_normalizes_legacy_native_post_id(dynamodb) -> None:
  """Legacy records stored bare shortcodes; load upgrades to global post_id."""
  save_post(
    post_from_dict(
      {
        "post_id": "legacy123",
        "post_url": "https://www.instagram.com/p/legacy123/",
        "platform": "instagram",
        "media_kind": "image",
        "caption": "old",
        "hashtags": [],
        "top_comments": [],
        "places": [],
        "extracted_places": [],
        "place_ids": [],
      }
    )
  )

  loaded = load_post(Platform.INSTAGRAM, "legacy123")
  assert loaded is not None
  assert loaded.post_id == "instagram:legacy123"


def test_has_post_returns_false_on_platform_mismatch(dynamodb) -> None:
  post = _sample_post()
  save_post(post)

  assert has_post(Platform.INSTAGRAM, post.post_id) is True
  assert has_post(Platform.YOUTUBE, post.post_id) is False
  assert load_post(Platform.YOUTUBE, post.post_id) is None
  assert delete_post(Platform.YOUTUBE, post.post_id) is False
  assert has_post(Platform.INSTAGRAM, post.post_id) is True


def test_delete_post(dynamodb) -> None:
  post = _sample_post()
  save_post(post)

  assert has_post(Platform.INSTAGRAM, post.post_id)
  assert delete_post(Platform.INSTAGRAM, "CjDN1tzMIjR") is True
  assert has_post(Platform.INSTAGRAM, post.post_id) is False
  assert delete_post(Platform.INSTAGRAM, "CjDN1tzMIjR") is False

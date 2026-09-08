from dataclasses import replace
from unittest.mock import patch

from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.movie_hints import ExtractedMovie, ResolvedMovie
from travelplanner.movie_resolve import resolve_extracted_movies, rotten_tomatoes_percent
from travelplanner.steps.resolve_movies import resolve_movies


def test_rotten_tomatoes_percent_parses() -> None:
  assert rotten_tomatoes_percent(
    [
      {"Source": "Internet Movie Database", "Value": "7.9/10"},
      {"Source": "Rotten Tomatoes", "Value": "60%"},
    ]
  ) == 60
  assert rotten_tomatoes_percent([]) is None


def test_resolve_extracted_movies_skips_without_tmdb_key() -> None:
  with patch("travelplanner.movie_resolve.tmdb.api_key", return_value=None):
    assert resolve_extracted_movies((ExtractedMovie(title="Dune"),)) == ()


def test_resolve_extracted_movies_combines_tmdb_and_omdb() -> None:
  extracted = ExtractedMovie(title="Bohemian Rhapsody", year=2018)
  hit = {"id": 424694, "title": "Bohemian Rhapsody", "release_date": "2018-10-24"}
  details = {
    "id": 424694,
    "title": "Bohemian Rhapsody",
    "release_date": "2018-10-24",
    "runtime": 135,
    "original_language": "en",
    "overview": "Queen origin story.",
    "genres": [{"name": "Music"}, {"name": "Drama"}],
    "external_ids": {"imdb_id": "tt1727824"},
    "release_dates": {
      "results": [
        {
          "iso_3166_1": "US",
          "release_dates": [{"certification": "PG-13"}],
        }
      ]
    },
    "reviews": {"results": [{"author": "A", "content": "Great performances."}]},
  }
  omdb_payload = {
    "imdbRating": "7.9",
    "Ratings": [{"Source": "Rotten Tomatoes", "Value": "60%"}],
  }

  with (
    patch("travelplanner.movie_resolve.tmdb.api_key", return_value="tmdb"),
    patch("travelplanner.movie_resolve.tmdb.search_movie", return_value=hit),
    patch("travelplanner.movie_resolve.tmdb.movie_details", return_value=details),
    patch("travelplanner.movie_resolve.omdb.by_imdb_id", return_value=omdb_payload),
    patch("travelplanner.movie_resolve._summarize_reviews", return_value="Strong lead, mixed overall."),
  ):
    resolved = resolve_extracted_movies((extracted,))

  assert len(resolved) == 1
  movie = resolved[0]
  assert movie.tmdb_id == 424694
  assert movie.imdb_id == "tt1727824"
  assert movie.runtime_minutes == 135
  assert movie.original_language == "en"
  assert movie.genres == ("Music", "Drama")
  assert movie.classification == "PG-13"
  assert movie.imdb_rating == 7.9
  assert movie.rotten_tomatoes_percent == 60
  assert movie.review_summary == "Strong lead, mixed overall."
  assert movie.kind == "movie"


def test_resolve_extracted_tv_uses_tmdb_tv_endpoints() -> None:
  extracted = ExtractedMovie(title="Stranger Things", year=2016, kind="tv")
  hit = {"id": 66732, "name": "Stranger Things", "first_air_date": "2016-07-15"}
  details = {
    "id": 66732,
    "name": "Stranger Things",
    "first_air_date": "2016-07-15",
    "episode_run_time": [50],
    "number_of_seasons": 5,
    "original_language": "en",
    "overview": "Kids in Hawkins.",
    "genres": [{"name": "Sci-Fi & Fantasy"}, {"name": "Drama"}],
    "external_ids": {"imdb_id": "tt4574334"},
    "content_ratings": {
      "results": [{"iso_3166_1": "US", "rating": "TV-14"}]
    },
    "reviews": {"results": []},
  }
  omdb_payload = {
    "imdbRating": "8.7",
    "Ratings": [{"Source": "Rotten Tomatoes", "Value": "92%"}],
  }

  with (
    patch("travelplanner.movie_resolve.tmdb.api_key", return_value="tmdb"),
    patch("travelplanner.movie_resolve.tmdb.search_tv", return_value=hit) as search_tv,
    patch("travelplanner.movie_resolve.tmdb.tv_details", return_value=details),
    patch("travelplanner.movie_resolve.tmdb.search_movie") as search_movie,
    patch("travelplanner.movie_resolve.omdb.by_imdb_id", return_value=omdb_payload),
    patch("travelplanner.movie_resolve._summarize_reviews", return_value=None),
  ):
    resolved = resolve_extracted_movies((extracted,))

  search_tv.assert_called_once_with("Stranger Things", 2016)
  search_movie.assert_not_called()
  assert len(resolved) == 1
  show = resolved[0]
  assert show.tmdb_id == 66732
  assert show.kind == "tv"
  assert show.imdb_id == "tt4574334"
  assert show.year == 2016
  assert show.runtime_minutes == 50
  assert show.number_of_seasons == 5
  assert show.classification == "TV-14"
  assert show.imdb_rating == 8.7
  assert show.rotten_tomatoes_percent == 92


def test_resolve_movies_step_stamps_post() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/reel/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="Bohemian Rhapsody",
    extracted_movies=(ExtractedMovie(title="Bohemian Rhapsody", year=2018),),
  )
  catalog = (
    ResolvedMovie(
      tmdb_id=424694,
      title="Bohemian Rhapsody",
      imdb_id="tt1727824",
      year=2018,
      runtime_minutes=135,
      imdb_rating=7.9,
      rotten_tomatoes_percent=60,
    ),
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)
  with patch(
    "travelplanner.steps.resolve_movies.resolve_extracted_movies",
    return_value=catalog,
  ):
    result = resolve_movies(ctx)
  assert result.post is not None
  assert result.post.resolved_movies == catalog
  assert result.post == replace(post, resolved_movies=catalog)


def test_resolve_extracted_movies_enriches_media_and_providers() -> None:
  extracted = ExtractedMovie(title="Oppenheimer", year=2023)
  hit = {
    "id": 872585,
    "title": "Oppenheimer",
    "poster_path": "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "backdrop_path": "/rLb2cw0iwOaxnxGI8Ao0vvugVwh.jpg",
  }
  details = {
    "id": 872585,
    "title": "Oppenheimer",
    "release_date": "2023-07-21",
    "runtime": 181,
    "poster_path": "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "backdrop_path": "/rLb2cw0iwOaxnxGI8Ao0vvugVwh.jpg",
    "overview": "The story of J. Robert Oppenheimer.",
    "videos": {
      "results": [
        {"site": "YouTube", "type": "Teaser", "key": "teaser123"},
        {"site": "YouTube", "type": "Trailer", "key": "uYPbbksJxIg"},
      ]
    },
    "credits": {
      "cast": [
        {"name": "Cillian Murphy"},
        {"name": "Emily Blunt"},
        {"name": "Matt Damon"},
        {"name": "Robert Downey Jr."},
        {"name": "Florence Pugh"},
      ],
      "crew": [
        {"name": "Christopher Nolan", "job": "Director"},
        {"name": "Emma Thomas", "job": "Producer"},
      ],
    },
    "watch/providers": {
      "results": {
        "US": {
          "flatrate": [
            {"provider_id": 8, "provider_name": "Netflix"},
            {"provider_id": 384, "provider_name": "Max"},
          ]
        }
      }
    },
  }

  with (
    patch("travelplanner.movie_resolve.tmdb.api_key", return_value="tmdb"),
    patch("travelplanner.movie_resolve.tmdb.search_movie", return_value=hit),
    patch("travelplanner.movie_resolve.tmdb.movie_details", return_value=details),
    patch("travelplanner.movie_resolve.omdb.by_imdb_id", return_value=None),
  ):
    resolved = resolve_extracted_movies((extracted,))

  assert len(resolved) == 1
  movie = resolved[0]
  assert movie.poster_url == "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"
  assert movie.backdrop_url == "https://image.tmdb.org/t/p/w1280/rLb2cw0iwOaxnxGI8Ao0vvugVwh.jpg"
  assert movie.trailer_youtube_key == "uYPbbksJxIg"
  assert movie.directors == ("Christopher Nolan",)
  assert movie.cast == ("Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr.")
  assert movie.watch_providers == ("Netflix", "Max")


def test_resolve_extracted_movies_cross_search_fallback() -> None:
  # LLM extracted kind="movie", but it is actually a TV show
  extracted = ExtractedMovie(title="Chernobyl", year=2019, kind="movie")
  tv_hit = {"id": 87108, "name": "Chernobyl", "first_air_date": "2019-05-06"}
  details = {
    "id": 87108,
    "name": "Chernobyl",
    "created_by": [{"name": "Craig Mazin"}],
    "number_of_seasons": 1,
    "overview": "The true story of Chernobyl.",
  }

  with (
    patch("travelplanner.movie_resolve.tmdb.api_key", return_value="tmdb"),
    patch("travelplanner.movie_resolve.tmdb.search_movie", return_value=None),
    patch("travelplanner.movie_resolve.tmdb.search_tv", return_value=tv_hit) as search_tv,
    patch("travelplanner.movie_resolve.tmdb.tv_details", return_value=details),
    patch("travelplanner.movie_resolve.omdb.by_imdb_id", return_value=None),
  ):
    resolved = resolve_extracted_movies((extracted,))

  search_tv.assert_called_once_with("Chernobyl", 2019)
  assert len(resolved) == 1
  assert resolved[0].title == "Chernobyl"
  assert resolved[0].kind == "tv"
  assert resolved[0].directors == ("Craig Mazin",)

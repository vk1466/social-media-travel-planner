from travelplanner.movie_extract import MOVIE_EXTRACT_PROMPT, _parse_extracted_movies
from travelplanner.movie_hints import ExtractedMovie


def test_parse_extracted_movies() -> None:
  movies = _parse_extracted_movies(
    {
      "movies": [
        {
          "title": "Dune: Part Two",
          "year": 2024,
          "details": "Official trailer.",
          "kind": "movie",
        },
        {
          "title": "Interstellar",
          "year": None,
          "details": None,
        },
      ]
    }
  )
  assert movies == (
    ExtractedMovie(
      title="Dune: Part Two",
      year=2024,
      details="Official trailer.",
      kind="movie",
    ),
    ExtractedMovie(title="Interstellar"),
  )


def test_parse_extracted_tv_series() -> None:
  movies = _parse_extracted_movies(
    {
      "movies": [
        {
          "title": "Stranger Things",
          "year": 2016,
          "details": "Season 5 trailer.",
          "kind": "tv",
        },
        {
          "title": "The Bear",
          "year": 2022,
          "details": None,
          "kind": "series",
        },
      ]
    }
  )
  assert movies == (
    ExtractedMovie(
      title="Stranger Things",
      year=2016,
      details="Season 5 trailer.",
      kind="tv",
    ),
    ExtractedMovie(title="The Bear", year=2022, kind="tv"),
  )


def test_parse_extracted_movies_dedupes_and_drops_bad_rows() -> None:
  movies = _parse_extracted_movies(
    {
      "movies": [
        {"title": "Dune", "year": 2021, "details": None},
        {"title": "Dune", "year": 2021, "details": "dup"},
        {"title": "  ", "year": 2020, "details": None},
        {"title": "Old Film", "year": 1800, "details": None},
        "nope",
      ]
    }
  )
  assert movies == (
    ExtractedMovie(title="Dune", year=2021),
    ExtractedMovie(title="Old Film"),
  )


def test_parse_extracted_movies_empty() -> None:
  assert _parse_extracted_movies(None) == ()
  assert _parse_extracted_movies({}) == ()
  assert _parse_extracted_movies({"movies": []}) == ()


def test_extract_prompt_includes_tv_series() -> None:
  assert "kind=tv" in MOVIE_EXTRACT_PROMPT
  assert "TV series" in MOVIE_EXTRACT_PROMPT

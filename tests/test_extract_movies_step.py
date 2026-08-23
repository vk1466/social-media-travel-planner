from dataclasses import replace
from unittest.mock import patch

from travelplanner.extract import ContentBundle, ContentSnippet
from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.movie_hints import ExtractedMovie
from travelplanner.steps.extract_movies import extract_movies


def test_extract_movies_uses_snippets() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/reel/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="Dune Part Two trailer is out",
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)
  movies = (ExtractedMovie(title="Dune: Part Two", year=2024),)

  with patch(
    "travelplanner.steps.extract_movies.fetch_movies_from_snippets",
    return_value=movies,
  ) as mock_fetch:
    result = extract_movies(ctx)

  assert mock_fetch.call_count == 1
  snippets = mock_fetch.call_args.args[0]
  assert snippets == (
    ContentSnippet(source="caption", text="Dune Part Two trailer is out"),
  )
  assert result.content_bundle == ContentBundle(caption="Dune Part Two trailer is out")
  assert result.post is not None
  assert result.post.extracted_movies == movies


def test_extract_movies_prefers_existing_content_bundle() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/reel/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="ignored",
  )
  bundle = ContentBundle(caption="Watch Interstellar", transcript="Nolan IMAX")
  ctx = IngestContext(
    post_url=post.post_url,
    user_id="u1",
    post=post,
    content_bundle=bundle,
  )
  movies = (ExtractedMovie(title="Interstellar", year=2014),)

  with patch(
    "travelplanner.steps.extract_movies.fetch_movies_from_snippets",
    return_value=movies,
  ) as mock_fetch:
    result = extract_movies(ctx)

  snippets = mock_fetch.call_args.args[0]
  assert [s.source for s in snippets] == ["caption", "transcript"]
  assert result.post is not None
  assert result.post == replace(post, extracted_movies=movies)

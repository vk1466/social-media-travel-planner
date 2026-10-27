from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost
from travelplanner.steps.instagram.fetch_transcript import (
  fetch_transcript_step,
  is_music_transcript,
)


def test_is_music_transcript_detects_notes_and_tags() -> None:
  assert is_music_transcript("♪ I'm in love with the shape of you ♪")
  assert is_music_transcript("[Music] background song playing [Music]")
  assert is_music_transcript("Verse one\n♪ singing in the rain ♪\nChorus")


def test_is_music_transcript_detects_repetitive_lyrics() -> None:
  lyrics = (
    "yeah yeah baby oh oh\n"
    "la la la la la\n"
    "yeah yeah baby\n"
    "oh oh yeah"
  )
  assert is_music_transcript(lyrics)


def test_is_music_transcript_allows_speech() -> None:
  speech = (
    "Today we are exploring the top 5 hidden gems in Rome.\n"
    "First, head to the Orange Garden for incredible views of St. Peter's Basilica.\n"
    "Next, walk down the hill to the Mouth of Truth."
  )
  assert not is_music_transcript(speech)


def test_fetch_transcript_step_flags_music(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.steps.instagram.fetch_transcript.fetch_transcript",
    lambda url: "♪ yeah yeah baby la la la ♪",
  )
  post = SavedPost(
    post_id="instagram:test1234",
    post_url="https://www.instagram.com/reel/test1234/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="A video",
  )
  ctx = IngestContext(
    post_url=post.post_url,
    user_id="user1",
    resource_type="reel",
    shortcode="test1234",
    post=post,
  )
  result_ctx = fetch_transcript_step(ctx)
  assert result_ctx.transcript_is_music is True
  assert result_ctx.post.transcript_is_music is True

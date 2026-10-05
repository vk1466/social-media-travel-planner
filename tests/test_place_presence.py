from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.places.place_presence import PLACE_NAMED_NOUL_MIN, places_named_in_text
from travelplanner.steps.detect_named_places import detect_named_places


def test_places_named_when_noul_clears_the_threshold(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    assert "Smith Rock" in state
    assert questions["named_place"]["type"] == "noul"
    return {"answers": {"named_place": {"type": "noul", "noul": PLACE_NAMED_NOUL_MIN}}}

  monkeypatch.setattr("travelplanner.places.place_presence.system_one", fake_system_one)
  assert places_named_in_text("CAPTION: Smith Rock at sunrise") is True


def test_places_not_named_on_a_weak_yes(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.places.place_presence.system_one",
    lambda **_: {"answers": {"named_place": {"type": "noul", "noul": PLACE_NAMED_NOUL_MIN - 0.01}}},
  )
  assert places_named_in_text("CAPTION: best coffee in Tokyo") is False


def test_places_not_named_when_jev_is_down(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    raise RuntimeError("JEV_API_KEY is not set")

  monkeypatch.setattr("travelplanner.places.place_presence.system_one", fake_system_one)
  assert places_named_in_text("CAPTION: Smith Rock") is False


def test_empty_text_skips_jev(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    raise AssertionError("Jev should not run")

  monkeypatch.setattr("travelplanner.places.place_presence.system_one", fake_system_one)
  assert places_named_in_text("  ") is False


def test_detect_named_places_uses_caption_and_transcript(monkeypatch) -> None:
  seen: list[str] = []

  def fake_system_one(*, state: str, questions: dict) -> dict:
    seen.append(state)
    return {"answers": {"named_place": {"type": "noul", "noul": 0.95}}}

  monkeypatch.setattr("travelplanner.places.place_presence.system_one", fake_system_one)
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/reel/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="sunrise hike",
  )
  ctx = IngestContext(
    post_url=post.post_url,
    user_id="u1",
    post=post,
    resource_type="reel",
    transcript="We started at Smith Rock",
  )
  result = detect_named_places(ctx)
  assert result.text_names_places is True
  assert "sunrise hike" in seen[0]
  assert "Smith Rock" in seen[0]


def test_detect_named_places_skips_an_image() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/p/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="Smith Rock",
  )
  ctx = IngestContext(
    post_url=post.post_url,
    user_id="u1",
    post=post,
    resource_type="image",
  )
  result = detect_named_places(ctx)
  assert result.text_names_places is False

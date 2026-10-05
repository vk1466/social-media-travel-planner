import pytest

from travelplanner.content_category_jev import (
  CATEGORY_CONFIDENCE_MIN,
  CATEGORY_INSTRUCTIONS,
  CategoryCheckError,
  category_from_text,
)


def test_category_instructions_keep_venues_in_travel() -> None:
  assert "TV series" in CATEGORY_INSTRUCTIONS
  assert "visitable venue" in CATEGORY_INSTRUCTIONS
  assert "use travel, not food" in CATEGORY_INSTRUCTIONS


def test_category_from_text_accepts_a_confident_choice(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    assert "bob" in state
    assert questions["content_category"]["type"] == "choice"
    return {
      "answers": {
        "content_category": {
          "type": "choice",
          "choice": "hairstyle",
          "confidence": CATEGORY_CONFIDENCE_MIN,
        }
      }
    }

  monkeypatch.setattr("travelplanner.content_category_jev.system_one", fake_system_one)
  assert category_from_text("CAPTION: bob haircut") == "hairstyle"


def test_category_from_text_drops_a_weak_choice(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.content_category_jev.system_one",
    lambda **_: {
      "answers": {
        "content_category": {
          "type": "choice",
          "choice": "food",
          "confidence": CATEGORY_CONFIDENCE_MIN - 0.01,
        }
      }
    },
  )
  assert category_from_text("CAPTION: recipe") is None


def test_category_from_text_raises_when_jev_is_down(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    raise RuntimeError("JEV_API_KEY is not set")

  monkeypatch.setattr("travelplanner.content_category_jev.system_one", fake_system_one)
  with pytest.raises(CategoryCheckError):
    category_from_text("CAPTION: hiking")

from travelplanner import settings


def test_mindcase_api_key_unset_is_none(monkeypatch) -> None:
  monkeypatch.delenv("MINDCASE_API_KEY", raising=False)
  assert settings.mindcase_api_key() is None


def test_mindcase_api_key_strips(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "  mk_live_abc  ")
  assert settings.mindcase_api_key() == "mk_live_abc"

from travelplanner import settings


def test_omdb_api_key_unset_is_none(monkeypatch) -> None:
  monkeypatch.delenv("OMDB_API_KEY", raising=False)
  assert settings.omdb_api_key() is None


def test_omdb_api_key_strips(monkeypatch) -> None:
  monkeypatch.setenv("OMDB_API_KEY", "  abc123  ")
  assert settings.omdb_api_key() == "abc123"

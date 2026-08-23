from travelplanner import settings


def test_tmdb_api_key_unset_is_none(monkeypatch) -> None:
  monkeypatch.delenv("TMDB_API_KEY", raising=False)
  assert settings.tmdb_api_key() is None


def test_tmdb_api_key_strips(monkeypatch) -> None:
  monkeypatch.setenv("TMDB_API_KEY", "  abc123  ")
  assert settings.tmdb_api_key() == "abc123"

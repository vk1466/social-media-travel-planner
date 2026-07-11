from fastapi.testclient import TestClient

from server.app import app
from server.media_proxy import is_allowed_media_url


def test_is_allowed_media_url() -> None:
  assert is_allowed_media_url("https://scontent-ord5-1.cdninstagram.com/v/t51.jpg")
  assert is_allowed_media_url("https://instagram.flux2-1.fna.fbcdn.net/v/t51.jpg")
  assert not is_allowed_media_url("https://evil.example.com/x.jpg")
  assert not is_allowed_media_url("ftp://cdninstagram.com/x.jpg")


def test_proxy_media_rejects_disallowed_host() -> None:
  client = TestClient(app)
  response = client.get("/api/media/proxy", params={"url": "https://evil.example.com/a.jpg"})
  assert response.status_code == 400

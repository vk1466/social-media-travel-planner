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


def test_proxy_media_success_without_auth(monkeypatch) -> None:
  from io import BytesIO
  from unittest.mock import MagicMock
  import urllib.request

  mock_resp = MagicMock()
  mock_resp.read.return_value = b"fake-jpeg-binary-data"
  mock_resp.headers.get_content_type.return_value = "image/jpeg"
  mock_resp.__enter__.return_value = mock_resp
  mock_resp.__exit__.return_value = None

  monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout, context: mock_resp)

  client = TestClient(app)
  # Ensure no Authorization header is needed
  response = client.get("/api/media/proxy", params={"url": "https://scontent-ord5-1.cdninstagram.com/v/t51.jpg"})
  assert response.status_code == 200
  assert response.content == b"fake-jpeg-binary-data"
  assert response.headers["content-type"] == "image/jpeg"
  assert response.headers["access-control-allow-origin"] == "*"
  assert "public" in response.headers["cache-control"]

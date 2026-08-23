from travelplanner.clients import mindcase


def test_fetch_post_polls_until_completed(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "mk_live_test")
  monkeypatch.setattr(mindcase, "POLL_INTERVAL_SECONDS", 0)
  calls: list[tuple[str, str]] = []

  def fake_request(method: str, path: str, body: dict | None = None) -> dict:
    calls.append((method, path))
    if method == "POST":
      return {"job_id": "job_1", "status": "queued"}
    gets = [c for c in calls if c[0] == "GET"]
    if len(gets) == 1:
      return {"status": "running"}
    return {
      "status": "completed",
      "data": [
        {
          "postUrl": "https://www.instagram.com/p/abc/",
          "caption": "hello",
        }
      ],
    }

  monkeypatch.setattr(mindcase, "_request", fake_request)
  row = mindcase.fetch_post(shortcode="abc")
  assert row["caption"] == "hello"
  assert calls[0] == ("POST", mindcase.POSTS_RUN_PATH)
  assert any(path.endswith("/results") for _, path in calls)


def test_fetch_post_returns_inline_completed(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "mk_live_test")

  def fake_request(method: str, path: str, body: dict | None = None) -> dict:
    assert method == "POST"
    assert body == {
      "params": {"postUrls": ["https://www.instagram.com/reel/xyz/"]}
    }
    return {
      "job_id": "job_2",
      "status": "completed",
      "data": [{"postUrl": "https://www.instagram.com/reel/xyz/", "likes": 9}],
    }

  monkeypatch.setattr(mindcase, "_request", fake_request)
  row = mindcase.fetch_post(post_url="https://www.instagram.com/reel/xyz/")
  assert row["likes"] == 9


def test_fetch_posts_for_handle_passes_max_results(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "mk_live_test")

  def fake_request(method: str, path: str, body: dict | None = None) -> dict:
    assert body == {"params": {"handles": "natgeo", "maxResults": 5}}
    return {
      "status": "completed",
      "data": [
        {"postUrl": "https://www.instagram.com/p/one/"},
        {"postUrl": "https://www.instagram.com/p/two/"},
      ],
    }

  monkeypatch.setattr(mindcase, "_request", fake_request)
  rows = mindcase.fetch_posts_for_handle("natgeo", max_results=5)
  assert len(rows) == 2


def test_fetch_post_raises_when_empty(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "mk_live_test")
  monkeypatch.setattr(
    mindcase,
    "_request",
    lambda method, path, body=None: {"status": "completed", "data": []},
  )
  try:
    mindcase.fetch_post(shortcode="missing")
    assert False, "expected RuntimeError"
  except RuntimeError as exc:
    assert "no post" in str(exc)


def test_fetch_post_raises_without_key(monkeypatch) -> None:
  monkeypatch.delenv("MINDCASE_API_KEY", raising=False)
  try:
    mindcase.fetch_post(shortcode="abc")
    assert False, "expected RuntimeError"
  except RuntimeError as exc:
    assert "MINDCASE_API_KEY" in str(exc)

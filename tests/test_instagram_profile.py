from travelplanner.sources.instagram_profile import (
  list_recent_post_urls,
  normalize_instagram_username,
)


def test_normalize_instagram_username() -> None:
  assert normalize_instagram_username("@Travel.User") == "Travel.User"
  assert (
    normalize_instagram_username("https://www.instagram.com/travel.user/")
    == "travel.user"
  )


def test_normalize_instagram_username_rejects_bad() -> None:
  try:
    normalize_instagram_username("bad name")
    assert False, "expected ValueError"
  except ValueError:
    pass


def test_list_recent_post_urls_truncates(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.sources.instagram_profile.fetch_posts_for_handle",
    lambda username, *, max_results: [
      {"postUrl": "https://www.instagram.com/reel/aaa/"},
      {"postUrl": "https://www.instagram.com/p/bbb/"},
      {"postUrl": "https://www.instagram.com/p/ccc/"},
      {"postUrl": "https://www.instagram.com/p/ddd/"},
    ][:max_results],
  )

  urls = list_recent_post_urls("someone", limit=2)
  assert urls == [
    "https://www.instagram.com/reel/aaa/",
    "https://www.instagram.com/p/bbb/",
  ]


def test_list_recent_post_urls_skips_blank_and_dupes(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.sources.instagram_profile.fetch_posts_for_handle",
    lambda username, *, max_results: [
      {"postUrl": "https://www.instagram.com/reel/reelCode1/"},
      {"postUrl": ""},
      {"postUrl": "https://www.instagram.com/reel/reelCode1/"},
      {"postUrl": "https://www.instagram.com/p/photoCode2/"},
    ],
  )

  urls = list_recent_post_urls("someone", limit=5)
  assert urls == [
    "https://www.instagram.com/reel/reelCode1/",
    "https://www.instagram.com/p/photoCode2/",
  ]

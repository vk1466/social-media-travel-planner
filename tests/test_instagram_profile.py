from travelplanner.sources.instagram_profile import (
  limit_to_depth_chunk,
  list_recent_post_urls,
  normalize_instagram_username,
)


def test_limit_to_depth_chunk_small() -> None:
  assert limit_to_depth_chunk(5) == (1, 5)
  assert limit_to_depth_chunk(1) == (1, 1)
  assert limit_to_depth_chunk(20) == (1, 20)


def test_limit_to_depth_chunk_large() -> None:
  assert limit_to_depth_chunk(21) == (2, 20)
  assert limit_to_depth_chunk(40) == (2, 20)
  assert limit_to_depth_chunk(41) == (3, 20)


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
    "travelplanner.sources.instagram_profile.fetch_user_info",
    lambda *, username: {"pk": 123, "username": username},
  )
  monkeypatch.setattr(
    "travelplanner.sources.instagram_profile.fetch_user_posts",
    lambda *, user_id, depth, chunk_size: {
      "posts": [
        {"code": "aaa", "product_type": "clips"},
        {"code": "bbb", "media_type": 1},
        {"code": "ccc", "media_type": 1},
        {"code": "ddd", "media_type": 1},
      ]
    },
  )

  urls = list_recent_post_urls("someone", limit=2)
  assert urls == [
    "https://www.instagram.com/reel/aaa/",
    "https://www.instagram.com/p/bbb/",
  ]


def test_list_recent_post_urls_unwraps_graphql_nodes(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.sources.instagram_profile.fetch_user_info",
    lambda *, username: {"pk": 123, "username": username},
  )
  monkeypatch.setattr(
    "travelplanner.sources.instagram_profile.fetch_user_posts",
    lambda *, user_id, depth, chunk_size: {
      "count": 2,
      "posts": [
        {
          "node": {
            "__typename": "GraphVideo",
            "shortcode": "reelCode1",
            "product_type": "clips",
            "is_video": True,
          }
        },
        {
          "node": {
            "__typename": "GraphImage",
            "shortcode": "photoCode2",
            "is_video": False,
          }
        },
      ],
    },
  )

  urls = list_recent_post_urls("someone", limit=5)
  assert urls == [
    "https://www.instagram.com/reel/reelCode1/",
    "https://www.instagram.com/p/photoCode2/",
  ]

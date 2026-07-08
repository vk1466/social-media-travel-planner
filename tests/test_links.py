import pytest

from travelplanner.links import detect_platform, extract_instagram_shortcode, extract_post_id
from travelplanner.models import Platform


@pytest.mark.parametrize(
  ("url", "expected"),
  [
    ("https://www.instagram.com/p/CjDN1tzMIjR/", "CjDN1tzMIjR"),
    ("https://instagram.com/reel/CjDN1tzMIjR", "CjDN1tzMIjR"),
    ("https://www.instagram.com/reels/DacxT80BYau/", "DacxT80BYau"),
    ("https://www.instagram.com/tv/ABC123_xyz/?utm_source=share", "ABC123_xyz"),
    ("https://www.instagram.com/p/CjDN1tzMIjR?igsh=abc", "CjDN1tzMIjR"),
  ],
)
def test_extract_instagram_shortcode(url: str, expected: str) -> None:
  assert extract_instagram_shortcode(url) == expected


@pytest.mark.parametrize(
  "url",
  [
    "https://www.instagram.com/wanderlust_ana/",
    "https://www.instagram.com/explore/tags/lisbon/",
    "not-a-url",
  ],
)
def test_extract_instagram_shortcode_invalid(url: str) -> None:
  with pytest.raises(ValueError, match="Could not extract Instagram shortcode"):
    extract_instagram_shortcode(url)


@pytest.mark.parametrize(
  ("url", "expected"),
  [
    ("https://www.instagram.com/p/abc/", Platform.INSTAGRAM),
    ("https://youtube.com/watch?v=abc", Platform.YOUTUBE),
    ("https://youtu.be/abc", Platform.YOUTUBE),
    ("https://www.tiktok.com/@user/video/1", Platform.TIKTOK),
    ("https://www.reddit.com/r/travel/comments/abc/", Platform.REDDIT),
    ("https://example.com/post", None),
  ],
)
def test_detect_platform(url: str, expected: Platform | None) -> None:
  assert detect_platform(url) == expected


def test_extract_post_id_instagram() -> None:
  assert extract_post_id(Platform.INSTAGRAM, "https://www.instagram.com/p/abc123/") == "abc123"

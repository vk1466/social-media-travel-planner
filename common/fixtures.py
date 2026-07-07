from common.models import Place, SocialPlatform, TravelPost


def sample_tokyo_posts() -> list[TravelPost]:
  return [
    TravelPost(
      post_url="https://www.instagram.com/p/sample-shibuya/",
      platform=SocialPlatform.INSTAGRAM,
      caption="Sunset at Shibuya Crossing #tokyo #japan #travel",
      author_handle="traveler_jane",
      places=(
        Place(
          place_name="Shibuya Crossing",
          city="Tokyo",
          country="Japan",
          latitude=35.6595,
          longitude=139.7005,
        ),
      ),
      hashtags=("tokyo", "japan", "travel"),
    ),
    TravelPost(
      post_url="https://www.tiktok.com/@foodie/video/sample-sensoji",
      platform=SocialPlatform.TIKTOK,
      caption="Morning walk through Senso-ji Temple in Asakusa",
      author_handle="foodie",
      places=(
        Place(
          place_name="Senso-ji Temple",
          city="Tokyo",
          country="Japan",
          latitude=35.7148,
          longitude=139.7967,
        ),
      ),
      hashtags=(),
    ),
    TravelPost(
      post_url="https://www.instagram.com/p/sample-tsukiji/",
      platform=SocialPlatform.INSTAGRAM,
      caption="Best sushi breakfast at Tsukiji Outer Market",
      author_handle="sushi_hunter",
      places=(
        Place(
          place_name="Tsukiji Outer Market",
          city="Tokyo",
          country="Japan",
          latitude=35.6655,
          longitude=139.7707,
        ),
      ),
      hashtags=(),
    ),
  ]

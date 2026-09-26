from travelplanner.sources.instagram_search import SEARCH_TEMPLATES, search_city_reels
from travelplanner.sources.reel_rank import select_diverse_reels


def test_city_search_fetches_each_phrase(monkeypatch) -> None:
  seen: list[tuple[str, int]] = []

  def fake_search(query: str, *, limit: int) -> list[dict]:
    seen.append((query, limit))
    return [
      {
        "postUrl": f"https://www.instagram.com/reel/{len(seen)}/",
        "caption": query,
        "authorUsername": "guide",
      }
    ]

  monkeypatch.setattr(
    "travelplanner.sources.instagram_search.search_reels",
    fake_search,
  )
  monkeypatch.setattr(
    "travelplanner.sources.instagram_search.select_diverse_reels",
    lambda reels, *, city, limit: reels[:limit],
  )

  hits = search_city_reels("Lisbon", limit=20)
  phrases = [query for query, _limit in seen]
  assert phrases == [template.format(city="Lisbon") for template in SEARCH_TEMPLATES]
  assert all(limit == 20 for _query, limit in seen)
  assert len(hits) == len(SEARCH_TEMPLATES)
  assert "top things to do in Lisbon" in phrases
  assert "3 days in Lisbon" in phrases
  assert "day trips from Lisbon" in phrases


def test_jev_keeps_reels_that_add_places(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    if "travel" in questions:
      choice = "not_travel" if "hotel lobby" in state else "travel"
      return {"answers": {"travel": {"type": "choice", "choice": choice}}}
    reel = state.split("REEL TO JUDGE:\n", 1)[-1]
    choice = "keep" if "Sintra" in reel else "skip"
    return {"answers": {"adds": {"type": "choice", "choice": choice}}}

  monkeypatch.setattr("travelplanner.sources.reel_rank.system_one", fake_system_one)
  chosen = select_diverse_reels(
    [
      {"post_url": "https://ig/belem", "caption": "Belem tower and Jeronimos", "author": "a"},
      {"post_url": "https://ig/same", "caption": "Belem again", "author": "b"},
      {"post_url": "https://ig/sintra", "caption": "Sintra and Cabo da Roca", "author": "c"},
      {"post_url": "https://ig/none", "caption": "hotel lobby", "author": "d"},
    ],
    city="Lisbon",
    limit=20,
  )
  urls = [reel["post_url"] for reel in chosen]
  assert urls == ["https://ig/belem", "https://ig/sintra"]

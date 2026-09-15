from __future__ import annotations

from unittest.mock import MagicMock, patch

from travelplanner.clients import browserless


def test_extract_alltrails_candidates_from_html():
  html = """
  <html>
    <div id="search">
      <div class="g">
        <a href="https://www.alltrails.com/trail/us/washington/hurricane-hill-via-hurricane-ridge-trail">
          <h3>Hurricane Hill via Hurricane Ridge Trail - Washington | AllTrails</h3>
        </a>
        <span>Experience this 3.2-mile out-and-back trail near Port Angeles, Washington. Generally considered a moderately challenging route, it takes an average of 1 h 40 min to complete.</span>
      </div>
      <div class="g">
        <a href="https://www.alltrails.com/parks/us/washington/olympic-national-park">
          <h3>Best Trails in Olympic National Park</h3>
        </a>
      </div>
    </div>
  </html>
  """
  candidates = browserless.extract_alltrails_candidates(html)
  assert len(candidates) == 1
  assert candidates[0]["url"] == "https://www.alltrails.com/trail/us/washington/hurricane-hill-via-hurricane-ridge-trail"
  assert "Hurricane Hill" in candidates[0]["title"]
  assert "3.2-mile" in candidates[0]["snippet"]


def test_search_google_for_trail_no_key(monkeypatch):
  monkeypatch.delenv("BROWSERLESS_API_KEY", raising=False)
  assert browserless.search_google_for_trail("test") is None

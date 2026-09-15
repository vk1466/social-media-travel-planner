"""Browserless HTTP client for headless browser rendering and search.

Calls Browserless /content endpoint to render JavaScript and bypass bot shields.
Key is optional; callers fail-soft when unset.
"""

from __future__ import annotations

import json
import logging
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import certifi

from travelplanner import settings

logger = logging.getLogger(__name__)

_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_USER_AGENT = "social-media-travel-planner"


def api_key() -> str | None:
  return settings.browserless_api_key()


def endpoint() -> str:
  return settings.browserless_endpoint()


def fetch_rendered_html(
  url: str,
  *,
  wait_for_selector: str | None = None,
  reject_resource_types: tuple[str, ...] = ("image", "font", "stylesheet"),
  timeout: int = 30,
) -> str | None:
  """Renders a URL via Browserless /content endpoint and returns HTML."""
  key = api_key()
  if not key:
    return None

  base = endpoint()
  target = f"{base}/content?token={urllib.parse.quote(key)}"

  payload: dict[str, Any] = {
    "url": url,
    "rejectResourceTypes": list(reject_resource_types),
  }
  if wait_for_selector:
    payload["waitForSelector"] = wait_for_selector

  body = json.dumps(payload).encode("utf-8")
  req = urllib.request.Request(
    target,
    data=body,
    headers={
      "Content-Type": "application/json",
      "User-Agent": _USER_AGENT,
    },
    method="POST",
  )

  try:
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CONTEXT) as resp:
      return resp.read().decode("utf-8", errors="replace")
  except (urllib.error.URLError, TimeoutError, OSError) as exc:
    logger.warning("browserless /content failed url=%s error=%s", url, exc)
    return None


def search_trail_candidates(
  query: str,
  *,
  timeout: int = 35,
) -> list[dict[str, str]]:
  """Searches DuckDuckGo via Browserless /function for trail candidates with AllTrails URLs."""
  key = api_key()
  if not key:
    return []

  base = endpoint()
  target = f"{base}/function?token={urllib.parse.quote(key)}"

  js_script = f"""export default async ({{ page }}) => {{
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    const searchUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent({json.dumps(query)});
    await page.goto(searchUrl, {{ waitUntil: 'networkidle2', timeout: 30000 }});
    const results = await page.evaluate(() => {{
      const items = [];
      const seen = new Set();
      document.querySelectorAll('article, [data-testid="result"]').forEach(el => {{
        const a = el.querySelector('a[href*="alltrails.com/trail/"]');
        if (a) {{
          const href = a.href.split('?')[0].replace(/\\/$/, '');
          if (!seen.has(href)) {{
            seen.add(href);
            const titleEl = el.querySelector('h2, [data-testid="result-title-a"]');
            const title = (titleEl ? titleEl.innerText : a.innerText || '').trim();
            const snippet = (el.innerText || '').replace(/\\s+/g, ' ').trim();
            items.push({{ url: href, title, snippet }});
          }}
        }}
      }});
      return items;
    }});
    return {{ results }};
  }};"""

  req = urllib.request.Request(
    target,
    data=js_script.encode("utf-8"),
    headers={
      "Content-Type": "application/javascript",
      "User-Agent": _USER_AGENT,
    },
    method="POST",
  )

  try:
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CONTEXT) as resp:
      data = json.loads(resp.read().decode("utf-8", errors="replace"))
      raw_results = data.get("results")
      if isinstance(raw_results, list):
        return [r for r in raw_results if isinstance(r, dict) and "url" in r]
  except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
    logger.warning("browserless search_trail_candidates failed query=%s error=%s", query, exc)

  return []


def search_google_for_trail(
  query: str,
  *,
  timeout: int = 30,
) -> str | None:
  """Searches Google via Browserless for trail queries."""
  google_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
  return fetch_rendered_html(google_url, wait_for_selector="div#search", timeout=timeout)


def extract_alltrails_candidates(html: str) -> list[dict[str, str]]:
  """Extracts candidate AllTrails trail links and surrounding text from Google HTML."""
  if not html:
    return []

  candidates: list[dict[str, str]] = []
  seen_urls: set[str] = set()

  # Find all <a> tags pointing to alltrails.com/trail/
  link_pattern = re.compile(
    r'<a[^>]+href=["\'](https?://(?:www\.)?alltrails\.com/trail/[^"\'\s&?#]+)["\'][^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
  )

  for match in link_pattern.finditer(html):
    raw_url = match.group(1).rstrip("/")
    if raw_url in seen_urls:
      continue
    seen_urls.add(raw_url)

    inner_text = re.sub(r"<[^>]+>", " ", match.group(2))
    title = " ".join(inner_text.split()).strip()

    start = max(0, match.start() - 300)
    end = min(len(html), match.end() + 500)
    snippet_raw = html[start:end]
    clean_snippet = " ".join(re.sub(r"<[^>]+>", " ", snippet_raw).split())

    candidates.append({
      "url": raw_url,
      "title": title,
      "snippet": clean_snippet,
    })

    if len(candidates) >= 5:
      break

  if not candidates:
    plain_urls = re.findall(
      r'https?://(?:www\.)?alltrails\.com/trail/[a-zA-Z0-9_\-/]+',
      html,
    )
    for plain_url in plain_urls:
      url_clean = plain_url.rstrip("/")
      if url_clean not in seen_urls:
        seen_urls.add(url_clean)
        candidates.append({"url": url_clean, "title": "", "snippet": ""})
        if len(candidates) >= 5:
          break

  return candidates


# Plan: Link Ingestion Pipeline (Phase 1 — Instagram) + Web Interface

## Goal

Take a list of social media links, detect the platform, fetch post details and
(for videos/reels) the transcript, trim the response down to useful fields, and
persist one record per post to local disk keyed by the post's unique ID
(Instagram shortcode).

Two ways to use it, both driving the **same core pipeline**:

- **CLI** — `python3 cli.py links.txt` for batch/scripted use.
- **Web UI** — paste links into a page, watch each link progress live, browse
  the saved posts. Backend and frontend are separate; they talk only via a
  JSON API.

Phase 1 supports **Instagram** only. YouTube, TikTok, Reddit, etc. plug in
later without changing the pipeline shape.

---

## Proposed structure

```
travelplanner/           # core library — no CLI, no web code in here
  __init__.py
  models.py              # SavedPost, Place — the one canonical record shape
  settings.py            # API keys from .env
  links.py               # URL → (platform, post_id) detection & parsing
  pipeline.py            # orchestrator: route links → fetchers → store
  store.py               # JSON-per-post persistence under data/posts/
  transcripts.py         # Supadata wrapper (shared: IG now, YT later)
  sources/
    __init__.py          # PLATFORM_FETCHERS registry (a plain dict)
    instagram.py         # Phase 1: EnsembleData + Supadata two-step fetch

server/                  # backend — FastAPI, thin layer over the core library
  __init__.py
  app.py                 # FastAPI app, CORS, serves the API
  jobs.py                # in-memory job tracker for async ingestion runs
  schemas.py             # request/response models (pydantic)

frontend/                # frontend — React + Vite, talks only to the API
  index.html
  src/
    App.tsx
    api.ts               # typed fetch helpers for the backend API
    components/
      LinkSubmitForm.tsx # paste-links box + submit
      IngestProgress.tsx # live per-link status list for a running job
      PostLibrary.tsx    # grid of saved posts
      PostCard.tsx       # one saved post: caption, place, transcript toggle
  package.json

cli.py                   # entry point: python3 cli.py links.txt [--refresh]
data/
  posts/
    instagram/
      CjDN1tzMIjR.json   # one file per post, filename = unique post ID
tests/
  test_links.py
  test_instagram.py
  test_store.py
  test_pipeline.py
  test_api.py
.env.example
pyproject.toml
```

The layering rule: **`travelplanner/` knows nothing about HTTP or the CLI.**
`cli.py` and `server/` are both thin adapters that call `pipeline.ingest_links`
and `store.load_all_posts`. The frontend knows nothing about Python — only the
API contract.

---

## Core library (unchanged from previous plan)

### `travelplanner/models.py`

Two frozen dataclasses. This is the *only* shape the rest of the system knows;
raw API responses never leave the fetcher that produced them.

```python
class Platform(str, Enum):
  INSTAGRAM = "instagram"
  YOUTUBE = "youtube"     # declared now, unrouted until Phase 2
  TIKTOK = "tiktok"
  REDDIT = "reddit"

@dataclass(frozen=True)
class Place:
  place_name: str
  city: str | None = None
  country: str | None = None
  latitude: float | None = None
  longitude: float | None = None

@dataclass(frozen=True)
class SavedPost:
  post_id: str                  # platform-unique ID (Instagram shortcode) — the storage key
  post_url: str
  platform: Platform
  media_kind: str               # "image" | "video" | "reel" | "carousel"
  caption: str
  hashtags: tuple[str, ...] = ()
  author_handle: str | None = None
  posted_at: str | None = None  # ISO 8601
  like_count: int | None = None
  comment_count: int | None = None
  top_comments: tuple[str, ...] = ()   # small sample; often contains place names
  places: tuple[Place, ...] = ()
  transcript: str | None = None        # only for video/reel; None if unavailable
  fetched_at: str | None = None        # when we ingested it
```

### `travelplanner/links.py`

Pure functions, no network:

```python
def detect_platform(post_url: str) -> Platform | None
def extract_instagram_shortcode(post_url: str) -> str   # handles /p/, /reel/, /tv/
```

### `travelplanner/settings.py`

Loads `.env` via `python-dotenv`; exposes `ensembledata_token` and
`supadata_api_key`. Fails at first use with a message naming the missing
variable.

### `travelplanner/sources/instagram.py`

One public function — the whole two-step flow:

```python
def fetch_instagram_post(post_url: str) -> SavedPost
```

1. Extract shortcode → the unique ID.
2. **Step 1 — post details** via EnsembleData
   (`client.instagram.post_info_and_comments(code=shortcode)`).
3. **Trim** in `_trim_post_info(raw)`: keep caption, author handle, media
   kind, timestamp, location (→ `Place`), like/comment counts, top ~5 comment
   texts. Drop CDN URLs, tracking fields, profile blobs, cursors.
4. **Step 2 — transcript** via `transcripts.fetch_transcript(post_url)`, only
   for video/reel. A failed transcript never fails the post.
5. Return a `SavedPost` (hashtags from caption, `fetched_at` stamped).

### `travelplanner/transcripts.py`

```python
def fetch_transcript(media_url: str, *, lang: str = "en") -> str | None
```

Calls Supadata (`text=True, mode="auto"`); if the result carries a `job_id`,
polls `get_job_status` every ~2s, bounded at ~60s. Returns `None` on failure.

### `travelplanner/pipeline.py`

```python
@dataclass(frozen=True)
class IngestResult:
  post_url: str
  status: Literal["saved", "skipped", "unsupported", "error"]
  post_id: str | None = None
  error_message: str | None = None

def ingest_link(post_url: str, *, refresh: bool = False) -> IngestResult
def ingest_links(post_urls, *, refresh=False, on_result=None) -> list[IngestResult]
```

One addition for the web UI: an optional **`on_result` callback**, invoked
after each link finishes. The CLI ignores it; the server uses it to update job
progress so the UI can show links completing one by one. This is the only
change the web interface requires in the core.

Per link: detect platform → unknown is `unsupported` → already stored and not
`refresh` is `skipped` → fetch and save is `saved` → any exception is caught
as `error` and the batch continues. **One bad link never aborts the run.**

### `travelplanner/store.py`

```python
def save_post(post: SavedPost, ...) -> Path
def has_post(platform, post_id, ...) -> bool
def load_post(platform, post_id, ...) -> SavedPost | None
def load_all_posts(platform=None, ...) -> list[SavedPost]
```

Layout: `data/posts/<platform>/<post_id>.json` — one file per post, filename
is the key. Existence check is `path.exists()`; no read-modify-write of a big
file; records are easy to inspect and delete. `data/` goes in `.gitignore`.

---

## Backend (`server/`, FastAPI)

Chosen because the project is Python and FastAPI gives request validation,
async background work, and self-documenting endpoints (`/docs`) with almost no
code.

### Why jobs instead of one blocking request

Ingesting a link can take up to ~60s (transcript polling). A single blocking
`POST` would freeze the UI and hit timeouts. So ingestion is a **job**: submit
returns immediately with a `job_id`, work runs in a background task, and the
frontend polls for progress. Jobs live in an in-memory dict (`server/jobs.py`)
— fine for a local single-user tool; the saved posts on disk are the real
source of truth, so losing job history on restart costs nothing.

### API endpoints

| Method & path | Purpose |
|---|---|
| `POST /api/ingest` | Body: `{ "links": [...], "refresh": false }`. Validates non-empty, dedupes, starts a background job. Returns `202` with `{ "job_id": ... }`. |
| `GET /api/jobs/{job_id}` | Job snapshot: overall status (`running` / `done`), counts, and a per-link list of `{ post_url, status, post_id, error_message }`. Links not yet processed show `pending`. |
| `GET /api/posts` | All saved posts (optional `?platform=` filter), newest first — powers the library view. |
| `GET /api/posts/{platform}/{post_id}` | One full saved post record. |
| `DELETE /api/posts/{platform}/{post_id}` | Remove a saved post (delete the JSON file). |

`server/schemas.py` holds the pydantic request/response models — these mirror
`SavedPost` / `IngestResult` and define the frontend contract. CORS is enabled
for the Vite dev origin.

Run: `uvicorn server.app:app --reload` (port 8000).

### Job flow

```
POST /api/ingest ──► create job (all links "pending")
                     └─► background task: ingest_links(..., on_result=update_job)
frontend polls GET /api/jobs/{id} every ~1.5s ──► per-link statuses fill in
job status → "done" when the batch finishes ──► frontend stops polling,
                                                refreshes the post library
```

---

## Frontend (`frontend/`, React + Vite)

Single-page app, two areas on one screen — no routing needed for Phase 1.

### Screen layout

```
┌──────────────────────────────────────────────────┐
│  Travel Post Ingest                              │
│  ┌────────────────────────────────────────────┐  │
│  │  Paste links, one per line…                │  │  ← LinkSubmitForm
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│  [x] Re-fetch already saved     [ Ingest 3 links ]│
│                                                  │
│  Progress (while a job runs)                     │  ← IngestProgress
│   ✓ instagram.com/reel/CjDN…   saved             │
│   ⟳ instagram.com/p/DEf4…      fetching…         │
│   ○ youtube.com/watch?v=…      pending           │
│                                                  │
│  Saved posts (12)                    [instagram ▾]│  ← PostLibrary
│  ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │PostCard │ │PostCard │ │PostCard │  …          │
│  └─────────┘ └─────────┘ └─────────┘             │
└──────────────────────────────────────────────────┘
```

### UX decisions (the "user friendly" part)

- **Paste-and-go input**: one big textarea, one URL per line; blank lines and
  stray whitespace tolerated. The submit button live-counts valid links
  ("Ingest 3 links") and disables when there's nothing valid.
- **Instant feedback before any network call**: obviously invalid lines (not a
  URL) are flagged inline under the textarea, not after submission.
- **Live per-link progress**: each submitted link gets its own row with a
  clear state — pending ○, fetching ⟳ (spinner), saved ✓ (green),
  skipped "already saved" (gray), unsupported "YouTube coming soon" (gray),
  error ✗ (red) with the actual error message expandable. No silent failures,
  no all-or-nothing spinner.
- **Human wording over jargon**: "already saved — skipped (no API credits
  used)" instead of `skipped`; "we don't support this site yet" instead of
  `unsupported`.
- **The library updates itself** when a job finishes — newly saved posts
  appear at the top without a manual refresh.
- **PostCard shows what matters**: author, media-kind badge (reel/image/…),
  caption (clamped to 3 lines), place chip if known, like/comment counts, and
  a "Transcript" expander for videos — collapsed by default so the grid stays
  scannable. Card links out to the original post; delete button with a
  confirm step.
- **Empty states that teach**: an empty library shows "Paste your first
  Instagram links above to get started", not a blank void.
- **Errors stay visible**: failed links remain listed after the job ends so
  the user can copy the URL and retry.

### Frontend/backend interaction

All through `src/api.ts` — typed wrappers over `fetch` for the five endpoints,
with the Vite dev server proxying `/api` to `localhost:8000` (no CORS pain in
dev, single origin in any future deployment). Polling lives in a small
`useJob(jobId)` hook: poll every 1.5s while `running`, stop on `done`.

Styling: plain CSS (or CSS modules) with a clean modern look — system font
stack, generous spacing, a single accent color, subtle card shadows. No UI
framework dependency for Phase 1.

---

## Error handling rules (unchanged)

| Situation | Behavior |
|---|---|
| Unknown host / unrouted platform | `unsupported`, continue |
| Unparseable Instagram URL | `error` with message, continue |
| EnsembleData API failure | `error`, nothing saved, continue |
| Supadata failure or job timeout | Save post with `transcript: null` |
| Post already on disk, no refresh | `skipped` — protects API credits |

---

## Testing

All tests run without network; live APIs validated once manually.

- `test_links.py` — platform detection and shortcode extraction edge cases.
- `test_instagram.py` — `_trim_post_info` against a checked-in sample of the
  raw EnsembleData response shape.
- `test_store.py` — save → has → load → load_all round-trip in `tmp_path`.
- `test_pipeline.py` — routing, skip-if-stored, refresh, error isolation, and
  the `on_result` callback, using a fake fetcher in the registry.
- `test_api.py` — FastAPI `TestClient`: submit job → poll → done → posts
  listed, with the pipeline faked; validation errors for empty link lists.
- Frontend: manual verification in Phase 1 (submit, watch progress, browse,
  delete); component tests can come later if the UI grows.

---

## Implementation order

1. `models.py`, `links.py` + tests — pure logic, no dependencies.
2. `store.py` + tests.
3. `settings.py`, `.env.example`, deps in `pyproject.toml`
   (`ensembledata`, `supadata`, `python-dotenv`, `fastapi`, `uvicorn`).
4. `sources/instagram.py` (trimming with tests first, then live calls) +
   `transcripts.py`.
5. `pipeline.py` (with `on_result`) + tests; registry in
   `sources/__init__.py`.
6. `cli.py`, manual smoke run with one real reel link.
7. `server/` — jobs, schemas, endpoints + `test_api.py`.
8. `frontend/` — scaffold with Vite, `api.ts` + `useJob`, then the four
   components; wire to the running backend and polish the UX states.

## Adding a platform later (e.g. YouTube)

1. Add ID extraction in `links.py`.
2. Create `sources/youtube.py` returning a `SavedPost`.
3. Add one entry to `PLATFORM_FETCHERS`.

CLI, server, and frontend need **zero changes** — the new platform's posts
flow through the same job API and appear in the same library with a platform
badge.

---

## Note on the existing code

This structure replaces the current `common/` / `ingest/` / `planner/` layout
for the ingestion side. The existing planner (`TravelPost` → `Itinerary`) is
not part of this phase; when rebuilt it reads `SavedPost` records via
`store.load_all_posts()` — the store is the boundary between ingestion and
planning.

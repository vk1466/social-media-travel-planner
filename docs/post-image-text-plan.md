# Plan: Post & Carousel Image Text

Roadmap item **P0 #1h** — on-image text from static Instagram posts and carousel
slides (overlay place names, map screenshots, signage, "Day 1" labels) becomes
place mentions through the **existing** extract → locate → resolve path.

Builds on [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md#post--carousel-image-text-ocr).
Independent of the locate work (1b–1g): this plan adds **evidence**, not geocode
tuning. A carousel that currently produces zero places produces zero pins no
matter how good ranking gets.

---

## Goal

```
Instagram post (image | carousel)
   → slide image URLs from the platform payload
   → verbatim text per slide (OCR)
   → code strips watermarks / CTAs / UI noise
   → text joins caption, hashtags, comments, location tag in ReelBundle
   → existing extract → locate → resolve, unchanged
```

**One sentence:** OCR is a new *input* to extraction, on the same footing as a
Supadata transcript — it never becomes its own place pipeline, and it never
produces coordinates.

---

## What we do today

`fetch_instagram_post` labels a `GraphSidecar` as `media_kind="carousel"` and
then treats it exactly like a single image: caption, hashtags, top comments, and
the IG location tag go into `ReelBundle`; `transcript` is `None` because
Supadata is only called for `video` / `reel`
(`travelplanner/sources/instagram.py:174`). The only media we keep is the cover
image (`_extract_thumbnail_url`, `instagram.py:134`) — **carousel children are
never parsed anywhere in the repo**.

So for the very common travel carousel — a cover with a title, then one slide
per stop with the place name burned into the photo, and a caption that says only
"save this for your trip 🇮🇸" — extraction sees no place names at all and the
post saves with an empty place list.

---

## Design decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Where OCR runs | Inside the Instagram fetch path, before `ReelBundle` is built | Instagram CDN URLs are signed and expire, so they cannot be stored now and read later. Text must be captured while the URLs are fresh. |
| What we persist | The **text** (`image_text` per slide), not the slide URLs | Text is durable and lets `reextract_post` re-run for free. URLs rot within hours/days and would bloat the item for nothing. |
| Who reads pixels | One `read_image_text` interface, two interchangeable providers: Google Cloud Vision `TEXT_DETECTION` and OpenAI vision | The right choice depends on real carousels (stylized type, unlabelled maps), and we do not have that data yet. Two small adapters behind one signature is cheaper than guessing and re-plumbing later. |
| Which provider by default | Neither — both ship implemented and **disabled** | Cost, latency, and hallucination behaviour get measured in Phase 2 before anything is switched on. |
| Provider trust asymmetry | Google Vision output is verbatim; OpenAI vision output is treated as *candidates* under a strict schema | A model reading pixels can invent a plausible place name, which is the exact failure mode the extract prompt already fights. |
| Who finds places | Existing `extract.fetch_places_from_reel` | One schema, one prompt, one locate path. OCR text is another labelled section, like `VIDEO TRANSCRIPT`. |
| Who removes noise | Code, before the prompt | "follow for more" and a repeated watermark are deterministic to detect. A prompt instruction is not a control. |
| Coordinates from images | Never | Cross-cutting roadmap rule: 1h may produce text or name candidates only. |
| Which posts | `image` and `carousel` only | Reels are covered by the transcript; frame sampling is out of scope for 1h. |

### Not a second extraction path

There is no image-specific place parser, no per-slide geocode, no "read the map
and give me coordinates". OCR output is text appended to the bundle that already
exists. If OCR is disabled or fails, ingest produces exactly today's result.

---

## Phase 0 — Media URL spike (gates everything)

**This is the real unknown, and it is worth resolving before writing any OCR
code.** We have never inspected an EnsembleData carousel payload; the fixture in
`tests/fixtures/instagram_post_raw.json` is a reel.

`instagram.post_info_and_comments` may expose children under any of these
shapes, depending on which upstream Instagram surface EnsembleData mirrors:

| Shape | Path |
|-------|------|
| GraphQL sidecar | `edge_sidecar_to_children.edges[].node.display_url` |
| Mobile API | `carousel_media[].image_versions2.candidates[].url` |
| Flattened | `image_versions2.candidates[].url` (single image only) |

**Do:** add `scripts/dump_instagram_media.py` that fetches one single-image
post, one carousel, and one reel, and prints every key path whose value looks
like an image URL plus the count of children found. Run it against real
shortcodes with `.env` loaded, in the style of `scripts/validate_extract.py`.

**Done when:** the carousel payload shape is documented here, and
`tests/fixtures/instagram_carousel_raw.json` is committed with ≥3 slide URLs.

**If children are not available:** stop and re-scope before Phase 1. Fallbacks,
in order of preference — a different EnsembleData Instagram endpoint that
returns full media; fetching the post page ourselves and reading the embedded
JSON; dropping to cover-image-only OCR (still fixes single-image posts and
carousel *cover* titles, which is a meaningful slice).

---

## Data model

One field on the existing entity, per AGENTS.md (extend before abstracting):

```python
# travelplanner/models.py — SavedPost

image_text: tuple[str, ...] = ()   # cleaned on-image text, one entry per slide, slide order
```

**Why one entry per slide, not one blob:** slide order carries meaning. "Day 2"
on slide 4 and "Seljalandsfoss" on slide 5 belong together, and the extract
prompt already knows how to read Day-N structure from captions. Flattening loses
the grouping that makes a carousel an itinerary.

**Size:** capped at `POST_IMAGE_TEXT_MAX_SLIDES` × `POST_IMAGE_TEXT_MAX_CHARS`
(10 × 1500 ≈ 15 KB worst case) — comfortably inside the 400 KB DynamoDB item
limit. `posts_repo` gains serialize/deserialize for it alongside `top_comments`.

**Not stored:** slide URLs. They expire, so persisting them creates a field that
silently becomes garbage. The consequence — improving OCR later requires a
re-fetch, not just a re-extract — is called out in Backfill below.

---

## Pipeline

```
fetch_instagram_post(post_url)
  1. fetch_post_info_and_comments            existing
  2. _extract_slide_urls(raw)                NEW   IG-specific, capped
  3. read_image_text(urls)                   NEW   OCR, fail-soft
  4. clean_overlay_text(per_slide)           NEW   noise removal, caps
  5. ReelBundle(..., image_text=...)         extended
  6. extract.fetch_places_from_reel          existing
  7. SavedPost(..., image_text=...)          extended
```

Steps 3–4 are skipped entirely when `media_kind` is `reel` / `video`, when the
feature flag is off, or when no OCR key is configured.

### 2. Slide URLs (`sources/instagram.py`)

IG-specific payload knowledge stays in the fetcher, next to
`_extract_thumbnail_url`. Returns slide order, deduped, capped at
`POST_IMAGE_TEXT_MAX_SLIDES`. Prefer the largest candidate per slide when the
payload offers several resolutions — small overlay type is the main OCR failure
mode.

### 3. Reading text (`travelplanner/image_text.py`)

A top-level module mirroring `extract.py`: platform-agnostic, called by sources,
reusable when YouTube/TikTok fetchers arrive. Raw HTTP lives in `clients/` per
the module rules.

One function is the whole seam — no base class, no registry, per AGENTS.md:

```python
def read_image_text(image_urls: tuple[str, ...]) -> tuple[str, ...]:
  """Verbatim on-image text per URL, in order. Empty tuple when unavailable."""
```

It resolves `POST_IMAGE_TEXT_PROVIDER` to one of two private adapters and
fail-softs in the `llm_fill` style: feature disabled, no key, HTTP error, or
unparseable response → `()` and a warning. A post never fails to save because
reading images failed.

**`google_vision` adapter** — `clients/google_vision.py`. One batched
`images:annotate` request (Vision accepts up to 16 images per call),
`TEXT_DETECTION`, authenticated with an **API key**, so no service account JSON
and nothing new in CDK beyond one env var. Sends `imageSource.imageUri` so
Google fetches the CDN URL directly, avoiding image bytes through Lambda egress
where Instagram is most likely to rate-limit us; falls back to downloading bytes
and base64-encoding them (reusing the host allowlist idea from
`server/media_proxy.py`) when `imageUri` fetches fail.

**`openai_vision` adapter** — reuses the existing `clients/openai.py` client with
image URL content parts, `temperature=0`, and a strict `json_schema` returning
one text string per slide. The prompt asks only for text **visible on the
image**, verbatim, with an explicit instruction to return an empty string rather
than describe the photo. It shares the same signature, so nothing downstream
knows which provider ran.

Both adapters return raw text and go through the same cleaning in step 4. Since
neither is trusted to be place-aware, the extract prompt's existing "name must
appear in the sources" rule remains the real guard.

### 4. Noise removal (code)

Carousel overlays are full of text that is not travel content. Deterministic
rules, unit-tested:

| Rule | Drops |
|------|-------|
| Repeated-line watermark | A line that appears on ≥60% of slides and is ≤3 words — creator handles, logos |
| CTA denylist | `follow`, `save this`, `swipe`, `link in bio`, `comment`, `share`, `part 1/2`, `@handle`-only lines |
| No-letter lines | Emoji-only, punctuation-only, bare numbers |
| Length caps | Per-slide truncation at `POST_IMAGE_TEXT_MAX_CHARS` |

**Explicitly kept:** `Day 1` / `Stop 3` style labels (itinerary structure the
prompt uses) and anything else with letters. When in doubt, keep — the extract
prompt already refuses to invent places from weak evidence, and recall is the
problem we are solving.

### 5. Bundle & prompt (`extract.py`)

`ReelBundle` gains `image_text: tuple[str, ...] = ()`. `format_reel_bundle`
emits it after `VIDEO TRANSCRIPT`:

```
IMAGE TEXT (verbatim from post slides; OCR, may contain typos and unrelated words):
SLIDE 1: 5 stops on Iceland's south coast
SLIDE 2: Day 1 — Seljalandsfoss
```

`REEL_EXTRACT_PROMPT` changes in three small ways:

1. First line generalized from "this Instagram reel" to "this Instagram post
   (reel, image, or carousel)".
2. `IMAGE TEXT` added to the list of sources that count as **name evidence**.
3. One new rule: OCR text is noisy — a garbled fragment is not a place, and the
   model must not "correct" OCR into a different plausible place name. If a
   fragment is not recognizably a place name, omit it.

Renaming `ReelBundle` → `PostBundle` and `reel_summary` → `post_summary` is the
honest follow-up but touches the stored schema, the API, and both clients. Keep
the names in this plan; treat the rename as separate cleanup.

### 6. Re-extract

`reextract_post` must pass `image_text=post.image_text` through, or the first
re-extract of a carousel silently deletes every place OCR found.

---

## Settings

Added to `travelplanner/settings.py` in the existing validated style:

| Env var | Default | Purpose |
|---------|---------|---------|
| `POST_IMAGE_TEXT_ENABLED` | `false` | Master switch — ships dark, stays dark until Phase 3 |
| `POST_IMAGE_TEXT_PROVIDER` | `google_vision` | `google_vision` \| `openai_vision`; inert while the switch is off |
| `POST_IMAGE_TEXT_MAX_SLIDES` | `10` | Slides read per post (cost + latency cap) |
| `POST_IMAGE_TEXT_MAX_CHARS` | `1500` | Per-slide text kept after cleaning |
| `GOOGLE_VISION_API_KEY` | unset | Required by the `google_vision` provider |

`openai_vision` needs no new key — it reuses `OPENAI_API_KEY`. The Vision key is
separate from `GOOGLE_MAPS_API_KEY` (1f) so geocode and Vision can be enabled,
keyed, and revoked independently. Both go into `shared_env` in
`infra/travel_planner_stack.py`.

**Two independent gates.** The feature runs only when
`POST_IMAGE_TEXT_ENABLED=true` **and** the selected provider's key is present.
With the default `false`, merged code changes nothing about ingest behaviour, so
Phase 1 can land on main safely.

**Cost / latency at 10 slides:** roughly $0.015 per post via Vision (one batched
HTTPS call) versus a few cents via `openai_vision`, both well inside the 900 s
`IngestWorker` timeout with the Step Functions Map at `maxConcurrency=2`.
Neither is the constraint — media URL availability is.

### Why not a caption-strength skip gate yet

Roadmap step 5 suggests skipping OCR when the caption already yields strong
places. Deliberately deferred: a caption naming one city while the slides name
eight stops is the exact case we are fixing, so a caption-based skip would
reintroduce the bug. Media-kind gating plus the slide cap is enough cost control
at MVP volume. Revisit with real numbers from Phase 2.

---

## Phases

### Phase 1 — Both providers wired, nothing enabled

Slide URL parsing, `image_text.py` with the `google_vision` and `openai_vision`
adapters, `clients/google_vision.py`, cleaning rules, `SavedPost.image_text` +
repo round-trip, bundle/prompt extension, `reextract_post` pass-through,
settings.

**Done when:** with the flag off (the default), ingest output is byte-identical
to today; with the flag forced on in a test, a real carousel whose place names
appear only on slides produces at least one correctly pinned place under **each**
provider; and watermark and CTA lines never reach the prompt.

### Phase 2 — Measure the two providers side by side

`scripts/validate_image_text.py` in the style of `scripts/validate_extract.py`,
run twice over the same ~20 real image/carousel posts — once per provider —
reporting: posts that went from zero places to ≥1, place-name grounding against
the returned text (no invented names), lines dropped by each cleaning rule,
characters per slide, empty-slide rate, cost and wall time per post. Writes
`docs/image-text-validation.json` keyed by provider.

The interesting comparison is the **empty-slide rate** (where Vision loses on
stylized type and map screenshots) against the **grounding rate** (where OpenAI
vision loses by inventing names). A plausible outcome is Vision as the default
with `openai_vision` used only on slides Vision returned empty for — that
becomes a real option rather than a guess, and it is the reason both live behind
one signature.

**Done when:** both providers have numbers on the same posts and a default is
chosen on evidence.

### Phase 3 — Enable and backfill

Set `POST_IMAGE_TEXT_ENABLED=true` with the chosen provider in dev, watch a
batch of real ingests, then run the backfill below.

**Done when:** new carousels save with places, and the previously empty stored
image/carousel posts have been re-fetched and reprocessed.

---

## Backfill

Existing image and carousel posts have no `image_text` and their slide URLs are
long gone, so `reextract_all_posts` cannot recover them — they need a **re-fetch**.
Add a `cli.py` mode that re-ingests stored posts with `refresh=True` filtered to
`media_kind in {image, carousel}`, then run `reprocess_all_places`. This costs
one EnsembleData call per post, so run it after Phase 2 validation, not before.

---

## Testing

Unit tests, no network, matching the existing moto-based suite:

- `_extract_slide_urls`: carousel fixture returns slides in order; single-image
  post returns one; reel returns none; cap enforced; duplicates removed.
- `clean_overlay_text`: watermark repeated across slides dropped; each CTA
  pattern dropped; `Day 1` kept; emoji-only line dropped; truncation at the cap.
- `format_reel_bundle`: `IMAGE TEXT` section present with slide labels, absent
  when `image_text` is empty; ordering relative to transcript.
- Fetch path with a fake OCR callable: `image_text` reaches both the bundle and
  the `SavedPost`; reel `media_kind` never invokes OCR.
- Provider selection: each `POST_IMAGE_TEXT_PROVIDER` value routes to its
  adapter; an unknown value raises at settings load, matching the existing
  validated-settings style.
- Fail-soft, per provider: flag off; missing `GOOGLE_VISION_API_KEY` or
  `OPENAI_API_KEY`; a 500 response; empty annotations; unparseable JSON from
  `openai_vision` — every case leaves the post saving with today's places.
- `posts_repo`: `image_text` round-trips.
- `reextract_post`: stored `image_text` is preserved in the new bundle.

---

## File touch list

| Area | Files |
|------|-------|
| Spike | `scripts/dump_instagram_media.py`, `tests/fixtures/instagram_carousel_raw.json` |
| Model | `travelplanner/models.py` (`SavedPost.image_text`) |
| Image text | `travelplanner/image_text.py` (interface + both adapters), `travelplanner/clients/google_vision.py` |
| Source | `travelplanner/sources/instagram.py` (`_extract_slide_urls`, OCR call) |
| Extract | `travelplanner/extract.py` (`ReelBundle`, `format_reel_bundle`, prompt) |
| Pipeline | `travelplanner/pipeline.py` (`reextract_post` pass-through, refresh backfill) |
| Persistence | `travelplanner/db/posts_repo.py` |
| Settings / infra | `travelplanner/settings.py`, `.env.example`, `infra/travel_planner_stack.py` |
| CLI | `cli.py` (re-fetch backfill) |
| Validation | `scripts/validate_image_text.py` |
| Tests | `tests/test_instagram.py`, `tests/test_extract.py`, `tests/test_pipeline.py`, `tests/test_posts_repo.py` |

Nothing changes in `server/`, `frontend/`, or `mobile/` — the output is more
places on existing screens.

---

## Out of scope

- Video frame sampling inside reels (transcript covers spoken places)
- Multimodal "describe this photo" tips and facts (P1 #5 / #6 territory)
- Turning `Day N` labels into itinerary structure (P2 #7 consumes them later)
- Enabling the feature in any environment before Phase 2 has numbers
- Storing slide URLs or images for display
- Any path where pixels produce coordinates
- Renaming `ReelBundle` / `reel_summary` to post-neutral names

---

## Relation to roadmap

| Roadmap item | This plan |
|--------------|-----------|
| P0 #1h Post & carousel image text | Phases 0–3 |
| P0 #1 Accurate place pins | Consumer — OCR supplies mentions, 1b–1g pin them |
| P0 #3 Region buckets & hierarchy | Benefits: slide text often names the parent park |
| P2 #7 Itinerary from a cluster | `Day N` labels preserved in `image_text` |

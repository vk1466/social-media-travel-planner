# Wanderfile data pipeline audit (read-only, Oct 26 2026)
Repo: ~/Projects/social-media-travel-planner. Pipeline is `travelplanner/` (server/ is the FastAPI/worker shell). Flow: `flow/pipelines/dispatch.py` → head (seed, Mindcase fetch, thumbnail) → tail (reel: Supadata transcript; image/carousel: OCR) → **one** Jev content category → **one** close pipeline (place | movie | recipe | none).

## 1. Field inventory
UI column = file references found by grep (frontend/src, mobile/src+app). "types only" = appears just in api.ts/types, so it's never rendered.

| Field | Stored | API | Web | Mobile | Notes |
|---|---|---|---|---|---|
| caption | Y | Y | Y (card, detail, title fallback) | Y | Used as the title. Cut at 77/80 chars mid-word (`postDisplayUtils.ts:21`, `top-tabs/recipes.ts:14`) |
| title | Y (model) | Y | PostCard, EditPostModal | partial | **The pipeline never sets it** (no `title=` in steps/personas), so it's only set by a user edit |
| author_handle | Y | Y | Y | Y | OK |
| hashtags | Y | Y | first 4 as tags | limited | OK |
| posted_at / fetched_at | Y | Y | Y | Y | OK |
| like_count / comment_count | Y | Y | types only | types only | Fetched, never shown |
| top_comments | Y | Y | PostDetail only | types only | Often contain places and tips |
| location tag (platform `places`, lat/lon) | Y | Y | indirectly (as a mention) | indirectly | Not shown as "Tagged location". Not used as a geocode bias for other places |
| views, audio/music info, tagged users, @mentions in caption, slide count, duration | **Not extracted** | – | – | – | `steps/instagram/media.py` only pulls caption/owner/kind/time/likes/comments/slides |
| thumbnail_url / slide_media_urls | Y | Y | Y | partial | Mobile has no carousel viewer |
| transcript (Supadata) | Y | Y | PostDetail debug | types only | No speech-vs-music check |
| video_analysis (vision) | Y | Y | PostDetail | types only | Raw text |
| image_text (carousel OCR) / reel frame OCR | Y | Y | PostDetail | types only | Frame OCR capped at **5 frames** |
| reel_summary | Y | Y | Y | Y | Good. Should feed the title |
| trip_tips | Y | Y | PostDetail only | **No** | Mobile drops them |
| content_category | Y | Y | tabs | tabs | Single label. A weak classification becomes `other` |
| extracted_places (name, city, state, country, details, tips, category, attributes, parent) | Y | Y | Y | Y | Tips are often empty (see below) |
| Place (canonical: location lat/lon/country/city, aliases, parent_place_id, google_maps_url, summary) | Y | Y | Y (place page, map) | Y | Aliases are barely used in the UI |
| PlaceFacts: hours, admission, website, phone, price_level, rating, reviews, cuisines, duration, best_time, trail stats, highlights/caveats/recommendations, evidence | Y (async `enrich_place_facts`) | Y | `placeFacts.ts` (partial) | `placeFacts.ts` (partial) | Hours, website, phone and admission have no screen. Facts are fetched but not used for a photo |
| extracted_movies / resolved_movies (TMDB/OMDb) | Y | Y | Y | Y | Only runs if the post is classified `movies` |
| extracted_recipe (ingredients, steps, servings, times, cuisine, tips, equipment) + nutrition | Y | Y | Y | Y | Only runs if the post is classified `food` |
| fashion / hairstyle | category only | Y | tab | tab | **No extraction pipeline** (`_SKIP_CLOSE_CATEGORIES`) |
| Visits | Y | Y | Y | Y | Out of scope |

## 2. QA issues explained by the code
1. **Places named only by @handle are missed.** The extract prompt (`extract.py` REEL_EXTRACT_PROMPT) only accepts names from the caption, transcript, location tag, hashtags and comments. Caption @mentions and tagged users are never parsed or resolved (`media.py`), and nothing looks up the account's business name or address.
2. **A "top 10" reel captures only 6.** `reel_frame_text.adaptive_frame_timestamps(max_frames=5)` samples 5 frames. List reels show one item per screen, so most on-screen names are never OCR'd. There's no count check against the "top N" or "10 places" claimed in the caption.
3. **Song lyrics are used as the transcript.** `steps/instagram/fetch_transcript.py` takes whatever Supadata returns, with no music detection, speech ratio check or language check. The lyrics then feed classification and extraction.
4. **Geocoding goes wrong (Orange Garden in Rome vs. Ischia, a Vietnamese Skytree name).** Bias exists only via the parent viewbox in `places/locate.py`. The post's location tag and the city/country inferred for the reel are not used as a hard bias, so a famous same-name place wins. `clients/google_geocode.py` sends `language=en`, but the stored display_name comes from the LLM or source string and isn't replaced with the English provider name.
5. **Recipe ingredients are empty.** Recipe extraction depends on the transcript and frame OCR. With lyrics as the "transcript" and only 5 frames, there's no ingredient text. Ingredients in the caption or comments are often in "link in bio". `fetch_recipe_source` tries only 2 URLs.
6. **Movie titles aren't extracted.** The movie pipeline only runs when Jev says `movies`. "Places from a film" or "films to watch on a trip" reels go to travel, and movie extraction is skipped. The pipelines are mutually exclusive (`dispatch.close_steps_for_category`).
7. **Categories are inconsistent.** There's one LLM label on noisy text (lyrics), with a weak result mapped to `other`. `inferred_content_category` falls back to travel if the post has place_ids, so the stored value and the inferred one can disagree. The place `category` enum is a separate taxonomy from the content category.
8. **Titles are cut mid-word.** There's no title generator, so `title` is null and the UI uses the caption's first line or `slice(0,77)`.
9. **Translation is partial.** The prompts don't require English output. Only `reel_summary` tends to come back in English, while place names, tips and details stay in the source language.
10. **No tips.** Tips must be stated explicitly in the transcript or caption. When the transcript is lyrics and frame OCR is thin, tips come back `[]`. `trip_tips` is never rendered on mobile. Comment tips are only included as the top comments.
11. **Data we fetch but never show:** like and comment counts, top comments (mobile), trip_tips (mobile), place hours, website, phone, admission and reviews, aliases, transcript and OCR (mobile), facts evidence and conflicts.

## 3. Recommendations (priority = user impact ÷ effort)
| # | Change | Impact | Effort | Where |
|---|---|---|---|---|
| 1 | **Clean title generator**: an LLM field `title` (≤60 chars, English, no emoji) in the extract and recipe/movie steps. The UI should fall back with a word-boundary ellipsis | High | S | extract.py schema, postDisplayUtils.ts |
| 2 | **Show existing data**: trip_tips and top comments on mobile; hours, website, phone, price, rating and admission on the place page and map card; engagement counts; a "Tagged location" chip | High | S | mobile/src, frontend place page |
| 3 | **Music detection**: skip or flag the transcript when it's lyrics (Supadata/Whisper no-speech prob, an LLM "is this speech about the video?" gate, or audio metadata from Mindcase). Store `audio_track` | High | S–M | fetch_transcript.py |
| 4 | **More frame OCR plus a list count check**: scale frames with duration (≈1 per 1.5–2s, max ~30, dedupe identical text). Parse "top N" or "N places" and re-run extraction when places found < N | High | M | reel_frame_text.py, extract_places |
| 5 | **Resolve @handles**: parse caption @mentions and tagged users, fetch the profile (Mindcase handle mode: business name, category, address, website), and add it as a `mentioned_account` snippet | High | M | media.py, new step |
| 6 | **Geocoding bias**: use the post's location tag, then the dominant city/country across the reel's places, as Places `locationBias`. Reject candidates more than ~200km from the reel's centroid. Store the provider's English name as display_name and keep the original as an alias | High | M | places/locate.py, google_geocode.py |
| 7 | **Multi-label categories**: allow primary plus secondary, and run the movie and recipe close steps when there's secondary evidence. Reuse the place category for food venues | Med | M | content_categories.py, dispatch.py |
| 8 | **English normalisation**: require English for summary, tips and details, and keep `original_name` | Med | S | prompts |
| 9 | **Places enrichment for photos**: a Google Places photo and rating for every pin (facts already fetch google_places), shown on cards and the map | High (UI) | S–M | places/facts/tools/google.py |
| 10 | **Confidence per place** (source = caption, OCR, @handle or tag; geocode score) so low-confidence places go to a "review" state instead of the wrong pin | Med | M | place_hints, locate |
| 11 | **Canonical place merge across reels**: match on provider_place_id first, then name plus distance; merge tips and the source posts; show "saved in N reels" | Med | M | places/identity.py, store.py |
| 12 | **Keep the creator's tips verbatim** with attribution (source_post_id per tip) instead of only merging them | Med | S | Place.tips → structured |
| 13 | **Fashion and hairstyle extraction** (items, brands, shop links; style name and products), or hide those tabs until it exists | Med | L | new close pipeline |

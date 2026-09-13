# Instagram reel ingest — step-by-step I/O and API calls

Worked example for a **travel** reel:

`https://www.instagram.com/reel/Db6I58kCI7F/` (shortcode `Db6I58kCI7F`, `@whisper.of.earth` — Suobuya Stone Forest).

This document maps each pipeline step to **context inputs/outputs**, **external calls**, and **observed results** from a local step-by-step run (September 2026). For architecture rules see [pipeline-framework-design.md](./pipeline-framework-design.md).

**Outputs below** are the **full values recorded during the interactive walkthrough** in this repo (not re-run for the doc). Re-execute a step only if you need fresh API data. The only field we did not paste in full is Mindcase **`raw_payload`** (entire JSON blob); step 2 lists its top-level keys and the full `SavedPost` fields we captured.

---

## Pipeline order (reel → travel)

```text
instagram_head
  1. seed_instagram_post
  2. fetch_media
  3. persist_thumbnail

instagram_tail (resource_type = reel)
  4. fetch_transcript
  5. analyze_video          [FeatureFlag: extract_video_analysis]
  6. extract_reel_frame_text [FeatureFlag: extract_reel_frame_text — default **off**; Supadata step 5 covers travel reels]

instagram_classify
  7. classify_content       [FeatureFlag: content_categories]

instagram_place_close (content_category = travel)
  8. extract_places
  9. process_place_mentions  (code: process_mentions)

persona post-work (not in pipeline runner)
  10. enrich_place_facts     [FeatureFlag: place_facts; often SQS worker]
```

**Context type:** `IngestContext` (`travelplanner/flow/context.py`).

| Field | Set by (typical) |
|-------|------------------|
| `post_url`, `user_id`, `refresh` | Entry (API / CLI) |
| `platform`, `shortcode`, `resource_type` | Step 1 (refined in 2) |
| `raw_payload` | Step 2 |
| `post` (`SavedPost`) | Step 2 |
| `transcript` | Step 4 |
| `video_analysis` | Step 5 |
| `image_text` | Step 6 |
| `content_bundle` | Steps 7–8 (built if missing) |
| `post.content_category` | Step 7 |
| `post.extracted_places`, `reel_summary`, `trip_tips` | Step 8 |
| `place_ids`, `place_outcomes`, `place_library` | Step 9 |

---

## Environment and infrastructure

| Variable / setting | Used by |
|--------------------|---------|
| `MINDCASE_API_KEY` | Steps 2, 10 (Google place details) |
| `SUPADATA_API_KEY` | Steps 4, 5 |
| `OPENAI_API_KEY` | Steps 6, 7, 8, 9 (optional LLM pick), 10 (insights) |
| `MEDIA_BUCKET` | Step 3 (optional S3) |
| `DYNAMODB_STAGE`, `DYNAMODB_REGION` | Step 9, 10 (`Places-{stage}-{region}`) |
| `GOOGLE_MAPS_API_KEY` | Step 9 only if `google_geocode_fallback` flag on |
| `SSL_CERT_FILE` → certifi bundle | Recommended on macOS Python for Wikipedia / Wikivoyage / Overpass in step 10 |

Dev tables for this project are in **`us-west-2`** (`Places-dev-us-west-2`), not `us-east-1`.

---

## Step 1 — `seed_instagram_post`

**Module:** `travelplanner/steps/instagram/seed_instagram_post.py`

| | |
|--|--|
| **Purpose** | Parse URL; set platform, shortcode, initial resource type. |
| **API calls** | None. |
| **Reads** | `ctx.post_url`, optional `ctx.shortcode`, optional `ctx.raw_payload` |
| **Writes** | `ctx.platform` = Instagram, `ctx.shortcode`, `ctx.resource_type` (from URL `/reel/` or payload) |

**Observed output (full)**

```json
{
  "step": "seed_instagram_post",
  "post_url": "https://www.instagram.com/reel/Db6I58kCI7F/?stkn=MWpraDlwNHd5cDU2NA==",
  "platform": "instagram",
  "shortcode": "Db6I58kCI7F",
  "resource_type": "reel",
  "user_id": "pipeline-debug",
  "refresh": false
}
```

---

## Step 2 — `fetch_media`

**Module:** `travelplanner/steps/instagram/fetch_media.py`  
**Client:** `travelplanner/clients/mindcase.py`

| | |
|--|--|
| **Purpose** | Fetch full Instagram post JSON and build `SavedPost`. |
| **Reads** | `ctx.post_url`, `ctx.shortcode` |
| **Writes** | `ctx.raw_payload`, `ctx.resource_type` (from payload), `ctx.post` |

**API calls**

| Service | Method | Endpoint | Notes |
|---------|--------|----------|--------|
| Mindcase | POST | `https://api.mindcase.co/v1/data/instagram/posts/run` | Body: `{ "params": { "postUrls": ["<reel url>"] } }` |
| Mindcase | GET | `https://api.mindcase.co/v1/jobs/{job_id}/results` | Poll every 2s, max 180s |

**Observed output (full `SavedPost` + metadata; `raw_payload` keys only)**

```json
{
  "step": "fetch_media",
  "shortcode": "Db6I58kCI7F",
  "resource_type": "reel",
  "post_id": "instagram:Db6I58kCI7F",
  "media_kind": "reel",
  "author_handle": "whisper.of.earth",
  "posted_at": "2026-08-11T17:37:59Z",
  "like_count": 136740,
  "comment_count": 288,
  "plays": 1732040,
  "duration_s": 21.733877,
  "views": null,
  "locationName": null,
  "videoUrl_present": true,
  "caption": "📍 Suobuya Stone Forest, Taiyanghe, Hubei, China\n🌊 460 million years ago, this place was the floor of an ancient ocean.\nOver hundreds of millions of years, geological forces transformed those ancient seabed rocks into a spectacular maze of towering stone walls, narrow gorges and deep passages.\n🌿 Today, the cliffs are covered with moss and lush vegetation, creating an almost otherworldly landscape. Some of the rock formations rise dramatically around narrow pathways where visitors can walk deep into the stone forest.\n✨ A place where you can literally walk through a landscape shaped by an ancient ocean.\n\n#SuobuyaStoneForest #Enshi #HubeiChina #ChinaTravel #HiddenChina",
  "hashtags": [
    "suobuyastoneforest",
    "enshi",
    "hubeichina",
    "chinatravel",
    "hiddenchina"
  ],
  "thumbnail_url": "https://scontent-fco2-1.cdninstagram.com/v/t51.71878-15/772327507_1071060142310669_8908511338336814426_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=100&ig_cache_key=Mzk2MTUxNzk4ODYzNzA4NTM4MQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNMSVBTLnhwaWRzLjY0MC5zZHIudmlkZW9fZGVmYXVsdF9jb3Zlcl9mcmFtZS5DMyJ9&_nc_ohc=huyuPo-Dof4Q7kNvwEbWb5I&_nc_oc=AdqQapQUqjvUEAvL5ZbTaf0e51-ow5G5arzHXggIu_kfYJN0MEoJI-uyFgZAuA05Dt0xVEk-qOHLJqzPs2q0IovX&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-fco2-1.cdninstagram.com&_nc_gid=oQjZphlnRuE4KeKc0N9kJQ&_nc_ss=7a22e&oh=00_AQIsJB7FKgPjXfT4vQ_HFaa-mGc1S52dkr-1vMR_1_zyag&oe=6AAC095A",
  "location_tags_from_ig": [],
  "top_comments_count": 10,
  "top_comments": [
    "Amazing ❤️",
    "😍",
    "Сказка !!!",
    "So speracular ❤️ a magical place",
    "@emmamay_94",
    "Word?",
    "This wasn’t made by water",
    "This must be where Aqua man et al. came from 🫠",
    "Amazing😮😮😮😮",
    "Wow"
  ],
  "raw_payload_keys": [
    "artist",
    "authorId",
    "authorName",
    "authorProfileUrl",
    "authorUsername",
    "authorVerified",
    "caption",
    "captionLanguage",
    "carouselImages",
    "carouselSlideMediaUrls",
    "coauthors",
    "comments",
    "contentFormat",
    "durationS",
    "firstComment",
    "hashtags",
    "image",
    "likes",
    "likesHidden",
    "locationName",
    "mentions",
    "originalAudio",
    "paidPartnership",
    "pinned",
    "plays",
    "postUrl",
    "posted",
    "recentComments",
    "shares",
    "song",
    "source",
    "taggedUsers",
    "type",
    "videoUrl",
    "views"
  ]
}
```

---

## Step 3 — `persist_thumbnail`

**Module:** `travelplanner/steps/instagram/persist_thumbnail.py`  
**Helper:** `travelplanner/media/thumbnails.py`

| | |
|--|--|
| **Purpose** | Copy cover image from Instagram CDN to durable S3 URL. |
| **Reads** | `ctx.post.thumbnail_url`, `ctx.post.post_id` |
| **Writes** | `ctx.post.thumbnail_url` (only if upload succeeds) |
| **API calls** | HTTP GET thumbnail CDN URL; if `MEDIA_BUCKET` set → AWS S3 `PutObject` |

**Observed output (full)**

```json
{
  "step": "persist_thumbnail",
  "media_bucket_configured": false,
  "media_bucket": null,
  "s3_region": "us-east-1",
  "expected_s3_key": "thumbnails/instagram/Db6I58kCI7F.jpg",
  "thumbnail_before": "https://scontent-waw2-2.cdninstagram.com/v/t51.71878-15/772327507_1071060142310669_8908511338336814426_n.jpg?stp=dst-jpg...",
  "thumbnail_after": "https://scontent-waw2-2.cdninstagram.com/v/t51.71878-15/772327507_1071060142310669_8908511338336814426_n.jpg?stp=dst-jpg...",
  "persisted_to_s3": false,
  "unchanged_cdn_fallback": true
}
```

(`thumbnail_before` / `after` were logged with `...` in the shell summary only; `ctx.post.thumbnail_url` after step 2 is the full CDN URL in step 2 above.)

---

## Step 4 — `fetch_transcript`

**Module:** `travelplanner/steps/instagram/fetch_transcript.py`  
**Client:** `travelplanner/clients/supadata.py`

| | |
|--|--|
| **Purpose** | Plain-text speech transcript for reel/video. |
| **Reads** | `ctx.resource_type`, `ctx.shortcode` |
| **Writes** | `ctx.transcript` (string or `null`) |

**URL passed to Supadata:** `https://www.instagram.com/reel/{shortcode}/` (not CDN `videoUrl`).

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| Supadata | `client.transcript(url=..., text=True)` → `GET https://api.supadata.ai/v1/transcript?...` | Async job polled via `GET /transcript/{job_id}` when needed |

**Observed output (full)**

```json
{
  "step": "fetch_transcript",
  "shortcode": "Db6I58kCI7F",
  "resource_type": "reel",
  "media_url_passed_to_supadata": "https://www.instagram.com/reel/Db6I58kCI7F/",
  "has_transcript": false,
  "transcript_char_count": 0,
  "transcript": null,
  "supadata_error": "transcript-unavailable — No transcript is available for this video"
}
```

---

## Step 5 — `analyze_video`

**Module:** `travelplanner/steps/instagram/analyze_video.py`  
**Flag:** `extract_video_analysis` (on in dev defaults)

| | |
|--|--|
| **Purpose** | Multimodal extract: scene summary, on-screen text, travel places. |
| **Reads** | `ctx.resource_type`, `ctx.shortcode` |
| **Writes** | `ctx.video_analysis` (flattened text) |

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| Supadata | `client.extract(url, prompt, schema)` | Structured JSON → flattened lines |
| Supadata | Poll extract job | Up to 180s |

**Observed output (full `ctx.video_analysis`)**

```json
{
  "step": "analyze_video",
  "feature_flag_extract_video_analysis": true,
  "media_url": "https://www.instagram.com/reel/Db6I58kCI7F/",
  "has_video_analysis": true,
  "video_analysis_char_count": 652,
  "video_analysis": "Scene: A woman walks through a narrow canyon with steep, mossy stone walls that resemble ancient sedimentary layers. The sun shines through the narrow opening above, creating dramatic lighting within the gorge. People are seen taking photos along the path.\nOn-screen text: Imagine standing on the floor of an ocean that disappeared 460 million years ago.\nOn-screen text: 460 million years ago, this place was the floor of an ancient ocean.\nOn-screen text: Suobuya Stone Forest, Taiyanghe, Hunan, China\nPlace: Suobuya Stone Forest (Geological Park) — On-screen text overlay explicitly names the location as Suobuya Stone Forest, Taiyanghe, Hunan, China.",
  "transcript_still": null
}
```

(Overlay **Hunan** vs caption **Hubei**.)

---

## Step 6 — `extract_reel_frame_text`

**Module:** `travelplanner/steps/instagram/extract_reel_frame_text.py`  
**Helpers:** `travelplanner/reel_frame_text.py`, `travelplanner/image_text.py`  
**Flag:** `extract_reel_frame_text` (default **off** in `feature_flag.py`; enable only if video analysis is insufficient)

| | |
|--|--|
| **Purpose** | Sample video frames, OCR on-screen text. |
| **Reads** | `ctx.raw_payload` → `videoUrl` |
| **Writes** | `ctx.image_text` |

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| Instagram CDN | HTTP GET | Download `videoUrl` from Mindcase payload |
| Local | ffmpeg (via `imageio-ffmpeg`) | Frame grabs at adaptive timestamps |
| OpenAI | Chat Completions (vision) | Per-frame OCR in `ocr_image_path` |

**Observed output (full; after `imageio-ffmpeg` installed)**

```json
{
  "step": "extract_reel_frame_text",
  "feature_flag_extract_reel_frame_text": true,
  "video_url_present": true,
  "has_image_text": true,
  "image_text_char_count": 82,
  "image_text": "Imagine standing on\n460 million\n📍 Suobuya Stone Forest, Taiyanghe, Hunan, China 🇨🇳"
}
```

**Local requirement:** `imageio-ffmpeg` package; without it the step no-ops (`image_text` stays `null`).

---

## Step 7 — `classify_content`

**Module:** `travelplanner/steps/classify_content.py`  
**Flag:** `content_categories`

| | |
|--|--|
| **Purpose** | Set `SavedPost.content_category` for close-pipeline dispatch. |
| **Reads** | `ctx.post`, `ctx.transcript`, `ctx.image_text`, `ctx.video_analysis` |
| **Writes** | `ctx.content_bundle`, `ctx.post.content_category` |

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| OpenAI | `chat.completions.create` | JSON schema `content_category` enum; model from `OPENAI_MODEL` |

**Observed output (full snippets + category)**

```json
{
  "step": "classify_content",
  "feature_flag_content_categories": true,
  "post_id": "instagram:Db6I58kCI7F",
  "content_category_before": null,
  "content_category_after": "travel",
  "snippets_used": [
    {
      "source": "author_handle",
      "text": "@whisper.of.earth"
    },
    {
      "source": "caption",
      "text": "📍 Suobuya Stone Forest, Taiyanghe, Hubei, China\n🌊 460 million years ago, this place was the floor of an ancient ocean.\nOver hundreds of millions of years, geological forces transformed those ancient seabed rocks into a spectacular maze of towering stone walls, narrow gorges and deep passages.\n🌿 Today, the cliffs are covered with moss and lush vegetation, creating an almost otherworldly landscape. Some of the rock formations rise dramatically around narrow pathways where visitors can walk deep into the stone forest.\n✨ A place where you can literally walk through a landscape shaped by an ancient ocean.\n\n#SuobuyaStoneForest #Enshi #HubeiChina #ChinaTravel #HiddenChina"
    },
    {
      "source": "video_analysis",
      "text": "Scene: A woman walks through a narrow canyon with steep, mossy stone walls that resemble ancient sedimentary layers. The sun shines through the narrow opening above, creating dramatic lighting within the gorge. People are seen taking photos along the path.\nOn-screen text: Imagine standing on the floor of an ocean that disappeared 460 million years ago.\nOn-screen text: 460 million years ago, this place was the floor of an ancient ocean.\nOn-screen text: Suobuya Stone Forest, Taiyanghe, Hunan, China\nPlace: Suobuya Stone Forest (Geological Park) — On-screen text overlay explicitly names the location as Suobuya Stone Forest, Taiyanghe, Hunan, China."
    },
    {
      "source": "image_text",
      "text": "Imagine standing on\n460 million\n📍 Suobuya Stone Forest, Taiyanghe, Hunan, China 🇨🇳"
    },
    {
      "source": "hashtags",
      "text": "#suobuyastoneforest #enshi #hubeichina #chinatravel #hiddenchina"
    },
    {
      "source": "top_comments",
      "text": "- Amazing ❤️\n- 😍\n- Сказка !!!\n- So speracular ❤️ a magical place\n- @emmamay_94\n- Word?\n- This wasn’t made by water\n- This must be where Aqua man et al. came from 🫠\n- Amazing😮😮😮😮\n- Wow"
    }
  ]
}
```

(No `transcript` snippet — step 4 returned `null`.)

---

## Step 8 — `extract_places`

**Module:** `travelplanner/steps/extract_places.py`  
**Logic:** `travelplanner/extract.py` (`fetch_places_from_snippets`)

| | |
|--|--|
| **Purpose** | LLM extract visitable places, summary, trip tips. |
| **Reads** | `ctx.content_bundle` (or builds from post + enrichments) |
| **Writes** | `ctx.post.extracted_places`, `reel_summary`, `trip_tips` |

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| OpenAI | `chat.completions.create` | Structured extraction schema (places, summary, tips) |

**Observed output (full)**

```json
{
  "step": "extract_places",
  "post_id": "instagram:Db6I58kCI7F",
  "content_category": "travel",
  "place_count": 1,
  "reel_summary": "The reel showcases the Suobuya Stone Forest in Taiyanghe, Hubei, China, a unique geological formation that was once the floor of an ancient ocean. Visitors can explore the towering stone walls and narrow gorges, surrounded by lush vegetation, creating a surreal landscape.",
  "trip_tips": [],
  "extracted_places": [
    {
      "place_name": "Suobuya Stone Forest",
      "city": "Taiyanghe",
      "country": "China",
      "state_province": "Hubei",
      "details": "Visitors can walk through a landscape shaped by an ancient ocean, featuring towering stone walls and narrow pathways.",
      "tips": [],
      "category": "park",
      "attributes": [],
      "parent_place_name": null,
      "parent_category": null
    }
  ]
}
```

---

## Step 9 — `process_place_mentions`

**Module:** `travelplanner/steps/process_mentions.py` (step name `process_place_mentions`)  
**Helpers:** `mentions_from_post`, `locate_mention_debug`, `upsert_place_record`

| | |
|--|--|
| **Purpose** | Geocode each mention, gate non-travel OSM types, upsert `Place` rows. |
| **Reads** | `ctx.post` (extracted + platform places), optional `ctx.place_library` |
| **Writes** | `ctx.place_ids`, `ctx.place_outcomes`, updates `ctx.place_library`, **DynamoDB** `Places` |

**API calls (per mention)**

| Service | Call | When |
|---------|------|------|
| DynamoDB | `Scan` | `load_all_places()` if `place_library` not provided |
| Nominatim (geopy) | Geocode search | Primary locate; rate-limited ≥1s between calls |
| OpenAI | Optional | `llm_pick.pick_candidate_index` if top scores ambiguous |
| Google Geocoding | Optional | `google_geocode_fallback` flag (off by default) |
| DynamoDB | `PutItem` / update | `save_place` via `upsert_place_record` |

**Observed output (full)**

```json
{
  "step": "process_mentions",
  "step_registered_name": "process_place_mentions",
  "dynamodb_stage": "dev",
  "dynamodb_region": "us-west-2",
  "mentions_input": [
    {
      "place_name": "Suobuya Stone Forest",
      "city": "Taiyanghe",
      "country": "China",
      "state_province": "Hubei",
      "latitude": null,
      "longitude": null,
      "details": "Visitors can walk through a landscape shaped by an ancient ocean, featuring towering stone walls and narrow gorges.",
      "tips": [],
      "category": "park",
      "attributes": [],
      "parent_place_name": null
    }
  ],
  "place_ids": [
    "cn-hubei-enshi-suobuya-stone-forest"
  ],
  "outcomes": [
    {
      "status": "resolved",
      "reason": null,
      "match_confidence": 1.0,
      "mention": {
        "place_name": "Suobuya Stone Forest",
        "city": "Taiyanghe",
        "country": "China",
        "state_province": "Hubei",
        "latitude": null,
        "longitude": null,
        "details": "Visitors can walk through a landscape shaped by an ancient ocean, featuring towering stone walls and narrow gorges.",
        "tips": [],
        "category": "park",
        "attributes": [],
        "parent_place_name": null
      },
      "location": {
        "display_name": "Suobuya Stone Forest",
        "continent": "Asia",
        "country": "China",
        "country_code": "CN",
        "state_province": "Hubei",
        "city": "Enshi",
        "latitude": 30.5771244,
        "longitude": 109.5729313,
        "provider_place_id": "240231100",
        "osm_class": "leisure",
        "osm_type": "nature_reserve"
      },
      "place": {
        "place_id": "cn-hubei-enshi-suobuya-stone-forest",
        "display_name": "Suobuya Stone Forest",
        "category": "park",
        "location": {
          "display_name": "Suobuya Stone Forest",
          "continent": "Asia",
          "country": "China",
          "country_code": "CN",
          "state_province": "Hubei",
          "city": "Enshi",
          "latitude": 30.5771244,
          "longitude": 109.5729313,
          "provider_place_id": "240231100",
          "osm_class": "leisure",
          "osm_type": "nature_reserve"
        },
        "source_post_ids": [
          "instagram:Db6I58kCI7F"
        ],
        "details": [
          "Visitors can walk through a landscape shaped by an ancient ocean, featuring towering stone walls and narrow gorges."
        ],
        "tips": [],
        "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Suobuya%20Stone%20Forest%2C%20Enshi%2C%20Hubei%2C%20China"
      }
    }
  ]
}
```

---

## Step 10 — `enrich_place_facts` (post-work)

**Module:** `travelplanner/steps/enrich_place_facts.py`  
**Orchestrator:** `travelplanner/places/facts/enrich.py`  
**Flag:** `place_facts` (step uses `force=True` when run from ingest step)

| | |
|--|--|
| **Purpose** | Source-backed facts on `Place.facts` (hours, website, highlights, …). |
| **Reads** | `ctx.place_ids` → `load_place` |
| **Writes** | DynamoDB place facts via `save_place_facts` |

**API calls (parallel tool fetch, category `park`)**

| Tool ID | External API | Cost |
|---------|----------------|------|
| `osm_tags` | Overpass `https://overpass-api.de/api/interpreter` | Free |
| `wikivoyage_summary` | `en.wikivoyage.org/w/api.php` (geosearch + extract) | Free |
| `wikipedia_summary` | `en.wikipedia.org/w/api.php` (geosearch + summary) | Free |
| `google_place_details` | Mindcase `POST /v1/data/google-maps/places/run` + job poll | Paid |
| `nps_park` | NPS API | Only US national parks |

**Downstream (when documents match)**

| Step | API |
|------|-----|
| Structured draft + verify | In-process |
| `fill_insights_from_documents` | OpenAI chat (if key set) |

**Observed output (full; second run with `SSL_CERT_FILE` → certifi)**

```json
{
  "step": "enrich_place_facts",
  "place_id": "cn-hubei-enshi-suobuya-stone-forest",
  "result_status": "saved",
  "result_note": "no structured fields",
  "facts": {
    "status": "empty",
    "fetched_at": "2026-09-13T06:32:06Z",
    "website_url": null,
    "phone_number": null,
    "opening_hours_text": [],
    "admission_text": null,
    "famous_for": null,
    "best_time_to_visit": null,
    "typical_duration_minutes": null,
    "highlights": [],
    "caveats": [],
    "recommendations": [],
    "notes": [
      "google_place_details error: Mindcase job 4616649b-5080-4fd0-96e9-6e26b430ee20 timed out after 180s",
      "no structured fields in source documents"
    ],
    "conflicts": [],
    "evidence": [],
    "source_documents": [
      { "tool_id": "osm_tags", "source_name": "osm", "title": "莲花寨步道" },
      { "tool_id": "osm_tags", "source_name": "osm", "title": "莲花寨步道" },
      { "tool_id": "osm_tags", "source_name": "osm", "title": "莲花寨步道" },
      { "tool_id": "osm_tags", "source_name": "osm", "title": "磨子沟步道" },
      { "tool_id": "osm_tags", "source_name": "osm", "title": "磨子沟步道" },
      { "tool_id": "osm_tags", "source_name": "osm", "title": "磨子沟步道" }
    ]
  }
}
```

First attempt (no certifi): Wikipedia, Wikivoyage, and Overpass failed with `SSL: CERTIFICATE_VERIFY_FAILED`; Google timed out; facts saved as `empty` with note `no matching source documents`.

**CLI equivalent**

```bash
DYNAMODB_REGION=us-west-2 python3 cli.py \
  --enrich-place-facts \
  --place-id cn-hubei-enshi-suobuya-stone-forest \
  --force
```

---

## Persona layer (after pipeline, not covered step-by-step)

Typical ingest entry (`travelplanner/pipeline.py` / server worker) also:

- Persist `SavedPost` to DynamoDB `Posts`
- Link `UserPosts` / `UserPlaces` for `user_id`
- Enqueue SQS per `place_id` for facts worker (same as step 10)

Ingest **job success** does not wait on facts enrichment.

---

## Re-running a single step locally

```python
from travelplanner.flow.context import IngestContext
from travelplanner.steps.instagram.fetch_media import FETCH_MEDIA_STEP

ctx = IngestContext(post_url="https://www.instagram.com/reel/Db6I58kCI7F/", user_id="debug")
ctx = FETCH_MEDIA_STEP.run(ctx)
```

Chain prior steps on the same `ctx` object. For step 9+, set `DYNAMODB_REGION=us-west-2` (or your deployed region).

---

## API call summary table (this reel, happy path)

| Step | Mindcase | Supadata | OpenAI | Nominatim/Overpass | DynamoDB | S3/CDN |
|------|----------|----------|--------|-------------------|----------|--------|
| 1 | — | — | — | — | — | — |
| 2 | ✓ post run | — | — | — | — | — |
| 3 | — | — | — | — | — | GET CDN; optional S3 |
| 4 | — | ✓ transcript | — | — | — | — |
| 5 | — | ✓ extract | — | — | — | — |
| 6 | — | — | ✓ vision OCR | — | — | GET video CDN |
| 7 | — | — | ✓ classify | — | — | — |
| 8 | — | — | ✓ extract places | — | — | — |
| 9 | — | — | optional pick | ✓ geocode | ✓ scan + write | — |
| 10 | ✓ Google places | — | optional insights | ✓ Overpass; wiki APIs | ✓ facts | — |

---

## Related docs

- [pipeline-walkthrough-instagram-carousel-example.md](./pipeline-walkthrough-instagram-carousel-example.md) — carousel `/p/` path (slide OCR, multi-place resolve)
- [pipeline-walkthrough-instagram-image-example.md](./pipeline-walkthrough-instagram-image-example.md) — single image itinerary graphic (OCR-critical)
- [pipeline-walkthrough-instagram-reel-amsterdam-kayak-example.md](./pipeline-walkthrough-instagram-reel-amsterdam-kayak-example.md) — travel reel shared as `/p/` (kayak operator + Jordaan)
- [pipeline-framework-design.md](./pipeline-framework-design.md) — layers, flags, close dispatch
- [place-facts-plan.md](./place-facts-plan.md) — facts pipeline design
- [AGENTS.md](../AGENTS.md) — env vars and run commands

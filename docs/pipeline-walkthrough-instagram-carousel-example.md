# Instagram carousel ingest — step-by-step I/O and API calls

Worked example for a **travel** carousel post:

`https://www.instagram.com/p/DOd5nuWDAuP/` (shortcode `DOd5nuWDAuP`, `@travel2amsterdam` — “10 Things to do in Amsterdam”).

This document maps each pipeline step to **context inputs/outputs**, **external calls**, and **observed results** from a local step-by-step run (September 2026). For architecture rules see [pipeline-framework-design.md](./pipeline-framework-design.md).

**Outputs below** are the **full values recorded during the interactive walkthrough** in this repo (not re-run for the doc). Re-execute a step only if you need fresh API data. The only field we did not paste in full is Mindcase **`raw_payload`** (entire JSON blob); step 2 lists its top-level keys and the full `SavedPost` fields we captured.

**Compared to a reel:** `/p/` URLs do not guess `resource_type` in step 1; Mindcase sets `carousel` in step 2. The Instagram **tail** runs **`extract_image_text`** only (no Supadata transcript/video analysis). See [pipeline-walkthrough-instagram-reel-example.md](./pipeline-walkthrough-instagram-reel-example.md) for the reel path.

---

## Pipeline order (carousel → travel)

```text
instagram_head
  1. seed_instagram_post
  2. fetch_media
  3. persist_thumbnail

instagram_tail (resource_type = carousel)
  4. extract_image_text        [FeatureFlag: extract_image_text]

instagram_classify
  5. classify_content           [FeatureFlag: content_categories]

instagram_place_close (content_category = travel)
  6. extract_places
  7. process_place_mentions      (code: process_mentions)

persona post-work (not in pipeline runner)
  8. enrich_place_facts         [FeatureFlag: place_facts; often SQS worker]
```

**Context type:** `IngestContext` (`travelplanner/flow/context.py`).

| Field | Set by (typical) |
|-------|------------------|
| `post_url`, `user_id`, `refresh` | Entry (API / CLI) |
| `platform`, `shortcode`, `resource_type` | Step 1 (refined in 2) |
| `raw_payload` | Step 2 |
| `post` (`SavedPost`) | Step 2 |
| `image_text` | Step 4 |
| `content_bundle` | Steps 5–6 (built if missing) |
| `post.content_category` | Step 5 |
| `post.extracted_places`, `reel_summary`, `trip_tips` | Step 6 |
| `place_ids`, `place_outcomes`, `place_library` | Step 7 |

---

## Environment and infrastructure

| Variable / setting | Used by |
|--------------------|---------|
| `MINDCASE_API_KEY` | Step 2, 8 (Google place details) |
| `OPENAI_API_KEY` | Steps 4, 5, 6, 7 (optional LLM pick), 8 (insights) |
| `MEDIA_BUCKET` | Step 3 (optional S3) |
| `DYNAMODB_STAGE`, `DYNAMODB_REGION` | Step 7, 8 (`Places-{stage}-{region}`) |
| `GOOGLE_MAPS_API_KEY` | Step 7 only if `google_geocode_fallback` flag on |
| `SSL_CERT_FILE` → certifi bundle | Recommended on macOS Python for Wikipedia / Wikivoyage / Overpass in step 8 |

Dev tables for this project are in **`us-west-2`** (`Places-dev-us-west-2`), not `us-east-1`.

---

## Step 1 — `seed_instagram_post`

**Module:** `travelplanner/steps/instagram/seed_instagram_post.py`

| | |
|--|--|
| **Purpose** | Parse URL; set platform, shortcode, initial resource type. |
| **API calls** | None. |
| **Reads** | `ctx.post_url`, optional `ctx.shortcode`, optional `ctx.raw_payload` |
| **Writes** | `ctx.platform` = Instagram, `ctx.shortcode`, `ctx.resource_type` (from `/reel/` URL only until payload exists) |

For `/p/` URLs, `resource_type` stays **`null`** until step 2.

**Observed output (full)**

```json
{
  "step": "seed_instagram_post",
  "post_url": "https://www.instagram.com/p/DOd5nuWDAuP/",
  "platform": "instagram",
  "shortcode": "DOd5nuWDAuP",
  "resource_type": null,
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
| Mindcase | POST | `https://api.mindcase.co/v1/data/instagram/posts/run` | Body: `{ "params": { "postUrls": ["<post url>"] } }` |
| Mindcase | GET | `https://api.mindcase.co/v1/jobs/{job_id}/results` | Poll every 2s, max 180s |

**Observed output (full `SavedPost` + metadata; `raw_payload` keys only)**

```json
{
  "step": "fetch_media",
  "shortcode": "DOd5nuWDAuP",
  "resource_type": "carousel",
  "post_id": "instagram:DOd5nuWDAuP",
  "media_kind": "carousel",
  "author_handle": "travel2amsterdam",
  "posted_at": "2025-09-16T15:33:27Z",
  "like_count": 9798,
  "comment_count": 2592,
  "plays": null,
  "duration_s": null,
  "views": null,
  "locationName": "Amsterdam, Netherlands",
  "videoUrl_present": false,
  "carousel_slide_count": 13,
  "caption": "10 Things to do in Amsterdam 🇳🇱✨\nby @explorewithmairyy \n.\n.\n@stanley_hotel_amsterdam ~ Stylish hotel in the heart of Amsterdam with canal views & moderns rooms 🇳🇱🛎️\n.\n@cornerbakeryamsterdam ~ Brunch & breakfast spot at 2 locations in Amsterdam 🇳🇱🍳\n.\n@theburgermaffia ~ The most delicious smash burgers in the city 🍔🍹\n.\n@loop51_ams ~ Brunch & vinyl bar in the heart of Amsterdam 🇳🇱\n.\n@bysim.app ~ Stay connected while travelling the world 📲✈️\n.\n.\n#amsterdam #amsterdamcity #europetravel #amsterdamstreets #beautiful #photographers #enjoy #life #nederland #sky #travel\n#travelphotography #travelgram #travelamsterdam #photo #photography #photooftheday #photoeveryday #visitamsterdam #holland #europe #instagram #instagood #igeurope #amsterdamtravel #mapofeurope #canals #netherlands #traveleurope #europetrip",
  "hashtags": [
    "amsterdam",
    "amsterdamcity",
    "europetravel",
    "amsterdamstreets",
    "beautiful",
    "photographers",
    "enjoy",
    "life",
    "nederland",
    "sky",
    "travel",
    "travelphotography",
    "travelgram",
    "travelamsterdam",
    "photo",
    "photography",
    "photooftheday",
    "photoeveryday",
    "visitamsterdam",
    "holland",
    "europe",
    "instagram",
    "instagood",
    "igeurope",
    "amsterdamtravel",
    "mapofeurope",
    "canals",
    "netherlands",
    "traveleurope",
    "europetrip"
  ],
  "thumbnail_url": "https://scontent-icn2-1.cdninstagram.com/v/t51.82787-15/546482846_17903677989249150_6521610725900442727_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=109&ig_cache_key=MzcxOTIyNTc0Mzg4MTUzNjgyMA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTE3MC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=2TneWa7n6IcQ7kNvwErbnvF&_nc_oc=Adqr8USf-Fqc7trG0vy8jovIdb_HOsSDnc2JdntdQGPk1AijMy0Ix1EntgTtJKHB580&_nc_ad=z-m&_nc_cid=1753&_nc_zt=23&_nc_ht=scontent-icn2-1.cdninstagram.com&_nc_gid=4jDmgX1iHkuN0TcUyx3oTA&_nc_ss=7a22e&oh=00_AQL3D54VAbtM_XFrzBz1tHkLLE00E8nHw54ZSPyhCpPUGg&oe=6AACC57F",
  "top_comments_count": 10,
  "top_comments": [
    "Guide",
    "GUiDE",
    "Guide",
    "Guide ❤️",
    "Guide",
    "Guide",
    "Guide",
    "Guide",
    "Guide",
    "Guide"
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
  "expected_s3_key": "thumbnails/instagram/DOd5nuWDAuP.jpg",
  "thumbnail_before": "https://scontent-icn2-1.cdninstagram.com/v/t51.82787-15/546482846_17903677989249150_6521610725900442727_n.jpg?...",
  "thumbnail_after": "https://scontent-icn2-1.cdninstagram.com/v/t51.82787-15/546482846_17903677989249150_6521610725900442727_n.jpg?...",
  "persisted_to_s3": false,
  "unchanged_cdn_fallback": true
}
```

(`thumbnail_before` / `after` use the full CDN URL from step 2.)

---

## Step 4 — `extract_image_text`

**Module:** `travelplanner/steps/instagram/extract_image_text.py`  
**Helpers:** `travelplanner/image_text.py`, slide URLs from Mindcase `carouselImages` / `carouselSlideMediaUrls`  
**Flag:** `extract_image_text` (on in dev defaults)

| | |
|--|--|
| **Purpose** | OCR each carousel slide → merged `ctx.image_text`. |
| **Reads** | `ctx.raw_payload`, `ctx.resource_type` (`carousel` or `image`) |
| **Writes** | `ctx.image_text` |

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| Instagram CDN | HTTP GET | One request per slide URL |
| OpenAI | Chat Completions (vision) | Per-slide OCR in `ocr_image_bytes` |

**Observed output (full)**

```json
{
  "step": "extract_image_text",
  "feature_flag_extract_image_text": true,
  "resource_type": "carousel",
  "carousel_slide_count": 13,
  "has_image_text": true,
  "image_text_char_count": 314,
  "image_text": "10 things to do\nAMSTERDAM\n1. Moco Museum\n2. Visit Zaandam\n@explore_human\n3. Anne frank house\nBelieve It\nor Not!\n5 FLOORS OF ENTERTAINMENT\n3. Visit ripley's\n@explorewithmarty\n4. Do a sunset canal cruise\n@explorewithmatt\n7. Visit the red light district\nMoulin Rouge\nEROTIC\nnightclub\nLIVE SEX\ntheater\nRed Light Secrets\nMUSEUM OF PROSTITUTION",
  "ocr_notes": "Some slides hit OpenAI TPM rate limits (429) and were skipped; merged text still covers the numbered list and sponsored venues from caption + successful slides."
}
```

(No `transcript`, `video_analysis`, or `image_text` from reel-only steps.)

---

## Step 5 — `classify_content`

**Module:** `travelplanner/steps/classify_content.py`  
**Flag:** `content_categories`

| | |
|--|--|
| **Purpose** | Set `SavedPost.content_category` for close-pipeline dispatch. |
| **Reads** | `ctx.post`, `ctx.image_text`, optional enrichments |
| **Writes** | `ctx.content_bundle`, `ctx.post.content_category` |

**API calls**

| Service | Call | Notes |
|---------|------|--------|
| OpenAI | `chat.completions.create` | JSON schema `content_category` enum; model from `OPENAI_MODEL` |

Classifier is **fail-soft**: on empty snippets or OpenAI errors it leaves `content_category` **`null`** and ingest continues. During this walkthrough, classify returned **`null`** once when OCR + classify hit the same TPM window; after a short cooldown the same snippets classified as **`travel`**.

**Observed output (full snippets + category)**

```json
{
  "step": "classify_content",
  "feature_flag_content_categories": true,
  "post_id": "instagram:DOd5nuWDAuP",
  "content_category_before": null,
  "content_category_after": "travel",
  "snippets_used": [
    {
      "source": "author_handle",
      "text": "@travel2amsterdam"
    },
    {
      "source": "caption",
      "text": "10 Things to do in Amsterdam 🇳🇱✨\nby @explorewithmairyy \n.\n.\n@stanley_hotel_amsterdam ~ Stylish hotel in the heart of Amsterdam with canal views & moderns rooms 🇳🇱🛎️\n.\n@cornerbakeryamsterdam ~ Brunch & breakfast spot at 2 locations in Amsterdam 🇳🇱🍳\n.\n@theburgermaffia ~ The most delicious smash burgers in the city 🍔🍹\n.\n@loop51_ams ~ Brunch & vinyl bar in the heart of Amsterdam 🇳🇱\n.\n@bysim.app ~ Stay connected while travelling the world 📲✈️\n.\n.\n#amsterdam #amsterdamcity #europetravel ..."
    },
    {
      "source": "image_text",
      "text": "10 things to do\nAMSTERDAM\n1. Moco Museum\n2. Visit Zaandam\n...\n7. Visit the red light district\n..."
    },
    {
      "source": "location_tag",
      "text": "Amsterdam, Netherlands"
    },
    {
      "source": "hashtags",
      "text": "#amsterdam #amsterdamcity #europetravel ..."
    },
    {
      "source": "top_comments",
      "text": "- Guide\n- GUiDE\n- Guide ❤️"
    }
  ]
}
```

---

## Step 6 — `extract_places`

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
  "post_id": "instagram:DOd5nuWDAuP",
  "content_category": "travel",
  "place_count": 10,
  "reel_summary": "This reel highlights ten things to do in Amsterdam, including museums, dining spots, and unique experiences. It showcases popular attractions and local favorites for travelers looking to explore the city.",
  "trip_tips": [],
  "extracted_places": [
    {
      "place_name": "Moco Museum",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A contemporary art museum featuring works by modern artists.",
      "tips": [],
      "category": "museum",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Zaandam",
      "city": "Zaandam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A picturesque town known for its historic windmills and colorful wooden houses.",
      "tips": [],
      "category": "city",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Anne Frank House",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "The historic house where Anne Frank wrote her diary during World War II.",
      "tips": [],
      "category": "landmark",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Ripley's Believe It or Not!",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "An entertainment center featuring oddities and interactive exhibits.",
      "tips": [],
      "category": "landmark",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Canal Cruise",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A scenic boat tour through Amsterdam's famous canals, especially beautiful at sunset.",
      "tips": [],
      "category": "landmark",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Red Light District",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A famous area known for its nightlife and adult entertainment.",
      "tips": [],
      "category": "neighborhood",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Stanley Hotel Amsterdam",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A stylish hotel offering modern rooms with canal views.",
      "tips": [],
      "category": "hotel",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Corner Bakery Amsterdam",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A popular brunch and breakfast spot with two locations in the city.",
      "tips": [],
      "category": "cafe",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "The Burger Maffia",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Known for serving delicious smash burgers in the city.",
      "tips": [],
      "category": "restaurant",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Loop 51",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "A brunch and vinyl bar located in the heart of Amsterdam.",
      "tips": [],
      "category": "cafe",
      "attributes": [],
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    }
  ]
}
```

---

## Step 7 — `process_place_mentions`

**Module:** `travelplanner/steps/process_mentions.py` (step name `process_place_mentions`)  
**Helpers:** `mentions_from_post`, locate/upsert in `travelplanner/places/`

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
| DynamoDB | `PutItem` / update | `save_place` via upsert |

**Observed summary**

| Outcome | Count | Examples |
|---------|-------|----------|
| `resolved` | 6 | Moco Museum, Anne Frank House, Ripley's, Red Light District, Corner Bakery, The Burger Maffia |
| `rejected` | 3 | IG location tag `Amsterdam, Netherlands`, city `Zaandam`, parent city `Amsterdam` — **non-travel OSM match** (`boundary` / `administrative`) |
| `unresolved` | 3 | Generic **Sunset Canal Cruise**, **Stanley Hotel Amsterdam** (no Nominatim hit), **Loop 51** (highway false positive; LLM pick rejected) |

**`ctx.place_ids` (resolved only)**

```json
[
  "nl-north-holland-amsterdam-moco-museum",
  "nl-north-holland-amsterdam-anne-frank-house",
  "nl-north-holland-amsterdam-ripley-s-believe-it-or-not",
  "nl-north-holland-amsterdam-red-light-district",
  "nl-north-holland-amsterdam-corner-bakery-amsterdam",
  "nl-north-holland-amsterdam-the-burger-maffia"
]
```

**Sample resolved outcome (Moco Museum)**

```json
{
  "status": "resolved",
  "reason": null,
  "match_confidence": 1.0,
  "mention": {
    "place_name": "Moco Museum",
    "city": "Amsterdam",
    "country": "Netherlands",
    "category": "museum"
  },
  "location": {
    "display_name": "Moco Museum",
    "country": "Netherlands",
    "state_province": "North Holland",
    "city": "Amsterdam",
    "latitude": 52.3587165,
    "longitude": 4.8819619,
    "osm_class": "tourism",
    "osm_type": "museum"
  },
  "place": {
    "place_id": "nl-north-holland-amsterdam-moco-museum",
    "display_name": "Moco Museum",
    "category": "museum",
    "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Moco%20Museum%2C%20Amsterdam%2C%20North%20Holland%2C%20Netherlands"
  }
}
```

**Sample unresolved outcome (Loop 51)**

```json
{
  "status": "unresolved",
  "reason": "ranked: Loop (highway) score=0.64; llm_pick rejected all (Neither candidate matches the intended destination name or category.)",
  "mention": {
    "place_name": "Loop 51",
    "city": "Amsterdam",
    "country": "Netherlands",
    "category": "cafe"
  },
  "location": null,
  "place": null
}
```

---

## Step 8 — `enrich_place_facts` (post-work)

**Module:** `travelplanner/steps/enrich_place_facts.py`  
**Orchestrator:** `travelplanner/places/facts/enrich.py`  
**Flag:** `place_facts` (off by default in `feature_flag.py`; SQS worker or manual CLI when on)

| | |
|--|--|
| **Purpose** | Source-backed facts on `Place.facts` (hours, website, highlights, …). |
| **Reads** | `ctx.place_ids` → `load_place` (or `ctx.place_library`) |
| **Writes** | DynamoDB place facts via `save_place_facts` |

For this carousel, step 7 produced **six** `place_ids`. Enrichment runs **once per id** (deduped), in list order.

**Ingest step vs manual refresh**

| Path | When enrich runs | `force` |
|------|------------------|---------|
| `ENRICH_PLACE_FACTS_STEP` during ingest | Only if `facts_are_stale(place.facts)` (TTL from `place_facts_ttl_days`) | `True` when it does run |
| CLI / worker / local debug | Always when invoked | `--force` optional |

**Observed ingest-step behavior (facts already fresh from earlier resolves)**

After step 7, calling `enrich_place_facts_step` with the six `place_ids` and `FeatureFlag.place_facts` on completed in ~1s with **no Mindcase/OpenAI calls** — every pin was inside the TTL window (`was_stale=false`). Production still **enqueues SQS** per `place_id` so a worker can refresh asynchronously.

**API calls (parallel tool fetch; tools gated by place category)**

| Tool ID | External API | Typical categories here | Cost |
|---------|----------------|-------------------------|------|
| `osm_tags` | Overpass `https://overpass-api.de/api/interpreter` | museum, cafe, restaurant, landmark | Free |
| `wikivoyage_summary` | `en.wikivoyage.org/w/api.php` (geosearch + extract) | all | Free |
| `wikipedia_summary` | `en.wikipedia.org/w/api.php` (geosearch + summary) | museum, landmark | Free |
| `google_place_details` | Mindcase `POST /v1/data/google-maps/places/run` + job poll | all visitable pins | Paid |
| `nps_park` | NPS API | — (US parks only; not used) | — |

**Downstream (when documents match)**

| Step | API |
|------|-----|
| Structured draft + verify | In-process |
| `fill_insights_from_documents` | OpenAI chat (`highlights`, `caveats`, `recommendations`, …) |

**Walkthrough refresh (`enrich_place_facts(place, force=True)` for all six ids)**

Forced re-fetch for documentation (September 2026, `SSL_CERT_FILE` → certifi, `DYNAMODB_REGION=us-west-2`). Same session also hit **OpenAI `insufficient_quota`** on `fill_insights_from_documents`, so several pins saved **`partial`** or **`complete`** without fresh LLM insight bullets. **Anne Frank House** lost Google details when a Mindcase job timed out (180s). **Overpass** returned 504 / read timeout on some coordinates.

| `place_id` | Category | `result_status` | `facts.status` | Notable |
|------------|----------|-----------------|----------------|---------|
| `nl-north-holland-amsterdam-moco-museum` | museum | saved | partial | Google + OSM hours; Wikipedia geosearch neighbors |
| `nl-north-holland-amsterdam-anne-frank-house` | museum | saved | partial | Wikipedia only this run; Google timeout |
| `nl-north-holland-amsterdam-ripley-s-believe-it-or-not` | museum | saved | partial | Google website/phone + Wikipedia |
| `nl-north-holland-amsterdam-red-light-district` | landmark | saved | complete | Google → Red Light Secrets museum listing |
| `nl-north-holland-amsterdam-corner-bakery-amsterdam` | cafe | saved | complete | Google + OSM hours; OSM name mismatch (Café Loetje node) |
| `nl-north-holland-amsterdam-the-burger-maffia` | restaurant | saved | partial | Google website/phone/cuisines only |

**Observed output (full facts per pin; `source_documents` trimmed to tool/title/ref)**

```json
{
  "step": "enrich_place_facts",
  "post_url": "https://www.instagram.com/p/DOd5nuWDAuP/",
  "mode": "force=True per place (walkthrough capture)",
  "place_ids": [
    "nl-north-holland-amsterdam-moco-museum",
    "nl-north-holland-amsterdam-anne-frank-house",
    "nl-north-holland-amsterdam-ripley-s-believe-it-or-not",
    "nl-north-holland-amsterdam-red-light-district",
    "nl-north-holland-amsterdam-corner-bakery-amsterdam",
    "nl-north-holland-amsterdam-the-burger-maffia"
  ],
  "per_place": [
    {
      "place_id": "nl-north-holland-amsterdam-moco-museum",
      "display_name": "Moco Museum",
      "category": "museum",
      "was_stale_before_run": false,
      "result_status": "saved",
      "result_note": "saved status=partial",
      "facts": {
        "status": "partial",
        "fetched_at": "2026-09-13T19:51:45Z",
        "website_url": "https://www.mocomuseum.com/amsterdam/",
        "phone_number": null,
        "opening_hours_text": ["09:30-17:00"],
        "famous_for": "Art museum housed in an early-20th-century townhouse, featuring inventive works by Dalí & Banksy.",
        "highlights": [],
        "caveats": [],
        "recommendations": [],
        "conflicts": ["famous_for: google_places≠osm"],
        "notes": [
          "structured fill from source documents",
          "llm_insights error: OpenAI insufficient_quota (429)"
        ],
        "source_documents": [
          { "tool_id": "wikipedia_summary", "source_name": "wikipedia", "title": "Moco Museum" },
          { "tool_id": "google_place_details", "source_name": "google_places", "title": "Moco Museum | Amsterdam" },
          { "tool_id": "osm_tags", "source_name": "osm", "title": "Museumshop" }
        ]
      }
    },
    {
      "place_id": "nl-north-holland-amsterdam-anne-frank-house",
      "display_name": "Anne Frank House",
      "category": "museum",
      "was_stale_before_run": false,
      "result_status": "saved",
      "result_note": "saved status=partial",
      "facts": {
        "status": "partial",
        "fetched_at": "2026-09-13T19:54:51Z",
        "website_url": null,
        "phone_number": null,
        "opening_hours_text": [],
        "famous_for": "Writer's house and museum in Amsterdam",
        "highlights": [],
        "caveats": [],
        "recommendations": [],
        "conflicts": ["famous_for: wikipedia≠wikipedia"],
        "notes": [
          "structured fill from source documents",
          "google_place_details error: Mindcase job timed out after 180s",
          "llm_insights error: OpenAI insufficient_quota (429)"
        ],
        "source_documents": [
          { "tool_id": "wikipedia_summary", "source_name": "wikipedia", "title": "Anne Frank House" },
          { "tool_id": "wikipedia_summary", "source_name": "wikipedia", "title": "Anne Frank tree" },
          { "tool_id": "wikipedia_summary", "source_name": "wikipedia", "title": "Homomonument" }
        ]
      }
    },
    {
      "place_id": "nl-north-holland-amsterdam-ripley-s-believe-it-or-not",
      "display_name": "Ripley's Believe It or Not",
      "category": "museum",
      "was_stale_before_run": false,
      "result_status": "saved",
      "result_note": "saved status=partial",
      "facts": {
        "status": "partial",
        "fetched_at": "2026-09-13T19:56:18Z",
        "website_url": "https://www.ripleys.com/attractions/ripleys-believe-it-or-not-amsterdam",
        "phone_number": "+31203697120",
        "opening_hours_text": [],
        "famous_for": "Museum with kitschy oddities on display, including shrunken human heads & rare animal skeletons.",
        "highlights": [],
        "caveats": [],
        "recommendations": [],
        "conflicts": ["famous_for: google_places≠wikipedia"],
        "notes": [
          "structured fill from source documents",
          "llm_insights error: OpenAI insufficient_quota (429)"
        ],
        "source_documents": [
          { "tool_id": "wikipedia_summary", "source_name": "wikipedia", "title": "Ripley's Believe It or Not!" },
          { "tool_id": "google_place_details", "source_name": "google_places", "title": "Ripley's Believe It or Not!" }
        ]
      }
    },
    {
      "place_id": "nl-north-holland-amsterdam-red-light-district",
      "display_name": "Red Light District",
      "category": "landmark",
      "was_stale_before_run": false,
      "result_status": "saved",
      "result_note": "saved status=complete",
      "facts": {
        "status": "complete",
        "fetched_at": "2026-09-13T19:56:41Z",
        "website_url": "https://www.redlightsecrets.com/",
        "phone_number": "+31208467020",
        "opening_hours_text": [],
        "famous_for": "Quirky museum offering exhibits on the history of Amsterdam's sex-work industry.",
        "highlights": [],
        "caveats": [],
        "recommendations": [],
        "conflicts": ["famous_for: google_places≠wikipedia"],
        "notes": [
          "structured fill from source documents",
          "llm_insights error: OpenAI insufficient_quota (429)"
        ],
        "source_documents": [
          { "tool_id": "wikipedia_summary", "source_name": "wikipedia", "title": "De Wallen" },
          { "tool_id": "google_place_details", "source_name": "google_places", "title": "Red Light Secrets Museum" }
        ]
      }
    },
    {
      "place_id": "nl-north-holland-amsterdam-corner-bakery-amsterdam",
      "display_name": "Corner Bakery Amsterdam",
      "category": "cafe",
      "was_stale_before_run": false,
      "result_status": "saved",
      "result_note": "saved status=complete",
      "facts": {
        "status": "complete",
        "fetched_at": "2026-09-13T19:58:19Z",
        "website_url": "https://www.cornerbakeryamsterdam.com/oud-zuid-johannes-vermeerstraat",
        "phone_number": "+31681157537",
        "opening_hours_text": ["Mo-Su 11:30-22:30"],
        "cuisines": ["Breakfast", "Brunch", "Cafe", "Coffee shop", "Lunch", "Pub"],
        "famous_for": "Casual, counter-serve cafe chain offering a standard menu of sandwiches, pasta & pastries.",
        "highlights": [],
        "caveats": [],
        "recommendations": [],
        "conflicts": [
          "website_url: google_places≠osm",
          "phone_number: google_places≠osm",
          "cuisines: google_places≠osm"
        ],
        "notes": [
          "structured fill from source documents",
          "llm_insights error: OpenAI insufficient_quota (429)"
        ],
        "source_documents": [
          { "tool_id": "google_place_details", "source_name": "google_places", "title": "Corner Bakery" },
          { "tool_id": "osm_tags", "source_name": "osm", "title": "Café Loetje" }
        ]
      }
    },
    {
      "place_id": "nl-north-holland-amsterdam-the-burger-maffia",
      "display_name": "The Burger Maffia",
      "category": "restaurant",
      "was_stale_before_run": false,
      "result_status": "saved",
      "result_note": "saved status=partial",
      "facts": {
        "status": "partial",
        "fetched_at": "2026-09-13T19:59:55Z",
        "website_url": "http://www.theburgermaffia.com/",
        "phone_number": "+31854017719",
        "opening_hours_text": [],
        "cuisines": ["Hamburger"],
        "famous_for": null,
        "highlights": [],
        "caveats": [],
        "recommendations": [],
        "conflicts": [],
        "notes": [
          "structured fill from source documents",
          "llm_insights error: OpenAI insufficient_quota (429)"
        ],
        "source_documents": [
          {
            "tool_id": "google_place_details",
            "source_name": "google_places",
            "title": "The Burger Maffia Amsterdam Oud West"
          }
        ]
      }
    }
  ]
}
```

When `fill_insights_from_documents` succeeds (quota available), **`complete`** cafe/restaurant pins also get non-empty `highlights`, `caveats`, and `recommendations` (see [place-facts-plan.md](./place-facts-plan.md)).

**CLI — one pin**

```bash
DYNAMODB_REGION=us-west-2 python3 cli.py \
  --enrich-place-facts \
  --place-id nl-north-holland-amsterdam-corner-bakery-amsterdam \
  --force
```

**CLI — all pins from this post**

```bash
for id in \
  nl-north-holland-amsterdam-moco-museum \
  nl-north-holland-amsterdam-anne-frank-house \
  nl-north-holland-amsterdam-ripley-s-believe-it-or-not \
  nl-north-holland-amsterdam-red-light-district \
  nl-north-holland-amsterdam-corner-bakery-amsterdam \
  nl-north-holland-amsterdam-the-burger-maffia
do
  DYNAMODB_REGION=us-west-2 python3 cli.py --enrich-place-facts --place-id "$id" --force
done
```

**Re-running the ingest step locally**

```python
from travelplanner.flow.context import IngestContext
from travelplanner.feature_flag import FeatureFlag
from travelplanner.steps.enrich_place_facts import ENRICH_PLACE_FACTS_STEP

FeatureFlag.set("place_facts", True)
ctx = IngestContext(
  post_url="https://www.instagram.com/p/DOd5nuWDAuP/",
  place_ids=["nl-north-holland-amsterdam-moco-museum", "..."],
)
ctx = ENRICH_PLACE_FACTS_STEP.run(ctx)
```

---

## Persona layer (after pipeline, not covered step-by-step)

Typical ingest entry (`travelplanner/pipeline.py` / server worker) also:

- Persist `SavedPost` to DynamoDB `Posts`
- Link `UserPosts` / `UserPlaces` for `user_id`
- Enqueue SQS per `place_id` for facts worker (same as step 8)

Ingest **job success** does not wait on facts enrichment.

---

## Re-running a single step locally

```python
from travelplanner.flow.context import IngestContext
from travelplanner.steps.instagram.fetch_media import FETCH_MEDIA_STEP

ctx = IngestContext(post_url="https://www.instagram.com/p/DOd5nuWDAuP/", user_id="debug")
ctx = FETCH_MEDIA_STEP.run(ctx)
```

Chain prior steps on the same `ctx` object. For step 7+, set `DYNAMODB_REGION=us-west-2` (or your deployed region).

---

## API call summary table (this carousel, happy path)

| Step | Mindcase | Supadata | OpenAI | Nominatim/Overpass | DynamoDB | S3/CDN |
|------|----------|----------|--------|-------------------|----------|--------|
| 1 | — | — | — | — | — | — |
| 2 | ✓ post run | — | — | — | — | — |
| 3 | — | — | — | — | — | GET CDN; optional S3 |
| 4 | — | — | ✓ vision OCR (× slides) | — | — | GET slide CDN |
| 5 | — | — | ✓ classify | — | — | — |
| 6 | — | — | ✓ extract places | — | — | — |
| 7 | — | — | optional pick | ✓ geocode | ✓ scan + write | — |
| 8 | ✓ Google places | — | optional insights | ✓ Overpass; wiki APIs | ✓ facts | — |

---

## Related docs

- [pipeline-walkthrough-instagram-reel-example.md](./pipeline-walkthrough-instagram-reel-example.md) — reel path (transcript + Supadata video analysis)
- [pipeline-walkthrough-instagram-image-example.md](./pipeline-walkthrough-instagram-image-example.md) — single image / itinerary graphic (OCR-critical)
- [pipeline-framework-design.md](./pipeline-framework-design.md) — layers, flags, close dispatch
- [place-facts-plan.md](./place-facts-plan.md) — facts pipeline design
- [AGENTS.md](../AGENTS.md) — env vars and run commands

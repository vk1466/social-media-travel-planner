# Instagram reel ingest — step-by-step I/O and API calls

Worked example for a **travel** reel (shared as a `/p/` link):

`https://www.instagram.com/p/DI4Q-yuMH0h/` (shortcode `DI4Q-yuMH0h`, `@ravandmohini` — Amsterdam canal kayaking with @amsterdamkayakin).

Mindcase still reports **`resource_type` = `reel`** in step 2, so the **reel tail** (transcript + Supadata video analysis) runs even though the URL path is `/p/`.

This document maps each pipeline step to **context inputs/outputs**, **external calls**, and **observed results** from a local step-by-step run (September 2026). For architecture rules see [pipeline-framework-design.md](./pipeline-framework-design.md).

**Outputs below** are values recorded during the walkthrough (not re-run for the doc). Mindcase **`raw_payload`** is omitted in full; step 2 lists keys and `SavedPost` fields.

**Run note:** First capture (same day) hit OpenAI **`insufficient_quota`** on steps 7–8. **Retry** with credits restored: steps 7–9 below are **live API** results (September 2026). Step 10 may still show empty `highlights` if `fill_insights_from_documents` failed on an earlier enrich pass.

Compare with [pipeline-walkthrough-instagram-reel-example.md](./pipeline-walkthrough-instagram-reel-example.md) (Suobuya Stone Forest).

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
  6. extract_reel_frame_text [default off — skipped]

instagram_classify
  7. classify_content       [FeatureFlag: content_categories]

instagram_place_close (content_category = travel)
  8. extract_places
  9. process_place_mentions

persona post-work
  10. enrich_place_facts    [FeatureFlag: place_facts]
```

---

## Step 1 — `seed_instagram_post`

```json
{
  "step": "seed_instagram_post",
  "post_url": "https://www.instagram.com/p/DI4Q-yuMH0h/",
  "platform": "instagram",
  "shortcode": "DI4Q-yuMH0h",
  "resource_type": null,
  "user_id": "pipeline-debug",
  "refresh": false
}
```

(`/p/` URL → `resource_type` stays `null` until step 2.)

---

## Step 2 — `fetch_media`

**API calls:** Mindcase `POST /v1/data/instagram/posts/run` + job poll.

```json
{
  "step": "fetch_media",
  "shortcode": "DI4Q-yuMH0h",
  "resource_type": "reel",
  "post_id": "instagram:DI4Q-yuMH0h",
  "media_kind": "reel",
  "author_handle": "ravandmohini",
  "posted_at": "2025-04-25T18:13:19Z",
  "like_count": 560,
  "comment_count": 32,
  "plays": null,
  "duration_s": null,
  "views": null,
  "locationName": "Amsterdam",
  "videoUrl_present": true,
  "caption": "and we had ZERO previous experience! 🛶\n\nWe had the BEST time exploring Amsterdam’s world-famous canals with @amsterdamkayakin 🇳🇱\n\nOur fantastic instructor welcomed us into his beautiful home and gave a quick history lesson before getting us into the kayaks. We then rowed our way through the charming neighbourhood of Jordaan whilst stopping at popular sites and landmarks for photos 📸\n\nA truly UNIQUE way to explore the city!\n\nFollow @ravandmohini for more EPIC travel recommendations ✨\n\n#amsterdam #netherlands #visitamsterdam #thingstodoamsterdam #activitiesamsterdam #kayakamsterdam  #amsterdamcanals #jordaan #doctorswhotravel #coupleswhotravel",
  "hashtags": [
    "amsterdam",
    "netherlands",
    "visitamsterdam",
    "thingstodoamsterdam",
    "activitiesamsterdam",
    "kayakamsterdam",
    "amsterdamcanals",
    "jordaan",
    "doctorswhotravel",
    "coupleswhotravel"
  ],
  "thumbnail_url": "https://instagram.fsyd14-1.fna.fbcdn.net/v/t51.75761-15/491518064_18007845296735400_424324042575455763_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=107&ig_cache_key=MzYxODcxNjk4NDQwNTk0OTcyOQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNMSVBTLnhwaWRzLjcyMC5zZHIudmlkZW9fZGVmYXVsdF9jb3Zlcl9mcmFtZS5DMyJ9&_nc_ohc=ivVS2YT9HwMQ7kNvwFaxhNz&_nc_oc=AdoMax5R4WU-rTIqj_ha4xRzMfwZLwtzB-EUhJJWVbcn2FbCfSw8Dp1r4E9i5dt0gP0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fsyd14-1.fna&_nc_gid=qnx_9Fd1M-qMxeU0gZWUZg&_nc_ss=7a22e&oh=00_AQJy8NGRtEy0Nqkj6T4mzgBFAgvMOAPj-2bt88n5YjBAoQ&oe=6AACD5C7",
  "top_comments_count": 10,
  "top_comments": [
    "❤️",
    "Perfect reel👏👏👏",
    "Looks like the best way to explore 👏",
    "MAP",
    "That looks amazing 👏",
    "That's so fun",
    "You guys are the cutest 😍😍😍",
    "DIRTY WATER",
    "Oh my gosh, kayaking there sounds perfect! I didn't know you could!",
    "Hahaha I love this!!"
  ],
  "raw_payload_keys": [
    "artist", "authorId", "authorName", "authorProfileUrl", "authorUsername",
    "authorVerified", "caption", "captionLanguage", "carouselImages",
    "carouselSlideMediaUrls", "coauthors", "comments", "contentFormat",
    "durationS", "firstComment", "hashtags", "image", "likes", "likesHidden",
    "locationName", "mentions", "originalAudio", "paidPartnership", "pinned",
    "plays", "postUrl", "posted", "recentComments", "shares", "song", "source",
    "taggedUsers", "type", "videoUrl", "views"
  ]
}
```

---

## Step 3 — `persist_thumbnail`

```json
{
  "step": "persist_thumbnail",
  "media_bucket_configured": false,
  "expected_s3_key": "thumbnails/instagram/DI4Q-yuMH0h.jpg",
  "persisted_to_s3": false,
  "unchanged_cdn_fallback": true
}
```

---

## Step 4 — `fetch_transcript`

**URL to Supadata:** `https://www.instagram.com/reel/DI4Q-yuMH0h/` (shortcode path; not CDN `videoUrl`).

```json
{
  "step": "fetch_transcript",
  "shortcode": "DI4Q-yuMH0h",
  "resource_type": "reel",
  "media_url_passed_to_supadata": "https://www.instagram.com/reel/DI4Q-yuMH0h/",
  "has_transcript": false,
  "transcript": null
}
```

(No usable speech transcript; reel relies on caption + on-screen text + video analysis.)

---

## Step 5 — `analyze_video`

**Flag:** `extract_video_analysis` (on in dev defaults). **API:** Supadata multimodal extract.

```json
{
  "step": "analyze_video",
  "feature_flag_extract_video_analysis": true,
  "media_url": "https://www.instagram.com/reel/DI4Q-yuMH0h/",
  "has_video_analysis": true,
  "video_analysis_char_count": 598,
  "video_analysis": "Scene: A couple contrasts 'normal' sightseeing in Amsterdam with their own adventurous approach. They first pose for a traditional photo on a bridge, then the video cuts to them energetically kayaking through the Amsterdam canals, passing by historic buildings and the Westerkerk tower.\nOn-screen text: Normal people exploring Amsterdam:\nOn-screen text: Us:\nPlace: Amsterdam (city) — Mentioned in the on-screen text and confirmed by the iconic canal-front architecture.\nPlace: Amsterdam Canals (waterway) — The couple is shown kayaking through the city's characteristic canal network.\nPlace: Westerkerk (church / landmark) — The distinctive tower of the Westerkerk is visible in the background while they are kayaking."
}
```

---

## Step 6 — `extract_reel_frame_text`

**Flag:** `extract_reel_frame_text` (default **off**). Step skipped; step 5 supplied overlay text (`Normal people exploring Amsterdam:` / `Us:`).

---

## Step 7 — `classify_content`

```json
{
  "step": "classify_content",
  "post_id": "instagram:DI4Q-yuMH0h",
  "content_category_before": null,
  "content_category_after": "travel"
}
```

---

## Step 8 — `extract_places`

**Observed output (full)**

```json
{
  "step": "extract_places",
  "post_id": "instagram:DI4Q-yuMH0h",
  "content_category": "travel",
  "place_count": 4,
  "reel_summary": "This reel showcases a unique kayaking experience through the historic canals of Amsterdam, particularly in the charming neighborhood of Jordaan. The couple explores popular sites and landmarks, including the Westerkerk, while enjoying the scenic waterways of the city.",
  "trip_tips": [],
  "extracted_places": [
    {
      "place_name": "Amsterdam",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Kayaking offers a unique perspective of the city's historic canals and architecture.",
      "category": "city",
      "parent_place_name": null
    },
    {
      "place_name": "Westerkerk",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "The distinctive steeple of the Westerkerk is a notable landmark visible while kayaking.",
      "category": "landmark",
      "parent_place_name": "Amsterdam"
    },
    {
      "place_name": "Amsterdam Canals",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "The canals are a UNESCO World Heritage site and a central feature of Amsterdam's charm.",
      "category": "waterfall",
      "attributes": ["hike"],
      "parent_place_name": "Amsterdam"
    },
    {
      "place_name": "Jordaan",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Jordaan is known for its narrow streets, quaint buildings, and vibrant atmosphere, making it a great area to explore by kayak.",
      "category": "neighborhood",
      "parent_place_name": "Amsterdam"
    }
  ]
}
```

Caption tags **@amsterdamkayakin**, but the extractor did not emit a separate operator row (only city + neighbourhoods/landmarks). Operator resolution may need platform mentions or a future extraction tweak.

---

## Step 9 — `process_place_mentions`

**Observed** with step 8 places on `ctx.post`, `DYNAMODB_REGION=us-west-2`. Platform location tag **Amsterdam** included via `mentions_from_post`.

| Outcome | Count | Notes |
|---------|-------|--------|
| `resolved` | 3 | Westerkerk, **Museum of the Canals** (for LLM `Amsterdam Canals` / category `waterfall`), Jordaan |
| `rejected` | 1 | City boundary for extracted **Amsterdam** |

**`ctx.place_ids`**

```json
[
  "nl-north-holland-amsterdam-westerkerk",
  "nl-north-holland-amsterdam-museum-of-the-canals",
  "nl-north-holland-amsterdam-jordaan"
]
```

**Sample resolved (Westerkerk)**

```json
{
  "status": "resolved",
  "match_confidence": 1.0,
  "mention": { "place_name": "Westerkerk", "city": "Amsterdam", "country": "Netherlands", "category": "landmark" },
  "location": {
    "display_name": "Westerkerk",
    "city": "Amsterdam",
    "latitude": 52.3745473,
    "longitude": 4.8839863,
    "osm_class": "amenity",
    "osm_type": "place_of_worship"
  },
  "place": {
    "place_id": "nl-north-holland-amsterdam-westerkerk",
    "display_name": "Westerkerk",
    "category": "landmark"
  }
}
```

**Sample resolved (Amsterdam Canals → museum POI)**

```json
{
  "status": "resolved",
  "match_confidence": 0.92,
  "mention": { "place_name": "Amsterdam Canals", "city": "Amsterdam", "category": "waterfall" },
  "location": {
    "display_name": "Museum of the Canals",
    "city": "Amsterdam",
    "latitude": 52.3678921,
    "longitude": 4.8862198,
    "osm_class": "tourism",
    "osm_type": "museum"
  },
  "place": {
    "place_id": "nl-north-holland-amsterdam-museum-of-the-canals",
    "display_name": "Museum of the Canals",
    "category": "museum"
  }
}
```

---

## Step 10 — `enrich_place_facts`

**Walkthrough:** `force=True` per resolved `place_id` (certifi for wiki/overpass).

| `place_id` | `facts.status` | Notable |
|------------|----------------|---------|
| `nl-north-holland-amsterdam-jordaan` | complete | Google + Wikipedia + Wikivoyage Jordaan |
| `nl-north-holland-amsterdam-westerkerk` | complete | https://www.westerkerk.nl/ , phone |
| `nl-north-holland-amsterdam-museum-of-the-canals` | (varies) | Geocode target for generic “Amsterdam Canals” extract |

**Jordaan (observed facts)**

```json
{
  "place_id": "nl-north-holland-amsterdam-jordaan",
  "result_status": "saved",
  "facts": {
    "status": "complete",
    "fetched_at": "2026-09-13T20:56:41Z",
    "famous_for": "Trendy neighborhood featuring boutiques, pubs & restaurants, plus several niche museums.",
    "notes": ["structured fill from source documents", "llm_insights error: OpenAI insufficient_quota (429)"],
    "source_documents": [
      { "tool_id": "wikipedia_summary", "title": "Jordaan" },
      { "tool_id": "google_place_details", "title": "Jordaan" },
      { "tool_id": "wikivoyage_summary", "title": "Amsterdam/Jordaan" }
    ]
  }
}
```

**Westerkerk (observed facts)**

```json
{
  "place_id": "nl-north-holland-amsterdam-westerkerk",
  "result_status": "saved",
  "facts": {
    "status": "complete",
    "fetched_at": "2026-09-13T20:58:17Z",
    "website_url": "https://www.westerkerk.nl/",
    "phone_number": "+31206247766",
    "famous_for": "A crown-topped spire rises from this Renaissance-era Protestant church where Rembrandt is buried.",
    "notes": ["structured fill from source documents", "llm_insights error: OpenAI insufficient_quota (429)"]
  }
}
```

**CLI loop**

```bash
for id in \
  nl-north-holland-amsterdam-jordaan \
  nl-north-holland-amsterdam-westerkerk \
  nl-north-holland-amsterdam-museum-of-the-canals
do
  DYNAMODB_REGION=us-west-2 python3 cli.py --enrich-place-facts --place-id "$id" --force
done
```

---

## API call summary (this reel)

| Step | Mindcase | Supadata | OpenAI | Nominatim | DynamoDB |
|------|----------|----------|--------|-----------|----------|
| 1 | — | — | — | — | — |
| 2 | ✓ | — | — | — | — |
| 3 | — | — | — | — | CDN |
| 4 | — | ✓ transcript | — | — | — |
| 5 | — | ✓ extract | — | — | — |
| 6 | — | — | (off) | — | — |
| 7 | — | — | ✓ classify | — | — |
| 8 | — | — | ✓ extract | — | — |
| 9 | — | — | optional pick | ✓ | ✓ |
| 10 | ✓ Google | — | optional insights | ✓ wiki/overpass | ✓ |

---

## Related docs

- [pipeline-walkthrough-instagram-reel-example.md](./pipeline-walkthrough-instagram-reel-example.md)
- [pipeline-walkthrough-instagram-carousel-example.md](./pipeline-walkthrough-instagram-carousel-example.md)
- [pipeline-walkthrough-instagram-image-example.md](./pipeline-walkthrough-instagram-image-example.md)
- [pipeline-framework-design.md](./pipeline-framework-design.md)
- [AGENTS.md](../AGENTS.md)

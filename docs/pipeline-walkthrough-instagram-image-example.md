# Instagram image post ingest — step-by-step I/O and API calls

Worked example for a **travel** single-image itinerary graphic:

`https://www.instagram.com/p/DZTAioMOzIW/` (shortcode `DZTAioMOzIW`, `@drives.anddestinations` — “Amsterdam itinerary for one day”).

This document maps each pipeline step to **context inputs/outputs**, **external calls**, and **observed results** from a local step-by-step run (September 2026). For architecture rules see [pipeline-framework-design.md](./pipeline-framework-design.md).

**Outputs below** are values recorded during the interactive walkthrough (not re-run for the doc). Mindcase **`raw_payload`** is omitted in full; step 2 lists keys and `SavedPost` fields.

**Run note:** This capture hit **OpenAI `insufficient_quota`** on vision OCR, classify, extract, `llm_pick`, and `fill_insights_from_documents`. Steps 1–3 and Mindcase parts of step 8 are unaffected. Where OpenAI failed, we document the **observed failure** plus **slide-accurate `image_text`** (transcribed from the post image when OCR could not run) so steps 6–7 remain reproducible.

**Compared to carousel/reel:** `resource_type` = **`image`** (one photo, not slides). Tail step is **`extract_image_text`** (same module as carousel). See [pipeline-walkthrough-instagram-carousel-example.md](./pipeline-walkthrough-instagram-carousel-example.md) and [pipeline-walkthrough-instagram-reel-example.md](./pipeline-walkthrough-instagram-reel-example.md).

---

## Pipeline order (image → travel)

```text
instagram_head
  1. seed_instagram_post
  2. fetch_media
  3. persist_thumbnail

instagram_tail (resource_type = image)
  4. extract_image_text        [FeatureFlag: extract_image_text]

instagram_classify
  5. classify_content           [FeatureFlag: content_categories]

instagram_place_close (content_category = travel)
  6. extract_places
  7. process_place_mentions      (code: process_mentions)

persona post-work (not in pipeline runner)
  8. enrich_place_facts         [FeatureFlag: place_facts; often SQS worker]
```

---

## Step 1 — `seed_instagram_post`

**Observed output (full)**

```json
{
  "step": "seed_instagram_post",
  "post_url": "https://www.instagram.com/p/DZTAioMOzIW/",
  "platform": "instagram",
  "shortcode": "DZTAioMOzIW",
  "resource_type": null,
  "user_id": "pipeline-debug",
  "refresh": false
}
```

---

## Step 2 — `fetch_media`

**API calls:** Mindcase `POST /v1/data/instagram/posts/run` + job poll (same as other Instagram posts).

**Observed output (full `SavedPost` + metadata)**

```json
{
  "step": "fetch_media",
  "shortcode": "DZTAioMOzIW",
  "resource_type": "image",
  "post_id": "instagram:DZTAioMOzIW",
  "media_kind": "image",
  "author_handle": "drives.anddestinations",
  "posted_at": "2026-06-07T19:54:48Z",
  "like_count": 119,
  "comment_count": 1,
  "plays": null,
  "duration_s": null,
  "views": null,
  "locationName": "Amsterdam Netherland",
  "videoUrl_present": false,
  "carousel_slide_count": 0,
  "caption": "Amsterdam itinerary for one day🌷\nSave this for later📌\n#fyp #amsterdam #explore #travel #instareels",
  "hashtags": ["fyp", "amsterdam", "explore", "travel", "instareels"],
  "thumbnail_url": "https://instagram.fadl4-1.fna.fbcdn.net/v/t51.82787-15/719032765_17879926980605475_548473320968444472_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=100&ig_cache_key=MzkxNDQ3NDg4MDczMjE4MTAxNA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQueHBpZHMuMTIwMC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=i2v4q3QEH1cQ7kNvwEGvdxd&_nc_oc=AdrFDbiZH-GGQqsoR-K6RvnMATSYf0cSEmcAHZ79d4vynCeXoCmLHghb4-SdnLm-Gz0EJHorjwVpi6dyfBAOiMNL&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fadl4-1.fna&_nc_gid=jU1Vm1FBuQqtVG0my7UGbA&_nc_ss=7a22e&oh=00_AQJejeeagl9KqQgglutNOYkFT91HluA8yS37pfOPHQd2sw&oe=6AACF1B4",
  "top_comments_count": 1,
  "top_comments": ["Amsterdam"],
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

The graphic is entirely in the **image**; caption is short. OCR on the image is critical for place extraction.

---

## Step 3 — `persist_thumbnail`

```json
{
  "step": "persist_thumbnail",
  "media_bucket_configured": false,
  "expected_s3_key": "thumbnails/instagram/DZTAioMOzIW.jpg",
  "persisted_to_s3": false,
  "unchanged_cdn_fallback": true
}
```

---

## Step 4 — `extract_image_text`

**API calls:** HTTP GET `image` URL from Mindcase payload; OpenAI vision per slide (here: **one** image).

**Observed output (API failure + slide copy)**

```json
{
  "step": "extract_image_text",
  "feature_flag_extract_image_text": true,
  "resource_type": "image",
  "has_image_text": false,
  "image_text": null,
  "openai_error": "insufficient_quota (429) on first vision OCR call",
  "image_text_recovered_for_downstream": "AMSTERDAM ITINERARY - DAY 1 • BEST OF AMSTERDAM\nMorning\n8:00 AM - 9:00 AM Coffee & breakfast in Jordaan\n9:30 AM - 11:00 AM Dam Square\n11:00 AM - 12:00 PM Royal Palace Amsterdam\nAfternoon\n12:30 PM - 1:30 PM Lunch at De Negen Straatjes (Nine Streets)\n2:00 PM - 4:00 PM Canal Cruise through the historic canals\n4:00 PM - 5:30 PM Shopping at Nine Streets & Kalverstraat\nEvening\n6:00 PM - 7:30 PM Traditional Dutch Dinner. Must Try: Dutch Cheese, Herring (Hollandse Nieuwe), Dutch Pancakes\n8:00 PM - 9:30 PM Sunset walk along the canals\n9:30 PM Fresh Stroopwafel for dessert\nMUST VISIT: Dam Square, Royal Palace Amsterdam, Jordaan District, Nine Streets, Amsterdam Canals\nMUST EAT: Stroopwafel, Dutch Pancakes, Herring, Gouda Cheese\nSHOPPING: Nine Streets (boutiques), Kalverstraat (popular brands)\nWALK. EAT. EXPLORE. REPEAT."
}
```

`image_text_recovered_for_downstream` is **not** set by the pipeline; it is the text on the infographic, used below only because OCR did not persist `ctx.image_text` in this run.

---

## Step 5 — `classify_content`

**Observed output**

```json
{
  "step": "classify_content",
  "feature_flag_content_categories": true,
  "post_id": "instagram:DZTAioMOzIW",
  "content_category_after": null,
  "classify_error": "OpenAI insufficient_quota (429) after retries",
  "snippets_used": [
    { "source": "author_handle", "text": "@drives.anddestinations" },
    {
      "source": "caption",
      "text": "Amsterdam itinerary for one day🌷\nSave this for later📌\n#fyp #amsterdam #explore #travel #instareels"
    },
    { "source": "location_tag", "text": "Amsterdam Netherland" },
    { "source": "hashtags", "text": "#fyp #amsterdam #explore #travel #instareels" },
    { "source": "top_comments", "text": "- Amsterdam" }
  ],
  "expected_category_when_api_available": "travel"
}
```

With recovered `image_text`, classification is unambiguous **travel** (itinerary + visitable stops).

---

## Step 6 — `extract_places`

**Observed:** `extract_places` returned no rows when OpenAI quota was exhausted.

**Output used for step 7 walkthrough** (matches infographic + caption; same schema as a successful `fetch_places_from_snippets` call):

```json
{
  "step": "extract_places",
  "post_id": "instagram:DZTAioMOzIW",
  "content_category": "travel",
  "place_count": 7,
  "reel_summary": "One-day Amsterdam itinerary covering Jordaan breakfast, Dam Square, Royal Palace, Nine Streets lunch, canal cruise, shopping, Dutch dinner, and an evening canal walk.",
  "trip_tips": [],
  "extracted_places": [
    {
      "place_name": "Dam Square",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Morning stop on day-one itinerary.",
      "category": "landmark",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Royal Palace Amsterdam",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Visit before lunch.",
      "category": "landmark",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Jordaan District",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Coffee and breakfast in the morning.",
      "category": "neighborhood",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "De Negen Straatjes",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Lunch in Nine Streets.",
      "category": "neighborhood",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Canal Cruise",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Afternoon cruise through historic canals.",
      "category": "landmark",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Kalverstraat",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Shopping street.",
      "category": "landmark",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    },
    {
      "place_name": "Amsterdam Canals",
      "city": "Amsterdam",
      "country": "Netherlands",
      "state_province": "North Holland",
      "details": "Sunset walk along the canals.",
      "category": "landmark",
      "parent_place_name": "Amsterdam",
      "parent_category": "city"
    }
  ]
}
```

Food items on the graphic (stroopwafel, herring, etc.) are **tips**, not separate visitable venues in this extraction.

---

## Step 7 — `process_place_mentions`

**Observed** with step 6 places on `ctx.post` and `DYNAMODB_REGION=us-west-2`. **`llm_pick` also failed** (quota), which affects ambiguous matches.

| Outcome | Count | Notes |
|---------|-------|--------|
| `resolved` | 6 | Dam Square, Royal Palace, De 9 Straatjes, Canal Cruise, Kalverstraat, Amsterdam Marina (for “Amsterdam Canals”) |
| `rejected` | 2 | Parent city `Amsterdam`; **Jordaan District** → OSM `Sneaker District` shop (travel gate could not call OpenAI) |
| `unresolved` | 1 | IG tag `Amsterdam Netherland` → US `Netherland Avenue` (low confidence) |

**`ctx.place_ids`**

```json
[
  "nl-north-holland-amsterdam-dam-square",
  "nl-north-holland-amsterdam-royal-palace",
  "nl-north-holland-amsterdam-de-9-straatjes",
  "nl-north-holland-amsterdam-canal-cruise",
  "nl-north-holland-tienhoven-kalverstraat",
  "nl-north-holland-amsterdam-amsterdam-marina"
]
```

**Geocoding caveats (this run):**

- **Kalverstraat** resolved to a canal in **Tienhoven**, not Amsterdam’s shopping street — needs `llm_pick` or tighter query bias.
- **Amsterdam Canals** matched **Amsterdam Marina** (waterway OSM type).
- **Canal Cruise** matched a tourism `attraction` POI named “Canal Cruise”.

**Sample resolved outcome (Dam Square)**

```json
{
  "status": "resolved",
  "match_confidence": 0.94,
  "mention": { "place_name": "Dam Square", "city": "Amsterdam", "country": "Netherlands", "category": "landmark" },
  "location": {
    "display_name": "Dam Square",
    "country": "Netherlands",
    "state_province": "North Holland",
    "city": "Amsterdam",
    "latitude": 52.3731162,
    "longitude": 4.8923511,
    "osm_class": "place",
    "osm_type": "square"
  },
  "place": {
    "place_id": "nl-north-holland-amsterdam-dam-square",
    "display_name": "Dam Square",
    "category": "landmark"
  }
}
```

**Sample rejected outcome (Jordaan District)**

```json
{
  "status": "rejected",
  "reason": "ambiguous shop rejected: shop travel gate unavailable (OpenAI insufficient_quota)",
  "mention": { "place_name": "Jordaan District", "city": "Amsterdam", "category": "neighborhood" },
  "location": {
    "display_name": "Sneaker District",
    "osm_class": "shop",
    "osm_type": "shoes"
  },
  "place": null
}
```

---

## Step 8 — `enrich_place_facts` (post-work)

**Ingest step:** Skips pins whose facts are inside TTL (same as [carousel walkthrough](./pipeline-walkthrough-instagram-carousel-example.md)).

**Walkthrough:** `enrich_place_facts(place, force=True)` for each resolved `place_id` (`SSL_CERT_FILE` → certifi).

| `place_id` | `facts.status` | Highlights |
|------------|----------------|------------|
| `nl-north-holland-amsterdam-dam-square` | complete | Google `famous_for` for Dam Square; Wikipedia geosearch |
| `nl-north-holland-amsterdam-royal-palace` | complete | `website_url` https://www.paleisamsterdam.nl/ , phone |
| `nl-north-holland-amsterdam-de-9-straatjes` | complete | Wikipedia **Negen Straatjes**; Google job 502 on this run |
| `nl-north-holland-amsterdam-canal-cruise` | complete | Weak match: hotel/OSM near cruise POI (verify in product) |
| `nl-north-holland-tienhoven-kalverstraat` | empty | Wrong geocode → irrelevant OSM docs |
| `nl-north-holland-amsterdam-amsterdam-marina` | partial | Marina website/hours; not the generic “canals” intent |

**Observed output (Dam Square — full facts object)**

```json
{
  "step": "enrich_place_facts",
  "place_id": "nl-north-holland-amsterdam-dam-square",
  "result_status": "saved",
  "result_note": "saved status=complete",
  "facts": {
    "status": "complete",
    "fetched_at": "2026-09-13T20:32:13Z",
    "website_url": null,
    "phone_number": null,
    "opening_hours_text": [],
    "famous_for": "Main city center square overlooked by a neoclassical palace, 15th-century church & WWII memorial.",
    "highlights": [],
    "caveats": [],
    "recommendations": [],
    "conflicts": ["famous_for: google_places≠wikipedia"],
    "notes": [
      "structured fill from source documents",
      "llm_insights error: OpenAI insufficient_quota (429)"
    ],
    "source_documents": [
      { "tool_id": "wikipedia_summary", "title": "Dam Square" },
      { "tool_id": "google_place_details", "title": "Dam" }
    ]
  }
}
```

**Observed output (Royal Palace — full facts object)**

```json
{
  "step": "enrich_place_facts",
  "place_id": "nl-north-holland-amsterdam-royal-palace",
  "result_status": "saved",
  "result_note": "saved status=complete",
  "facts": {
    "status": "complete",
    "fetched_at": "2026-09-13T20:34:12Z",
    "website_url": "https://www.paleisamsterdam.nl/",
    "phone_number": "+31205226161",
    "famous_for": "Grand residence for royal receptions since 1808, open to the public & exhibitions when not in use.",
    "conflicts": ["famous_for: google_places≠wikipedia"],
    "notes": ["structured fill from source documents", "llm_insights error: OpenAI insufficient_quota (429)"],
    "source_documents": [
      { "tool_id": "google_place_details", "title": "Royal Palace Amsterdam" },
      { "tool_id": "wikipedia_summary", "title": "Royal Palace of Amsterdam" }
    ]
  }
}
```

**Observed output (Kalverstraat wrong pin — empty facts)**

```json
{
  "place_id": "nl-north-holland-tienhoven-kalverstraat",
  "result_status": "saved",
  "result_note": "no structured fields",
  "facts": {
    "status": "empty",
    "fetched_at": "2026-09-13T20:36:07Z",
    "notes": ["no structured fields in source documents"],
    "source_documents": [
      { "tool_id": "osm_tags", "title": "De Plassen Zuid" },
      { "tool_id": "osm_tags", "title": "Nieuweweg" }
    ]
  }
}
```

**CLI — all pins from this post**

```bash
for id in \
  nl-north-holland-amsterdam-dam-square \
  nl-north-holland-amsterdam-royal-palace \
  nl-north-holland-amsterdam-de-9-straatjes \
  nl-north-holland-amsterdam-canal-cruise \
  nl-north-holland-tienhoven-kalverstraat \
  nl-north-holland-amsterdam-amsterdam-marina
do
  DYNAMODB_REGION=us-west-2 python3 cli.py --enrich-place-facts --place-id "$id" --force
done
```

---

## API call summary table (this image, happy path)

| Step | Mindcase | Supadata | OpenAI | Nominatim/Overpass | DynamoDB | S3/CDN |
|------|----------|----------|--------|-------------------|----------|--------|
| 1 | — | — | — | — | — | — |
| 2 | ✓ post run | — | — | — | — | — |
| 3 | — | — | — | — | — | GET CDN; optional S3 |
| 4 | — | — | ✓ vision OCR (×1) | — | — | GET image CDN |
| 5 | — | — | ✓ classify | — | — | — |
| 6 | — | — | ✓ extract places | — | — | — |
| 7 | — | — | optional pick | ✓ geocode | ✓ scan + write | — |
| 8 | ✓ Google places | — | optional insights | ✓ Overpass; wiki APIs | ✓ facts | — |

---

## Related docs

- [pipeline-walkthrough-instagram-carousel-example.md](./pipeline-walkthrough-instagram-carousel-example.md)
- [pipeline-walkthrough-instagram-reel-example.md](./pipeline-walkthrough-instagram-reel-example.md)
- [pipeline-framework-design.md](./pipeline-framework-design.md)
- [place-facts-plan.md](./place-facts-plan.md)
- [AGENTS.md](../AGENTS.md)

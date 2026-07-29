# Plan: Type-Specific Place Facts

Roadmap item **P1 #6** — objective, category-aware facts on a place page
(restaurant → cuisine + hours; park → hours, fee, what it's famous for, when to
visit), kept separate from reel-sourced `details` / `tips`.

Builds on [attraction-categories-plan.md](./attraction-categories-plan.md)
(one `category` per place) and [place-enrichment-plan.md](./place-enrichment-plan.md)
(locate → resolve). Enrichment runs **after** a place has a stable pin and a
category.

---

## Goal

```
Place (pinned + categorized)
   → fetch from sources chosen by category
   → keep only documents that describe THIS pin
   → LLM fills a category-scoped fact schema from those documents
   → code validates, records provenance, stores
```

**One sentence:** tools find the facts, code decides what is trustworthy and
complete enough, the LLM only reads retrieved documents — it never supplies a
fact from its own memory.

---

## Design decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Who picks tools | Code, from a `category → tools` table | 15 rows, no judgement needed; keeps runs deterministic |
| Who filters wrong entities | Code — distance from our pin, then name similarity | Survives provider schema churn; geometry doesn't rename |
| Who fills fields | One LLM call over normalized documents | Handles messy, differently-shaped payloads |
| Who decides "good enough" | Code — per-category required-field policy | Completeness is policy, not opinion |
| LLM conflict adjudication | Phase 4, only where sources disagree | Most conflicts resolve by source priority |
| When it runs | Lazy / on demand — never in the ingest path | Cost and Nominatim-style rate limits |

### Not a research agent

The model receives documents that tools already returned and may only fill
fields those documents support. No web browsing, no tool-choosing loop, no
"keep digging" retries. This matches the existing repo posture: `llm_pick`
picks among real geocoder candidates, `llm_gate` triages with no authority to
invent. Same rule here.

### Anti-fabrication is enforced in code, not the prompt

Every filled field must cite a `source_ref` that exists in the document set we
passed in. Fields citing an unknown ref are dropped before storage. A prompt
instruction alone is not a control.

---

## Data model

One new dataclass nested on `Place` (per AGENTS.md: extend existing entities
before adding abstractions). All fields optional — a place may legitimately
have very few facts.

```python
# travelplanner/models.py

@dataclass(frozen=True)
class FactEvidence:
  """Which source backed one field. `source_ref` must exist in the fetched docs."""

  field_name: str
  source_name: str          # google_places | osm | wikipedia | nps
  source_ref: str           # provider id or URL


@dataclass(frozen=True)
class PlaceFacts:
  """Objective, source-backed facts. Separate from reel `details` / `tips`."""

  status: str                                   # complete | partial | empty
  fetched_at: str
  # Shared
  website_url: str | None = None
  phone_number: str | None = None
  opening_hours_text: tuple[str, ...] = ()      # one line per day, as published
  admission_text: str | None = None             # "Free", "$30 per vehicle, 7 days"
  famous_for: str | None = None
  best_time_to_visit: str | None = None
  typical_duration_minutes: int | None = None
  # Food & drink
  cuisines: tuple[str, ...] = ()
  price_level: int | None = None                # 0–4
  reservation_required: bool | None = None
  # Trail
  distance_km: float | None = None
  elevation_gain_m: int | None = None
  difficulty: str | None = None                 # easy | moderate | hard
  # Provenance / trust
  evidence: tuple[FactEvidence, ...] = ()
  conflicts: tuple[str, ...] = ()               # "opening_hours_text: google≠osm"
  notes: tuple[str, ...] = ()
```

`Place` gains `facts: PlaceFacts | None = None`.

**Why nested, not a new table:** the place detail page always wants facts
alongside the place, `place_to_dict` already uses `asdict`, and we store
compact normalized values (never raw provider payloads), so item size stays
small. If purge requirements or size force a split later, move it behind
`places/facts/store.py` without touching callers.

**Write path:** enrichment must not clobber a concurrent ingest merge.
`save_place` does a full `put_item`, so add a targeted
`places_repo.save_place_facts(place_id, facts)` using
`update_item(UpdateExpression="SET facts = :facts")`.

**Staleness:** read-time, not DynamoDB TTL. `fetched_at` older than
`PLACE_FACTS_TTL_DAYS` counts as absent and is eligible for refresh.

### Category field policy

One table drives both the LLM's JSON schema and the completeness check.
Requesting only relevant fields keeps prompts small and stops the model from
reaching for irrelevant ones.

| Category | Required | Optional |
|----------|----------|----------|
| `restaurant` / `cafe` / `bar` | `cuisines`, `opening_hours_text` | `price_level`, `reservation_required`, `website_url`, `phone_number`, `famous_for` |
| `hotel` | `website_url` | `price_level`, `phone_number`, `famous_for` |
| `park` | `admission_text`, `famous_for` | `opening_hours_text`, `best_time_to_visit`, `typical_duration_minutes`, `website_url` |
| `museum` | `opening_hours_text`, `admission_text` | `famous_for`, `typical_duration_minutes`, `website_url`, `phone_number` |
| `landmark` | `famous_for` | `opening_hours_text`, `admission_text`, `best_time_to_visit`, `typical_duration_minutes` |
| `market` | `opening_hours_text` | `famous_for`, `best_time_to_visit`, `website_url` |
| `hike` | — (Phase 4) | `distance_km`, `elevation_gain_m`, `difficulty`, `typical_duration_minutes`, `best_time_to_visit` |
| `beach` / `lake` / `waterfall` / `viewpoint` | `best_time_to_visit` | `admission_text`, `famous_for`, `typical_duration_minutes` |
| `city` / `neighborhood` | `famous_for` | `best_time_to_visit` |

`status`: all required present → `complete`; some present → `partial`; none →
`empty`. Partial is a normal, acceptable outcome.

---

## Tool catalog

A registry of what we can call, kept as code (not config) until runtime
configuration is actually needed.

```python
# travelplanner/places/facts/catalog.py

@dataclass(frozen=True)
class FactTool:
  tool_id: str
  description: str
  source_name: str
  categories: frozenset[str]        # empty = all categories
  cost_class: str                   # free | paid
  requires_setting: str | None      # env var that gates it
  fetch: Callable[[FactQuery], list[SourceDocument]]
```

Every tool returns the same envelope, so the filter and the LLM never see a
provider's raw shape:

```python
@dataclass(frozen=True)
class SourceDocument:
  tool_id: str
  source_name: str
  source_ref: str                   # provider place id or URL
  title: str
  latitude: float | None
  longitude: float | None
  content: dict[str, Any]           # small normalized dict, or {"text": "..."}
  retrieved_at: str
```

| tool_id | Source | Categories | Cost | Gate |
|---------|--------|-----------|------|------|
| `osm_tags` | Overpass (existing client) | all | free | — |
| `wikipedia_summary` | Wikipedia REST | park, landmark, museum, city, neighborhood, lake, waterfall, beach | free | — |
| `google_place_details` | Google Places | restaurant, cafe, bar, hotel, museum, market, landmark | paid | `GOOGLE_MAPS_API_KEY` |
| `nps_park` | US National Park Service | park, landmark | free (key) | `NPS_API_KEY` |
| `wikidata_entity` | Wikidata | landmark, museum, park | free | — (Phase 4) |

Raw HTTP access lives in `travelplanner/clients/` per the module rules; the
`fetch` adapters that produce `SourceDocument` live in
`travelplanner/places/facts/tools/`.

Catalog entries whose `requires_setting` is unset are skipped silently — the
pipeline degrades to free sources rather than failing.

---

## Pipeline

```
enrich_place_facts(place)
  1. select_tools(category)          catalog lookup, honors setting gates
  2. fetch                           throttled, per-tool failures are non-fatal
  3. match_documents(place, docs)    distance gate → name gate → cap
  4. llm_fill(place, docs, fields)   one strict-JSON call, temperature 0
  5. verify(draft, docs)             evidence check, format check, conflicts
  6. save_place_facts(place_id, ...)
```

### 3. Match filter

Reuses `haversine_meters` and `name_similarity` from `places/locate.py`.

- **Distance gate** — drop documents whose coordinates are farther than the
  category radius from our pin. This is the check that kills "same name, wrong
  city" without knowing anything about provider schemas.

  | Category group | Radius |
  |----------------|--------|
  | restaurant, cafe, bar, hotel, market | 250 m |
  | museum, landmark, viewpoint, waterfall | 500 m |
  | beach, hike | 2 km |
  | park, lake | 5 km |
  | city, neighborhood | 15 km |

- **Name gate** — when a document has no coordinates (common for Wikipedia),
  require `name_similarity >= 0.6` against `display_name` or any alias.
- **Cap** — keep at most `PLACE_FACTS_MAX_DOCS` (default 6), best first.
- **Ambiguity is allowed** — if two nearby documents survive (hotel and its
  restaurant in one building), keep both and let the LLM pick or abstain. That
  is the one identity decision worth spending a model on.

### 4. LLM fill

One `chat.completions` call, `temperature=0`, strict `json_schema` built from
the category's required + optional fields, mirroring `llm_pick` /
`llm_gate` style. Fails soft: no API key, API error, or unparseable response
returns `None` plus a note, and the caller stores nothing.

Prompt contract:

> You are given documents already retrieved for one specific place. Fill only
> fields these documents support. Every filled field must cite the
> `source_ref` it came from. If the documents describe a different place, or
> do not mention a field, leave it null. Never use prior knowledge. Never
> guess hours, fees, or cuisine.

### 5. Verify (code)

1. Drop any field whose cited `source_ref` is not in the document set.
2. Format checks: `price_level` in 0–4, `website_url` is http(s),
   `opening_hours_text` entries are short strings, `difficulty` in the enum,
   numeric ranges sane (`distance_km` ≤ 200, `elevation_gain_m` ≤ 9000).
3. Conflicts: when two sources back the same field with different values,
   record a `conflicts` entry and keep the higher-priority source.

   Priority: `nps` > `google_places` > `osm` for hours/fees;
   `wikipedia` is prose-only (`famous_for`, `best_time_to_visit`) and never
   wins a structured field.
4. Apply the completeness policy → `status`.

---

## When it runs

**Never during ingest.** Ingest already serializes on Nominatim
(`infra/travel_planner_stack.py` runs the place Map at `maxConcurrency=1`), and
most saved places are never opened.

| Trigger | Behavior |
|---------|----------|
| Place detail viewed | If facts missing or stale, enqueue an async refresh; return the place immediately without blocking |
| Admin refresh | `POST /api/places/{place_id}/facts/refresh` — force, ignore TTL |
| Backfill | Admin job over a filter (category / country), batched through Step Functions like the Timeline import |

`PLACE_FACTS_ENABLED` gates the whole feature so it can ship dark.

---

## Settings

Added to `travelplanner/settings.py` in the existing style (validated, sane
default, raises on garbage):

| Env var | Default | Purpose |
|---------|---------|---------|
| `PLACE_FACTS_ENABLED` | `false` | Master switch |
| `PLACE_FACTS_TTL_DAYS` | `30` | Refresh eligibility |
| `PLACE_FACTS_MAX_DOCS` | `6` | Documents passed to the LLM |
| `GOOGLE_MAPS_API_KEY` | unset | Enables `google_place_details` |
| `NPS_API_KEY` | unset | Enables `nps_park` |

---

## Licensing and caching

Worth confirming current terms before Phase 3 ships, because it constrains
storage:

- **Google** — most Place Details content has caching limits (the place id is
  the documented exception) plus attribution requirements. The TTL default of
  30 days is chosen with this in mind.
- **OSM** — ODbL, requires attribution.
- **Wikipedia** — CC BY-SA, requires attribution and a descriptive User-Agent.

Storing `source_name` per field lets the UI attribute correctly; the place
detail page should show a compact "Facts from Google, OpenStreetMap" line.

---

## Phases

### Phase 1 — Free sources, no UI

`PlaceFacts` model + repo write path, catalog, `osm_tags` and
`wikipedia_summary` tools, match filter, LLM fill, verify. CLI entry point to
enrich one place or the first N places of a category. Behind
`PLACE_FACTS_ENABLED`.

**Done when:** a park and a landmark produce `famous_for` + `admission_text`
with correct evidence refs, and a deliberately wrong-city Wikipedia article is
rejected by the distance/name gate.

### Phase 2 — Surface it

`PlaceFactsSchema` on `PlaceDetailSchema`, refresh endpoint, lazy enqueue on
detail view, facts section on the web and mobile place pages (with
attribution), empty state when `status == "empty"`.

**Done when:** facts render on both clients and never block the place page.

### Phase 3 — Google Places

`clients/google_places.py` + `google_place_details` tool, restricted field mask
to control cost. Unlocks reliable cuisine, hours, price level, and phone for
food, drink, and hotel categories.

**Done when:** a restaurant reaches `complete`, and cost per enriched place is
measured and documented.

### Phase 4 — Harder facts

NPS tool for US parks; conflict adjudication via a second small LLM call
limited to conflicting fields with the raw documents attached; trail metrics
for `hike` once a real source is chosen. Wikidata if it proves useful.

---

## Testing

Unit tests with fake `FactTool` entries — no network, matching the existing
moto-based suite:

- Match filter: far-away document rejected; near document kept; no-coordinate
  document accepted only on name similarity; per-category radii.
- Verify: fabricated `source_ref` dropped; out-of-range `price_level` dropped;
  conflict recorded with the priority source winning.
- Completeness policy per category → `complete` / `partial` / `empty`.
- Fail-soft: no `OPENAI_API_KEY`, tool raising, LLM returning invalid JSON —
  all leave the place unchanged and log a note.
- Repo: `save_place_facts` preserves concurrently merged `tips`.

---

## File touch list

| Area | Files |
|------|-------|
| Model | `travelplanner/models.py` (`PlaceFacts`, `FactEvidence`, `Place.facts`) |
| Facts package | `travelplanner/places/facts/{__init__,types,enrich}.py` plus `config/`, `pipeline/`, `tools/` |
| Config | `travelplanner/places/facts/config/{fields,categories,rules,sources}.py` |
| Pipeline | `travelplanner/places/facts/pipeline/{match,fill,schema,verify}.py` |
| Tools | `travelplanner/places/facts/tools/{catalog,osm,wikipedia,google,nps}.py` |
| Clients | `travelplanner/clients/{wikipedia,google_places,nps}.py` |
| Persistence | `travelplanner/db/places_repo.py` (`save_place_facts`, (de)serialize facts) |
| Settings | `travelplanner/settings.py` |
| API | `server/schemas.py`, `server/app.py`, `server/workers.py` |
| Web / mobile | place detail components, `api.ts` on both |
| CLI | `cli.py` (enrich one / batch) |
| Tests | `tests/test_place_facts.py`, `tests/test_places.py` |

---

## Out of scope

- Booking, availability, live "open now" status
- Review or rating aggregation
- Per-user personalization of facts
- Rewriting reel `details` / `tips` — facts sit alongside them, not over them
- Any tool that lets the model browse freely

---

## Relation to roadmap

| Roadmap item | This plan |
|--------------|-----------|
| P1 #6 Type-specific place facts | Phases 1–4 |
| P2 #10 Access & logistics pack | Consumes `admission_text`, `opening_hours_text`, durations |
| P3 #13 Conflict surfacing | `conflicts` field feeds the UI |
| P3 #14 Best season / conditions | `best_time_to_visit` is the source-backed half |

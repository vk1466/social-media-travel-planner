# Plan: Trip Agent (chat, suggestions, itineraries)

A conversational surface over the place library. The user asks travel
questions in natural language — "plan me 4 days around Bend in October",
"what haven't I done in Iceland", "why did you put the hike on day 2" — and
gets back an answer plus, when relevant, a **structured day plan** built only
from places already in their library.

Roadmap linkage: primarily **P2 #7 itinerary**, consuming **P2 #8 visit
status**, **P2 #9 map view**, **P2 #10 logistics**, and **P1 #6 place facts**.
Related later work: **P4 #17 similar places** (embeddings), **P4 #20 skip
learning**.

Builds on [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md) and
[place-facts-plan.md](./place-facts-plan.md), whose retrieve → fill → verify
shape this plan deliberately copies.

---

## Goal

```
User message + conversation history
   → classify intent and parse a trip brief (LLM #1)
   → build a context pack from THIS user's places, visits, and trips (code)
   → compute distances, clusters, durations, hours (code)
   → LLM reasons over the pack and commits to a ranked plan (LLM #2)
   → code verifies every stop against the pack, then stores
```

**One sentence:** code decides which places are even eligible and computes
every number, the LLM decides what is worth doing and in what order, and code
rejects any stop that is not a real place in the user's library.

---

## Sequencing decision

This ships **before** P0–P1 place quality is finished. That is a deliberate
choice, and the plan is shaped around it:

- The roadmap warns that wrong pins poison itineraries. True — so the agent
  treats thin data as **unknowns it must name**, never as something to
  paper over with plausible prose.
- Every run emits a **data gap report** (which fields the planner wanted and
  did not have). The agent becomes the measuring instrument that tells us
  which P0–P1 work actually matters, instead of us guessing.
- Anything the agent cannot ground gets dropped by code, so bad data
  degrades the plan's *completeness*, not its *honesty*.

---

## Design decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Who picks candidate places | Code, from `library.list_user_places` + filters | Region/date/category filtering is deterministic; no judgement needed |
| Who computes distance / duration / hours | Code, before the LLM call | Same reason place-facts precomputes: a model asked for numbers invents them |
| Who orders the days and defends the choices | One LLM call over the pack | This is the judgement the product is actually paying for |
| Who decides a stop is real | Code — `place_id` must exist in the pack | A prompt instruction is not a control |
| Tool-calling / agent loop | **No** | Repo posture: fixed pipeline, no tool-choosing loop, no "keep digging" |
| Want-to-go signal | Saved minus visited, for now | `UserPlaces` and `Visits` already give this; explicit Want/Skip (P2 #8) can refine it later without changing the interface |
| Stated preferences | On the **conversation brief**, not a user profile table | Avoids a settings form nobody fills in; taste is inferred from history |
| Streaming | No, v1 | One JSON turn with a typing indicator; matches Lambda + Mangum today |
| Conversation memory | Last N turns + persisted brief, re-parsed each turn | Cheap, debuggable, and enough for refinement |

### Not a research agent

The model sees places the code already selected and may only build a plan from
them. No web browsing, no "find me a restaurant in Lisbon" that reaches
outside the library, no tool-choosing loop. This matches `llm_pick` (picks
among real geocoder candidates), `llm_gate` (triages, cannot invent), and
place-facts (fills from retrieved documents only).

Consequence worth stating plainly: **if a place is not in the user's library,
the agent cannot suggest it.** It can say the library is thin for a region and
suggest saving more — that is the honest answer, and it doubles as a product
loop back into ingest.

### Anti-fabrication is enforced in code

Every stop in a returned itinerary must carry a `place_id` present in the
context pack that was sent to the model. Stops citing an unknown `place_id`
are **dropped before the response is built**, and the drop is logged as a
fabrication event. This is the direct analogue of the place-facts
`source_ref` check.

---

## Data model

Three new dataclasses in `travelplanner/models.py`, following the existing
frozen-dataclass style. Names are domain terms per AGENTS.md — `TripBrief`,
`DayPlan`, `ItineraryStop`, not `Request`/`Item`/`Result`.

```python
@dataclass(frozen=True)
class TripBrief:
  """Structured constraints parsed from conversation. Mutable across turns."""

  intent: str                                   # plan_trip | ask_history | ask_place | refine_plan
  destination_text: str | None = None           # as the user said it
  country: str | None = None
  state_province: str | None = None
  city: str | None = None
  parent_place_id: str | None = None            # region root when resolvable
  start_date: str | None = None                 # YYYY-MM-DD
  end_date: str | None = None
  day_count: int | None = None
  pace: str | None = None                       # relaxed | balanced | packed
  party: str | None = None                      # solo | couple | family | friends
  budget_level: int | None = None               # 0-4, matches PlaceFacts.price_level
  styles: tuple[str, ...] = ()                  # hiking | food | photography | ...
  include_visited: bool = False                 # revisit favorites when asked
  interpretation: str | None = None             # one line, shown in the UI


@dataclass(frozen=True)
class ItineraryStop:
  """One place on one day. `place_id` must exist in the user's library."""

  place_id: str
  place_name: str
  slot: str                                     # morning | midday | afternoon | evening
  why_here: str                                 # analysis, not a field dump
  duration_minutes: int | None = None
  travel_minutes_from_previous: int | None = None
  unknowns: tuple[str, ...] = ()                # "hours unknown", "fee unknown"


@dataclass(frozen=True)
class DayPlan:
  day_number: int
  date: str | None = None
  theme: str | None = None
  base_city: str | None = None
  stops: tuple[ItineraryStop, ...] = ()
  total_travel_minutes: int | None = None
  notes: tuple[str, ...] = ()
```

Plus persisted wrappers:

```python
@dataclass(frozen=True)
class Itinerary:
  itinerary_id: str
  user_id: str
  title: str
  brief: TripBrief
  days: tuple[DayPlan, ...] = ()
  tradeoffs: tuple[str, ...] = ()               # what was sacrificed and why
  unknowns: tuple[str, ...] = ()                # plan-level data gaps
  conversation_id: str | None = None
  created_at: str | None = None
  updated_at: str | None = None


@dataclass(frozen=True)
class ChatMessage:
  conversation_id: str
  message_key: str                              # msg#<iso-ts>#<short-uuid>
  role: str                                     # user | assistant
  content: str
  itinerary_id: str | None = None               # set when this turn produced a plan
  created_at: str | None = None
```

### Why these shapes

- `ItineraryStop.place_id` is the verification anchor — the whole
  anti-fabrication control depends on it being required, not optional.
- `unknowns` exists at both stop and plan level because shipping before
  place-facts means gaps are the normal case, and naming them is the feature.
- `TripBrief` lives on the conversation and is replaced each turn, so
  refinement is "re-parse with the previous brief", not diff-patching state.
- `Itinerary` stores the brief it came from, so a saved plan is reproducible
  and explainable later.

---

## Context pack

Built entirely in code. This is the retrieval step, and it is where cost and
quality are actually decided.

```
build_context_pack(user_id, brief) -> TripContextPack
  1. saved       = library.list_user_places(user_id, country/state/city/category…)
  2. visited     = visits.visited_place_ids(user_id)
  3. candidates  = saved - visited        (unless brief.include_visited)
  4. cluster     = group by parent_place_id, then by geographic proximity
  5. compute     = pairwise distances, cluster centroids, facts-derived timing
  6. taste       = taste profile from visit history + saved categories
  7. cap         = keep at most TRIP_AGENT_MAX_PLACES, best first
```

**Candidate ranking for the cap** (deterministic, no LLM): inside the brief's
region first, then places with a category matching a requested style, then
places with richer data (`facts.status`, tip count), then recently saved.

**Why a cap:** a user with 500 saved places cannot fit in a prompt, and REW's
lesson is that a model reasons well over ~10–40 finalists and retrieves badly
over hundreds. Default 30.

### Derived signals (code, never the model)

| Signal | Source | Available today |
|--------|--------|-----------------|
| Distance between candidates | `haversine_meters` (`places/locate.py`) | Yes |
| Region grouping | `parent_place_id` hierarchy | Yes (P0 #3 in progress) |
| Rough travel time | Straight-line distance × road factor, clearly labelled an estimate | Yes |
| Visit duration | `PlaceFacts.typical_duration_minutes` | Model exists, unpopulated |
| Hours / fees | `PlaceFacts.opening_hours_text`, `admission_text` | Model exists, unpopulated |
| Seasonality | `PlaceFacts.best_time_to_visit` | Model exists, unpopulated |
| Budget fit | `PlaceFacts.price_level` vs `brief.budget_level` | Model exists, unpopulated |
| Tips / context | `Place.tips`, `Place.details`, `SavedPost.reel_summary` | Yes |

Anything unavailable becomes an explicit `unknowns` entry **and** a line in
the data gap report. No estimate is presented as a fact: travel time is
labelled an estimate everywhere it appears.

### Taste profile

Derived, not asked for:

- Category histogram over **visited** places (what they actually do)
- Category histogram over **saved but unvisited** places (what they aspire to)
- Trip cadence and typical trip length from `Visits` date ranges
- Home region and past trip windows via `timeline/trips.py`
  (`build_travel_context`, `TripWindow`) — the Visits + Places pair can be
  shaped into the `TimelineCluster` protocol it already accepts

That last point is worth calling out: **trip segmentation already exists** for
Timeline import. Reusing it turns loose visit rows into "your 6-day Cascades
trip last June", which is what makes history questions answerable.

---

## Pipeline

```
chat_turn(user_id, conversation_id, message)
  1. load conversation      last N messages + stored brief
  2. parse_brief            LLM #1 — intent + constraints (temp 0)
  3. build_context_pack     code — candidates, metrics, taste
  4. answer                 LLM #2 — plan or history answer (strict schema)
  5. verify                 code — place_id check, geography/hours sanity
  6. persist                messages, brief, itinerary (when produced)
  7. respond                reply text + structured itinerary + unknowns
```

### 2. Parse brief (LLM #1)

`chat.completions`, `temperature=0`, strict `json_schema`, mirroring
`llm_pick` / `llm_gate`. Inputs: the message, the last few turns, and the
previous brief. Output: `TripBrief`.

Routing on `intent`:

| Intent | Answer shape |
|--------|--------------|
| `plan_trip` | Full itinerary schema |
| `refine_plan` | Itinerary schema, seeded with the previous plan |
| `ask_history` | Prose answer over visits and trip windows, no itinerary |
| `ask_place` | Prose answer about specific places, no itinerary |

**Fallback:** no API key or a parse failure yields a heuristic brief (region
keywords, day-count regex, date parsing) so the feature degrades instead of
failing — the same fail-soft posture as `extract.py` and `llm_fill.py`.

### 4. Answer (LLM #2)

The call that has to actually think. Strict JSON schema with these required
fields:

| Field | Purpose |
|-------|---------|
| `thinking` | Working analysis: tradeoffs, why this order, what would change it |
| `reply` | What the user reads |
| `days[]` | `DayPlan` list with stops, slots, `why_here` |
| `tradeoffs[]` | What was left out and why — the honest part |
| `unknowns[]` | Data gaps that affected the plan |
| `data_gaps[]` | Machine-readable: `{place_id, missing_field}` for the gap report |

Prompt contract:

> You are planning from a fixed list of places the user has already saved.
> You may only use places from that list, cited by `place_id`. Do not invent
> places, hours, fees, or travel times. Use the computed distances and
> durations provided; if a duration or opening hour is missing, say so in
> `unknowns` and plan conservatively. Group each day geographically — do not
> bounce across a region. Decide what matters for *this* trip given the
> brief and the taste profile; a packed pace and a relaxed pace should not
> produce the same plan. Explain each stop's role in the day, not its
> description.

Temperature ~0.35 for this call (planning benefits from some flexibility),
`temperature=0` for the brief parse. Both configurable.

`thinking` is **stored, not shown** by default. It is the debugging surface
for prompt work and the input to the gap report. A "why this plan" disclosure
in the UI can surface it later — REW returns it and never renders it, which is
a small waste worth avoiding.

### 5. Verify (code)

1. **Fabrication gate** — drop any stop whose `place_id` is not in the pack;
   count and log. A day left empty by drops is reported, not silently shrunk.
2. **Geography sanity** — flag any day whose stop-to-stop straight-line
   distance exceeds `TRIP_AGENT_MAX_DAY_KM`; annotate the day rather than
   deleting the model's work.
3. **Duplicate gate** — the same `place_id` twice in one plan is dropped
   unless the brief asked for a return visit.
4. **Duration sanity** — clamp implausible `duration_minutes` (≤ 12 h) and
   recompute `total_travel_minutes` from code-side distances, ignoring any
   number the model produced.
5. **Visited gate** — when `include_visited` is false, drop stops the user has
   already visited.
6. **Gap report** — merge `data_gaps` with code-detected missing fields, log
   aggregate counts per field and category.

---

## API surface

Thin adapters in `server/app.py`, Clerk `CurrentUserId` scoped, no business
logic — consistent with the existing module rules.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/trip-chat` | One turn: `{message, conversation_id?}` → reply + itinerary |
| `GET` | `/api/trip-chat/conversations` | List the user's conversations |
| `GET` | `/api/trip-chat/conversations/{id}` | Messages + current brief |
| `DELETE` | `/api/trip-chat/conversations/{id}` | Remove a conversation |
| `GET` | `/api/itineraries` | Saved plans |
| `GET` | `/api/itineraries/{id}` | One plan |
| `PATCH` | `/api/itineraries/{id}` | Rename / keep / discard |
| `DELETE` | `/api/itineraries/{id}` | Remove |

**Latency:** one synchronous turn — two LLM calls plus Dynamo reads, roughly
5–25 s. That fits the existing Function URL budget (900 s) with room to
spare. If p95 becomes unpleasant, the escape hatch is the existing Jobs
pattern (create job → poll `/api/jobs/{id}`), not new streaming infra. Do
**not** route chat turns through the ingest state machine.

---

## Persistence

Two new tables via the existing `simple()` / `composite()` helpers in
`infra/travel_planner_stack.py`:

| Table | Keys | Notes |
|-------|------|-------|
| `Conversations` | PK `conversation_id`, SK `item_key` | `item_key` is `meta` or `msg#<ts>#<uuid>`; GSI `user_id-updated_at-index` for listing |
| `Itineraries` | PK `user_id`, SK `itinerary_id` | Same shape as `Visits`; user-scoped by construction |

**Why messages are separate items** rather than a list on one record: a long
conversation would eventually approach the 400 KB item limit, and appending an
item is cheaper and safer under concurrency than rewriting a growing list.

Repos live in `travelplanner/db/conversations_repo.py` and
`travelplanner/db/itineraries_repo.py`, matching `visits_repo` conventions.
No TTL on either table — saved plans are user content.

---

## Module layout

```
travelplanner/trip/
  brief.py       parse_brief (LLM #1) + heuristic fallback
  context.py     build_context_pack: candidates, cap, taste profile
  metrics.py     distances, clusters, travel-time estimates, timing from facts
  plan.py        answer call (LLM #2) + strict schemas
  verify.py      fabrication / geography / duration / visited gates
  chat.py        orchestrator: load → brief → pack → answer → verify → persist
  gaps.py        data gap report aggregation
```

Per AGENTS.md: one responsibility per file, plain functions and dataclasses,
no base classes or plugin registry. `server/` calls `trip.chat` only.
`travelplanner/trip/` may import `library`, `visits`, `places`, `models`,
`settings` — never `server` or `sources`.

---

## Settings

Added to `travelplanner/settings.py` in the existing validated style (sane
default, raise on garbage).

| Env var | Default | Purpose |
|---------|---------|---------|
| `TRIP_AGENT_ENABLED` | `false` | Master switch; ships dark |
| `TRIP_AGENT_MODEL` | falls back to `OPENAI_MODEL` | Planning call model |
| `TRIP_AGENT_TEMPERATURE` | `0.35` | Planning call only |
| `TRIP_AGENT_MAX_PLACES` | `30` | Candidates in the pack |
| `TRIP_AGENT_MAX_TURNS` | `8` | Conversation turns sent to the brief parser |
| `TRIP_AGENT_MAX_DAY_KM` | `250` | Geography sanity threshold |
| `TRIP_AGENT_ROAD_FACTOR` | `1.3` | Straight-line → road distance estimate |

**On the model:** `OPENAI_MODEL` defaults to `gpt-4o-mini`, which is right for
extraction and gating but weak at multi-constraint planning with tradeoffs.
`TRIP_AGENT_MODEL` exists so the planning call can use a stronger reasoning
model while brief parsing stays cheap. Measure both before settling.

---

## Phases

### Phase 1 — Planning over the library, CLI only

Models, context pack, metrics, both LLM calls, verify, gap report. A CLI entry
point that takes a `--user-id` and a question and prints the plan plus the gap
report. No tables, no API, no UI. Behind `TRIP_AGENT_ENABLED`.

**Done when:** for a real library, a "4 days around X" question produces a
geographically coherent plan in which **every** stop resolves to a real
`place_id`, a deliberately impossible request ("plan me 3 days in Tokyo" with
no Tokyo places saved) says the library is thin instead of inventing places,
and the gap report names the top five missing fields.

### Phase 2 — Persist and expose

`Conversations` + `Itineraries` tables and repos, CDK wiring, the endpoints
above, multi-turn refinement, history questions using `trips.py` windows.

**Done when:** a conversation survives a reload, "make day 2 easier" edits the
existing plan rather than restarting, and "what did I do on my June trip"
answers from visit history.

### Phase 3 — Surface it

A **Plan** tab on web and mobile: thread on one side, itinerary cards on the
other (REW's split — structured artifacts do not belong buried in chat prose).
Stops deep-link to existing place detail pages. Saved plans list. Unknowns
rendered honestly rather than hidden.

**Done when:** a plan is created, saved, reopened, and refined on both clients,
and every stop navigates to its place page.

### Phase 4 — Quality from data

Feed the Phase 1–3 gap reports back into P1 priorities: run place-facts on the
categories the planner most often lacked, add P1 #4 relations so "hike to
reach the lake" orders correctly, use P2 #10 logistics for fees and access.
Re-measure the unknown rate.

**Done when:** the unknown rate per plan drops measurably against a fixed
question set.

### Later

Embeddings for "places like X" (P4 #17), Skip as negative signal (P4 #20),
token streaming, group trips (P4 #19), offline day sheet (P4 #18).

---

## Testing and validation

Unit tests with fake places and visits, no network, matching the moto suite:

- **Verify gates** — fabricated `place_id` dropped; duplicate stop dropped;
  visited stop dropped unless requested; over-distance day flagged, not
  deleted; implausible duration clamped.
- **Context pack** — region filter honored; visited excluded by default; cap
  respected with ranking order; taste profile from a synthetic history.
- **Metrics** — distances against known coordinates; travel estimate labelled;
  missing facts produce `unknowns` rather than guesses.
- **Brief parse** — heuristic fallback with no API key; previous brief carried
  forward on refinement; intent routing for each of the four intents.
- **Fail-soft** — no `OPENAI_API_KEY`, API error, invalid JSON: the turn
  returns a clear message and persists nothing broken.
- **Repos** — message append ordering; itinerary round-trip with nested days.

Validation script in the repo's existing style —
`scripts/validate_trip_agent.py` writing `docs/trip-agent-validation.json`
over a fixed question set, reporting per run: fabricated-stop count (must be
0), unknown rate, average day distance, and the field-level gap histogram.
This is how "did that prompt change help" gets answered with evidence rather
than vibes.

---

## File touch list

| Area | Files |
|------|-------|
| Models | `travelplanner/models.py` (`TripBrief`, `ItineraryStop`, `DayPlan`, `Itinerary`, `ChatMessage`) |
| Trip package | `travelplanner/trip/{brief,context,metrics,plan,verify,chat,gaps}.py` |
| Persistence | `travelplanner/db/{conversations_repo,itineraries_repo}.py`, `db/tables.py` |
| Settings | `travelplanner/settings.py` |
| API | `server/app.py`, `server/schemas.py` |
| Infra | `infra/travel_planner_stack.py` (two tables + GSI, env vars) |
| Web | `frontend/src/components/TripChat*.tsx`, `api.ts`, `styles.css` |
| Mobile | `mobile/app/(app)/(tabs)/plan.tsx`, `mobile/src/api.ts`, chat components |
| CLI | `cli.py` (Phase 1 entry point) |
| Tests | `tests/test_trip_agent.py`, `tests/test_trip_context.py` |
| Validation | `scripts/validate_trip_agent.py`, `docs/trip-agent-validation.json` |

---

## Out of scope

- Booking, availability, live pricing, real "open now" status
- Suggesting places outside the user's library (no web search, no tool loop)
- Real routing / drive-time APIs — v1 uses labelled straight-line estimates
- Token streaming
- Group or collaborative planning (P4 #19)
- Rewriting `tips` / `details` / `facts` — the agent reads them, never edits
- Automatic trip creation from chat without the user saving the plan

---

## Relation to roadmap

| Roadmap item | This plan |
|--------------|-----------|
| P2 #7 Itinerary from a reel / cluster | Phases 1–3, generalized from one cluster to a conversational brief |
| P2 #8 Visit / want-to-go status | Consumes visited; saved-minus-visited stands in for Want until it lands |
| P2 #9 Map-first trip view | Itinerary days are a natural map overlay |
| P2 #10 Access & logistics pack | Phase 4 input for fees, access, and ordering |
| P1 #6 Place facts | Supplies durations, hours, fees; gap report prioritizes which categories to enrich first |
| P1 #4 Related attractions | Phase 4 — correct ordering for "hike to reach the lake" |
| P4 #17 Similar places | Later — lifts the candidate cap beyond deterministic filtering |
| P4 #20 Skip learning | Later — negative signal in candidate ranking |

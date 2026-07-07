# Social Media Travel Planner

Ingest social media travel inspiration and build itineraries.

## Layout

```
common/ shared models, parsing, helpers
ingest/ fetch social posts → TravelPost
planner/ TravelPost[] → Itinerary
scripts/ dev utilities (not imported by modules)
```

## Module rules

- **common** — types and helpers used by every module. No imports from ingest or planner.
- **ingest** — only talks to social platforms and returns `TravelPost`. Imports `common` only.
- **planner** — builds itineraries from posts. Imports `common` only.
- **scripts/** — thin entry points; import from modules, don't duplicate logic.

Data flows one way: `ingest → planner`.

## Implementation

Keep it **simple, modular, and extendable**. Do not add layers you don't need yet.

- One clear responsibility per file.
- Add fields to existing dataclasses before creating new abstractions.
- Put shared logic in `common/` when two modules need it — not before.
- Prefer plain functions and dataclasses over factories, base classes, or plugin systems.
- **Names must be contextual** — use domain terms (`place_name`, `post_url`, `day_number`) instead of generic ones (`id`, `value`, `parts`).

## Run

```bash
PYTHONPATH=. python3 scripts/plan_from_fixture.py
```

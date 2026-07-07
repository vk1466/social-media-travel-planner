# Social Media Travel Planner

Turn saved social media posts into structured travel plans.

Ingest posts from Instagram, TikTok, Pinterest, and similar platforms, extract places and activities, then build day-by-day itineraries.

## Layout

```
common/   shared models and helpers
ingest/   social posts → TravelPost
planner/  TravelPost[] → Itinerary
scripts/  dev utilities (not imported by modules)
```

Data flows one way: `ingest → planner`.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

PYTHONPATH=. python3 scripts/plan_from_fixture.py
```

## Environment

Copy `.env.example` to `.env` and fill in API keys when you wire up real platform integrations.

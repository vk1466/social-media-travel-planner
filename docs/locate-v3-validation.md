# Locate validation

> **Note:** The former “v3” locate path is now the only places pipeline
> (`travelplanner/places/`). This doc’s “v3” wording is historical.

How we validated the accurate-pins locate path (multi-candidate ranking,
parent viewbox, settlement weights, LLM candidate picker) and how to re-run
those checks after future changes.

Related: [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md#accurate-place-pins),
[accurate-place-pins-plan.md](./accurate-place-pins-plan.md).

---

## What “good” means

A case **passes** when v3 returns a pin within the expected distance of a known
truth coordinate (and does not match a known-bad name token like `drive` /
`inn` / parking-lot roads).

| Layer | What it covers | Network? | LLM? |
|-------|----------------|----------|------|
| Unit (`pytest`) | Scoring, query shapes, apostrophe variants, LLM pick wiring (mocked) | No | Mocked |
| Live suite (`scripts/validate_locate_v3.py`) | Real Nominatim + optional OpenAI pick on ~28 global places | Yes | Yes if `OPENAI_API_KEY` set |
| Admin compare UI / `compare_locate` | Side-by-side legacy \| v2 \| v3 for one mention | Yes | v3 path only |

Baseline (2026-07-14, with LLM picker + settlement/country fixes): **28/28 PASS**
on the live suite. Artifact: [locate-v3-global-validation.json](./locate-v3-global-validation.json).

---

## How we tested it (history)

1. **Admin compare tool** — Ran legacy vs v2 on hard US cases; showed v2 mostly
   matched legacy (single Nominatim hit), so we built **v3**.
2. **v3 iterative live probes** — Misery Ridge, Angel’s Landing, Old Faithful,
   Smith Rock+coords, Banff Canada, Sydney Opera House, etc. Fixed:
   - multi-candidate ranking + parent viewbox
   - apostrophe variants (`Angels Landing`)
   - town `addresstype` as visitable `place` (Banff)
   - hard country gate (no Scotland for `country=Canada`)
   - lower weight for towns vs attractions
   - LLM pick among candidates when ranking is weak/ambiguous
3. **Global live suite** — Same expectations across Americas / Europe / Asia /
   Oceania / Africa / Middle East (see case list in the script).
4. **Unit tests** — `tests/test_places_v3.py` (and v2 pipeline env tests).

---

## Re-run after changes

### 1. Unit (fast, CI-friendly)

```bash
source .venv/bin/activate
pytest tests/test_places_v3.py tests/test_places_v2.py -q
```

Expect all green. These do **not** hit Nominatim or OpenAI.

### 2. Live global suite (authoritative for pin quality)

Needs network. Load `.env` so `OPENAI_API_KEY` is available for the LLM picker
(1g). Without the key, v3 still runs but falls back to deterministic ranking
only when the model would have been asked.

```bash
source .venv/bin/activate
set -a && source .env && set +a
python3 scripts/validate_locate_v3.py
```

Options:

```bash
python3 scripts/validate_locate_v3.py --unit-only          # pytest only
python3 scripts/validate_locate_v3.py --skip-unit          # live only
python3 scripts/validate_locate_v3.py --compare            # + legacy/v2/v3 on hard cases
```

Exit code `0` = all live cases PASS; writes/updates
`docs/locate-v3-global-validation.json`.

**Budget:** ~1–2 minutes (Nominatim 1 req/s + LLM on ambiguous cases). Do not
run in unit CI without a dedicated opt-in job.

### 3. Ad-hoc single mention

**CLI**

```bash
python3 - <<'PY'
from travelplanner.place_hints import PlaceMention
from travelplanner.places_v3.locate import locate_mention_debug
r = locate_mention_debug(PlaceMention(
  place_name="Angel's Landing",
  parent_place_name="Zion National Park",
  state_province="Utah",
  country="USA",
))
print(r.status, r.location, r.match_confidence, r.notes)
PY
```

**Three-way compare**

```bash
python3 - <<'PY'
from travelplanner.place_hints import PlaceMention
from travelplanner.places_compare import compare_locate
print(compare_locate(PlaceMention(
  place_name="Misery Ridge",
  parent_place_name="Smith Rock State Park",
  state_province="Oregon",
  country="USA",
)))
PY
```

**UI:** Admin → Locate compare (`/admin`) — legacy | v2 | v3 columns (read-only).

---

## Case set (maintain this)

Canonical list lives in `scripts/validate_locate_v3.py` (`CASES`). When adding a
regression:

1. Add a dict with `label`, `mention` fields, `expect_near` `(lat, lon, max_km)`,
   optional `reject_name`.
2. Re-run the live script; commit an updated
   `docs/locate-v3-global-validation.json` only if you want a snapshot in git
   (optional — the file is a run artifact).

Hard cases we always care about:

| Case | Must not become |
|------|-----------------|
| Misery Ridge + Smith Rock | Wrong Oregon ridge ~100 km away |
| Angel's Landing + Zion | Angel’s Landing **Drive** |
| Old Faithful + Yellowstone | Old Faithful **Inn** |
| Smith Rock + IG coords | Parking / Crooked River Drive |
| Banff + Canada | Banff, Scotland |
| Sydney Opera House + Australia | Same-named Colorado POI |

---

## When to re-run

| Change | Minimum retest |
|--------|----------------|
| Scoring / category / country filters | Unit + live suite |
| Query shapes / viewbox / geocoder | Live suite (+ `--compare` on hard cases) |
| LLM picker prompt / trigger | Live suite (with `OPENAI_API_KEY`) |
| Google fallback (1f) when added | Live suite + new cases that Nominatim alone fails |
| Merge / upsert only | Unit resolve tests; live suite optional |

---

## Interpreting results

- **PASS** — pin within `max_km` of truth; no forbidden name token.
- **FAIL** — unresolved, wrong country/region, or too far from truth.
- **`llm_used: true`** — notes include `llm_pick` / `llm override`. High
  invocation rate is OK when many Nominatim duplicates score close together;
  tighten `LLM_AMBIGUITY_MARGIN` only if cost/latency becomes an issue.
- Compare **legacy ↔ v3** distance: regressions often show as same wrong pin on
  legacy/v2 and a corrected pin on v3 (or v3 unresolved when OSM has nothing
  near the parent).

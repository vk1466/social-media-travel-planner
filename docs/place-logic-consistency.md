# Place logic consistency — Timeline vs ingest

**Status: mostly closed on feature/composable-step-pipelines.** Shared
`run_timeline_pipeline` / `run_instagram_pipeline` steps own locate, nearby,
dedupe, and upsert. Both personas apply `is_visitable_place`. Timeline uses
`locate_mention_debug` outcomes (including low_confidence). Visit review state
is on `Visit.status`. Jobs use typed `items` + `stats`. `finalize_timeline_job`
runs `link_places()`. Shared identity helpers live in `places/identity.py`;
hierarchy imports `haversine_meters` / `same_region` from there (no local
copies). Remaining inventory items below that are still open: finding 4
(hierarchy election weights), finding 7 (duplicate vs parent thresholds),
finding 9 (synthetic unresolved recovery region).

Historical inventory (pre-rewrite audit) follows for reference.

Related: [mvp-pipeline-roadmap.md](./mvp-pipeline-roadmap.md) P0 #1 (accurate
pins) and #3 (hierarchy).

---

## Summary

Place **dedupe and merge** are already a single shared implementation. The
divergence is in the **gates around** that core, and in **hierarchy**. Two
distinct root causes:

| Gap | Root cause | Findings |
|-----|-----------|----------|
| **1. Parallel accept policy** | Timeline reimplemented "is this pin good enough" instead of reusing ingest's | 1, 2, 3, 6a, 8, 9 |
| **2. Hierarchy decoupled from place identity** | `hierarchy.py` re-derived its own geometry / region / name matching, and assumes every place came from a post | 4, 5, 6b, 7 |

Gap 1 is the functional problem: it produces junk places in ingest and silent
data loss in Timeline. Gap 2 is mostly latent inconsistency that will surprise
whoever next tunes a threshold.

---

## What is already shared (do not "fix" twice)

- `upsert_place_record` → `find_existing_place` → `_merge_place`
  (`places/resolve.py`) — **one** dedupe/merge implementation, used by both
  ingest and Timeline.
- `place_key` / `slugify` (`places/store.py:213-223`) — one identity encoding.
- `resolve_category` / `category_from_osm` (`categories.py`) — shared.
- Forward geocoding, multi-candidate ranking, parent viewbox, and the LLM
  candidate pick all live in `locate_mention_debug` (`places/locate.py:565`) and
  are reached by both personas.

---

## Gap 1 — Timeline reimplemented the accept policy

Ingest expresses "is this pin good enough" as a **confidence status** out of
`locate_mention_debug` (`resolved` / `low_confidence` / `unresolved`). Timeline
expresses the same decision as a **stack of booleans** (`is_visitable_place` +
`_passes_osm_travel_gate`) applied on top of a wrapper that already discarded the
status. Two vocabularies for one question, so the filters drifted apart
invisibly.

### 1. Two different "is this a real place" filters; ingest uses the weaker one

| Filter | Used by | Rejects |
|--------|---------|---------|
| `locate._is_visitable_result` (`places/locate.py:205-213`, applied at `:424`) | **ingest only** | `administrative` category; display name equal to state; display name equal to country |
| `store.is_visitable_place` (`places/store.py:169-211`) | **Timeline only** (`timeline/import_visits.py:264,331,347`) | non-travel offices, shops, amenities, non-travel OSM classes (named trails excepted), residential building types, street-address-shaped names |

A reel mention that geocodes to `shop=clothes`, `amenity=fuel`, or
`office=company` is saved as a travel Place by ingest; the identical pin from
Timeline is rejected. The near-identical names are why this went unnoticed.
There is no type barrier — ingest already builds a `PlaceLocation` via
`locate._location_from_result`.

**Caution when fixing:** do not adopt the whole Timeline filter for ingest
blindly. `_looks_like_street_address` and the residential rules were tuned for
reverse-geocode noise and may reject legitimate reel places. Take the
office / shop / amenity / non-travel-class subset first and check the delta with
`scripts/validate_extract.py`.

### 2. Timeline discards low-confidence pins and records no candidates

`locate_mention` (`places/locate.py:670-675`) returns a location **only** when
status is `resolved`. Ingest keeps `low_confidence` — it upserts the place *and*
records a `PlaceCandidate` (`places/pipeline.py:74-87`). Timeline gets neither,
and because it never calls `record_candidate`, the loss is unrecoverable even
though the candidates table, `cli.py --retry-place-candidates`, and the admin
review UI already exist.

Not a rare edge: in `timeline-backfill-skip-list.json` the `unresolved` bucket is
**95 of 202 clusters** — the largest by a wide margin.

**Target:** Timeline calls `locate_mention_debug`, decides keep/skip from
`debug.status`, and records candidates on failure — the same policy as ingest.

### 3. `link_places()` never runs after a Timeline import

`finalize_job` calls it (`server/workers.py:197`); `finalize_timeline_job` does
not (`server/workers.py:205-212`). Timeline-imported places keep
`parent_place_id=None` until an unrelated ingest batch or a manual reprocess
happens to run. Effectively a one-line fix and the most visible symptom.

### 6a. `_place_location_from_geocode` is a verbatim copy

`timeline/import_visits.py:59-72` is line-for-line identical to
`locate._location_from_result` (`places/locate.py:160-173`). Timeline already
imports the shared `haversine_meters` (`import_visits.py:15`), so the precedent
for importing rather than copying exists.

### 8. Timeline reloads the whole place library once per cluster

Ingest builds a library cache and threads it through
(`places/pipeline.py:25,68-72`). Timeline's `upsert_place` calls omit `library=`
(`import_visits.py:245,334`), so `find_existing_place` falls through to
`load_all_places()` every time (`places/resolve.py:49`). For the 202-cluster
fixture that is 202 full table scans, in a Lambda running at
`max_concurrency=1` — a timeout risk, not just cost.

### 9. Timeline's synthetic fallback place can merge with anything, anywhere

`_place_for_unresolved_recovery` (`import_visits.py:301-310`) builds
`PlaceLocation(display_name=name, latitude, longitude)` with no country, state,
city, or country code. Then:

- `place_key` (`places/store.py:220-223`) degrades to the name slug alone.
- `resolve._same_region` skips every check when both sides lack region fields, so
  the alias branch (`ALIAS_REGION_MATCH = 0.72`) can merge this place with a
  same-named place on another continent.

**Target:** populate region from the cluster's reverse-geocode attempt, or refuse
the alias-merge branch when the incoming location has no country.

---

## Gap 2 — Hierarchy is decoupled from place identity

These exist independently of Timeline and would remain after Gap 1 is closed.

### 4. Timeline places are structurally second-class in the hierarchy

Timeline upserts with `source_post_id=None` (`import_visits.py:245,334`), so
those places carry `source_post_ids=()`. Consequences in `hierarchy.py`:

- `_cluster_places` (`hierarchy.py:268-292`) derives edges only from
  `post.extracted_places` and `post.places`. Timeline places contribute no edges,
  so they can join a cluster only via the proximity + broader-name rule
  (`hierarchy.py:294-304`).
- `_deterministic_elect_root` (`hierarchy.py:148-157`) ranks partly by
  `-len(place.source_post_ids)`, so a Timeline place always loses root election to
  any post-backed place.

Neither is obviously wrong, but it is an unstated policy where **provenance
decides geography**. Cheapest fix: drop `source_post_ids` from the election key —
category rank and name-token count already carry the signal.

### 5. Two `_same_region` implementations that disagree

| Location | Behavior |
|----------|----------|
| `places/resolve.py:28-39` | `country_code`, falling back to country **name** when codes are missing, then state |
| `hierarchy.py:74-83` | `country_code` only, then state — no name fallback, so a missing code reads as same-region |

Same name, same intent, different answers on the same input.

### 6b. `_haversine_meters` is a verbatim copy

`hierarchy.py:51-57` is line-for-line identical to `locate.haversine_meters`
(`places/locate.py:151-157`).

### 7. "Duplicate" vs "parent/child" is decided by two rules that don't know about each other

| Rule | Threshold | Effect |
|------|-----------|--------|
| `resolve` near-duplicate (`resolve.py:18-19`, applied at `:90`) | ≤50 m **and** `name_similarity` ≥ 0.55 | collapses two places into one |
| `hierarchy` clustering (`hierarchy.py:21,65-71`, applied at `:303`) | ≤25 km **and** slug-token-subset | makes one the parent of the other |

Both answer "how are these two places related." `resolve` runs first and wins, so
a viewpoint and its parking lot 30 m apart with compatible names get merged into
one Place and hierarchy never sees the pair to nest them.

That may be the desired behavior, but nothing records the decision — so the next
tweak to `NAME_COMPATIBLE` silently changes hierarchy output. A shared constant,
or even a comment naming the precedence, is enough.

---

## Target consolidation

Small, and mostly deletion:

1. **One identity module** — extend `places/store.py` or add `places/identity.py`
   owning `is_visitable_place`, `same_region`, `haversine_meters`,
   `name_similarity`, `place_key`, `slugify`. Timeline and `hierarchy.py` import
   instead of reimplementing.
2. **One accept policy** — both personas consume `locate_mention_debug` outcomes
   (`resolved` / `low_confidence` / `unresolved` / `rejected`) and decide at the
   edge. This is exactly the "policy at the edge, outcomes in the middle" rule in
   the framework design, so it should fall out of the rewrite rather than be
   bolted on.
3. **Hierarchy runs for every persona**, and stops assuming a place came from a
   post.

Suggested order when this is picked up, cheapest first: 3 → 1 → 2 → 5/6 → 8 →
then decide 4 and 9 deliberately.

---

## Verification

These are the same two assets the rewrite depends on, with the same caveats noted
in the plan (neither is currently a deterministic offline fixture):

- `timeline-backfill-skip-list.json` — Timeline keep / skip / review buckets.
  Finding 2 will **intentionally** move clusters out of `unresolved`, so the
  fixture must be re-baselined with that change, not held constant.
- `extract-validation.json` via `scripts/validate_extract.py` — required for
  finding 1, since tightening the ingest gate can only be judged by what it stops
  saving.

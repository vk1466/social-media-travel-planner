"""Locate a mention and decide whether it belongs in the travel library.

Shared by Instagram mention processing and Timeline locate. Callers attach
the outcome to a place record or apply an extra gate of their own.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.place_hints import PlaceMention
from travelplanner.places.interest_gate import jev_is_place_of_interest
from travelplanner.places.locate import LocateDebugResult, locate_mention_debug
from travelplanner.places.shop_travel_gate import llm_ambiguous_shop_is_travel
from travelplanner.places.store import is_ambiguous_shop, is_visitable_place

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GatedMention:
  outcome: LocateOutcome
  jev_kept: bool


def _unresolved_reason(debug: LocateDebugResult) -> str | None:
  if not debug.notes:
    return None
  return "; ".join(debug.notes[-3:])


def locate_mention_for_library(
  mention: PlaceMention,
  *,
  anchor_cache: dict[str, tuple[float, float] | None] | None = None,
) -> GatedMention:
  """Locate, then keep or reject. Does not upsert.

  ``jev_kept`` is true only when the interest check overrode a non-visitable
  tag. An ambiguous shop that was kept does not set it.
  """
  debug = locate_mention_debug(mention, anchor_cache=anchor_cache)
  if debug.location is None or debug.status == "unresolved":
    return GatedMention(
      outcome=LocateOutcome(
        status="unresolved",
        mention=mention,
        location=debug.location,
        match_confidence=debug.match_confidence,
        reason=_unresolved_reason(debug),
      ),
      jev_kept=False,
    )

  if not is_visitable_place(debug.location):
    if is_ambiguous_shop(debug.location):
      keep, gate_reason = llm_ambiguous_shop_is_travel(debug.location, mention)
      if not keep:
        return GatedMention(
          outcome=LocateOutcome(
            status="rejected",
            mention=mention,
            location=debug.location,
            match_confidence=debug.match_confidence,
            reason=f"ambiguous shop rejected: {gate_reason}",
          ),
          jev_kept=False,
        )
      logger.info(
        "ambiguous shop kept by LLM place_name=%r reason=%s",
        mention.place_name,
        gate_reason,
      )
    else:
      keep, gate_reason = jev_is_place_of_interest(debug.location, mention)
      if not keep:
        return GatedMention(
          outcome=LocateOutcome(
            status="rejected",
            mention=mention,
            location=debug.location,
            match_confidence=debug.match_confidence,
            reason=f"not a place of interest: {gate_reason}",
          ),
          jev_kept=False,
        )
      logger.info(
        "osm tag overridden by Jev place_name=%r reason=%s",
        mention.place_name,
        gate_reason,
      )
      return GatedMention(
        outcome=LocateOutcome(
          status=debug.status,  # type: ignore[arg-type]
          mention=mention,
          location=debug.location,
          match_confidence=debug.match_confidence,
        ),
        jev_kept=True,
      )

  return GatedMention(
    outcome=LocateOutcome(
      status=debug.status,  # type: ignore[arg-type]
      mention=mention,
      location=debug.location,
      match_confidence=debug.match_confidence,
    ),
    jev_kept=False,
  )

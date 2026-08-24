import type { Place, TimelineReviewDetail } from "../api";
import { CategoryChip } from "./CategoryChip";
import { ReviewIcon } from "./PanelIcons";
import { SectionPanel } from "./SectionPanel";
import { visitDateLabel } from "./travelHistoryHelpers";

interface TimelineReviewPanelProps {
  reviews: TimelineReviewDetail[];
  reviewBusyId: string | null;
  onNavigateToPlace?: (placeId: string) => void;
  onAccept: (visitId: string) => void;
  onDiscard: (visitId: string) => void;
}

function locationLine(place: Place | null | undefined): string {
  if (!place) return "";
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

export function TimelineReviewPanel({
  reviews,
  reviewBusyId,
  onNavigateToPlace,
  onAccept,
  onDiscard,
}: TimelineReviewPanelProps) {
  if (reviews.length === 0) return null;

  return (
    <SectionPanel
      className="history-panel"
      tone="notice"
      icon={<ReviewIcon />}
      title="Review Timeline places"
      subtitle="Ambiguous imports — keep the trip memories, discard the everyday stops. Suggestions are hints only."
      actions={
        <span className="history-review-badge">{reviews.length} waiting</span>
      }
    >
      <ul className="history-review-list">
        {reviews.map(({ visit, place, suggestion, suggestion_reason: suggestionReason }) => {
          const busy = reviewBusyId === visit.visit_id;
          const where = locationLine(place);
          return (
            <li key={visit.visit_id} className="history-review-item">
              <div className="history-review-copy">
                {place && onNavigateToPlace ? (
                  <button
                    type="button"
                    className="history-entry-link"
                    onClick={() => onNavigateToPlace(place.place_id)}
                  >
                    {visit.place_name}
                  </button>
                ) : (
                  <span className="history-entry-name">{visit.place_name}</span>
                )}
                <div className="history-entry-meta">
                  <CategoryChip category={place?.category} small />
                  <span className="history-entry-date-inline">
                    {visitDateLabel(visit.visited_from, visit.visited_to)}
                  </span>
                  {where ? <span className="history-entry-where">{where}</span> : null}
                </div>
                {suggestion ? (
                  <p className="history-review-suggestion">
                    Suggested: {suggestion}
                    {suggestionReason ? ` — ${suggestionReason}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="history-actions history-review-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy}
                  onClick={() => onAccept(visit.visit_id)}
                >
                  Keep
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={busy}
                  onClick={() => onDiscard(visit.visit_id)}
                >
                  Discard
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionPanel>
  );
}

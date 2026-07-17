import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  acceptTimelineReview,
  cleanupVisits,
  createVisit,
  deleteVisit,
  discardTimelineReview,
  fetchPlaces,
  fetchTimelineReviews,
  fetchVisits,
  importTimelineFile,
  startInstagramImport,
  type Place,
  type TimelineReviewDetail,
  type VisitDetail,
} from "../api";

interface TravelHistoryProps {
  refreshToken?: number;
  jobRunning?: boolean;
  onChanged?: () => void;
  onNavigateToPlace?: (placeId: string) => void;
  onImportStarted?: (jobId: string) => void;
}

function formatVisitDates(visitedFrom?: string | null, visitedTo?: string | null): string {
  if (!visitedFrom) {
    return "Visited · date unknown";
  }
  if (!visitedTo || visitedTo === visitedFrom) {
    return visitedFrom;
  }
  return `${visitedFrom} → ${visitedTo}`;
}

function locationLine(place: Place | null | undefined): string {
  if (!place) {
    return "";
  }
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

export function TravelHistory({
  refreshToken = 0,
  jobRunning = false,
  onChanged,
  onNavigateToPlace,
  onImportStarted,
}: TravelHistoryProps) {
  const [visits, setVisits] = useState<VisitDetail[]>([]);
  const [reviews, setReviews] = useState<TimelineReviewDetail[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [timelineImporting, setTimelineImporting] = useState(false);
  const [timelineSummary, setTimelineSummary] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [instagramUsername, setInstagramUsername] = useState("");
  const timelineInputRef = useRef<HTMLInputElement>(null);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [visitedFrom, setVisitedFrom] = useState("");
  const [visitedTo, setVisitedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextVisits, nextPlaces, nextReviews] = await Promise.all([
        fetchVisits(),
        fetchPlaces(),
        fetchTimelineReviews(),
      ]);
      setVisits(nextVisits);
      setPlaces(nextPlaces);
      setReviews(nextReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load travel history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refreshToken]);

  const suggestions = useMemo(() => {
    const query = destinationQuery.trim().toLowerCase();
    if (query.length < 2) {
      return [];
    }
    return places
      .filter((place) => {
        const haystack = [place.display_name, ...place.aliases].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [destinationQuery, places]);

  const resetForm = () => {
    setDestinationQuery("");
    setSelectedPlace(null);
    setVisitedFrom("");
    setVisitedTo("");
    setNotes("");
    setSuggestionsOpen(false);
  };

  const handleSelectSuggestion = (place: Place) => {
    setSelectedPlace(place);
    setDestinationQuery(place.display_name);
    setSuggestionsOpen(false);
  };

  const handleImportInstagram = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setTimelineSummary(null);
    const username = instagramUsername.trim();
    if (!username) {
      setError("Enter an Instagram username");
      return;
    }
    setImporting(true);
    try {
      const jobId = await startInstagramImport(username);
      setInstagramUsername("");
      onImportStarted?.(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Instagram import");
    } finally {
      setImporting(false);
    }
  };

  const handleImportTimeline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTimelineSummary(null);
    const input = timelineInputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setError("Choose a Timeline .json or Takeout .zip file");
      return;
    }
    setTimelineImporting(true);
    try {
      const jobId = await importTimelineFile(file);
      setTimelineSummary("Timeline import started — watch progress above. You can refresh anytime.");
      if (input) {
        input.value = "";
      }
      onImportStarted?.(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import Timeline");
    } finally {
      setTimelineImporting(false);
    }
  };

  const handleCleanupVisits = async (scope: "timeline" | "all") => {
    const message =
      scope === "timeline"
        ? "Delete all visits imported from Google Maps Timeline? Linked places with no remaining visits will be unlinked. This cannot be undone."
        : "Delete ALL visited-place history (Timeline, Instagram, and manual)? Linked places with no remaining visits will be unlinked. This cannot be undone.";
    if (!window.confirm(message)) {
      return;
    }
    setError(null);
    try {
      const result = await cleanupVisits(scope);
      const visitLabel = `${result.visits_deleted} visit${result.visits_deleted === 1 ? "" : "s"}`;
      const placeLabel =
        result.places_unlinked > 0
          ? ` and unlinked ${result.places_unlinked} place${result.places_unlinked === 1 ? "" : "s"}`
          : "";
      setTimelineSummary(
        scope === "timeline"
          ? `Cleared ${visitLabel}${placeLabel} from Timeline.`
          : `Cleared ${visitLabel}${placeLabel} from travel history.`,
      );
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear visits");
    }
  };

  const handleAcceptReview = async (visitId: string) => {
    setReviewBusyId(visitId);
    setError(null);
    try {
      await acceptTimelineReview(visitId);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to keep place");
    } finally {
      setReviewBusyId(null);
    }
  };

  const handleDiscardReview = async (visitId: string) => {
    setReviewBusyId(visitId);
    setError(null);
    try {
      await discardTimelineReview(visitId);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard place");
    } finally {
      setReviewBusyId(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const query = destinationQuery.trim();
    if (!query) {
      setError("Enter a destination");
      return;
    }
    if (visitedTo && !visitedFrom) {
      setError("Enter a start date if you set an end date");
      return;
    }

    setSaving(true);
    try {
      await createVisit({
        visited_from: visitedFrom || null,
        visited_to: visitedTo || null,
        notes: notes.trim() || null,
        place_id: selectedPlace?.place_id ?? null,
        place_query: selectedPlace ? null : query,
      });
      resetForm();
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (visitId: string) => {
    const confirmed = window.confirm("Remove this trip from your history?");
    if (!confirmed) {
      return;
    }
    setError(null);
    try {
      await deleteVisit(visitId);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete visit");
    }
  };

  return (
    <section className="library-section">
      <section className="panel visit-form-panel">
        <div className="ingest-panel-header">
          <span className="ingest-panel-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="9" cy="9" r="2.2" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h2 className="ingest-panel-title">Import from Instagram</h2>
            <p className="ingest-panel-subtitle">
              Pull your latest public posts, run the full place pipeline, and mark places as
              visited. Progress stays visible if you refresh.
            </p>
          </div>
        </div>
        <form className="visit-form" onSubmit={(event) => void handleImportInstagram(event)}>
          <label className="visit-field visit-field-destination">
            <span className="field-label">Instagram username</span>
            <input
              type="text"
              className="place-search visit-destination-input"
              placeholder="@yourusername"
              value={instagramUsername}
              onChange={(event) => setInstagramUsername(event.target.value)}
              autoComplete="off"
              disabled={importing || jobRunning}
            />
          </label>
          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={importing || jobRunning}
            >
              {importing ? "Starting…" : jobRunning ? "Import running…" : "Import visits"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel visit-form-panel">
        <div className="ingest-panel-header">
          <span className="ingest-panel-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M3 14.5V3.5h7.2L15 8.3v6.2H3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M10 3.5V8h4.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          <div>
            <h2 className="ingest-panel-title">Import from Google Maps Timeline</h2>
            <p className="ingest-panel-subtitle">
              Upload a phone Timeline .json or Takeout .zip. Parsed in your browser; clusters upload
              to staging and process in the background (survives refresh). Home-area and errand
              places are filtered; TYPE_UNKNOWN places are gated via OpenStreetMap.
            </p>
          </div>
        </div>
        <form className="visit-form" onSubmit={(event) => void handleImportTimeline(event)}>
          <label className="visit-field visit-field-destination">
            <span className="field-label">Timeline file</span>
            <input
              ref={timelineInputRef}
              type="file"
              accept=".json,.zip,application/json,application/zip"
              className="visit-file-input"
              disabled={timelineImporting || jobRunning}
            />
          </label>
          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={timelineImporting || jobRunning}
            >
              {timelineImporting
                ? "Uploading…"
                : jobRunning
                  ? "Import running…"
                  : "Import Timeline"}
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={timelineImporting || jobRunning}
              onClick={() => void handleCleanupVisits("timeline")}
            >
              Clear Timeline visits
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={timelineImporting || jobRunning}
              onClick={() => void handleCleanupVisits("all")}
            >
              Clear all visit history
            </button>
          </div>
        </form>
        {timelineSummary ? <p className="banner-success">{timelineSummary}</p> : null}
      </section>

      {reviews.length > 0 ? (
        <section className="panel visit-form-panel">
          <div className="ingest-panel-header">
            <div>
              <h2 className="ingest-panel-title">Review Timeline places</h2>
              <p className="ingest-panel-subtitle">
                Ambiguous imports — keep trip memories, discard everyday stops. AI suggestions are
                hints only.
              </p>
            </div>
          </div>
          <ul className="visit-list">
            {reviews.map((item) => {
              const { visit, place, suggestion, suggestion_reason: suggestionReason } = item;
              const busy = reviewBusyId === visit.visit_id;
              const where = locationLine(place);
              return (
                <li key={visit.visit_id} className="visit-row">
                  <div className="visit-row-main">
                    <button
                      type="button"
                      className="visit-place-link"
                      onClick={() => place && onNavigateToPlace?.(place.place_id)}
                      disabled={!place}
                    >
                      {visit.place_name}
                    </button>
                    {where ? <p className="visit-meta">{where}</p> : null}
                    <p className="visit-meta">{formatVisitDates(visit.visited_from, visit.visited_to)}</p>
                    {suggestion ? (
                      <p className="visit-meta">
                        Suggested: {suggestion}
                        {suggestionReason ? ` — ${suggestionReason}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={busy}
                      onClick={() => void handleAcceptReview(visit.visit_id)}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busy}
                      onClick={() => void handleDiscardReview(visit.visit_id)}
                    >
                      Discard
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {error && <p className="banner-error">{error}</p>}

      <section className="panel visit-form-panel">
        <div className="ingest-panel-header">
          <span className="ingest-panel-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M9 2.5C6.5 2.5 4.5 4.5 4.5 7c0 4 4.5 8 4.5 8s4.5-4 4.5-8c0-2.5-2-4.5-4.5-4.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="9" cy="7" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h2 className="ingest-panel-title">Add a place you’ve visited</h2>
            <p className="ingest-panel-subtitle">
              Pick a place from your library or type a new destination. Dates are optional.
            </p>
          </div>
        </div>

        <form className="visit-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="visit-form-grid">
            <label className="visit-field visit-field-destination">
              <span className="field-label">Destination</span>
              <div className="visit-destination-wrap">
                <input
                  type="search"
                  className="place-search visit-destination-input"
                  placeholder="Tokyo, Smith Rock, Lisbon…"
                  value={destinationQuery}
                  onChange={(event) => {
                    setDestinationQuery(event.target.value);
                    setSelectedPlace(null);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setSuggestionsOpen(false), 150);
                  }}
                  autoComplete="off"
                  disabled={saving}
                />
                {suggestionsOpen && suggestions.length > 0 && (
                  <ul className="visit-suggestions" role="listbox">
                    {suggestions.map((place) => (
                      <li key={place.place_id}>
                        <button
                          type="button"
                          className="visit-suggestion"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelectSuggestion(place)}
                        >
                          <span className="visit-suggestion-name">{place.display_name}</span>
                          <span className="visit-suggestion-meta">
                            {[place.location.city, place.location.country].filter(Boolean).join(", ") ||
                              "in your library"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedPlace ? (
                <p className="visit-resolve-hint">Using place from your library</p>
              ) : destinationQuery.trim().length >= 2 ? (
                <p className="visit-resolve-hint">
                  Will look up “{destinationQuery.trim()}” and add it if it’s new
                </p>
              ) : null}
            </label>

            <label className="visit-field">
              <span className="field-label">From (optional)</span>
              <input
                type="date"
                className="platform-filter"
                value={visitedFrom}
                onChange={(event) => setVisitedFrom(event.target.value)}
                disabled={saving}
              />
            </label>

            <label className="visit-field">
              <span className="field-label">To (optional)</span>
              <input
                type="date"
                className="platform-filter"
                value={visitedTo}
                onChange={(event) => setVisitedTo(event.target.value)}
                disabled={saving}
              />
            </label>
          </div>

          <label className="visit-field">
            <span className="field-label">Notes (optional)</span>
            <textarea
              className="links-input visit-notes"
              rows={2}
              placeholder="Who you went with, season, highlights…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Mark as visited"}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <p className="loading-copy">Loading travel history…</p>
      ) : visits.length === 0 ? (
        <p className="empty-copy">No visits yet. Mark places as visited from here or from a place page.</p>
      ) : (
        <ul className="visit-list">
          {visits.map(({ visit, place }) => (
            <li key={visit.visit_id} className="visit-card panel">
              <div className="visit-card-main">
                <div>
                  <h3 className="visit-card-title">
                    {onNavigateToPlace ? (
                      <button
                        type="button"
                        className="inline-link-button"
                        onClick={() => onNavigateToPlace(visit.place_id)}
                      >
                        {visit.place_name}
                      </button>
                    ) : (
                      visit.place_name
                    )}
                  </h3>
                  {locationLine(place) && <p className="visit-card-location">{locationLine(place)}</p>}
                  <p className="visit-card-dates">
                    {formatVisitDates(visit.visited_from, visit.visited_to)}
                  </p>
                  {visit.notes && <p className="visit-card-notes">{visit.notes}</p>}
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void handleDelete(visit.visit_id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

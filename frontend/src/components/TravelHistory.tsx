import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  createVisit,
  deleteVisit,
  fetchPlaces,
  fetchVisits,
  type Place,
  type VisitDetail,
} from "../api";

interface TravelHistoryProps {
  refreshToken?: number;
  onChanged?: () => void;
  onNavigateToPlace?: (placeId: string) => void;
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
  onChanged,
  onNavigateToPlace,
}: TravelHistoryProps) {
  const [visits, setVisits] = useState<VisitDetail[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      const [nextVisits, nextPlaces] = await Promise.all([fetchVisits(), fetchPlaces()]);
      setVisits(nextVisits);
      setPlaces(nextPlaces);
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

      {error && <p className="banner-error">{error}</p>}

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

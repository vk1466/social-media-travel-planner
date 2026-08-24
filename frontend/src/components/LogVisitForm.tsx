import { type FormEvent, useState } from "react";

import type { Place } from "../api";
import { categoryLabel } from "../categoryLabels";
import { PinIcon } from "./PanelIcons";
import { SectionPanel } from "./SectionPanel";

interface VisitFormData {
  visited_from: string | null;
  visited_to: string | null;
  notes: string | null;
  place_id: string | null;
  place_query: string | null;
}

interface LogVisitFormProps {
  places: Place[];
  disabled?: boolean;
  onVisitSaved: (data: VisitFormData) => Promise<void>;
  onError?: (message: string) => void;
}

export function LogVisitForm({ places, disabled = false, onVisitSaved, onError }: LogVisitFormProps) {
  const [destinationQuery, setDestinationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [visitedFrom, setVisitedFrom] = useState("");
  const [visitedTo, setVisitedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestions =
    destinationQuery.trim().length >= 2
      ? places.filter((place) => {
          const haystack = [place.display_name, ...place.aliases].join(" ").toLowerCase();
          return haystack.includes(destinationQuery.trim().toLowerCase());
        }).slice(0, 8)
      : [];

  const reset = () => {
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
    const query = destinationQuery.trim();
    if (!query) {
      onError?.("Enter a destination");
      return;
    }
    if (visitedTo && !visitedFrom) {
      onError?.("Enter a start date if you set an end date");
      return;
    }
    setSaving(true);
    try {
      await onVisitSaved({
        visited_from: visitedFrom || null,
        visited_to: visitedTo || null,
        notes: notes.trim() || null,
        place_id: selectedPlace?.place_id ?? null,
        place_query: selectedPlace ? null : query,
      });
      reset();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || disabled;

  return (
    <SectionPanel
      className="history-panel"
      icon={<PinIcon />}
      title="Log a visit"
      subtitle="Pick a place from your atlas or type a new destination. Dates are optional."
    >
      <form className="history-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="history-form-grid">
          <label className="history-field history-field-destination">
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
                disabled={isBusy}
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
                          {[
                            categoryLabel(place.category),
                            place.location.city,
                            place.location.country,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "in your library"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedPlace ? (
              <p className="history-hint">
                Using {categoryLabel(selectedPlace.category).toLowerCase()} from your atlas
              </p>
            ) : destinationQuery.trim().length >= 2 ? (
              <p className="history-hint">
                Will look up "{destinationQuery.trim()}" and add it if it's new
              </p>
            ) : null}
          </label>

          <label className="history-field">
            <span className="field-label">From (optional)</span>
            <input
              type="date"
              className="platform-filter"
              value={visitedFrom}
              onChange={(event) => setVisitedFrom(event.target.value)}
              disabled={isBusy}
            />
          </label>

          <label className="history-field">
            <span className="field-label">To (optional)</span>
            <input
              type="date"
              className="platform-filter"
              value={visitedTo}
              onChange={(event) => setVisitedTo(event.target.value)}
              disabled={isBusy}
            />
          </label>
        </div>

        <label className="history-field">
          <span className="field-label">Notes (optional)</span>
          <textarea
            className="links-input history-notes"
            rows={2}
            placeholder="Who you went with, season, highlights…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isBusy}
          />
        </label>

        <div className="history-actions">
          <button type="submit" className="primary-button" disabled={isBusy}>
            {saving ? "Saving…" : "Mark as visited"}
          </button>
        </div>
      </form>
    </SectionPanel>
  );
}

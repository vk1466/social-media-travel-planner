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
  type Visit,
  type VisitDetail,
} from "../api";
import "../history-page.css";
import { CategoryChip } from "./CategoryChip";
import { FilterChipRow, type FilterChipOption } from "./FilterChipRow";
import { LogVisitForm } from "./LogVisitForm";
import { PageHeader } from "./PageHeader";
import { PageMetric } from "./PageMetric";
import { ApertureIcon, FileIcon } from "./PanelIcons";
import { SectionPanel } from "./SectionPanel";
import { TimelineReviewPanel } from "./TimelineReviewPanel";
import {
  categoryLabel,
} from "../categoryLabels";
import {
  compareVisitsNewestFirst,
  groupVisitsByYear,
  sourceLabel,
  visitDateLabel,
} from "./travelHistoryHelpers";

interface TravelHistoryProps {
  refreshToken?: number;
  jobRunning?: boolean;
  onChanged?: () => void;
  onNavigateToPlace?: (placeId: string) => void;
  onImportStarted?: (jobId: string) => void;
}

function locationLine(place: Place | null | undefined): string {
  if (!place) return "";
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
  const [importing, setImporting] = useState(false);
  const [timelineImporting, setTimelineImporting] = useState(false);
  const [timelineSummary, setTimelineSummary] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [instagramUsername, setInstagramUsername] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const timelineInputRef = useRef<HTMLInputElement>(null);

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

  const sortedVisits = useMemo(() => [...visits].sort(compareVisitsNewestFirst), [visits]);

  const placeCount = useMemo(
    () => new Set(visits.map(({ visit }) => visit.place_id)).size,
    [visits],
  );

  const countryCount = useMemo(
    () =>
      new Set(
        visits
          .map(({ place }) => place?.location.country)
          .filter((country): country is string => Boolean(country)),
      ).size,
    [visits],
  );

  const categoryOptions = useMemo<FilterChipOption[]>(() => {
    const counts = new Map<string, number>();
    for (const { place } of visits) {
      const key = place?.category ?? "uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort(([a], [b]) => {
      if (a === "uncategorized") return 1;
      if (b === "uncategorized") return -1;
      return categoryLabel(a).localeCompare(categoryLabel(b));
    });
    return [
      { key: "all", label: "All", count: visits.length },
      ...sorted.map(([key, count]) => ({
        key,
        label: key === "uncategorized" ? "Uncategorized" : categoryLabel(key),
        count,
      })),
    ];
  }, [visits]);

  const filteredVisits = useMemo(() => {
    if (categoryFilter === "all") return sortedVisits;
    return sortedVisits.filter(({ place }) => {
      const key = place?.category ?? "uncategorized";
      return key === categoryFilter;
    });
  }, [sortedVisits, categoryFilter]);

  const visitGroups = useMemo(() => groupVisitsByYear(filteredVisits), [filteredVisits]);

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
      setTimelineSummary(
        "Timeline import started — progress opens on the add page and survives a refresh.",
      );
      if (input) input.value = "";
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
    if (!window.confirm(message)) return;
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

  const handleVisitSaved = async (data: {
    visited_from: string | null;
    visited_to: string | null;
    notes: string | null;
    place_id: string | null;
    place_query: string | null;
  }) => {
    await createVisit(data);
    await refresh();
    onChanged?.();
  };

  const handleDelete = async (visit: Visit) => {
    const confirmed = window.confirm(`Remove ${visit.place_name} from your history?`);
    if (!confirmed) return;
    setError(null);
    try {
      await deleteVisit(visit.visit_id);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete visit");
    }
  };

  return (
    <div className="wf-container wf-page-pad history-page">
      <PageHeader
        eyebrow="Where you've been"
        title="Travel history"
        lede="Every place you've marked as visited — logged by hand, pulled from your Instagram posts, or imported from Google Maps Timeline."
        aside={
          <>
            <PageMetric value={visits.length} label="visits" />
            <PageMetric value={placeCount} label="places" />
            <PageMetric value={countryCount} label="countries" />
          </>
        }
      />

      {error ? <p className="banner-error">{error}</p> : null}
      {timelineSummary ? <p className="banner-success">{timelineSummary}</p> : null}

      <TimelineReviewPanel
        reviews={reviews}
        reviewBusyId={reviewBusyId}
        onNavigateToPlace={onNavigateToPlace}
        onAccept={(visitId) => void handleAcceptReview(visitId)}
        onDiscard={(visitId) => void handleDiscardReview(visitId)}
      />

      <LogVisitForm
        places={places}
        disabled={jobRunning}
        onVisitSaved={handleVisitSaved}
        onError={setError}
      />

      <div className="history-import-grid">
        <SectionPanel
          className="history-panel"
          icon={<ApertureIcon />}
          title="Import from Instagram"
          subtitle="Pull your latest public posts, run the full place pipeline, and mark those places as visited."
        >
          <form
            className="history-form"
            onSubmit={(event) => void handleImportInstagram(event)}
          >
            <label className="history-field">
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
            <div className="history-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={importing || jobRunning}
              >
                {importing ? "Starting…" : jobRunning ? "Import running…" : "Import visits"}
              </button>
            </div>
          </form>
        </SectionPanel>

        <SectionPanel
          className="history-panel"
          icon={<FileIcon />}
          title="Import from Google Maps Timeline"
          subtitle="Upload a phone Timeline .json or a Takeout .zip. Parsing happens in your browser; clusters process in the background. Home-area and errand stops are filtered out."
        >
          <form
            className="history-form"
            onSubmit={(event) => void handleImportTimeline(event)}
          >
            <label className="history-field">
              <span className="field-label">Timeline file</span>
              <input
                ref={timelineInputRef}
                type="file"
                accept=".json,.zip,application/json,application/zip"
                className="history-file-input"
                disabled={timelineImporting || jobRunning}
              />
            </label>
            <div className="history-actions">
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
            </div>
          </form>
        </SectionPanel>
      </div>

      <div className="history-reset">
        <span className="history-reset-label">Reset</span>
        <button
          type="button"
          className="history-reset-button"
          disabled={timelineImporting || jobRunning}
          onClick={() => void handleCleanupVisits("timeline")}
        >
          Clear Timeline visits
        </button>
        <button
          type="button"
          className="history-reset-button"
          disabled={timelineImporting || jobRunning}
          onClick={() => void handleCleanupVisits("all")}
        >
          Clear all visit history
        </button>
      </div>

      <section className="history-visits">
        <div className="wf-section-head">
          <h2 className="wf-section-title">Your visits</h2>
          {visits.length > 0 ? (
            <p className="wf-section-count">
              {filteredVisits.length === visits.length
                ? `${visits.length} logged`
                : `${filteredVisits.length} of ${visits.length}`}
            </p>
          ) : null}
        </div>

        {categoryOptions.length > 2 ? (
          <FilterChipRow
            label="Category"
            options={categoryOptions}
            activeKey={categoryFilter}
            onSelect={setCategoryFilter}
            ariaLabel="Filter visits by category"
          />
        ) : null}

        {loading ? (
          <p className="wf-note">Loading travel history…</p>
        ) : visits.length === 0 ? (
          <p className="wf-note">
            No visits yet. Log one above, import from Instagram or Timeline, or mark a place as
            visited from its page in the atlas.
          </p>
        ) : filteredVisits.length === 0 ? (
          <p className="wf-note">No visits in this category.</p>
        ) : (
          visitGroups.map((group) => (
            <section key={group.key} className="history-group">
              <h3 className="history-group-heading">
                <span className="history-group-year">{group.label}</span>
                <span className="history-group-count">
                  {group.entries.length} visit{group.entries.length === 1 ? "" : "s"}
                </span>
              </h3>
              <ol className="history-timeline">
                {group.entries.map(({ visit, place }) => {
                  const source = sourceLabel(visit.source);
                  const where = locationLine(place);
                  return (
                    <li key={visit.visit_id} className="history-entry">
                      <div className="history-entry-rail">
                        <span className="history-entry-dot" aria-hidden="true" />
                        <span className="history-entry-date">
                          {visitDateLabel(visit.visited_from, visit.visited_to)}
                        </span>
                      </div>
                      <div className="history-entry-body">
                        <div className="history-entry-top">
                          {onNavigateToPlace ? (
                            <button
                              type="button"
                              className="history-entry-link"
                              onClick={() => onNavigateToPlace(visit.place_id)}
                            >
                              {visit.place_name}
                            </button>
                          ) : (
                            <span className="history-entry-name">{visit.place_name}</span>
                          )}
                          <button
                            type="button"
                            className="history-entry-remove"
                            onClick={() => void handleDelete(visit)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="history-entry-meta">
                          <CategoryChip category={place?.category} small />
                          {where ? <span className="history-entry-where">{where}</span> : null}
                          {source ? (
                            <span className="history-entry-source">{source}</span>
                          ) : null}
                        </div>
                        {visit.notes ? (
                          <p className="history-entry-notes">{visit.notes}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </section>
    </div>
  );
}

import { useState } from "react";

import { cleanupData, reprocessPlaces } from "../api";

interface DataMaintenanceProps {
  disabled?: boolean;
  onComplete: () => void;
}

export function DataMaintenance({ disabled = false, onComplete }: DataMaintenanceProps) {
  const [open, setOpen] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = disabled || reprocessing || cleaning;

  const handleReprocess = async () => {
    setError(null);
    setMessage(null);
    setReprocessing(true);
    try {
      await reprocessPlaces();
      setMessage("Place library rebuilt from saved posts.");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reprocess places");
    } finally {
      setReprocessing(false);
    }
  };

  const handleCleanup = async () => {
    const confirmed = window.confirm(
      "Delete all saved posts, places, and travel history? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    setCleaning(true);
    try {
      const result = await cleanupData();
      const posts = result.posts_deleted ?? 0;
      const places = result.places_deleted ?? 0;
      const visits = result.visits_deleted ?? 0;
      setMessage(
        `Deleted ${posts} post${posts === 1 ? "" : "s"}, ${places} place${places === 1 ? "" : "s"}, and ${visits} trip${visits === 1 ? "" : "s"}.`,
      );
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clean up data");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <section className="panel data-maintenance">
      <button
        type="button"
        className="data-maintenance-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="section-header data-maintenance-header">
          <h2>Data tools</h2>
          <span className={`data-maintenance-chevron ${open ? "data-maintenance-chevron-open" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <>
          <p className="data-maintenance-copy">
            Reprocess rebuilds the shared place library from all saved posts (global). Clean up
            deletes all shared posts, places, memberships, and visits — admin only when
            ADMIN_USER_IDS is set.
          </p>
          <div className="data-maintenance-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void handleReprocess()}
            >
              {reprocessing ? "Reprocessing…" : "Reprocess places"}
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={busy}
              onClick={() => void handleCleanup()}
            >
              {cleaning ? "Cleaning up…" : "Clean up data"}
            </button>
          </div>
          {message && <p className="banner-success">{message}</p>}
          {error && <p className="banner-error">{error}</p>}
        </>
      )}
    </section>
  );
}

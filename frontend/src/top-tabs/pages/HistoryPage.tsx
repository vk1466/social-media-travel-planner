import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createVisit, startInstagramImport, type Place, type VisitDetail } from "../../api";
import { formatDate, locationLine } from "../display";
import { SearchField } from "../../components/library";
import { EmptyState } from "../components/Toolbar";
import { PageHeading } from "../../components/PageHeading";
import { useLabTheme } from "../theme";
import "../../history-page.css";

function visitSourceLabel(source: string | null | undefined): string {
  if (source === "instagram") return "Instagram";
  if (source === "timeline") return "Google Timeline";
  if (source === "manual") return "Logged by you";
  return "Visit";
}

export function HistoryPage({
  visits,
  places,
  onChanged,
}: {
  visits: VisitDetail[];
  places: Place[];
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const [username, setUsername] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const countries = useMemo(() => {
    return new Set(visits.map((item) => item.place?.location.country).filter(Boolean)).size;
  }, [visits]);
  const cities = useMemo(() => {
    return new Set(visits.map((item) => item.place?.location.city).filter(Boolean)).size;
  }, [visits]);

  return (
    <div className="top-history-page">
      <PageHeading
        backLink={{ to: "/", label: "Home" }}
        kicker="Places you’ve been"
        title="Your visits"
        lede="Keep a personal record of places you’ve visited and the memories connected to them."
        count={{ value: visits.length, label: "visits" }}
        platformFilter={false}
      />
      <section className="history-stats">
        <article>
          <b>{visits.length}</b>
          <span>visits</span>
        </article>
        <article>
          <b>{countries}</b>
          <span>countries</span>
        </article>
        <article>
          <b>{cities}</b>
          <span>cities</span>
        </article>
      </section>
      <div className="history-toolbar">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!username.trim()) return;
            setBusy(true);
            setFormError(null);
            try {
              await startInstagramImport(username.trim());
              onChanged();
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Couldn’t import that Instagram account.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <SearchField
            value={username}
            onChange={setUsername}
            placeholder="Instagram username"
          />
          <button type="submit" className="lib-filters-action" disabled={busy}>
            Import Instagram
          </button>
        </form>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!placeQuery.trim()) return;
            setBusy(true);
            setFormError(null);
            try {
              await createVisit({ place_query: placeQuery.trim() });
              setPlaceQuery("");
              onChanged();
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Couldn’t log that visit.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <SearchField
            value={placeQuery}
            onChange={setPlaceQuery}
            placeholder="Log a visit"
            list="known-places"
          />
          <datalist id="known-places">
            {places.map((place) => (
              <option key={place.place_id} value={place.display_name} />
            ))}
          </datalist>
          <button type="submit" className="lib-filters-action" disabled={busy}>
            Log visit
          </button>
        </form>
      </div>
      {formError ? <p className="inline-errors" role="alert">{formError}</p> : null}
      {visits.length === 0 ? (
        <EmptyState>No visits logged yet.</EmptyState>
      ) : (
        <section className="visit-timeline">
          {visits.map((item) => (
            <article key={item.visit.visit_id}>
              <time>{formatDate(item.visit.visited_from ?? item.visit.created_at) ?? "—"}</time>
              <i />
              <div>
                <h2>{item.visit.place_name}</h2>
                <p>
                  {[item.place ? locationLine(item.place) : null, item.visit.notes].filter(Boolean).join(" · ") ||
                    visitSourceLabel(item.visit.source)}
                </p>
              </div>
              <button type="button" onClick={() => navigate(`${basePath}/travel/${item.visit.place_id}`)}>
                Open →
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

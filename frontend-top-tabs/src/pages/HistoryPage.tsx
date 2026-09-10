import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createVisit, startInstagramImport, type Place, type VisitDetail } from "../api";
import { formatDate, locationLine } from "../display";
import { EmptyState } from "../components/Toolbar";
import { PageHeading } from "../components/Shell";

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
  const [username, setUsername] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const countries = useMemo(() => {
    return new Set(visits.map((item) => item.place?.location.country).filter(Boolean)).size;
  }, [visits]);
  const cities = useMemo(() => {
    return new Set(visits.map((item) => item.place?.location.city).filter(Boolean)).size;
  }, [visits]);

  return (
    <>
      <PageHeading
        kicker="Where you have been"
        title="History"
        lede="Visits and imports live on a stable personal timeline, separate from inspiration."
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
            try {
              await startInstagramImport(username.trim());
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Instagram username"
          />
          <button type="submit" disabled={busy}>
            Import Instagram
          </button>
        </form>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!placeQuery.trim()) return;
            setBusy(true);
            try {
              await createVisit({ place_query: placeQuery.trim() });
              setPlaceQuery("");
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Log a visit"
            list="known-places"
          />
          <datalist id="known-places">
            {places.map((place) => (
              <option key={place.place_id} value={place.display_name} />
            ))}
          </datalist>
          <button type="submit" disabled={busy}>
            Log visit
          </button>
        </form>
      </div>
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
                    item.visit.source}
                </p>
              </div>
              <button type="button" onClick={() => navigate(`/travel/${item.visit.place_id}`)}>
                Open →
              </button>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

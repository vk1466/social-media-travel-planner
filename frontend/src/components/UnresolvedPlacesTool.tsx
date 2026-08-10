import { useEffect, useState, type FormEvent } from "react";

import {
  fetchPlaceCandidates,
  type PlaceCandidate,
  type PlaceCandidateStatusFilter,
} from "../api";

function regionLabel(candidate: PlaceCandidate): string {
  const parts = [
    candidate.hints.parent_place_name,
    candidate.hints.city,
    candidate.hints.state_province,
    candidate.hints.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function UnresolvedPlacesTool() {
  const [status, setStatus] = useState<PlaceCandidateStatusFilter>("unresolved");
  const [sourcePostId, setSourcePostId] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = async (nextStatus = status, nextPostId = sourcePostId) => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchPlaceCandidates({
        status: nextStatus,
        source_post_id: nextPostId.trim() || null,
      });
      setCandidates(result.candidates);
      setLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("unresolved", "");
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };

  return (
    <section className="grid gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div>
        <h2 className="m-0 text-xl font-semibold tracking-tight text-ink">Unresolved places</h2>
        <p className="mt-2 mb-0 max-w-3xl text-sm text-quiet">
          PlaceCandidates saved when v2/v3 locate fails or is low-confidence. Read-only view —
          retry via CLI (<code className="rounded-sm bg-surface-muted px-1 py-0.5 font-mono text-[0.9em]">--retry-place-candidates</code>) without re-fetching the reel.
        </p>
      </div>

      <form
        className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-end gap-3"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-1 text-xs text-quiet">
          Status
          <select
            className="rounded-sm border border-border bg-bg px-2.5 py-2 text-sm text-ink"
            value={status}
            onChange={(e) => setStatus(e.target.value as PlaceCandidateStatusFilter)}
          >
            <option value="unresolved">Unresolved</option>
            <option value="low_confidence">Low confidence</option>
            <option value="open">Open (both)</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-quiet">
          Source post id
          <input
            className="rounded-sm border border-border bg-bg px-2.5 py-2 text-sm text-ink"
            value={sourcePostId}
            onChange={(e) => setSourcePostId(e.target.value)}
            placeholder="instagram:…"
          />
        </label>
        <div className="flex items-end">
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </form>

      {error && <p className="banner-error">{error}</p>}

      {loadedOnce && !loading && candidates.length === 0 && !error && (
        <p className="m-0 text-sm text-quiet">No candidates match these filters.</p>
      )}

      {candidates.length > 0 && (
        <div>
          <p className="m-0 text-sm text-quiet">{candidates.length} candidate(s)</p>
          <ul className="mt-3 grid list-none gap-3 p-0">
            {candidates.map((candidate) => (
              <li
                key={candidate.candidate_id}
                className="grid gap-3 rounded-md border border-border bg-surface-muted p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-base font-semibold text-ink">{candidate.place_name}</strong>
                  <span className={`locate-status locate-status-${candidate.status}`}>
                    {candidate.status}
                  </span>
                </div>
                <dl className="locate-compare-dl">
                  <div>
                    <dt>Source post</dt>
                    <dd>
                      <code className="font-mono text-[0.9em]">{candidate.source_post_id}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Hints</dt>
                    <dd>{regionLabel(candidate)}</dd>
                  </div>
                  {candidate.last_tried_at && (
                    <div>
                      <dt>Last tried</dt>
                      <dd>{candidate.last_tried_at}</dd>
                    </div>
                  )}
                  {candidate.resolved_place_id && (
                    <div>
                      <dt>Resolved place</dt>
                      <dd>
                        <code className="font-mono text-[0.9em]">{candidate.resolved_place_id}</code>
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

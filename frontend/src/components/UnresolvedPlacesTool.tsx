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
    <section className="admin-tool">
      <div className="admin-tool-header">
        <h2>Unresolved places</h2>
        <p>
          PlaceCandidates saved when v2/v3 locate fails or is low-confidence. Read-only view —
          retry via CLI (<code>--retry-place-candidates</code>) without re-fetching the reel.
        </p>
      </div>

      <form className="unresolved-places-filters" onSubmit={handleSubmit}>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PlaceCandidateStatusFilter)}
          >
            <option value="unresolved">Unresolved</option>
            <option value="low_confidence">Low confidence</option>
            <option value="open">Open (both)</option>
          </select>
        </label>
        <label>
          Source post id
          <input
            value={sourcePostId}
            onChange={(e) => setSourcePostId(e.target.value)}
            placeholder="instagram:…"
          />
        </label>
        <div className="unresolved-places-actions">
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </form>

      {error && <p className="banner-error">{error}</p>}

      {loadedOnce && !loading && candidates.length === 0 && !error && (
        <p className="unresolved-places-empty">No candidates match these filters.</p>
      )}

      {candidates.length > 0 && (
        <div className="unresolved-places-list">
          <p className="unresolved-places-count">{candidates.length} candidate(s)</p>
          <ul>
            {candidates.map((candidate) => (
              <li key={candidate.candidate_id} className="unresolved-places-item">
                <div className="unresolved-places-item-header">
                  <strong>{candidate.place_name}</strong>
                  <span className={`locate-status locate-status-${candidate.status}`}>
                    {candidate.status}
                  </span>
                </div>
                <dl className="locate-compare-dl">
                  <div>
                    <dt>Source post</dt>
                    <dd>
                      <code>{candidate.source_post_id}</code>
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
                        <code>{candidate.resolved_place_id}</code>
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

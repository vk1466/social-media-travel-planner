import { useState, type FormEvent } from "react";

import { debugLocate, type LocateDebugInput, type LocateDebugResult, type LocateDebugSide } from "../api";

function emptyInput(): LocateDebugInput {
  return {
    place_name: "",
    city: "",
    state_province: "",
    country: "",
    parent_place_name: "",
    latitude: null,
    longitude: null,
  };
}

function ResultCard({ side }: { side: LocateDebugSide }) {
  const location = side.location;
  return (
    <article className="locate-compare-side">
      <header className="locate-compare-side-header">
        <h3>Result</h3>
        <span className={`locate-status locate-status-${side.status}`}>{side.status}</span>
      </header>
      {location ? (
        <dl className="locate-compare-dl">
          <div>
            <dt>Name</dt>
            <dd>{location.display_name}</dd>
          </div>
          <div>
            <dt>Coords</dt>
            <dd>
              {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
            </dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>
              {[location.city, location.state_province, location.country].filter(Boolean).join(", ") ||
                "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="locate-compare-empty">No pin</p>
      )}
      {side.match_confidence != null && (
        <p className="locate-compare-meta">
          Confidence {side.match_confidence.toFixed(2)}
          {side.category ? ` · ${side.category}` : ""}
          {side.provider ? ` · ${side.provider}` : ""}
        </p>
      )}
      {side.queries_tried.length > 0 && (
        <details className="locate-compare-details">
          <summary>Queries tried ({side.queries_tried.length})</summary>
          <ol>
            {side.queries_tried.map((query) => (
              <li key={query}>{query}</li>
            ))}
          </ol>
        </details>
      )}
      {side.notes.length > 0 && (
        <details className="locate-compare-details">
          <summary>Notes ({side.notes.length})</summary>
          <ul>
            {side.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export function LocateDebugTool() {
  const [input, setInput] = useState<LocateDebugInput>(emptyInput);
  const [result, setResult] = useState<LocateDebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof LocateDebugInput, value: string) => {
    setInput((prev) => {
      if (field === "latitude" || field === "longitude") {
        const trimmed = value.trim();
        return {
          ...prev,
          [field]: trimmed === "" ? null : Number(trimmed),
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.place_name.trim()) {
      setError("Place name is required");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const payload: LocateDebugInput = {
        place_name: input.place_name.trim(),
        city: input.city?.toString().trim() || null,
        state_province: input.state_province?.toString().trim() || null,
        country: input.country?.toString().trim() || null,
        parent_place_name: input.parent_place_name?.toString().trim() || null,
        latitude:
          input.latitude === null || input.latitude === undefined || Number.isNaN(input.latitude)
            ? null
            : input.latitude,
        longitude:
          input.longitude === null || input.longitude === undefined || Number.isNaN(input.longitude)
            ? null
            : input.longitude,
      };
      const next = await debugLocate(payload);
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Locate failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-tool">
      <div className="admin-tool-header">
        <h2>Locate place</h2>
        <p>
          Run locate on a place mention. Read-only — does not write to the place library. Geocoding
          is rate-limited; expect several seconds.
        </p>
      </div>

      <form className="locate-compare-form" onSubmit={handleSubmit}>
        <label>
          Place name
          <input
            value={input.place_name}
            onChange={(e) => update("place_name", e.target.value)}
            placeholder="Misery Ridge"
            required
          />
        </label>
        <label>
          Parent place
          <input
            value={input.parent_place_name ?? ""}
            onChange={(e) => update("parent_place_name", e.target.value)}
            placeholder="Smith Rock State Park"
          />
        </label>
        <label>
          City
          <input value={input.city ?? ""} onChange={(e) => update("city", e.target.value)} />
        </label>
        <label>
          State / province
          <input
            value={input.state_province ?? ""}
            onChange={(e) => update("state_province", e.target.value)}
            placeholder="Oregon"
          />
        </label>
        <label>
          Country
          <input
            value={input.country ?? ""}
            onChange={(e) => update("country", e.target.value)}
            placeholder="USA"
          />
        </label>
        <label>
          Latitude
          <input
            value={input.latitude ?? ""}
            onChange={(e) => update("latitude", e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          Longitude
          <input
            value={input.longitude ?? ""}
            onChange={(e) => update("longitude", e.target.value)}
            inputMode="decimal"
          />
        </label>
        <div className="locate-compare-actions">
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Locating…" : "Locate"}
          </button>
        </div>
      </form>

      {error && <p className="banner-error">{error}</p>}

      {result && (
        <div className="locate-compare-results">
          <div className="locate-compare-grid">
            <ResultCard side={result.result} />
          </div>
        </div>
      )}
    </section>
  );
}

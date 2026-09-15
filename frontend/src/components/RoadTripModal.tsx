import { useCallback, useEffect, useState } from "react";
import {
  Place,
  RouteOptimizationResult,
  RouteStopInput,
  optimizeRoute,
} from "../api";
import "./road-trip-modal.css";

export interface RoadTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTitle?: string;
  postId?: string;
  places: Place[];
}

type Strategy = "shortest" | "first" | "loop";
type TravelMode = "driving" | "walking" | "bicycling";

export function RoadTripModal({
  isOpen,
  onClose,
  postTitle,
  postId,
  places,
}: RoadTripModalProps) {
  const [strategy, setStrategy] = useState<Strategy>("shortest");
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");
  const [cache, setCache] = useState<Record<string, RouteOptimizationResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter valid places with coordinates
  const validPlaces = places.filter(
    (p) => p.location?.latitude != null && p.location?.longitude != null,
  );

  const cacheKey = `${strategy}-${travelMode}`;
  const currentResult = cache[cacheKey];

  const fetchOptimization = useCallback(
    async (strat: Strategy, mode: TravelMode) => {
      const key = `${strat}-${mode}`;
      if (cache[key]) return;

      setLoading(true);
      setError(null);

      try {
        const stops: RouteStopInput[] = validPlaces.map((p) => ({
          stop_id: p.place_id,
          name: p.display_name,
          latitude: p.location.latitude!,
          longitude: p.location.longitude!,
          category: p.category,
          address: [p.location.city, p.location.state_province, p.location.country]
            .filter(Boolean)
            .join(", "),
        }));

        const res = await optimizeRoute({
          stops,
          place_ids: places.map((p) => p.place_id),
          post_id: postId,
          start_mode: strat === "first" ? "fixed" : "any",
          round_trip: strat === "loop",
          travel_mode: mode,
        });

        setCache((prev) => ({ ...prev, [key]: res }));
      } catch (err: any) {
        console.error("Failed to optimize route:", err);
        setError(err.message || "Could not optimize route");
      } finally {
        setLoading(false);
      }
    },
    [cache, places, postId, validPlaces],
  );

  useEffect(() => {
    if (!isOpen || validPlaces.length === 0) return;
    fetchOptimization(strategy, travelMode);
  }, [isOpen, strategy, travelMode, fetchOptimization, validPlaces.length]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (currentResult?.google_maps_url) {
      navigator.clipboard.writeText(currentResult.google_maps_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortestRes = cache[`shortest-${travelMode}`];
  const firstRes = cache[`first-${travelMode}`];
  const loopRes = cache[`loop-${travelMode}`];

  return (
    <div
      className="roadtrip-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="roadtrip-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadtrip-dialog-title"
      >
        {/* Header */}
        <div className="roadtrip-modal-header">
          <div className="roadtrip-header-left">
            <div className="roadtrip-icon-badge">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div>
              <h3 id="roadtrip-dialog-title" className="roadtrip-modal-title">
                Distance-Optimized Road Trip
              </h3>
              <p className="roadtrip-modal-subtitle">
                {postTitle || `${validPlaces.length} stops in Amsterdam`} · Powered by Google OR-Tools
              </p>
            </div>
          </div>
          <button
            type="button"
            className="roadtrip-modal-close"
            onClick={onClose}
            aria-label="Close road trip planner"
          >
            ✕
          </button>
        </div>

        {/* Strategy Selector Tabs */}
        <div className="roadtrip-strategy-bar">
          <button
            type="button"
            className={`roadtrip-strategy-tab ${strategy === "shortest" ? "active" : ""}`}
            onClick={() => setStrategy("shortest")}
          >
            <div className="roadtrip-tab-top">
              <span className="roadtrip-tab-title">Shortest Distance</span>
              <span className="roadtrip-best-badge">Best</span>
            </div>
            <div className="roadtrip-tab-metric">
              {shortestRes
                ? `${shortestRes.total_distance_km} km · saves ${shortestRes.savings_percent}%`
                : "Optimal start"}
            </div>
          </button>

          <button
            type="button"
            className={`roadtrip-strategy-tab ${strategy === "first" ? "active" : ""}`}
            onClick={() => setStrategy("first")}
          >
            <div className="roadtrip-tab-top">
              <span className="roadtrip-tab-title">Start at Stop #1</span>
            </div>
            <div className="roadtrip-tab-metric">
              {firstRes
                ? `${firstRes.total_distance_km} km · saves ${firstRes.savings_percent}%`
                : "Fixed origin"}
            </div>
          </button>

          <button
            type="button"
            className={`roadtrip-strategy-tab ${strategy === "loop" ? "active" : ""}`}
            onClick={() => setStrategy("loop")}
          >
            <div className="roadtrip-tab-top">
              <span className="roadtrip-tab-title">Round Trip Loop</span>
            </div>
            <div className="roadtrip-tab-metric">
              {loopRes
                ? `${loopRes.total_distance_km} km loop`
                : "Return to start"}
            </div>
          </button>
        </div>

        {/* Controls Bar: Travel Mode + Savings */}
        <div className="roadtrip-controls-bar">
          <div className="roadtrip-travel-modes">
            <button
              type="button"
              className={`roadtrip-mode-btn ${travelMode === "driving" ? "active" : ""}`}
              onClick={() => setTravelMode("driving")}
            >
              🚗 Drive
            </button>
            <button
              type="button"
              className={`roadtrip-mode-btn ${travelMode === "walking" ? "active" : ""}`}
              onClick={() => setTravelMode("walking")}
            >
              🚶 Walk
            </button>
            <button
              type="button"
              className={`roadtrip-mode-btn ${travelMode === "bicycling" ? "active" : ""}`}
              onClick={() => setTravelMode("bicycling")}
            >
              🚲 Bike
            </button>
          </div>

          {currentResult && currentResult.savings_meters > 0 && (
            <div className="roadtrip-savings-pill">
              <span>⚡ Saved {(currentResult.savings_meters / 1000).toFixed(1)} km</span>
              <span>({currentResult.savings_percent}%)</span>
            </div>
          )}
        </div>

        {/* Metric Summary Row */}
        {currentResult && (
          <div className="roadtrip-metrics-row">
            <div className="roadtrip-metric-item">
              <span className="roadtrip-metric-val">
                {currentResult.total_distance_km} km
              </span>
              <span className="roadtrip-metric-lbl">Total Distance</span>
            </div>
            <div className="roadtrip-metric-divider" />
            <div className="roadtrip-metric-item">
              <span className="roadtrip-metric-val">
                {currentResult.ordered_stops.length}
              </span>
              <span className="roadtrip-metric-lbl">Total Stops</span>
            </div>
            <div className="roadtrip-metric-divider" />
            <div className="roadtrip-metric-item">
              <span className="roadtrip-metric-val">
                ~
                {travelMode === "walking"
                  ? Math.round((currentResult.total_distance_meters / 80))
                  : Math.max(
                      10,
                      Math.round((currentResult.total_distance_meters / 450) + currentResult.ordered_stops.length * 2),
                    )}{" "}
                min
              </span>
              <span className="roadtrip-metric-lbl">Est. Travel Time</span>
            </div>
          </div>
        )}

        {/* Stops Scroll List */}
        <div className="roadtrip-stops-scroll">
          {loading && !currentResult ? (
            <div className="roadtrip-loading-box">
              <div className="roadtrip-spinner" />
              <p>Computing optimal route with OR-Tools...</p>
            </div>
          ) : error ? (
            <div className="roadtrip-loading-box" style={{ color: "#e57373" }}>
              <p>⚠️ {error}</p>
            </div>
          ) : currentResult ? (
            <div className="roadtrip-stops-list">
              {currentResult.ordered_stops.map((stop, index) => {
                const leg = currentResult.legs[index];
                const isLast = index === currentResult.ordered_stops.length - 1;

                return (
                  <div key={`${stop.stop_id}-${index}`} className="roadtrip-stop-row">
                    <div className="roadtrip-pin-col">
                      <div className="roadtrip-pin-number">{index + 1}</div>
                      {!isLast && <div className="roadtrip-leg-line" />}
                    </div>
                    <div className="roadtrip-stop-body">
                      <div className="roadtrip-stop-header">
                        <span className="roadtrip-stop-name">{stop.name}</span>
                        {stop.category && (
                          <span className="roadtrip-stop-category">
                            {stop.category}
                          </span>
                        )}
                      </div>
                      {stop.address && (
                        <div className="roadtrip-stop-address">{stop.address}</div>
                      )}
                      {leg && (
                        <div className="roadtrip-leg-info">
                          <span>
                            ↓{" "}
                            {leg.distance_meters < 1000
                              ? `${leg.distance_meters} m`
                              : `${(leg.distance_meters / 1000).toFixed(1)} km`}
                          </span>
                          <span>·</span>
                          <span>
                            {travelMode === "walking"
                              ? `${leg.est_walking_minutes} min walk`
                              : `${leg.est_driving_minutes} min drive`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="roadtrip-modal-footer">
          <button
            type="button"
            className="roadtrip-copy-btn"
            onClick={handleCopy}
            disabled={!currentResult}
          >
            {copied ? "✓ Copied Link" : "Copy Maps Link"}
          </button>

          <div className="roadtrip-footer-actions">
            {currentResult && (
              <a
                href={currentResult.apple_maps_url}
                target="_blank"
                rel="noreferrer"
                className="roadtrip-apple-btn"
                title="Open in Apple Maps"
              >
                Apple Maps ↗
              </a>
            )}
            {currentResult && (
              <a
                href={currentResult.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="roadtrip-gmaps-btn"
                title="Open optimized multi-stop route in Google Maps"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Open in Google Maps ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

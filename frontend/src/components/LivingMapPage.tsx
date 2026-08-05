import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { UserButton } from "@clerk/react";

import {
  fetchActiveJob,
  fetchPlaceDetail,
  fetchPlaces,
  fetchPosts,
  fetchVisits,
  startIngest,
  type Place,
  type PlaceDetail,
  type SavedPost,
  type VisitDetail,
} from "../api";
import { categoryLabel } from "../categoryLabels";
import { useJob } from "../hooks/useJob";
import {
  DEFAULT_LIVING_MAP_THEME_ID,
  LIVING_MAP_THEMES,
  getAdjacentLivingMapTheme,
  getLivingMapTheme,
  getLivingMapThemeIndex,
  livingMapThemeVars,
  type LivingMapTheme,
} from "../livingMapThemes";
import { mappablePlaces } from "../placeMapUtils";
import { getPlatformLabel, getPostTitle } from "../postDisplayUtils";

import "leaflet/dist/leaflet.css";
import "../living-map.css";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseLinks(text: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (isLikelyUrl(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  }
  return { valid, invalid };
}

function locationLine(place: Place): string {
  const { city, state_province: stateProvince, country, continent } = place.location;
  return [city, stateProvince, country, continent].filter(Boolean).join(" · ");
}

function formatVisitWhen(visit: VisitDetail["visit"]): string {
  const from = visit.visited_from?.slice(0, 10);
  const to = visit.visited_to?.slice(0, 10);
  if (from && to && from !== to) {
    return `${from} → ${to}`;
  }
  return from || to || visit.created_at?.slice(0, 10) || "Visit logged";
}

function pinIcon(visited: boolean): L.DivIcon {
  return L.divIcon({
    className: "living-map-pin-icon",
    html: `<div class="living-map-pin-mark ${visited ? "visited" : "dream"}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -14],
  });
}

function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function TileFilter({ filter }: { filter?: string }) {
  const map = useMap();

  useLayoutEffect(() => {
    const pane = map.getPane("tilePane");
    if (!pane) {
      return;
    }
    pane.style.setProperty("filter", filter && filter.length > 0 ? filter : "none");
    return () => {
      pane.style.removeProperty("filter");
    };
  }, [map, filter]);

  return null;
}

function FlyToPlace({ place }: { place: Place | null }) {
  const map = useMap();

  useEffect(() => {
    if (!place?.location.latitude || !place.location.longitude) {
      return;
    }
    map.flyTo([place.location.latitude, place.location.longitude], Math.max(map.getZoom(), 5), {
      duration: 0.8,
    });
  }, [map, place]);

  return null;
}

function FitWorld({ places }: { places: Place[] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || places.length === 0) {
      return;
    }
    fittedRef.current = true;
    if (places.length === 1) {
      const { latitude, longitude } = places[0].location;
      map.setView([latitude!, longitude!], 5);
      return;
    }
    const bounds = L.latLngBounds(
      places.map((place) => [place.location.latitude!, place.location.longitude!] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 6 });
  }, [map, places]);

  return null;
}

function DetailedBasemap({ theme }: { theme: LivingMapTheme }) {
  const showTiles = theme.land === "tiles" || theme.land === "hybrid";
  const showCountries = theme.land === "countries" || theme.land === "hybrid";
  const tileOpacity = theme.tiles.opacity ?? 1;

  return (
    <>
      {showTiles && tileOpacity > 0 && (
        <>
          <TileLayer
            key={`${theme.id}-tiles`}
            attribution={theme.tiles.attribution}
            url={theme.tiles.url}
            subdomains={theme.tiles.subdomains}
            maxZoom={19}
            opacity={tileOpacity}
          />
          <TileFilter filter={theme.tiles.filter} />
        </>
      )}
      {showCountries && <ThemeCountries theme={theme} />}
    </>
  );
}

function ThemeCountries({ theme }: { theme: LivingMapTheme }) {
  const [geojson, setGeojson] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/gh/holtzy/D3-graph-gallery@master/DATA/world.geojson",
        );
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as object;
        if (!cancelled) {
          setGeojson(data);
        }
      } catch {
        // pins still work without country polygons
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!geojson) {
    return null;
  }

  const fillOpacity = theme.land === "hybrid" ? 0.42 : 0.94;

  return (
    <GeoJSON
      key={`${theme.id}-countries`}
      data={geojson as GeoJSON.GeoJsonObject}
      style={() => ({
        fillColor: theme.countryFill,
        fillOpacity,
        color: theme.countryStroke,
        weight: theme.land === "hybrid" ? 0.6 : 0.85,
        opacity: 1,
      })}
      interactive={false}
    />
  );
}

interface LivingMapPageProps {
  authReady: boolean;
  /** When set, locks the theme (demo routes). Otherwise reads :themeId or default. */
  themeId?: string;
  demoMode?: boolean;
}

export function LivingMapPage({
  authReady,
  themeId: themeIdProp,
  demoMode = false,
}: LivingMapPageProps) {
  const navigate = useNavigate();
  const params = useParams<{ themeId?: string; placeId?: string }>();
  const theme = getLivingMapTheme(themeIdProp ?? params.themeId ?? DEFAULT_LIVING_MAP_THEME_ID);
  const themeIndex = getLivingMapThemeIndex(theme.id);
  const routePlaceId = params.placeId;
  const mapBase = demoMode ? `/map/demos/${theme.id}` : "/map";
  const prevTheme = demoMode ? getAdjacentLivingMapTheme(theme.id, -1) : null;
  const nextTheme = demoMode ? getAdjacentLivingMapTheme(theme.id, 1) : null;

  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<VisitDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [linkText, setLinkText] = useState("");
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PlaceDetail | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const { job, error: jobError } = useJob(jobId);

  const visitedIds = useMemo(
    () => new Set(visits.map((item) => item.visit.place_id)),
    [visits],
  );
  const mapped = useMemo(() => mappablePlaces(places), [places]);
  const selectedPlace =
    selectedDetail?.place ??
    mapped.find((place) => place.place_id === routePlaceId) ??
    null;

  const refreshLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const [nextPosts, nextPlaces, nextVisits] = await Promise.all([
        fetchPosts(),
        fetchPlaces(),
        fetchVisits(),
      ]);
      setPosts(nextPosts);
      setPlaces(nextPlaces);
      setVisits(nextVisits);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    void refreshLibrary();
  }, [authReady, refreshLibrary]);

  useEffect(() => {
    if (!authReady || jobId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const active = await fetchActiveJob();
        if (!cancelled && active?.status === "running") {
          setJobId(active.job_id);
        }
      } catch {
        // no active job
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, jobId]);

  useEffect(() => {
    if (job?.status === "done") {
      void refreshLibrary();
      setToast({ message: "Pinned to your atlas" });
      const timer = window.setTimeout(() => setToast(null), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [job?.status, refreshLibrary]);

  useEffect(() => {
    if (!routePlaceId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setSheetLoading(true);
    void (async () => {
      try {
        const detail = await fetchPlaceDetail(routePlaceId);
        if (!cancelled) {
          setSelectedDetail(detail);
        }
      } catch {
        if (!cancelled) {
          const fallback = places.find((place) => place.place_id === routePlaceId);
          setSelectedDetail(
            fallback
              ? { place: fallback, source_posts: [], children: [] }
              : null,
          );
        }
      } finally {
        if (!cancelled) {
          setSheetLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routePlaceId, places]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && routePlaceId) {
        navigate(mapBase);
        return;
      }
      if (!demoMode || routePlaceId) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(`/map/demos/${getAdjacentLivingMapTheme(theme.id, -1).id}`);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(`/map/demos/${getAdjacentLivingMapTheme(theme.id, 1).id}`);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate, routePlaceId, mapBase, demoMode, theme.id]);

  const openPlace = (place: Place) => {
    navigate(`${mapBase}/${place.place_id}`);
  };

  const closeSheet = () => {
    navigate(mapBase);
  };

  const handleIngest = async () => {
    const { valid, invalid } = parseLinks(linkText);
    if (invalid.length > 0) {
      setToast({ message: `Not a valid URL: ${invalid[0]}`, error: true });
      return;
    }
    if (valid.length === 0) {
      return;
    }
    try {
      const nextJobId = await startIngest(valid, false);
      setJobId(nextJobId);
      setLinkText("");
      setToast({ message: "Adding to your atlas…" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Failed to start ingest",
        error: true,
      });
    }
  };

  const placeVisits = useMemo(() => {
    if (!selectedPlace) {
      return [];
    }
    return visits.filter((item) => item.visit.place_id === selectedPlace.place_id);
  }, [selectedPlace, visits]);

  const sheetOpen = Boolean(routePlaceId);
  const isVisited = selectedPlace ? visitedIds.has(selectedPlace.place_id) : false;
  const ingestRunning = job?.status === "running";
  const rootRef = useRef<HTMLDivElement>(null);

  // Apply theme tokens before paint so gradients/filters are visible immediately.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const vars = livingMapThemeVars(theme);
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
  }, [theme]);

  return (
    <div
      ref={rootRef}
      className={`living-map living-map--${theme.mode}`}
      data-theme={theme.id}
      data-layout={theme.layout}
      data-land={theme.land}
    >
      <div className="living-map-stage">
        {theme.layout === "rail" && (
          <div className="living-map-rail-label">
            <h2>{theme.name}</h2>
            <p>{theme.thesis}</p>
          </div>
        )}
        <div className="living-map-canvas">
          <MapContainer
            key={theme.id}
            center={[20, 10]}
            zoom={2}
            minZoom={2}
            maxZoom={12}
            worldCopyJump
            scrollWheelZoom
            className="living-map-leaflet"
          >
            <DetailedBasemap theme={theme} />
            <InvalidateSize />
            {!routePlaceId && <FitWorld places={mapped} />}
            <FlyToPlace place={selectedPlace} />
            {mapped.map((place) => {
              const visited = visitedIds.has(place.place_id);
              return (
                <Marker
                  key={place.place_id}
                  position={[place.location.latitude!, place.location.longitude!]}
                  icon={pinIcon(visited)}
                  eventHandlers={{ click: () => openPlace(place) }}
                  opacity={
                    routePlaceId && routePlaceId !== place.place_id ? 0.55 : 1
                  }
                >
                  <Tooltip direction="top" offset={[0, -12]}>
                    {place.display_name}
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>
          <div className="living-map-wash" aria-hidden="true" />
          <div className="living-map-vignette" aria-hidden="true" />
        </div>

        {demoMode && prevTheme && nextTheme && (
          <div className="living-map-theme-nav" role="navigation" aria-label="Theme demos">
            <Link
              className="living-map-theme-arrow"
              to={`/map/demos/${prevTheme.id}`}
              aria-label={`Previous theme: ${prevTheme.name}`}
              title={prevTheme.name}
            >
              ←
            </Link>
            <span className="living-map-theme-count">
              {themeIndex + 1} / {LIVING_MAP_THEMES.length}
            </span>
            <Link
              className="living-map-theme-arrow"
              to={`/map/demos/${nextTheme.id}`}
              aria-label={`Next theme: ${nextTheme.name}`}
              title={nextTheme.name}
            >
              →
            </Link>
          </div>
        )}

        {loading && <div className="living-map-loading">Loading your atlas…</div>}

        <div className="living-map-hud-top">
          <div className="living-map-brand">
            <h1>Wanderfile</h1>
            <p>
              {theme.layout === "billboard" || theme.layout === "ribbon"
                ? theme.thesis
                : "Your curated atlas on a living world map."}
            </p>
            <span className="living-map-theme-chip">{theme.name}</span>
            <div className="living-map-theme-meta">
              <span className="living-map-theme-pill">{theme.layout}</span>
              <span className="living-map-theme-pill">{theme.land}</span>
            </div>
            <div className="living-map-brand-links">
              <Link className="living-map-brand-link" to="/map/demos">
                All demos
              </Link>
              <Link className="living-map-brand-link" to="/posts">
                Classic library →
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div className="living-map-stats" aria-label="Library stats">
              <div>
                <strong>{posts.length}</strong>
                <span>Links</span>
              </div>
              <div>
                <strong>{places.length}</strong>
                <span>Places</span>
              </div>
              <div>
                <strong>{visits.length}</strong>
                <span>Visits</span>
              </div>
            </div>
            {clerkEnabled && (
              <div style={{ pointerEvents: "auto" }}>
                <UserButton />
              </div>
            )}
          </div>
        </div>

        <div className="living-map-ingest">
          <h2>Add inspiration</h2>
          <p className="living-map-hint">Paste travel links — they land as new pins on the map.</p>
          <textarea
            value={linkText}
            onChange={(event) => setLinkText(event.target.value)}
            placeholder="https://instagram.com/reel/…"
            disabled={ingestRunning}
            aria-label="Paste travel links"
          />
          <div className="living-map-ingest-actions">
            <button type="button" onClick={() => void handleIngest()} disabled={ingestRunning}>
              {ingestRunning ? "Adding…" : "Add to map"}
            </button>
            {toast && (
              <span className={`living-map-toast show${toast.error ? " error" : ""}`}>
                {toast.message}
              </span>
            )}
            {jobError && !toast && (
              <span className="living-map-toast show error">{jobError}</span>
            )}
          </div>
          {ingestRunning && job && (
            <p className="living-map-job">
              Ingest running · {job.counts.saved + (job.counts.linked ?? 0)} saved ·{" "}
              {job.counts.pending + job.counts.fetching} remaining
            </p>
          )}
        </div>

        <div className="living-map-legend" aria-hidden="true">
          <span>
            <i className="living-map-dot visited" /> Visited
          </span>
          <span>
            <i className="living-map-dot dream" /> Inspiration
          </span>
        </div>

        <aside
          className={`living-map-sheet${sheetOpen ? " open" : ""}`}
          aria-hidden={!sheetOpen}
        >
          <button
            className="living-map-sheet-close"
            type="button"
            aria-label="Close"
            onClick={closeSheet}
          >
            ×
          </button>
          <div className="living-map-sheet-head">
            <div className="living-map-meta">
              {selectedPlace
                ? [
                    locationLine(selectedPlace),
                    categoryLabel(selectedPlace.category),
                    `${selectedPlace.source_post_ids.length} mention${
                      selectedPlace.source_post_ids.length === 1 ? "" : "s"
                    }`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Place"}
            </div>
            <h3>{selectedPlace?.display_name ?? (sheetLoading ? "Loading…" : "Place")}</h3>
            {selectedPlace && (
              <span className={`living-map-status ${isVisited ? "visited" : "dream"}`}>
                {isVisited ? "Visited" : "On your list"}
              </span>
            )}
          </div>
          <div className="living-map-sheet-body">
            {sheetLoading && <p className="living-map-empty">Loading place details…</p>}
            {!sheetLoading && selectedPlace && (
              <>
                {placeVisits.length > 0 && (
                  <>
                    <h4>Your visits</h4>
                    {placeVisits.map((item) => (
                      <div className="living-map-visit-note" key={item.visit.visit_id}>
                        <strong>{formatVisitWhen(item.visit)}</strong>
                        {item.visit.notes ? ` — ${item.visit.notes}` : ""}
                      </div>
                    ))}
                  </>
                )}
                <h4>
                  Source posts ({selectedDetail?.source_posts.length ?? 0})
                </h4>
                {(selectedDetail?.source_posts.length ?? 0) === 0 ? (
                  <p className="living-map-empty">No linked posts for this place yet.</p>
                ) : (
                  selectedDetail?.source_posts.map((post) => (
                    <a
                      key={post.post_id}
                      className="living-map-post-card"
                      href={post.post_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="living-map-platform">
                        {getPlatformLabel(post)}
                        {post.posted_at ? ` · ${post.posted_at.slice(0, 10)}` : ""}
                      </div>
                      <strong>{getPostTitle(post)}</strong>
                      {post.caption && (
                        <p>
                          {post.caption.length > 140
                            ? `${post.caption.slice(0, 137)}…`
                            : post.caption}
                        </p>
                      )}
                    </a>
                  ))
                )}
                {(selectedDetail?.children.length ?? 0) > 0 && (
                  <>
                    <h4>Nearby / nested</h4>
                    {selectedDetail?.children.map((child) => (
                      <button
                        key={child.place_id}
                        type="button"
                        className="living-map-post-card"
                        style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        onClick={() => openPlace(child)}
                      >
                        <strong>{child.display_name}</strong>
                        <p>{locationLine(child) || categoryLabel(child.category)}</p>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

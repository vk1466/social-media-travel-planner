import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

import type { SavedPost } from "../api";
import {
  CARTO_BASEMAP_ATTR,
  cartoVoyagerTileUrl,
} from "../maps";
import { leafPlaces, type AtlasNode, type AtlasPlace } from "../placeAtlasModel";
import { visualForCategory } from "../placeCategoryVisuals";
import { getPostTitle } from "../postDisplayUtils";

import "leaflet/dist/leaflet.css";

function visualFor(place: AtlasPlace) {
  return visualForCategory(place.category, place.categoryTone);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  })[character]!);
}

const categoryIconCache = new Map<string, L.DivIcon>();

function categoryIcon(
  place: AtlasPlace,
  active: boolean,
  isHighlighted: boolean,
  isDimmed: boolean,
  showLabel: boolean,
): L.DivIcon {
  const visual = visualFor(place);
  const cacheKey = `${place.placeId}|${active ? 1 : 0}|${isHighlighted ? 1 : 0}|${isDimmed ? 1 : 0}|${showLabel ? 1 : 0}|${visual.color}`;
  const cached = categoryIconCache.get(cacheKey);
  if (cached) return cached;
  const classes = [
    "saved-map-marker",
    active ? "is-active" : "",
    isHighlighted ? "is-reel-highlighted" : "",
    isDimmed ? "is-reel-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const icon = L.divIcon({
    className: "saved-map-marker-host",
    html: `<span class="${classes}" style="--marker-color:${visual.color}"><i>${visual.icon}</i>${showLabel ? `<b>${escapeHtml(place.categoryLabel)}</b>` : ""}</span>`,
    iconSize: showLabel ? [112, 34] : active || isHighlighted ? [34, 34] : [28, 28],
    iconAnchor: showLabel ? [17, 17] : active || isHighlighted ? [17, 17] : [14, 14],
    popupAnchor: [0, -18],
  });
  categoryIconCache.set(cacheKey, icon);
  return icon;
}

const AtlasMarkers = memo(function AtlasMarkers({
  places,
  selectedPlaceId,
  highlightedPlaceIds,
  showLabels,
  onSelectPlace,
  onOpenPlace,
}: {
  places: AtlasPlace[];
  selectedPlaceId: string | null;
  highlightedPlaceIds: Set<string>;
  showLabels: boolean;
  onSelectPlace: (placeId: string) => void;
  onOpenPlace: (placeId: string) => void;
}) {
  const hasHighlights = highlightedPlaceIds.size > 0;
  return (
    <>
      {places.map((place) => {
        const isHighlighted = highlightedPlaceIds.has(place.placeId);
        const isDimmed = hasHighlights && !isHighlighted;
        return (
          <Marker
            key={place.placeId}
            position={[place.lat as number, place.lng as number]}
            icon={categoryIcon(
              place,
              selectedPlaceId === place.placeId,
              isHighlighted,
              isDimmed,
              showLabels,
            )}
            zIndexOffset={isHighlighted ? 800 : 0}
            eventHandlers={{ click: () => onSelectPlace(place.placeId) }}
          >
            <Tooltip direction="top" offset={[0, -14]}>
              {place.name} · {place.categoryLabel}
            </Tooltip>
            <Popup>
              <div className="saved-place-popup-card">
                {place.imageUrl && (
                  <div
                    className="saved-place-popup-photo"
                    style={{ backgroundImage: `url(${place.imageUrl})` }}
                  />
                )}
                <small>
                  <i
                    style={{ background: visualFor(place).color }}
                    dangerouslySetInnerHTML={{ __html: visualFor(place).icon }}
                  />
                  {place.categoryLabel} · {place.saves} saved post
                  {place.saves === 1 ? "" : "s"}
                </small>
                <strong>{place.name}</strong>
                <span>
                  {[place.city, place.state, place.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
                <p>
                  {place.tips[0] ??
                    place.details[0] ??
                    "Saved from your processed travel posts."}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenPlace(place.placeId)}
                >
                  Open full place →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});

function FitPlaces({ places }: { places: AtlasPlace[] }) {
  const map = useMap();
  const key = places.map((place) => place.placeId).join("|");
  useEffect(() => {
    const coords = places.map(
      (place) => [place.lat as number, place.lng as number] as [number, number],
    );
    if (coords.length === 0) map.setView([20, 0], 2);
    else if (coords.length === 1) map.setView(coords[0], 12);
    else map.fitBounds(L.latLngBounds(coords), { padding: [56, 56], maxZoom: 12 });
  }, [key, map]);
  return null;
}

function FlyToReel({
  reelPlaces,
  triggerKey,
}: {
  reelPlaces: AtlasPlace[];
  triggerKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (triggerKey === 0 || reelPlaces.length === 0) return;
    const coords = reelPlaces.map(
      (p) => [p.lat as number, p.lng as number] as [number, number],
    );
    if (coords.length === 1) {
      map.flyTo(coords[0], 13, { duration: 0.8 });
    } else {
      map.flyToBounds(L.latLngBounds(coords), {
        padding: [80, 80],
        maxZoom: 13,
        duration: 0.8,
      });
    }
  }, [reelPlaces, triggerKey, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function ViewportReporter({ onChange }: { onChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMap();
  useEffect(() => {
    const report = () => onChange(map.getBounds());
    report();
    map.on("moveend zoomend", report);
    return () => {
      map.off("moveend zoomend", report);
    };
  }, [map, onChange]);
  return null;
}

interface AtlasMapPanelProps {
  scope: AtlasNode;
  posts: SavedPost[];
  onOpenNode: (node: AtlasNode) => void;
  onOpenPlace: (placeId: string) => void;
  onNavigateToPost?: (platform: string, postId: string) => void;
}

export function AtlasMapPanel({
  scope,
  posts,
  onOpenNode,
  onOpenPlace,
  onNavigateToPost,
}: AtlasMapPanelProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [flyTriggerKey, setFlyTriggerKey] = useState(0);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const places = useMemo(
    () => leafPlaces(scope).filter((place) => place.lat !== null && place.lng !== null),
    [scope],
  );
  const rankedPlaces = useMemo(
    () => [...places].sort((a, b) => b.saves - a.saves || a.name.localeCompare(b.name)),
    [places],
  );
  const postsById = useMemo(() => new Map(posts.map((post) => [post.post_id, post])), [posts]);

  // Reels related to the places present in the current map view
  const photoEntries = useMemo(() => {
    const visiblePlaces = mapBounds
      ? places.filter((place) =>
          mapBounds.contains([place.lat as number, place.lng as number]),
        )
      : places;
    const uniquePosts = new Map<
      string,
      { place: AtlasPlace; post: SavedPost; reelPlacesCount: number }
    >();
    for (const place of visiblePlaces) {
      for (const postId of place.sourcePostIds) {
        const post = postsById.get(postId);
        if (post && !uniquePosts.has(post.post_id)) {
          const reelPlacesCount = places.filter((p) =>
            p.sourcePostIds.includes(post.post_id),
          ).length;
          uniquePosts.set(post.post_id, { place, post, reelPlacesCount });
        }
      }
    }
    return Array.from(uniquePosts.values()).slice(0, 20);
  }, [mapBounds, places, postsById]);

  const selectedReelPlaces = useMemo(() => {
    if (!selectedPostId) return [];
    return places.filter((p) => p.sourcePostIds.includes(selectedPostId));
  }, [places, selectedPostId]);

  const highlightedPlaceIds = useMemo(() => {
    if (!selectedPostId) return new Set<string>();
    return new Set(selectedReelPlaces.map((p) => p.placeId));
  }, [selectedReelPlaces, selectedPostId]);

  const selectedPlace =
    places.find((place) => place.placeId === selectedPlaceId) ??
    rankedPlaces[0] ??
    null;

  const selectPlace = useCallback((placeId: string) => setSelectedPlaceId(placeId), []);
  const reportBounds = useCallback((next: L.LatLngBounds) => {
    setMapBounds((current) => (current && current.equals(next) ? current : next));
  }, []);

  const handleReelClick = useCallback(
    (post: SavedPost) => {
      if (selectedPostId === post.post_id) {
        setSelectedPostId(null);
        return;
      }
      setSelectedPostId(post.post_id);
      setFlyTriggerKey((k) => k + 1);
    },
    [selectedPostId],
  );

  useEffect(() => {
    setSelectedPlaceId(null);
    setSelectedPostId(null);
    setMapBounds(null);
  }, [scope.key]);

  if (places.length === 0) {
    return (
      <p className="pl2-empty">
        No saved places with coordinates are available in this scope.
      </p>
    );
  }

  const showLabels = false;
  const mapStyle = {
    "--selected-color": selectedPlace ? visualFor(selectedPlace).color : "var(--muted)",
  } as CSSProperties;

  return (
    <section className="saved-map-view saved-map-view--photos" style={mapStyle}>
      <div className="saved-map-stage">
        {scope.children.some((node) => node.level !== "place") && (
          <div className="pl2-map-scope-rail" aria-label={`Destinations in ${scope.name}`}>
            <span>Zoom to</span>
            {scope.children
              .filter((node) => node.level !== "place")
              .slice(0, 12)
              .map((node) => (
                <button key={node.key} type="button" onClick={() => onOpenNode(node)}>
                  {node.name}
                  <small>{node.total}</small>
                </button>
              ))}
          </div>
        )}

        <MapContainer
          className="pl2-map-canvas"
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom
          worldCopyJump
          fadeAnimation={false}
          markerZoomAnimation={false}
        >
          <TileLayer
            url={cartoVoyagerTileUrl()}
            attribution={CARTO_BASEMAP_ATTR}
            subdomains="abcd"
            updateWhenZooming={false}
            keepBuffer={3}
          />
          <InvalidateSize />
          <ViewportReporter onChange={reportBounds} />
          <FitPlaces places={places} />
          <FlyToReel reelPlaces={selectedReelPlaces} triggerKey={flyTriggerKey} />
          <AtlasMarkers
            places={places}
            selectedPlaceId={selectedPlace?.placeId ?? null}
            highlightedPlaceIds={highlightedPlaceIds}
            showLabels={showLabels}
            onSelectPlace={selectPlace}
            onOpenPlace={onOpenPlace}
          />
        </MapContainer>

        {selectedPostId && (
          <div className="saved-map-post-filter">
            <span>
              Showing {selectedReelPlaces.length}{" "}
              {selectedReelPlaces.length === 1 ? "place" : "places"} from{" "}
              <b>
                {postsById.get(selectedPostId)?.author_handle
                  ? `@${postsById.get(selectedPostId)?.author_handle}`
                  : "this reel"}
              </b>
            </span>
            {onNavigateToPost && postsById.get(selectedPostId) ? (
              <button
                type="button"
                className="saved-map-open-post-btn"
                onClick={() => {
                  const p = postsById.get(selectedPostId)!;
                  const nativeId = p.post_id.includes(":")
                    ? p.post_id.slice(p.post_id.indexOf(":") + 1)
                    : p.post_id;
                  onNavigateToPost(p.platform, nativeId);
                }}
              >
                Open reel ↗
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSelectedPostId(null);
              }}
            >
              Show all
            </button>
          </div>
        )}

        <div
          className={`saved-map-gallery${photoEntries.length > 1 ? " is-scrollable" : ""}`}
        >
          {photoEntries.map(({ place, post, reelPlacesCount }) => (
            <button
              key={`${place.placeId}:${post.post_id}`}
              type="button"
              className={`${selectedPlace?.placeId === place.placeId ? "is-active" : ""}${selectedPostId === post.post_id ? " is-post-active" : ""}`}
              onClick={() => handleReelClick(post)}
            >
              <i
                style={
                  post.thumbnail_url
                    ? { backgroundImage: `url(${post.thumbnail_url})` }
                    : { background: visualFor(place).color }
                }
              />
              <span>
                <small>
                  {post.platform} · {post.media_kind || "reel"}
                </small>
                <b>{getPostTitle(post)}</b>
                <em>
                  {post.author_handle ? `@${post.author_handle}` : "Creator"} ·{" "}
                  {reelPlacesCount} {reelPlacesCount === 1 ? "stop" : "stops"}
                </em>
              </span>
            </button>
          ))}
          {photoEntries.length === 0 && (
            <p>No reels are linked to places currently in view.</p>
          )}
        </div>
      </div>
    </section>
  );
}

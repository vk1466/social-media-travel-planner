import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

function categoryIcon(place: AtlasPlace, active: boolean, showLabel: boolean): L.DivIcon {
  const visual = visualFor(place);
  return L.divIcon({
    className: "saved-map-marker-host",
    html: `<span class="saved-map-marker${active ? " is-active" : ""}" style="--marker-color:${visual.color}"><i>${visual.icon}</i>${showLabel ? `<b>${escapeHtml(place.categoryLabel)}</b>` : ""}</span>`,
    iconSize: showLabel ? [112, 34] : active ? [34, 34] : [28, 28],
    iconAnchor: showLabel ? [17, 17] : active ? [17, 17] : [14, 14],
    popupAnchor: [0, -18],
  });
}

function FitPlaces({ places }: { places: AtlasPlace[] }) {
  const map = useMap();
  const key = places.map((place) => place.placeId).join("|");
  useEffect(() => {
    const coords = places.map((place) => [place.lat as number, place.lng as number] as [number, number]);
    if (coords.length === 0) map.setView([20, 0], 2);
    else if (coords.length === 1) map.setView(coords[0], 12);
    else map.fitBounds(L.latLngBounds(coords), { padding: [56, 56], maxZoom: 12 });
  }, [key, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [map]);
  return null;
}

function ViewportReporter({ onChange }: { onChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMap();
  useEffect(() => {
    const report = () => onChange(map.getBounds());
    report();
    map.on("moveend zoomend", report);
    return () => { map.off("moveend zoomend", report); };
  }, [map, onChange]);
  return null;
}

interface AtlasMapPanelProps {
  scope: AtlasNode;
  posts: SavedPost[];
  onOpenNode: (node: AtlasNode) => void;
  onOpenPlace: (placeId: string) => void;
}

export function AtlasMapPanel({ scope, posts, onOpenNode, onOpenPlace }: AtlasMapPanelProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const places = useMemo(
    () => leafPlaces(scope).filter((place) => place.lat !== null && place.lng !== null),
    [scope],
  );
  const mapPlaces = selectedPostId
    ? places.filter((place) => place.sourcePostIds.includes(selectedPostId))
    : places;
  const rankedPlaces = useMemo(
    () => [...places].sort((a, b) => b.saves - a.saves || a.name.localeCompare(b.name)),
    [places],
  );
  const postsById = useMemo(() => new Map(posts.map((post) => [post.post_id, post])), [posts]);
  const photoEntries = useMemo(
    () => {
      const visiblePlaces = mapBounds
        ? mapPlaces.filter((place) => mapBounds.contains([place.lat as number, place.lng as number]))
        : mapPlaces;
      const uniquePosts = new Map<string, { place: AtlasPlace; post: SavedPost }>();
      for (const place of visiblePlaces) {
        for (const postId of place.sourcePostIds) {
          const post = postsById.get(postId);
          if (post && !uniquePosts.has(post.post_id)) {
            uniquePosts.set(post.post_id, { place, post });
          }
        }
      }
      return Array.from(uniquePosts.values()).slice(0, 10);
    },
    [mapBounds, mapPlaces, postsById, selectedPostId],
  );
  const selectedPlace = places.find((place) => place.placeId === selectedPlaceId)
    ?? rankedPlaces[0]
    ?? null;

  useEffect(() => {
    setSelectedPlaceId(null);
    setSelectedPostId(null);
    setMapBounds(null);
  }, [scope.key]);

  if (places.length === 0) {
    return <p className="pl2-empty">No saved places with coordinates are available in this scope.</p>;
  }

  const showLabels = false;
  const mapStyle = { "--selected-color": selectedPlace ? visualFor(selectedPlace).color : "#68736d" } as CSSProperties;

  return (
    <section className="saved-map-view saved-map-view--photos" style={mapStyle}>
      <div className="saved-map-stage">
        {scope.children.some((node) => node.level !== "place") && (
          <div className="pl2-map-scope-rail" aria-label={`Destinations in ${scope.name}`}>
            <span>Zoom to</span>
            {scope.children.filter((node) => node.level !== "place").slice(0, 12).map((node) => (
              <button key={node.key} type="button" onClick={() => onOpenNode(node)}>{node.name}<small>{node.total}</small></button>
            ))}
          </div>
        )}

        <MapContainer className="pl2-map-canvas" center={[20, 0]} zoom={2} scrollWheelZoom worldCopyJump>
          <TileLayer
            url={cartoVoyagerTileUrl()}
            attribution={CARTO_BASEMAP_ATTR}
            subdomains="abcd"
            opacity={0.9}
          />
          <InvalidateSize />
          <ViewportReporter onChange={setMapBounds} />
          <FitPlaces places={mapPlaces} />

          {mapPlaces.map((place) => (
            <Marker key={place.placeId} position={[place.lat as number, place.lng as number]} icon={categoryIcon(place, selectedPlace?.placeId === place.placeId, showLabels)} eventHandlers={{ click: () => setSelectedPlaceId(place.placeId) }}>
              <Tooltip direction="top" offset={[0, -14]}>{place.name} · {place.categoryLabel}</Tooltip>
              <Popup>
                <div className="saved-place-popup-card">
                  {place.imageUrl && <div className="saved-place-popup-photo" style={{ backgroundImage: `url(${place.imageUrl})` }} />}
                  <small><i style={{ background: visualFor(place).color }} dangerouslySetInnerHTML={{ __html: visualFor(place).icon }} />{place.categoryLabel} · {place.saves} saved post{place.saves === 1 ? "" : "s"}</small>
                  <strong>{place.name}</strong>
                  <span>{[place.city, place.state, place.country].filter(Boolean).join(", ")}</span>
                  <p>{place.tips[0] ?? place.details[0] ?? "Saved from your processed travel posts."}</p>
                  <button type="button" onClick={() => onOpenPlace(place.placeId)}>Open full place →</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {selectedPostId && (
          <div className="saved-map-post-filter">
            <span>Showing places from <b>{postsById.get(selectedPostId)?.author_handle ? `@${postsById.get(selectedPostId)?.author_handle}` : "this processed post"}</b></span>
            <button type="button" onClick={() => { setSelectedPostId(null); setMapBounds(null); }}>Show all posts</button>
          </div>
        )}

        <div className={`saved-map-gallery${photoEntries.length > 1 ? " is-scrollable" : ""}`}>
            {photoEntries.map(({ place, post }) => (
              <button key={`${place.placeId}:${post.post_id}`} type="button" className={`${selectedPlace?.placeId === place.placeId ? "is-active" : ""}${selectedPostId === post.post_id ? " is-post-active" : ""}`} onClick={() => { setSelectedPostId(post.post_id); setSelectedPlaceId(place.placeId); setMapBounds(null); }}>
                <i style={post.thumbnail_url ? { backgroundImage: `url(${post.thumbnail_url})` } : { background: visualFor(place).color }} />
                <span><small>{post.platform} · {post.media_kind}</small><b>{getPostTitle(post)}</b><em>{post.author_handle ? `@${post.author_handle}` : "Processed post"}</em></span>
              </button>
            ))}
            {photoEntries.length === 0 && <p>No processed post thumbnails are available for these saved places yet.</p>}
          </div>
        </div>

    </section>
  );
}

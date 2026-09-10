import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

import type { SavedPost } from "../api";
import {
  CARTO_BASEMAP_ATTR,
  cartoVoyagerTileUrl,
} from "../maps";
import { leafPlaces, type AtlasNode, type AtlasPlace } from "../placeAtlasModel";
import { getPostTitle } from "../postDisplayUtils";

import "leaflet/dist/leaflet.css";

const ICON_START = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const ICON_END = "</svg>";
const TONE_VISUALS: Record<string, { icon: string; color: string }> = {
  food: { icon: `${ICON_START}<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3c3 3 3 8 0 11v7M16 3v11h4"/>${ICON_END}`, color: "#d35f42" },
  culture: { icon: `${ICON_START}<path d="m12 3 9 5H3l9-5ZM5 10v7M9 10v7M15 10v7M19 10v7M3 21h18M4 17h16"/>${ICON_END}`, color: "#7c58a6" },
  outdoors: { icon: `${ICON_START}<path d="m3 20 6-10 4 6 2-3 6 7H3ZM15 7l2-4 2 4"/>${ICON_END}`, color: "#3f7c58" },
  water: { icon: `${ICON_START}<path d="M2 8c3-2 5 2 8 0s5 2 8 0 4 0 4 0M2 13c3-2 5 2 8 0s5 2 8 0 4 0 4 0M2 18c3-2 5 2 8 0s5 2 8 0 4 0 4 0"/>${ICON_END}`, color: "#347fa2" },
  place: { icon: `${ICON_START}<path d="M4 21V8l5-3v16M9 21V3l7 3v15M16 21v-9l4-2v11M2 21h20M12 8h1M12 12h1M12 16h1"/>${ICON_END}`, color: "#b77a2d" },
  market: { icon: `${ICON_START}<path d="M3 9h18l-2-5H5L3 9ZM5 9v11h14V9M9 20v-6h6v6M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0"/>${ICON_END}`, color: "#b44f72" },
  stay: { icon: `${ICON_START}<path d="M3 19V9M21 19v-7H8a5 5 0 0 0-5 5v2M3 15h18M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>${ICON_END}`, color: "#385e86" },
  muted: { icon: `${ICON_START}<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>${ICON_END}`, color: "#68736d" },
};

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: TONE_VISUALS.food.icon,
  cafe: `${ICON_START}<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8ZM17 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2M15 3v2"/>${ICON_END}`,
  bar: `${ICON_START}<path d="M5 3h14l-7 8v8M8 21h8M7 6h10"/>${ICON_END}`,
  attraction: `${ICON_START}<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>${ICON_END}`,
  landmark: `${ICON_START}<path d="M6 21h12M8 21V10h8v11M6 10h12l-2-4H8l-2 4ZM10 14h4M10 17h4"/>${ICON_END}`,
  museum: TONE_VISUALS.culture.icon,
  city: TONE_VISUALS.place.icon,
  neighborhood: `${ICON_START}<path d="m3 12 5-4 5 4v8H3v-8Zm10 1 4-3 4 3v7h-8M6 15h3M16 16h2"/>${ICON_END}`,
  hike: TONE_VISUALS.outdoors.icon,
  viewpoint: `${ICON_START}<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${ICON_END}`,
  park: `${ICON_START}<path d="m12 3-5 8h3l-4 6h12l-4-6h3l-5-8ZM12 17v4"/>${ICON_END}`,
  waterfall: `${ICON_START}<path d="M6 3h12M8 3v8c0 4 2 7 4 10M12 3v8c0 3 2 5 4 7M16 3v7"/>${ICON_END}`,
  lake: TONE_VISUALS.water.icon,
  beach: `${ICON_START}<path d="M3 18c4-2 6 2 10 0s6 0 8 0M12 4a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5ZM12 9v9"/>${ICON_END}`,
  market: TONE_VISUALS.market.icon,
  hotel: TONE_VISUALS.stay.icon,
};

function visualForCategory(category: string | null, tone: string) {
  const toneVisual = TONE_VISUALS[tone] ?? TONE_VISUALS.muted;
  return { color: toneVisual.color, icon: CATEGORY_ICONS[category ?? ""] ?? toneVisual.icon };
}

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
  const [category, setCategory] = useState("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const places = useMemo(
    () => leafPlaces(scope).filter((place) => place.lat !== null && place.lng !== null),
    [scope],
  );
  const categoryOptions = useMemo(() => {
    const byCategory = new Map<string, { label: string; tone: string; count: number }>();
    for (const place of places) {
      const key = place.category ?? "uncategorized";
      const current = byCategory.get(key);
      byCategory.set(key, {
        label: place.categoryLabel,
        tone: place.categoryTone,
        count: (current?.count ?? 0) + 1,
      });
    }
    return Array.from(byCategory, ([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [places]);
  const filteredPlaces = category === "all"
    ? places
    : places.filter((place) => (place.category ?? "uncategorized") === category);
  const mapPlaces = selectedPostId
    ? filteredPlaces.filter((place) => place.sourcePostIds.includes(selectedPostId))
    : filteredPlaces;
  const rankedPlaces = useMemo(
    () => [...filteredPlaces].sort((a, b) => b.saves - a.saves || a.name.localeCompare(b.name)),
    [filteredPlaces],
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
    setCategory("all");
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
      <header className="saved-map-view-picker saved-map-view-picker--single">
        <div>
          <small>Photo atlas · your processed saves</small>
          <strong>Places, remembered through the posts that saved them</strong>
        </div>
      </header>

      {scope.children.some((node) => node.level !== "place") && (
        <div className="pl2-map-scope-rail" aria-label={`Destinations in ${scope.name}`}>
          <span>Zoom to</span>
          {scope.children.filter((node) => node.level !== "place").slice(0, 12).map((node) => (
            <button key={node.key} type="button" onClick={() => onOpenNode(node)}>{node.name}<small>{node.total}</small></button>
          ))}
        </div>
      )}

      <div className="saved-map-category-bar" aria-label="Filter places by type">
        <button type="button" className={category === "all" ? "is-active" : ""} onClick={() => { setCategory("all"); setSelectedPostId(null); setMapBounds(null); }}>
          <i>✦</i><span>All places</span><b>{places.length}</b>
        </button>
        {categoryOptions.map((option) => {
          const visual = visualForCategory(option.key === "uncategorized" ? null : option.key, option.tone);
          return (
            <button key={option.key} type="button" className={category === option.key ? "is-active" : ""} style={{ "--category-color": visual.color } as CSSProperties} onClick={() => { setCategory(option.key); setSelectedPostId(null); setMapBounds(null); }}>
              <i dangerouslySetInnerHTML={{ __html: visual.icon }} /><span>{option.label}</span><b>{option.count}</b>
            </button>
          );
        })}
      </div>

      <div className="saved-map-stage">
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

      <p className="pl2-hint">Showing {filteredPlaces.length} saved place{filteredPlaces.length === 1 ? "" : "s"} in {scope.name}. Colors and symbols represent place type; numbers represent saved posts.</p>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { useSavePipeline } from "../state/SavePipelineContext";
import type { Place } from "../../api";
import { visualForCategory } from "../../placeCategoryVisuals";

import "leaflet/dist/leaflet.css";

interface MapPageProps {
  places: Place[];
  loading: boolean;
}

// Ensure default icon paths work if used
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 38 : count < 50 ? 44 : 50;
  return L.divIcon({
    className: "wf-cluster-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 999px;
      background: linear-gradient(135deg, #1F6F8B, #14495B);
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
      line-height: 1;
      font-family: 'Figtree', system-ui, sans-serif;
      cursor: pointer;
      user-select: none;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function placeIcon(place: Place, isSelected: boolean): L.DivIcon {
  const visual = visualForCategory(place.category);
  const color = visual.color || "#1F6F8B";
  const size = isSelected ? 36 : 28;
  return L.divIcon({
    className: "wf-place-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 999px;
      background: ${isSelected ? "#1B1D1F" : color};
      border: ${isSelected ? "3px solid #FFFFFF" : "2px solid #FFFFFF"};
      box-shadow: 0 4px 12px ${isSelected ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)"};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: ${isSelected ? 16 : 13}px;
      cursor: pointer;
      transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
      transition: transform 0.15s ease;
    ">
      <span style="display:inline-block; line-height: 1;">${visual.icon || "📍"}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function ClusterMarker({
  lat,
  lng,
  count,
}: {
  lat: number;
  lng: number;
  count: number;
}) {
  const map = useMap();
  return (
    <Marker
      position={[lat, lng]}
      icon={clusterIcon(count)}
      eventHandlers={{
        click: () => {
          map.flyTo([lat, lng], Math.min(map.getZoom() + 3, 16), { duration: 0.6 });
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -16]}>
        {count} saved places (zoom in)
      </Tooltip>
    </Marker>
  );
}

function InvalidateSize({
  places,
  hasSelected,
  mobileView,
}: {
  places: Place[];
  hasSelected: boolean;
  mobileView: string;
}) {
  const map = useMap();
  const placesRef = useRef(places);
  placesRef.current = places;
  const hasSelectedRef = useRef(hasSelected);
  hasSelectedRef.current = hasSelected;

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
      if (!hasSelectedRef.current) {
        const valid = placesRef.current.filter(
          (p) => typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number",
        );
        if (valid.length > 1) {
          const bounds = L.latLngBounds(valid.map((p) => [p.location.latitude!, p.location.longitude!]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        }
      }
    };

    map.invalidateSize();
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const t1 = window.setTimeout(() => map.invalidateSize(), 100);
    const t2 = window.setTimeout(() => map.invalidateSize(), 300);
    const t3 = window.setTimeout(() => map.invalidateSize(), 800);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => handleResize());
    if (container) {
      observer.observe(container);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      observer.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (mobileView === "map") {
      map.invalidateSize();
      const t = window.setTimeout(() => map.invalidateSize(), 50);
      return () => window.clearTimeout(t);
    }
  }, [mobileView, map]);

  return null;
}

function FitAllBounds({ places, hasSelected }: { places: Place[]; hasSelected: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (hasSelected) return;
    const valid = places.filter(
      (p) => typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number",
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].location.latitude!, valid[0].location.longitude!], 13);
      return;
    }
    const bounds = L.latLngBounds(
      valid.map((p) => [p.location.latitude!, p.location.longitude!]),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [places, hasSelected, map]);
  return null;
}

function PanToSelected({ place }: { place: Place | null }) {
  const map = useMap();
  useEffect(() => {
    if (!place?.location?.latitude || !place?.location?.longitude) return;
    map.flyTo([place.location.latitude, place.location.longitude], 14, { duration: 0.8 });
  }, [place, map]);
  return null;
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

export function MapPage({ places, loading }: MapPageProps) {
  const { placeId } = useParams<{ placeId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet } = useSavePipeline();
  const [zoom, setZoom] = useState<number>(4);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const mappablePlaces = useMemo(() => {
    return places.filter(
      (p) => typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number",
    );
  }, [places]);

  const selectedPlaceId = searchParams.get("place") || placeId || null;
  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return places.find((p) => p.place_id === selectedPlaceId) || null;
  }, [places, selectedPlaceId]);

  // Clustering logic based on map zoom
  const clusters = useMemo(() => {
    if (zoom >= 12) {
      return mappablePlaces.map((p) => ({
        isCluster: false,
        place: p,
        count: 1,
        lat: p.location.latitude!,
        lng: p.location.longitude!,
        places: [p],
      }));
    }

    const cellSize = 180 / Math.pow(2, zoom);
    const grid = new Map<string, Place[]>();

    for (const p of mappablePlaces) {
      const latIdx = Math.floor(p.location.latitude! / cellSize);
      const lngIdx = Math.floor(p.location.longitude! / cellSize);
      const key = `${latIdx}:${lngIdx}`;
      const list = grid.get(key) || [];
      list.push(p);
      grid.set(key, list);
    }

    const result: Array<{
      isCluster: boolean;
      place?: Place;
      count: number;
      lat: number;
      lng: number;
      places: Place[];
    }> = [];

    for (const group of grid.values()) {
      if (group.length === 1) {
        result.push({
          isCluster: false,
          place: group[0],
          count: 1,
          lat: group[0].location.latitude!,
          lng: group[0].location.longitude!,
          places: group,
        });
      } else {
        const avgLat = group.reduce((sum, p) => sum + p.location.latitude!, 0) / group.length;
        const avgLng = group.reduce((sum, p) => sum + p.location.longitude!, 0) / group.length;
        result.push({
          isCluster: true,
          count: group.length,
          lat: avgLat,
          lng: avgLng,
          places: group,
        });
      }
    }
    return result;
  }, [mappablePlaces, zoom]);

  if (places.length === 0 && !loading) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <EmptyState
          screenLabel="Map, no places yet"
          headline="Places appear here"
          description="When a saved post mentions a location, it is pinned on the map."
          primaryActionLabel="Save a travel link"
          onPrimaryAction={() => openSaveSheet()}
          iconPath="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
          tint="#E3F0F4"
          ink="#1B5E78"
        />
      </main>
    );
  }

  const defaultCenter: [number, number] = mappablePlaces.length > 0
    ? [mappablePlaces[0].location.latitude!, mappablePlaces[0].location.longitude!]
    : [20, 0];

  const selLat = selectedPlace?.location?.latitude;
  const selLng = selectedPlace?.location?.longitude;
  const selHasCoords = typeof selLat === "number" && typeof selLng === "number";

  const googleMapsUrl = selectedPlace
    ? (selectedPlace.google_maps_url ||
       (selHasCoords
         ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.display_name)}+${selLat},${selLng}`
         : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.display_name)}`))
    : "";

  const appleMapsUrl = selectedPlace
    ? (selHasCoords
        ? `https://maps.apple.com/?q=${encodeURIComponent(selectedPlace.display_name)}&ll=${selLat},${selLng}`
        : `https://maps.apple.com/?q=${encodeURIComponent(selectedPlace.display_name)}`)
    : "";

  return (
    <main className="wf-map-main">
      {/* Places list sidebar (Desktop always, mobile toggleable) */}
      <aside
        className={`wf-map-sidebar ${mobileView === "map" ? "wf-desktop-only" : ""}`}
        style={{
          display: mobileView === "list" ? "flex" : undefined,
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #EFEDE7",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Places
            </h1>
            <div style={{ fontSize: "13px", color: "#6B6F73", marginTop: "2px" }}>
              {places.length} saved places on your map
            </div>
          </div>
          {mobileView === "list" && (
            <button
              type="button"
              onClick={() => setMobileView("map")}
              style={{
                background: "#1B1D1F",
                color: "#FFFFFF",
                border: 0,
                borderRadius: "999px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🗺️</span> View Map
            </button>
          )}
        </div>

        <div className="wf-map-sidebar-list">
          {places.map((place) => {
            const isSelected = selectedPlace?.place_id === place.place_id;
            return (
              <button
                key={place.place_id}
                type="button"
                onClick={() => {
                  setSearchParams({ place: place.place_id });
                  setMobileView("map");
                }}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  border: 0,
                  background: isSelected ? "#F6F5F1" : "transparent",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#1B1D1F" }}>
                  {place.display_name}
                </div>
                <div style={{ fontSize: "13px", color: "#6B6F73" }}>
                  {[place.location?.city, place.location?.state_province, place.location?.country].filter(Boolean).join(", ")}
                </div>
                {place.category && (
                  <span
                    style={{
                      alignSelf: "flex-start",
                      marginTop: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "#E3F0F4",
                      color: "#1B5E78",
                    }}
                  >
                    {place.category}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Interactive Map Pane */}
      <section
        className="wf-map-pane"
        style={{
          display: mobileView === "list" ? "none" : "flex",
        }}
      >
        {/* Mobile toggle pill to switch between map & places list */}
        <div
          className="wf-mobile-only"
          style={{
            position: "absolute",
            top: "14px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "#FFFFFF",
            borderRadius: "999px",
            padding: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.16)",
            border: "1px solid #D9D5CB",
            display: "flex",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setMobileView("map")}
            style={{
              border: 0,
              background: mobileView === "map" ? "#1B1D1F" : "transparent",
              color: mobileView === "map" ? "#FFFFFF" : "#6B6F73",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={() => setMobileView("list")}
            style={{
              border: 0,
              background: mobileView === "list" ? "#1B1D1F" : "transparent",
              color: mobileView === "list" ? "#FFFFFF" : "#6B6F73",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ☰ Places ({places.length})
          </button>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={zoom}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, width: "100%", height: "100%", zIndex: 1 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <InvalidateSize places={places} hasSelected={Boolean(selectedPlace)} mobileView={mobileView} />
          <FitAllBounds places={places} hasSelected={Boolean(selectedPlace)} />
          <PanToSelected place={selectedPlace} />
          <ZoomTracker onZoomChange={setZoom} />

          {clusters.map((c, i) => {
            if (c.isCluster) {
              return (
                <ClusterMarker
                  key={`cluster-${i}-${c.lat}-${c.lng}`}
                  lat={c.lat}
                  lng={c.lng}
                  count={c.count}
                />
              );
            }

            const p = c.place!;
            const isSelected = selectedPlace?.place_id === p.place_id;

            return (
              <Marker
                key={p.place_id}
                position={[c.lat, c.lng]}
                icon={placeIcon(p, isSelected)}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => {
                    setSearchParams({ place: p.place_id });
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -16]}>
                  {p.display_name}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Selected place card overlay - positioned cleanly above bottom nav on mobile */}
        {selectedPlace && (
          <div
            className="wf-map-selected-card"
            style={{
              position: "absolute",
              background: "#FFFFFF",
              borderRadius: "24px",
              border: "1px solid #E6E3DC",
              padding: "20px 22px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              zIndex: 1000,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#E3F0F4",
                    color: "#1B5E78",
                    display: "inline-block",
                  }}
                >
                  {selectedPlace.category || "Place"}
                </span>
                <h2
                  style={{
                    margin: "6px 0 2px",
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#1B1D1F",
                    lineHeight: 1.2,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedPlace.display_name}
                </h2>
                <div style={{ fontSize: "13px", color: "#6B6F73" }}>
                  {[selectedPlace.location?.city, selectedPlace.location?.state_province, selectedPlace.location?.country].filter(Boolean).join(", ")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "18px",
                  lineHeight: 1,
                  color: "#999",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Actions: Details, Add to trip, Google Maps, Apple Maps */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
              <Link
                to={`/place/${selectedPlace.place_id}`}
                state={{ from: "/map" }}
                style={{
                  height: "38px",
                  padding: "0 18px",
                  borderRadius: "999px",
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Details
              </Link>
              <ComingSoonButton
                featureId="trips"
                style={{
                  height: "38px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Add to trip
              </ComingSoonButton>
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    borderRadius: "999px",
                    border: "1px solid #D9D5CB",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1B1D1F",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Google Maps ↗
                </a>
              )}
              {appleMapsUrl && (
                <a
                  href={appleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    borderRadius: "999px",
                    border: "1px solid #D9D5CB",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1B1D1F",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Apple Maps ↗
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

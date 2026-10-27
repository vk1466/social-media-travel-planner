import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import type { Place } from "../api";
import { CARTO_BASEMAP_ATTR, cartoPositronTileUrl, googleMapsDirectionsUrl, googleMapsUrl } from "../maps";
import { mappablePlaces } from "../placeMapUtils";

import "leaflet/dist/leaflet.css";

function numberedPin(index: number, selected: boolean): L.DivIcon {
  const size = selected ? 32 : 26;
  return L.divIcon({
    className: "post-card-map-pin",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${selected ? "var(--accent, #FF5A4E)" : "var(--ink, #16181B)"};
      border: 2px solid #FFFFFF;
      box-shadow: ${selected ? "0 4px 14px rgba(255, 90, 78, 0.45)" : "0 2px 6px rgba(16, 24, 40, 0.2)"};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-weight: 700;
      font-size: ${selected ? "13px" : "11px"};
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      transform: ${selected ? "scale(1.15)" : "scale(1)"};
      transition: transform 0.15s ease;
    ">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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

function Recenter({ places, activePlaceId }: { places: Place[]; activePlaceId?: string | null }) {
  const map = useMap();
  const firstFit = useRef(true);
  const placeKey = places.map((place) => place.place_id).join("|");

  useEffect(() => {
    if (places.length === 0) {
      return;
    }
    if (firstFit.current) {
      firstFit.current = false;
      if (places.length === 1) {
        const { latitude, longitude } = places[0].location;
        map.setView([latitude!, longitude!], 13);
        return;
      }
      const bounds = L.latLngBounds(
        places.map((place) => [place.location.latitude!, place.location.longitude!] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
      return;
    }
    const active = places.find((place) => place.place_id === activePlaceId) ?? places[0];
    map.flyTo([active.location.latitude!, active.location.longitude!], 13, { duration: 0.55 });
    // placeKey stands in for `places` so a new array identity does not retrigger flyTo.
  }, [map, placeKey, activePlaceId]);

  return null;
}

interface PostPlacesMapProps {
  places: Place[];
  activePlaceId?: string | null;
  pinIndexByPlaceId?: Record<string, number>;
  onSelectPlaceId?: (placeId: string) => void;
}

export function PostPlacesMap({
  places,
  activePlaceId,
  pinIndexByPlaceId,
  onSelectPlaceId,
}: PostPlacesMapProps) {
  const mapped = mappablePlaces(places);
  const active = mapped.find((place) => place.place_id === activePlaceId) ?? mapped[0];

  if (mapped.length === 0 || !active) {
    return (
      <div className="post-flip-live-map is-empty">
        <span>Map appears when a stop is located</span>
      </div>
    );
  }

  const center: [number, number] = [active.location.latitude!, active.location.longitude!];
  const mapsUrl =
    googleMapsUrl({
      display_name: active.display_name,
      city: active.location.city,
      country: active.location.country,
      latitude: active.location.latitude,
      longitude: active.location.longitude,
      provider_place_id: active.location.provider_place_id,
    }) ?? googleMapsDirectionsUrl(active.location.latitude!, active.location.longitude!);

  return (
    <div className="post-flip-live-map">
      <MapContainer
        center={center}
        zoom={mapped.length === 1 ? 13 : 10}
        className="post-flip-live-map-canvas"
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl
      >
        <TileLayer url={cartoPositronTileUrl()} attribution={CARTO_BASEMAP_ATTR} subdomains="abcd" />
        <InvalidateSize />
        <Recenter places={mapped} activePlaceId={active.place_id} />
        {mapped.map((place, index) => {
          const pinIndex = pinIndexByPlaceId?.[place.place_id] ?? index;
          const selected = place.place_id === active.place_id;
          return (
            <Marker
              key={place.place_id}
              position={[place.location.latitude!, place.location.longitude!]}
              icon={numberedPin(pinIndex, selected)}
              zIndexOffset={selected ? 600 : 0}
              eventHandlers={{
                click: () => onSelectPlaceId?.(place.place_id),
              }}
            />
          );
        })}
      </MapContainer>
      <div className="post-flip-live-map-chip">
        <p>{active.display_name}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="post-flip-live-map-directions-btn"
        >
          Directions ↗
        </a>
      </div>
    </div>
  );
}

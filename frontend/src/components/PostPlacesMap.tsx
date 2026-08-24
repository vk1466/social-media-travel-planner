import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import type { Place } from "../api";
import { googleMapsDirectionsUrl, googleMapsUrl } from "../maps";
import { mappablePlaces } from "../placeMapUtils";

import "leaflet/dist/leaflet.css";

const VOYAGER_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const VOYAGER_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function numberedPin(index: number, selected: boolean): L.DivIcon {
  const size = selected ? 28 : 22;
  return L.divIcon({
    className: selected ? "post-card-map-pin is-light-map is-active" : "post-card-map-pin is-light-map",
    html: `<span>${index + 1}</span>`,
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
        <TileLayer url={VOYAGER_URL} attribution={VOYAGER_ATTR} subdomains="abcd" />
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
        <a href={mapsUrl} target="_blank" rel="noreferrer">
          Directions
        </a>
      </div>
    </div>
  );
}

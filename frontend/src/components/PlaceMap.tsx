import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import type { CanonicalPlace } from "../api";
import { mappablePlaces } from "../placeMapUtils";

import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function locationLine(place: CanonicalPlace): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

interface FitBoundsProps {
  places: CanonicalPlace[];
}

function FitBounds({ places }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    const coords = places.map(
      (place) => [place.location.latitude!, place.location.longitude!] as [number, number],
    );
    if (coords.length === 0) {
      return;
    }
    if (coords.length === 1) {
      map.setView(coords[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 12 });
  }, [map, places]);

  return null;
}

interface PlaceMapProps {
  places: CanonicalPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: CanonicalPlace) => void;
  className?: string;
  height?: string;
  showCaption?: boolean;
}

export function PlaceMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  className,
  height = "480px",
  showCaption = true,
}: PlaceMapProps) {
  const mapped = mappablePlaces(places);

  if (mapped.length === 0) {
    return <p className="loading-copy">No places with coordinates match the current filters.</p>;
  }

  const center: [number, number] = [mapped[0].location.latitude!, mapped[0].location.longitude!];

  return (
    <div className={className ?? "place-map-shell"} style={{ height }}>
      <MapContainer center={center} zoom={4} className="place-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds places={mapped} />
        {mapped.map((place) => (
          <Marker
            key={place.place_id}
            position={[place.location.latitude!, place.location.longitude!]}
            eventHandlers={
              onSelectPlace
                ? {
                    click: () => onSelectPlace(place),
                  }
                : undefined
            }
            opacity={selectedPlaceId && selectedPlaceId !== place.place_id ? 0.65 : 1}
          >
            <Popup>
              <div className="place-map-popup">
                <strong>{place.display_name}</strong>
                {locationLine(place) && <p>{locationLine(place)}</p>}
                {place.tags.length > 0 && (
                  <p className="place-map-popup-tags">{place.tags.join(" · ")}</p>
                )}
                {onSelectPlace && (
                  <button
                    type="button"
                    className="inline-link-button"
                    onClick={() => onSelectPlace(place)}
                  >
                    View details
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {showCaption && (
        <p className="place-map-caption">
          {mapped.length} of {places.length} place{places.length === 1 ? "" : "s"} on map
        </p>
      )}
    </div>
  );
}

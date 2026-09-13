import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import type { Place } from "../api";
import { categoryLabel } from "../categoryLabels";
import { visualForCategory } from "../placeCategoryVisuals";

interface OsmPlaceMapProps {
  places: Place[];
  visitedPlaceIds: ReadonlySet<string>;
  onSelectPlace?: (place: Place) => void;
}

/** Same Leaflet + CARTO Voyager canvas as the web Travel atlas map. */
export function OsmPlaceMap({
  places,
  visitedPlaceIds,
  onSelectPlace,
}: OsmPlaceMapProps) {
  const html = useMemo(() => buildMapHtml(places, visitedPlaceIds), [places, visitedPlaceIds]);

  return (
    <WebView
      style={StyleSheet.absoluteFill}
      originWhitelist={["*"]}
      source={{ html }}
      javaScriptEnabled
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      onMessage={(event) => {
        const place = places.find((item) => item.place_id === event.nativeEvent.data);
        if (place) {
          onSelectPlace?.(place);
        }
      }}
    />
  );
}

function locationLine(place: Place): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

function buildMapHtml(places: Place[], visitedPlaceIds: ReadonlySet<string>): string {
  const markers = places.map((place) => {
    const visual = visualForCategory(place.category);
    const visited = visitedPlaceIds.has(place.place_id);
    return {
      id: place.place_id,
      name: place.display_name,
      lat: place.location.latitude!,
      lng: place.location.longitude!,
      visited,
      categoryLabel: categoryLabel(place.category),
      location: locationLine(place),
      tags: [categoryLabel(place.category), ...(place.attributes ?? [])].filter(Boolean).join(" · "),
      blurb: place.tips[0] ?? place.details[0] ?? "",
      color: visual.color,
      icon: visual.icon,
    };
  });
  const payload = JSON.stringify(markers).replace(/</g, "\\u003c");
  const tileKey = process.env.EXPO_PUBLIC_CARTO_BASEMAPS_API_KEY?.trim() ?? "";
  const tileUrl = tileKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(tileKey)}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: #112a35; }
    .leaflet-container { background: #112a35; filter: saturate(0.72) brightness(1.05); }
    .saved-map-marker-host { border: 0; background: transparent; }
    .saved-map-marker {
      display: flex;
      align-items: center;
      filter: drop-shadow(0 3px 5px rgb(0 0 0 / 0.3));
    }
    .saved-map-marker > i {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border: 3px solid white;
      border-radius: 50%;
      background: var(--marker-color);
      color: white;
      font-style: normal;
    }
    .saved-map-marker svg { width: 14px; height: 14px; }
    .saved-map-marker.is-active { transform: scale(1.22); }
    .saved-map-marker.is-active > i { box-shadow: 0 0 0 3px var(--marker-color); }
    .saved-place-popup-card {
      min-width: 180px;
      max-width: 240px;
      color: #1b2621;
    }
    .saved-place-popup-card small {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #66736c;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .saved-place-popup-card small i {
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: white;
      font-style: normal;
    }
    .saved-place-popup-card small svg { width: 10px; height: 10px; }
    .saved-place-popup-card strong { display: block; margin: 0.35rem 0 0.15rem; font-size: 0.95rem; }
    .saved-place-popup-card span, .saved-place-popup-card p {
      display: block;
      margin: 0;
      color: #68736d;
      font-size: 0.72rem;
      line-height: 1.4;
    }
    .saved-place-popup-card button {
      margin-top: 0.55rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: #173a47;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .leaflet-popup-content-wrapper { border-radius: 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const places = ${payload};
    function esc(value) {
      return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
      });
    }
    const map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer(${JSON.stringify(tileUrl)}, {
      attribution: "&copy; OSM &copy; CARTO",
      subdomains: "abcd",
      opacity: 0.9,
      maxZoom: 19
    }).addTo(map);

    const bounds = [];
    for (const place of places) {
      const icon = L.divIcon({
        className: "saved-map-marker-host",
        html: '<span class="saved-map-marker" style="--marker-color:' + place.color + '"><i>' + place.icon + '</i></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -18]
      });
      const marker = L.marker([place.lat, place.lng], { icon: icon }).addTo(map);
      const visitedLine = place.visited ? " · Visited" : "";
      const blurb = place.blurb ? "<p>" + esc(place.blurb) + "</p>" : "";
      const loc = place.location ? "<span>" + esc(place.location) + "</span>" : "";
      marker.bindPopup(
        '<div class="saved-place-popup-card">' +
          '<small><i style="background:' + esc(place.color) + '">' + place.icon + '</i>' +
          esc(place.categoryLabel) + visitedLine + '</small>' +
          '<strong>' + esc(place.name) + '</strong>' +
          loc + blurb +
          '<button type="button" data-place-id="' + esc(place.id) + '">Open full place →</button>' +
        '</div>'
      );
      marker.on("popupopen", function () {
        const button = document.querySelector('button[data-place-id="' + place.id + '"]');
        if (button) {
          button.addEventListener("click", function () {
            window.ReactNativeWebView.postMessage(place.id);
          });
        }
      });
      bounds.push([place.lat, place.lng]);
    }
    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 12 });
    }
  </script>
</body>
</html>`;
}

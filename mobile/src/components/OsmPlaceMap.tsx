import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  const payload = useMemo(
    () => markerPayload(places, visitedPlaceIds),
    [places, visitedPlaceIds],
  );
  const html = useMemo(() => buildMapHtml(), []);
  const source = useMemo(
    () => ({ html, baseUrl: "https://basemaps.cartocdn.com" }),
    [html],
  );
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  const applyFrame = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) {
      return;
    }
    webViewRef.current?.injectJavaScript(
      `window.__setMapFrame && window.__setMapFrame(${Math.round(width)}, ${Math.round(height)}); true;`,
    );
  }, []);

  const pushPlaces = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `window.__setPlaces && window.__setPlaces(${payloadRef.current}); true;`,
    );
  }, []);

  useEffect(() => {
    if (readyRef.current) {
      pushPlaces();
    }
  }, [payload, pushPlaces]);

  return (
    <View
      style={styles.host}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setFrame((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
        applyFrame(width, height);
      }}
    >
      {frame.width > 0 && frame.height > 0 ? (
        <WebView
          ref={webViewRef}
          style={{ width: frame.width, height: frame.height, backgroundColor: "#112a35" }}
          originWhitelist={["*"]}
          source={source}
          javaScriptEnabled
          nestedScrollEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onLoadEnd={() => {
            readyRef.current = true;
            applyFrame(frame.width, frame.height);
            pushPlaces();
          }}
          androidLayerType="hardware"
          cacheEnabled
          onMessage={(event) => {
            const place = places.find((item) => item.place_id === event.nativeEvent.data);
            if (place) {
              onSelectPlace?.(place);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignSelf: "stretch",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "#112a35",
  },
});

function locationLine(place: Place): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

function markerPayload(places: Place[], visitedPlaceIds: ReadonlySet<string>): string {
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
  return JSON.stringify(markers).replace(/</g, "\\u003c");
}

function buildMapHtml(): string {
  const tileKey = process.env.EXPO_PUBLIC_CARTO_BASEMAPS_API_KEY?.trim() ?? "";
  const tileUrl = tileKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(tileKey)}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #112a35;
    }
    #map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .leaflet-container { width: 100%; height: 100%; background: #112a35; }
    .saved-map-marker-host { border: 0; background: transparent; }
    .saved-map-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
    }
    .saved-map-marker > i {
      flex: 0 0 auto;
      box-sizing: border-box;
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
      max-width: 28px;
      max-height: 28px;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      display: grid;
      place-items: center;
      line-height: 0;
      border: 3px solid white;
      border-radius: 999px;
      background: var(--marker-color);
      color: white;
      font-style: normal;
      box-shadow: 0 2px 4px rgb(0 0 0 / 0.28);
    }
    .saved-map-marker svg {
      display: block;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
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
      box-sizing: border-box;
      width: 18px;
      height: 18px;
      min-width: 18px;
      min-height: 18px;
      overflow: hidden;
      display: grid;
      place-items: center;
      line-height: 0;
      border-radius: 999px;
      color: white;
      font-style: normal;
    }
    .saved-place-popup-card small svg { display: block; width: 10px; height: 10px; }
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
    function esc(value) {
      return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
      });
    }
    const map = L.map("map", {
      zoomControl: true,
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 19,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomAnimation: true
    });
    L.tileLayer(${JSON.stringify(tileUrl)}, {
      attribution: "&copy; OSM &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 3
    }).addTo(map);
    const markers = L.layerGroup().addTo(map);
    let placeKey = "";

    function fitPlaces(places) {
      if (!places.length) {
        map.setView([20, 0], 2, { animate: false });
        return;
      }
      if (places.length === 1) {
        map.setView([places[0].lat, places[0].lng], 12, { animate: false });
        return;
      }
      map.fitBounds(places.map(function (place) { return [place.lat, place.lng]; }), {
        padding: [48, 72],
        maxZoom: 12,
        animate: false
      });
    }
    window.__setMapFrame = function (width, height) {
      if (!width || !height) return;
      var root = document.documentElement;
      root.style.width = width + "px";
      root.style.height = height + "px";
      document.body.style.width = width + "px";
      document.body.style.height = height + "px";
      var el = document.getElementById("map");
      el.style.width = width + "px";
      el.style.height = height + "px";
      map.invalidateSize({ animate: false, pan: false });
    };
    window.__setPlaces = function (places) {
      markers.clearLayers();
      for (const place of places) {
        const icon = L.divIcon({
          className: "saved-map-marker-host",
          html: '<span class="saved-map-marker" style="--marker-color:' + place.color + '"><i>' + place.icon + '</i></span>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -18]
        });
        const marker = L.marker([place.lat, place.lng], { icon: icon, keyboard: false });
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
        markers.addLayer(marker);
      }
      var nextKey = places.map(function (place) { return place.id; }).join("|");
      if (nextKey !== placeKey) {
        placeKey = nextKey;
        fitPlaces(places);
      }
    };
  </script>
</body>
</html>`;
}

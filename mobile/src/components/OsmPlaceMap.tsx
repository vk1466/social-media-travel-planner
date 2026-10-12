import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import type { Place } from "../api";
import { categoryLabel } from "../categoryLabels";
import { visualForCategory } from "../placeCategoryVisuals";

interface OsmPlaceMapProps {
  places: Place[];
  visitedPlaceIds: ReadonlySet<string>;
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: Place | null) => void;
}

/** Leaflet + CARTO Voyager canvas styled for Wanderfile mobile design. */
export function OsmPlaceMap({
  places,
  visitedPlaceIds,
  selectedPlaceId,
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
  const selectedRef = useRef(selectedPlaceId);
  selectedRef.current = selectedPlaceId;
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
      `window.__setPlaces && window.__setPlaces(${payloadRef.current}, ${JSON.stringify(selectedRef.current ?? null)}); true;`,
    );
  }, []);

  const pushSelected = useCallback((id: string | null | undefined) => {
    webViewRef.current?.injectJavaScript(
      `window.__setSelectedPlace && window.__setSelectedPlace(${JSON.stringify(id ?? null)}); true;`,
    );
  }, []);

  useEffect(() => {
    if (readyRef.current) {
      pushPlaces();
    }
  }, [payload, pushPlaces]);

  useEffect(() => {
    if (readyRef.current) {
      pushSelected(selectedPlaceId);
    }
  }, [selectedPlaceId, pushSelected]);

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
          style={{ width: frame.width, height: frame.height, backgroundColor: "#E6EFF2" }}
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
            const data = event.nativeEvent.data;
            if (data === "__DESELECT__") {
              onSelectPlace?.(null);
              return;
            }
            const place = places.find((item) => item.place_id === data);
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
    backgroundColor: "#E6EFF2",
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
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #E6EFF2;
      font-family: 'Figtree', system-ui, sans-serif;
    }
    #map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .leaflet-container { width: 100%; height: 100%; background: #E6EFF2; }
    .leaflet-control-attribution {
      font-size: 9px !important;
      color: #6B6F73 !important;
      background: rgba(255, 255, 255, 0.75) !important;
      padding: 2px 6px !important;
      border-radius: 4px;
      margin: 4px !important;
    }
    .saved-map-marker-host { border: 0; background: transparent; }
    .saved-map-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      cursor: pointer;
    }
    .saved-map-marker > i {
      box-sizing: border-box;
      width: 20px;
      height: 20px;
      border: 3px solid white;
      border-radius: 999px;
      background: #1F6F8B;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .selected-marker-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      pointer-events: auto;
      cursor: pointer;
    }
    .selected-marker-pill {
      background: #FFFFFF;
      border-radius: 15px;
      padding: 5px 14px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.2);
      margin-bottom: 6px;
      white-space: nowrap;
      font-family: 'Figtree', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #1B1D1F;
    }
    .selected-marker-dot {
      width: 28px;
      height: 28px;
      border-radius: 14px;
      background: #1F6F8B;
      border: 4px solid #FFFFFF;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    }
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
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 19,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomAnimation: true
    });
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
    L.tileLayer(${JSON.stringify(tileUrl)}, {
      attribution: "&copy; OSM &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 3
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    let currentPlaces = [];
    let selectedPlaceId = null;
    let placeKey = "";

    map.on("click", function () {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage("__DESELECT__");
      }
    });

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
        padding: [60, 60],
        maxZoom: 12,
        animate: false
      });
    }

    function renderMarkers() {
      markersGroup.clearLayers();
      for (const place of currentPlaces) {
        const isSelected = place.id === selectedPlaceId;
        if (isSelected) {
          const icon = L.divIcon({
            className: "saved-map-marker-host",
            html: '<div class="selected-marker-wrap"><div class="selected-marker-pill">' + esc(place.name) + '</div><div class="selected-marker-dot"></div></div>',
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          });
          const marker = L.marker([place.lat, place.lng], { icon: icon, keyboard: false, zIndexOffset: 1000 });
          marker.on("click", function (e) {
            L.DomEvent.stopPropagation(e);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(place.id);
            }
          });
          markersGroup.addLayer(marker);
        } else {
          const icon = L.divIcon({
            className: "saved-map-marker-host",
            html: '<span class="saved-map-marker"><i></i></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          const marker = L.marker([place.lat, place.lng], { icon: icon, keyboard: false });
          marker.on("click", function (e) {
            L.DomEvent.stopPropagation(e);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(place.id);
            }
          });
          markersGroup.addLayer(marker);
        }
      }
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

    window.__setPlaces = function (places, selectedId) {
      currentPlaces = places;
      selectedPlaceId = selectedId || null;
      renderMarkers();
      var nextKey = places.map(function (place) { return place.id; }).join("|");
      if (nextKey !== placeKey) {
        placeKey = nextKey;
        fitPlaces(places);
      }
    };

    window.__setSelectedPlace = function (id) {
      selectedPlaceId = id || null;
      renderMarkers();
      if (selectedPlaceId) {
        var found = currentPlaces.find(function (p) { return p.id === selectedPlaceId; });
        if (found) {
          map.panTo([found.lat, found.lng], { animate: true });
        }
      }
    };
  </script>
</body>
</html>`;
}

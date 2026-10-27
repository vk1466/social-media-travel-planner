import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import type { Place } from "../api";
import { categoryLabel } from "../categoryLabels";
import { getCategoryVisual } from "../categoryVisuals";

interface OsmPlaceMapProps {
  places: Place[];
  visitedPlaceIds: ReadonlySet<string>;
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: Place | null) => void;
  onVisiblePlaceIdsChange?: (placeIds: string[]) => void;
  highlightedPlaceIds?: string[];
  fitPlaceIds?: string[] | null;
  fitKey?: number;
  isDark?: boolean;
}

/** Leaflet + CARTO Positron canvas styled for Wanderfile mobile design. */
export function OsmPlaceMap({
  places,
  visitedPlaceIds,
  selectedPlaceId,
  onSelectPlace,
  onVisiblePlaceIdsChange,
  highlightedPlaceIds,
  fitPlaceIds,
  fitKey,
  isDark = false,
}: OsmPlaceMapProps) {
  const payload = useMemo(
    () => markerPayload(places, visitedPlaceIds),
    [places, visitedPlaceIds],
  );
  const html = useMemo(() => buildMapHtml(isDark), [isDark]);
  const source = useMemo(
    () => ({ html, baseUrl: "https://openfreemap.org" }),
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

  const pushHighlights = useCallback((ids: string[] | undefined) => {
    webViewRef.current?.injectJavaScript(
      `window.__setHighlightedPlaces && window.__setHighlightedPlaces(${JSON.stringify(ids ?? [])}); true;`,
    );
  }, []);

  const pushFitPlaces = useCallback((ids: string[] | null | undefined) => {
    if (!ids || ids.length === 0) return;
    webViewRef.current?.injectJavaScript(
      `window.__fitPlacesBounds && window.__fitPlacesBounds(${JSON.stringify(ids)}); true;`,
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

  useEffect(() => {
    if (readyRef.current) {
      pushHighlights(highlightedPlaceIds);
    }
  }, [highlightedPlaceIds, pushHighlights]);

  useEffect(() => {
    if (readyRef.current && fitPlaceIds && fitPlaceIds.length > 0) {
      pushFitPlaces(fitPlaceIds);
    }
  }, [fitPlaceIds, fitKey, pushFitPlaces]);

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
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Wanderfile/1.0"
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
            pushHighlights(highlightedPlaceIds);
            if (fitPlaceIds && fitPlaceIds.length > 0) {
              pushFitPlaces(fitPlaceIds);
            }
          }}
          androidLayerType="hardware"
          cacheEnabled
          onMessage={(event) => {
            const data = event.nativeEvent.data;
            if (data === "__DESELECT__") {
              onSelectPlace?.(null);
              return;
            }
            if (typeof data === "string" && data.startsWith("{")) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "VISIBLE_PLACES" && Array.isArray(parsed.placeIds)) {
                  onVisiblePlaceIdsChange?.(parsed.placeIds);
                  return;
                }
              } catch {}
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
    backgroundColor: "#FAFAF9",
  },
});

function locationLine(place: Place): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

function markerPayload(places: Place[], visitedPlaceIds: ReadonlySet<string>): string {
  const markers = places.map((place) => {
    const visual = getCategoryVisual(place.category);
    const visited = visitedPlaceIds.has(place.place_id);
    return {
      id: place.place_id,
      name: place.display_name,
      lat: place.location.latitude!,
      lng: place.location.longitude!,
      visited,
      categoryLabel: visual.name,
      location: locationLine(place),
      tags: [visual.name, ...(place.attributes ?? [])].filter(Boolean).join(" · "),
      blurb: place.tips[0] ?? place.details[0] ?? "",
      color: visual.hue,
      icon: visual.glyph,
    };
  });
  return JSON.stringify(markers).replace(/</g, "\\u003c");
}

function buildMapHtml(isDark = false): string {
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const bgColor = isDark ? "#0E0F11" : "#FAFAF9";
  const inkColor = isDark ? "#23272E" : "#16181B";
  const haloColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(22, 24, 27, 0.18)";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: ${bgColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .leaflet-container { width: 100%; height: 100%; background: ${bgColor}; }
    .leaflet-control-attribution {
      font-size: 9px !important;
      color: ${isDark ? "#A2A7AE" : "#5E636B"} !important;
      background: ${isDark ? "rgba(23, 25, 28, 0.75)" : "rgba(255, 255, 255, 0.75)"} !important;
      padding: 2px 6px !important;
      border-radius: 4px;
      margin: 4px !important;
    }
    .saved-map-marker-host { border: 0; background: transparent; }
    .saved-map-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      cursor: pointer;
    }
    .wf-pin-circle {
      box-sizing: border-box;
      width: 32px;
      height: 32px;
      border: 2px solid #FFFFFF;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(16, 24, 40, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #FFFFFF;
      transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .saved-map-marker.is-dimmed {
      opacity: 0.35;
    }
    .saved-map-marker.is-selected .wf-pin-circle {
      transform: scale(1.2);
      border: 2px solid #FF5A4E;
      box-shadow: 0 4px 14px rgba(255, 90, 78, 0.4);
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
      background: ${isDark ? "#17191C" : "#FFFFFF"};
      border-radius: 999px;
      padding: 4px 12px;
      box-shadow: 0 4px 14px rgba(16, 24, 40, 0.18);
      margin-bottom: 6px;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      color: ${isDark ? "#F2F2F0" : "#16181B"};
      border: 1px solid ${isDark ? "#2A2D32" : "#E7E6E3"};
    }
    .selected-marker-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #FF5A4E;
      box-shadow: 0 4px 14px rgba(255, 90, 78, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transform: scale(1.2);
    }
    .marker-cluster, .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
      background-color: transparent !important;
    }
    .marker-cluster div, .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
      background-color: ${inkColor} !important;
      color: #FFFFFF !important;
      border: 2px solid ${isDark ? "rgba(255, 255, 255, 0.85)" : "#FFFFFF"} !important;
      box-shadow: 0 0 0 4px ${haloColor} !important;
      border-radius: 50% !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-weight: 700 !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.21/leaflet-maplibre-gl.js"></script>
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
      minZoom: 3,
      maxZoom: 19,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomAnimation: true
    });
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
    var openFreeMapStyle = ${JSON.stringify(isDark ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://tiles.openfreemap.org/styles/positron")};
    if (typeof L.maplibreGL === "function") {
      L.maplibreGL({
        style: openFreeMapStyle
      }).addTo(map);
    } else {
      L.tileLayer(${JSON.stringify(tileUrl)}, {
        attribution: isDark ? '&copy; OpenStreetMap contributors &copy; CARTO' : '&copy; OpenStreetMap contributors &copy; OpenFreeMap',
        maxZoom: 19
      }).addTo(map);
    }

    const markersGroup = (typeof L.markerClusterGroup === 'function')
      ? L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 40,
          spiderfyOnMaxZoom: true,
          zoomToBoundsOnClick: true,
          iconCreateFunction: function(cluster) {
            var count = cluster.getChildCount();
            var size = count < 10 ? 32 : count < 50 ? 40 : 48;
            return L.divIcon({
              html: '<div style="width:' + size + 'px;height:' + size + 'px;line-height:' + size + 'px;text-align:center;">' + count + '</div>',
              className: 'marker-cluster marker-cluster-small',
              iconSize: L.point(size, size)
            });
          }
        }).addTo(map)
      : L.layerGroup().addTo(map);
    let currentPlaces = [];
    let selectedPlaceId = null;
    let placeKey = "";
    let highlightedPlaceIds = [];

    map.on("click", function () {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage("__DESELECT__");
      }
    });

    function reportVisiblePlaces() {
      if (!window.ReactNativeWebView) return;
      var bounds = map.getBounds();
      var visibleIds = [];
      for (var i = 0; i < currentPlaces.length; i++) {
        var p = currentPlaces[i];
        if (bounds.contains([p.lat, p.lng])) {
          visibleIds.push(p.id);
        }
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "VISIBLE_PLACES",
        placeIds: visibleIds
      }));
    }

    map.on("moveend", reportVisiblePlaces);

    function fitPlaces(places) {
      if (!places.length) {
        map.setView([20, 0], 3, { animate: false });
        return;
      }
      if (places.length === 1) {
        map.setView([places[0].lat, places[0].lng], 13, { animate: false });
        return;
      }
      map.fitBounds(places.map(function (place) { return [place.lat, place.lng]; }), {
        paddingTopLeft: [30, 80],
        paddingBottomRight: [30, 140],
        maxZoom: 13,
        animate: false
      });
    }

    function renderMarkers() {
      markersGroup.clearLayers();
      var hasHighlights = highlightedPlaceIds && highlightedPlaceIds.length > 0;
      for (var i = 0; i < currentPlaces.length; i++) {
        var place = currentPlaces[i];
        var isSelected = place.id === selectedPlaceId;
        var highlightIdx = highlightedPlaceIds ? highlightedPlaceIds.indexOf(place.id) : -1;
        var isHighlighted = highlightIdx !== -1;
        var isDimmed = hasHighlights && !isHighlighted;
        var stopNumber = isHighlighted ? (highlightIdx + 1) : null;

        if (isSelected) {
          var icon = L.divIcon({
            className: "saved-map-marker-host",
            html: '<div class="selected-marker-wrap"><div class="selected-marker-pill">' + esc(place.name) + '</div><div class="selected-marker-dot" style="background:' + (place.color || '#2F80ED') + ';">' + (place.icon || '📍') + '</div></div>',
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          });
          var marker = L.marker([place.lat, place.lng], { icon: icon, keyboard: false, zIndexOffset: 1000 });
          (function (pid) {
            marker.on("click", function (e) {
              L.DomEvent.stopPropagation(e);
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(pid);
              }
            });
          })(place.id);
          markersGroup.addLayer(marker);
        } else if (isHighlighted) {
          var icon = L.divIcon({
            className: "saved-map-marker-host",
            html: '<span class="saved-map-marker is-highlighted"><div class="wf-pin-circle" style="background:' + (place.color || '#FF5A4E') + ';font-weight:700;">' + (stopNumber || '') + '</div></span>',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });
          var marker = L.marker([place.lat, place.lng], { icon: icon, keyboard: false, zIndexOffset: 800 });
          (function (pid) {
            marker.on("click", function (e) {
              L.DomEvent.stopPropagation(e);
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(pid);
              }
            });
          })(place.id);
          markersGroup.addLayer(marker);
        } else {
          var icon = L.divIcon({
            className: "saved-map-marker-host",
            html: '<span class="saved-map-marker' + (isDimmed ? ' is-dimmed' : '') + '"><div class="wf-pin-circle" style="background:' + (place.color || '#6B7280') + ';">' + (place.icon || '📍') + '</div></span>',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });
          var marker = L.marker([place.lat, place.lng], { icon: icon, keyboard: false });
          (function (pid) {
            marker.on("click", function (e) {
              L.DomEvent.stopPropagation(e);
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(pid);
              }
            });
          })(place.id);
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
      setTimeout(reportVisiblePlaces, 150);
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

    window.__setHighlightedPlaces = function (ids) {
      highlightedPlaceIds = ids || [];
      renderMarkers();
    };

    window.__fitPlacesBounds = function (placeIds) {
      if (!placeIds || !placeIds.length) return;
      var matched = currentPlaces.filter(function (p) {
        return placeIds.indexOf(p.id) !== -1;
      });
      if (!matched.length) return;
      var coords = matched.map(function (p) { return [p.lat, p.lng]; });
      if (coords.length === 1) {
        map.flyTo(coords[0], 14, { duration: 0.8 });
      } else {
        map.flyToBounds(coords, {
          paddingTopLeft: [30, 80],
          paddingBottomRight: [30, 140],
          maxZoom: 14,
          duration: 0.8
        });
      }
    };
  </script>
</body>
</html>`;
}

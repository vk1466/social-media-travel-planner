import * as maplibregl from "maplibre-gl";

// Ensure MapLibre web worker loads from the explicitly emitted static asset
if (typeof window !== "undefined") {
  try {
    const workerUrl = new URL("/assets/maplibre-gl-worker.mjs", window.location.origin).href;
    maplibregl.setWorkerUrl(workerUrl);
  } catch (err) {
    console.warn("Failed to set MapLibre workerUrl", err);
  }
}

export interface GoogleMapsLocation {
  display_name?: string | null;
  city?: string | null;
  state_province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  provider_place_id?: string | null;
}

function locationQuery(location: GoogleMapsLocation): string {
  return [
    location.display_name,
    location.city,
    location.state_province,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function isGooglePlaceId(providerPlaceId?: string | null): boolean {
  if (!providerPlaceId) {
    return false;
  }
  const token = providerPlaceId.trim();
  if (token.startsWith("overpass:") || /^\d+$/.test(token)) {
    return false;
  }
  return token.startsWith("ChIJ") || token.startsWith("GhIJ");
}

export function googleMapsUrl(location: GoogleMapsLocation): string | null {
  let query = locationQuery(location);
  if (!query) {
    const { latitude, longitude } = location;
    if (latitude != null && longitude != null) {
      query = `${latitude},${longitude}`;
    }
  }
  if (!query) {
    return null;
  }

  const params = new URLSearchParams({ api: "1", query });
  if (isGooglePlaceId(location.provider_place_id)) {
    params.set("query_place_id", location.provider_place_id!.trim());
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function googleMapsDirectionsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${latitude},${longitude}`,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const OSM_BASEMAP_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const OPENFREEMAP_BASEMAP_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://openfreemap.org">OpenFreeMap</a>';

export const CARTO_BASEMAP_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function osmStandardTileUrl(): string {
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}

/** Minimal, keyless basemap style for MapLibre: OpenFreeMap Positron (light) and Dark (dark). */
export function openFreeMapStyleUrl(isDark = false): string {
  return isDark
    ? "https://tiles.openfreemap.org/styles/dark"
    : "https://tiles.openfreemap.org/styles/positron";
}

export const ESRI_BASEMAP_ATTR =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, &copy; OpenStreetMap contributors';

export function cartoPositronTileUrl(isDark = false): string {
  return isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
}

/** Legacy alias */
export function cartoVoyagerTileUrl(): string {
  return cartoPositronTileUrl(false);
}

export function cartoLightNoLabelsTileUrl(): string {
  return cartoPositronTileUrl(false);
}

export function cartoDarkTileUrl(): string {
  return cartoPositronTileUrl(true);
}

/** MapLibre style definition for minimal basemap (subtle land, water, major roads, and minimal labels, zero POI/shop clutter). */
export function cartoMaplibreStyle(isDark = false): maplibregl.StyleSpecification {
  const baseTile = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
  const labelTile = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

  return {
    version: 8,
    name: isDark ? "Esri Dark Canvas Minimal" : "Esri Light Canvas Minimal",
    sources: {
      "esri-base": {
        type: "raster",
        tiles: [baseTile],
        tileSize: 256,
        attribution: ESRI_BASEMAP_ATTR,
      },
      "esri-labels": {
        type: "raster",
        tiles: [labelTile],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "esri-base-layer",
        type: "raster",
        source: "esri-base",
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: "esri-labels-layer",
        type: "raster",
        source: "esri-labels",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

/** OpenStreetMap embed (no API key) for a Google-Maps-like preview. */
export function osmEmbedUrl(latitude: number, longitude: number, span = 0.04): string {
  const west = longitude - span;
  const south = latitude - span;
  const east = longitude + span;
  const north = latitude + span;
  const bbox = `${west},${south},${east},${north}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

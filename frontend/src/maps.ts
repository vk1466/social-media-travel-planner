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

export const CARTO_BASEMAP_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function osmStandardTileUrl(): string {
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}

/** CARTO Positron & Dark Matter raster tiles (keyless, muted, no POI clutter). */
export function cartoPositronTileUrl(isDark = false): string {
  return isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

/** CARTO Voyager raster tiles (keyless, works in production). */
export function cartoVoyagerTileUrl(): string {
  return cartoPositronTileUrl(false);
}

export function cartoLightNoLabelsTileUrl(): string {
  return "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
}

export function cartoDarkTileUrl(): string {
  return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
}

/** MapLibre style definition for CARTO Positron / Dark Matter basemaps. */
export function cartoMaplibreStyle(isDark = false) {
  const tileUrl = isDark ? "dark_all" : "light_all";
  return {
    version: 8,
    sources: {
      "carto-raster": {
        type: "raster" as const,
        tiles: [
          `https://a.basemaps.cartocdn.com/${tileUrl}/{z}/{x}/{y}.png`,
          `https://b.basemaps.cartocdn.com/${tileUrl}/{z}/{x}/{y}.png`,
          `https://c.basemaps.cartocdn.com/${tileUrl}/{z}/{x}/{y}.png`,
          `https://d.basemaps.cartocdn.com/${tileUrl}/{z}/{x}/{y}.png`,
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: "carto-raster-layer",
        type: "raster" as const,
        source: "carto-raster",
        minzoom: 0,
        maxzoom: 24,
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

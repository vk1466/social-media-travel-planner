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

export const CARTO_BASEMAP_ATTR = OPENFREEMAP_BASEMAP_ATTR;

export function osmStandardTileUrl(): string {
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}

/** Minimal, keyless basemap style for MapLibre: OpenFreeMap Positron (light) and CARTO Dark Matter (dark). */
export function openFreeMapStyleUrl(isDark = false): string {
  return isDark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://tiles.openfreemap.org/styles/positron";
}

/** Clean, keyless raster tiles with zero watermark (fallback for Leaflet). */
export function cartoPositronTileUrl(_isDark = false): string {
  return osmStandardTileUrl();
}

/** Legacy alias */
export function cartoVoyagerTileUrl(): string {
  return osmStandardTileUrl();
}

export function cartoLightNoLabelsTileUrl(): string {
  return osmStandardTileUrl();
}

export function cartoDarkTileUrl(): string {
  return "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png";
}

/** MapLibre style definition for OpenFreeMap Positron / CARTO Dark Matter basemaps (zero watermark). */
export function cartoMaplibreStyle(isDark = false): string {
  return openFreeMapStyleUrl(isDark);
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

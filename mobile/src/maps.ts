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
  return [location.display_name, location.city, location.state_province, location.country]
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

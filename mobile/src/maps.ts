export interface GoogleMapsLocation {
  display_name?: string | null;
  city?: string | null;
  state_province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

function locationQuery(location: GoogleMapsLocation): string {
  return [location.display_name, location.city, location.state_province, location.country]
    .filter(Boolean)
    .join(", ");
}

export function googleMapsUrl(location: GoogleMapsLocation): string | null {
  const query = locationQuery(location);
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const { latitude, longitude } = location;
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return null;
}

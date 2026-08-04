import type { PlaceFacts } from "./api";

const SOURCE_LABELS: Record<string, string> = {
  osm: "OpenStreetMap",
  wikipedia: "Wikipedia",
  google_places: "Google",
  nps: "National Park Service",
};

export function factsAttribution(facts: PlaceFacts): string {
  const names = [
    ...new Set(
      facts.evidence
        .map((row) => SOURCE_LABELS[row.source_name] ?? row.source_name)
        .filter(Boolean),
    ),
  ];
  if (names.length === 0) return "";
  return `Facts from ${names.join(", ")}`;
}

export function factsRows(facts: PlaceFacts): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (facts.famous_for) rows.push({ label: "Famous for", value: facts.famous_for });
  if (facts.admission_text) rows.push({ label: "Admission", value: facts.admission_text });
  if (facts.opening_hours_text.length > 0) {
    rows.push({ label: "Hours", value: facts.opening_hours_text.join("; ") });
  }
  if (facts.cuisines.length > 0) {
    rows.push({ label: "Cuisine", value: facts.cuisines.join(", ") });
  }
  if (facts.best_time_to_visit) {
    rows.push({ label: "Best time", value: facts.best_time_to_visit });
  }
  if (facts.typical_duration_minutes != null) {
    rows.push({
      label: "Typical visit",
      value: `${facts.typical_duration_minutes} min`,
    });
  }
  if (facts.price_level != null) {
    rows.push({ label: "Price", value: "$".repeat(Math.max(1, facts.price_level)) });
  }
  if (facts.reservation_required != null) {
    rows.push({
      label: "Reservation",
      value: facts.reservation_required ? "Required" : "Not required",
    });
  }
  if (facts.website_url) rows.push({ label: "Website", value: facts.website_url });
  if (facts.phone_number) rows.push({ label: "Phone", value: facts.phone_number });
  if (facts.distance_km != null) {
    rows.push({ label: "Distance", value: `${facts.distance_km} km` });
  }
  if (facts.elevation_gain_m != null) {
    rows.push({ label: "Elevation gain", value: `${facts.elevation_gain_m} m` });
  }
  if (facts.difficulty) rows.push({ label: "Difficulty", value: facts.difficulty });
  return rows;
}

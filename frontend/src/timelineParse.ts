/** Client-side Google Maps Timeline parse (phone + Takeout). Keeps large files off the API. */

export type TimelineFormat = "phone" | "takeout_semantic" | "records" | "mixed" | "unknown";

export interface TimelineVisit {
  latitude: number;
  longitude: number;
  visited_from?: string | null;
  visited_to?: string | null;
  place_name?: string | null;
  google_place_id?: string | null;
  semantic_type?: string | null;
  address?: string | null;
  source_format?: TimelineFormat;
}

const SKIP_SEMANTIC = new Set(["TYPE_HOME", "TYPE_WORK", "HOME", "WORK"]);
const LAT_LNG_RE = /^\s*(-?\d+(?:\.\d+)?)\s*°?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?\s*$/;

export function detectFormat(payload: unknown): TimelineFormat {
  if (Array.isArray(payload)) {
    const first = payload[0];
    if (first && typeof first === "object") {
      const row = first as Record<string, unknown>;
      if ("visit" in row || "timelinePath" in row || "activity" in row) {
        return "phone";
      }
      if ("placeVisit" in row || "activitySegment" in row) {
        return "takeout_semantic";
      }
    }
    return "unknown";
  }
  if (!payload || typeof payload !== "object") {
    return "unknown";
  }
  const obj = payload as Record<string, unknown>;
  if ("semanticSegments" in obj || "rawSignals" in obj) {
    return "phone";
  }
  if ("timelineObjects" in obj) {
    return "takeout_semantic";
  }
  if ("locations" in obj) {
    return "records";
  }
  return "unknown";
}

function parseDegreeLatLng(value: unknown): [number, number] | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.replace(/\u00b0/g, "°").match(LAT_LNG_RE);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

function coordsFromE7(lat: unknown, lng: unknown): [number, number] | null {
  if (lat == null || lng == null) {
    return null;
  }
  const latitude = Number(lat) / 1e7;
  const longitude = Number(lng) / 1e7;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return [latitude, longitude];
}

function coordsFromLocation(location: unknown): [number, number] | null {
  if (!location || typeof location !== "object") {
    return null;
  }
  const loc = location as Record<string, unknown>;
  const e7 = coordsFromE7(loc.latitudeE7, loc.longitudeE7);
  if (e7) {
    return e7;
  }
  return parseDegreeLatLng(loc.latLng ?? loc.LatLng);
}

function dateFromTimestamp(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    let ms = value;
    if (ms < 1_000_000_000_000) {
      ms *= 1000;
    }
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  if (/^\d+$/.test(text)) {
    return dateFromTimestamp(Number(text));
  }
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  if (text.length >= 10 && text[4] === "-" && text[7] === "-") {
    return text.slice(0, 10);
  }
  return null;
}

function durationDates(duration: unknown): [string | null, string | null] {
  if (!duration || typeof duration !== "object") {
    return [null, null];
  }
  const d = duration as Record<string, unknown>;
  return [
    dateFromTimestamp(d.startTimestamp ?? d.startTimestampMs),
    dateFromTimestamp(d.endTimestamp ?? d.endTimestampMs),
  ];
}

function shouldSkipSemantic(semanticType: unknown): boolean {
  if (typeof semanticType !== "string") {
    return false;
  }
  return SKIP_SEMANTIC.has(semanticType.trim().toUpperCase());
}

function parsePhone(payload: unknown): TimelineVisit[] {
  const segments = Array.isArray(payload)
    ? payload
    : ((payload as Record<string, unknown>).semanticSegments as unknown[]);
  if (!Array.isArray(segments)) {
    return [];
  }
  const visits: TimelineVisit[] = [];
  for (const segment of segments) {
    if (!segment || typeof segment !== "object") {
      continue;
    }
    const seg = segment as Record<string, unknown>;
    const visit = seg.visit;
    if (!visit || typeof visit !== "object") {
      continue;
    }
    const candidate = (visit as Record<string, unknown>).topCandidate;
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const top = candidate as Record<string, unknown>;
    if (shouldSkipSemantic(top.semanticType)) {
      continue;
    }
    let coords: [number, number] | null = null;
    const placeLocation = top.placeLocation;
    if (placeLocation && typeof placeLocation === "object") {
      coords = coordsFromLocation(placeLocation);
    } else if (typeof placeLocation === "string") {
      coords = parseDegreeLatLng(placeLocation);
    }
    if (!coords) {
      continue;
    }
    visits.push({
      latitude: coords[0],
      longitude: coords[1],
      visited_from: dateFromTimestamp(seg.startTime),
      visited_to: dateFromTimestamp(seg.endTime),
      google_place_id: top.placeId ? String(top.placeId) : null,
      semantic_type: top.semanticType ? String(top.semanticType) : null,
      source_format: "phone",
    });
  }
  return visits;
}

function parseTakeout(payload: unknown): TimelineVisit[] {
  const objects = Array.isArray(payload)
    ? payload
    : ((payload as Record<string, unknown>).timelineObjects as unknown[]);
  if (!Array.isArray(objects)) {
    return [];
  }
  const visits: TimelineVisit[] = [];
  for (const item of objects) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const placeVisit = (item as Record<string, unknown>).placeVisit;
    if (!placeVisit || typeof placeVisit !== "object") {
      continue;
    }
    const pv = placeVisit as Record<string, unknown>;
    let location: Record<string, unknown> | null =
      pv.location && typeof pv.location === "object"
        ? (pv.location as Record<string, unknown>)
        : null;
    let coords = coordsFromLocation(location);
    const others = pv.otherCandidateLocations;
    if (!coords && Array.isArray(others)) {
      for (const alt of others) {
        if (alt && typeof alt === "object") {
          coords = coordsFromLocation(alt);
          if (coords) {
            location = alt as Record<string, unknown>;
            break;
          }
        }
      }
    }
    if (!coords || !location) {
      continue;
    }
    if (shouldSkipSemantic(location.semanticType)) {
      continue;
    }
    const [start, end] = durationDates(pv.duration);
    visits.push({
      latitude: coords[0],
      longitude: coords[1],
      visited_from: start,
      visited_to: end,
      place_name: location.name ? String(location.name).trim() : null,
      google_place_id: location.placeId ? String(location.placeId) : null,
      semantic_type: location.semanticType ? String(location.semanticType) : null,
      address: location.address ? String(location.address).trim() : null,
      source_format: "takeout_semantic",
    });
  }
  return visits;
}

export function parseTimelinePayload(payload: unknown): {
  format: TimelineFormat;
  visits: TimelineVisit[];
  home: TimelineHome | null;
} {
  const format = detectFormat(payload);
  const home = extractHome(payload);
  if (format === "phone") {
    return { format, visits: parsePhone(payload), home };
  }
  if (format === "takeout_semantic") {
    return { format, visits: parseTakeout(payload), home };
  }
  return { format, visits: [], home };
}

export interface TimelineCluster {
  latitude: number;
  longitude: number;
  visited_from?: string | null;
  visited_to?: string | null;
  place_name?: string | null;
  google_place_id?: string | null;
  semantic_type?: string | null;
  address?: string | null;
  visit_count: number;
}

export interface TimelineHome {
  latitude: number;
  longitude: number;
}

const CLUSTER_METERS = 75;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function clusterKey(visit: TimelineVisit): string {
  if (visit.google_place_id) {
    return `g:${visit.google_place_id}`;
  }
  return `c:${visit.latitude.toFixed(3)},${visit.longitude.toFixed(3)}`;
}

function mergeDate(a: string | null | undefined, b: string | null | undefined, prefer: "min" | "max"): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return prefer === "min" ? (a < b ? a : b) : a > b ? a : b;
}

export function clusterTimelineVisits(visits: TimelineVisit[]): TimelineCluster[] {
  const buckets = new Map<string, TimelineVisit[]>();
  for (const visit of visits) {
    const key = clusterKey(visit);
    const list = buckets.get(key) ?? [];
    list.push(visit);
    buckets.set(key, list);
  }

  const clusters: TimelineCluster[] = [];
  for (const group of buckets.values()) {
    const named = group.find((v) => v.place_name) ?? group[0];
    const typed = group.find((v) => v.semantic_type) ?? named;
    let visitedFrom: string | null = null;
    let visitedTo: string | null = null;
    for (const item of group) {
      visitedFrom = mergeDate(visitedFrom, item.visited_from, "min");
      visitedTo = mergeDate(visitedTo, item.visited_to ?? item.visited_from, "max");
    }
    const lat = group.reduce((sum, v) => sum + v.latitude, 0) / group.length;
    const lng = group.reduce((sum, v) => sum + v.longitude, 0) / group.length;
    clusters.push({
      latitude: lat,
      longitude: lng,
      visited_from: visitedFrom,
      visited_to: visitedTo === visitedFrom ? visitedFrom : visitedTo,
      place_name: named.place_name ?? null,
      google_place_id: named.google_place_id ?? null,
      semantic_type: typed.semantic_type ?? null,
      address: named.address ?? null,
      visit_count: group.length,
    });
  }

  const merged: TimelineCluster[] = [];
  for (const cluster of clusters.sort((a, b) =>
    (a.visited_from ?? "").localeCompare(b.visited_from ?? ""),
  )) {
    const mateIndex = merged.findIndex(
      (existing) =>
        haversineMeters(cluster.latitude, cluster.longitude, existing.latitude, existing.longitude) <=
        CLUSTER_METERS,
    );
    if (mateIndex < 0) {
      merged.push(cluster);
      continue;
    }
    const existing = merged[mateIndex];
    const total = existing.visit_count + cluster.visit_count;
    merged[mateIndex] = {
      latitude:
        (existing.latitude * existing.visit_count + cluster.latitude * cluster.visit_count) / total,
      longitude:
        (existing.longitude * existing.visit_count + cluster.longitude * cluster.visit_count) / total,
      visited_from: mergeDate(existing.visited_from, cluster.visited_from, "min"),
      visited_to: mergeDate(
        existing.visited_to ?? existing.visited_from,
        cluster.visited_to ?? cluster.visited_from,
        "max",
      ),
      place_name: existing.place_name || cluster.place_name,
      google_place_id: existing.google_place_id || cluster.google_place_id,
      semantic_type: existing.semantic_type || cluster.semantic_type,
      address: existing.address || cluster.address,
      visit_count: total,
    };
  }
  return merged;
}

function extractHome(payload: unknown): TimelineHome | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const profile = (payload as Record<string, unknown>).userLocationProfile;
  if (!profile || typeof profile !== "object") {
    return null;
  }
  const places = (profile as Record<string, unknown>).frequentPlaces;
  if (!Array.isArray(places)) {
    return null;
  }
  for (const place of places) {
    if (!place || typeof place !== "object") {
      continue;
    }
    const row = place as Record<string, unknown>;
    if (String(row.label || "").toUpperCase() !== "HOME") {
      continue;
    }
    const loc = row.placeLocation;
    if (typeof loc === "string") {
      const coords = parseDegreeLatLng(loc);
      if (coords) {
        return { latitude: coords[0], longitude: coords[1] };
      }
    }
    if (loc && typeof loc === "object") {
      const coords = coordsFromLocation(loc);
      if (coords) {
        return { latitude: coords[0], longitude: coords[1] };
      }
    }
  }
  return null;
}

async function parseZipBytes(data: ArrayBuffer): Promise<{
  format: TimelineFormat;
  visits: TimelineVisit[];
  home: TimelineHome | null;
}> {
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(data));
  const formats = new Set<TimelineFormat>();
  const visits: TimelineVisit[] = [];
  let home: TimelineHome | null = null;
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith(".json")) {
      continue;
    }
    try {
      const text = new TextDecoder("utf-8").decode(bytes);
      const payload = JSON.parse(text) as unknown;
      const parsed = parseTimelinePayload(payload);
      formats.add(parsed.format);
      visits.push(...parsed.visits);
      if (!home && parsed.home) {
        home = parsed.home;
      }
    } catch {
      // skip unreadable members
    }
  }
  if (formats.size === 0) {
    return { format: "unknown", visits: [], home };
  }
  if (formats.size === 1) {
    return { format: [...formats][0], visits, home };
  }
  const meaningful = [...formats].filter((f) => f !== "unknown" && f !== "records");
  if (meaningful.length > 1) {
    return { format: "mixed", visits, home };
  }
  if (meaningful.length === 1) {
    return { format: meaningful[0], visits, home };
  }
  if (formats.has("records")) {
    return { format: "records", visits, home };
  }
  return { format: "unknown", visits, home };
}

export async function parseTimelineBytes(
  buffer: ArrayBuffer,
  filename: string,
): Promise<{
  format: TimelineFormat;
  visits: TimelineVisit[];
  clusters: TimelineCluster[];
  home: TimelineHome | null;
}> {
  const name = filename.toLowerCase();
  let parsed: { format: TimelineFormat; visits: TimelineVisit[]; home: TimelineHome | null };
  if (
    name.endsWith(".zip") ||
    (buffer.byteLength >= 2 &&
      new Uint8Array(buffer)[0] === 0x50 &&
      new Uint8Array(buffer)[1] === 0x4b)
  ) {
    parsed = await parseZipBytes(buffer);
  } else {
    const text = new TextDecoder("utf-8").decode(buffer);
    parsed = parseTimelinePayload(JSON.parse(text) as unknown);
  }
  return {
    ...parsed,
    clusters: clusterTimelineVisits(parsed.visits),
  };
}

export async function parseTimelineFile(file: File): Promise<{
  format: TimelineFormat;
  visits: TimelineVisit[];
  clusters: TimelineCluster[];
  home: TimelineHome | null;
}> {
  return parseTimelineBytes(await file.arrayBuffer(), file.name);
}

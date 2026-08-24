import type { ExtractedPlace, Place, PlatformPlace, SavedPost } from "../api";
import { googleMapsUrl } from "../maps";
import { getCaptionExcerpt, getPostTitle } from "../postDisplayUtils";

export interface LinkedPlace {
  placeId: string;
  displayName: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  providerPlaceId?: string | null;
}

export interface PlaceSummary {
  key: string;
  name: string;
  placeId?: string;
  locationLine?: string;
  parentPlaceName?: string | null;
  category?: string | null;
  attributes: string[];
  details?: string | null;
  tips: string[];
  mapUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function locationFromExtracted(place: ExtractedPlace): string | undefined {
  const parts = [place.city, place.state_province, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function locationFromTagged(place: PlatformPlace): string | undefined {
  const parts = [place.city, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function locationFromLinked(place: LinkedPlace): string | undefined {
  const parts = [place.city, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function mapsQueryForSummary(
  name: string,
  extracted?: ExtractedPlace,
  linked?: LinkedPlace,
  tagged?: PlatformPlace,
): ReturnType<typeof googleMapsUrl> {
  return googleMapsUrl({
    display_name: name,
    city: extracted?.city ?? linked?.city ?? tagged?.city,
    state_province: extracted?.state_province,
    country: extracted?.country ?? linked?.country ?? tagged?.country,
    latitude: linked?.latitude ?? tagged?.latitude,
    longitude: linked?.longitude ?? tagged?.longitude,
    provider_place_id: linked?.providerPlaceId,
  });
}

export function mapPlaceStub(place: PlaceSummary): Place | null {
  if (place.latitude == null || place.longitude == null) {
    return null;
  }
  return {
    place_id: place.placeId ?? place.key,
    display_name: place.name,
    location: {
      display_name: place.name,
      city: null,
      country: null,
      latitude: place.latitude,
      longitude: place.longitude,
    },
    aliases: [],
    attributes: place.attributes,
    details: place.details ? [place.details] : [],
    tips: place.tips,
    source_post_ids: [],
    category: place.category,
  };
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const north = latitude >= 0 ? "N" : "S";
  const east = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(3)}°${north}  ${Math.abs(longitude).toFixed(3)}°${east}`;
}

/** Place ids look like `us-washington-clallam-county-devils-punchbowl`. */
export function isPlaceIdSlug(value: string): boolean {
  return /^[a-z]{2}(?:-[a-z0-9]+){2,}$/.test(value.trim());
}

export function humanizePlaceSlug(placeId: string): string {
  const parts = placeId.trim().toLowerCase().split("-").filter(Boolean);
  if (parts[0] && parts[0].length === 2) {
    parts.shift();
  }
  const adminWords = new Set(["county", "parish", "borough", "municipality", "province"]);
  let start = 0;
  for (let index = 0; index < parts.length; index += 1) {
    if (adminWords.has(parts[index] ?? "")) {
      start = index + 1;
    }
  }
  const nameParts =
    start > 0 && start < parts.length ? parts.slice(start) : parts.slice(-3);
  return nameParts
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

export function readablePlaceName(
  extractedName?: string | null,
  linkedName?: string | null,
  placeId?: string | null,
): string {
  for (const candidate of [extractedName, linkedName]) {
    const trimmed = candidate?.trim();
    if (trimmed && !isPlaceIdSlug(trimmed)) {
      return trimmed;
    }
  }
  const slug = [placeId, linkedName, extractedName].find((value) => value?.trim());
  return slug ? humanizePlaceSlug(slug) : "Unknown place";
}

export function buildPlaceSummaries(post: SavedPost, linkedPlaces: LinkedPlace[]): PlaceSummary[] {
  const linkedByIndex = new Map(linkedPlaces.map((linked, index) => [index, linked]));
  const count = Math.max(post.extracted_places.length, post.place_ids.length);

  if (count > 0) {
    const summaries: PlaceSummary[] = [];
    for (let index = 0; index < count; index += 1) {
      const extracted = post.extracted_places[index];
      const linked = linkedByIndex.get(index) ?? (
        post.place_ids[index]
          ? { placeId: post.place_ids[index], displayName: post.place_ids[index] }
          : undefined
      );

      if (extracted) {
        const name = readablePlaceName(extracted.place_name, linked?.displayName, linked?.placeId);
        summaries.push({
          key: linked?.placeId ?? `${extracted.place_name}-${index}`,
          name,
          placeId: linked?.placeId,
          locationLine: locationFromExtracted(extracted) ?? (linked ? locationFromLinked(linked) : undefined),
          parentPlaceName: extracted.parent_place_name,
          category: extracted.category,
          attributes: extracted.attributes ?? [],
          details: extracted.details,
          tips: extracted.tips,
          mapUrl: mapsQueryForSummary(name, extracted, linked),
          latitude: linked?.latitude,
          longitude: linked?.longitude,
        });
        continue;
      }

      if (linked) {
        const name = readablePlaceName(undefined, linked.displayName, linked.placeId);
        summaries.push({
          key: linked.placeId,
          name,
          placeId: linked.placeId,
          locationLine: locationFromLinked(linked),
          attributes: [],
          tips: [],
          mapUrl: mapsQueryForSummary(name, undefined, linked),
          latitude: linked.latitude,
          longitude: linked.longitude,
        });
      }
    }
    return summaries;
  }

  return post.places.map((place, index) => {
    const mapUrl = googleMapsUrl({
      display_name: place.place_name,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    return {
      key: `${place.place_name}-${place.latitude}-${place.longitude}-${index}`,
      name: place.place_name,
      locationLine: locationFromTagged(place),
      attributes: [],
      tips: [],
      mapUrl,
      latitude: place.latitude,
      longitude: place.longitude,
    };
  });
}

export function captionFallbackSummary(post: SavedPost): string {
  const caption = post.caption?.trim() ?? "";
  if (!caption) {
    return "";
  }
  const lines = caption
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return lines.slice(1).join(" ");
  }
  return caption;
}

export function shortHeading(post: SavedPost): string {
  const title = getPostTitle(post);
  if (title.length <= 56) {
    return title;
  }
  return `${title.slice(0, 53).trimEnd()}…`;
}

export function buildReelSummary(post: SavedPost): {
  llmSummary: string;
  fallbackSummary: string;
  reelSummary: string;
  summaryExcerpt: ReturnType<typeof getCaptionExcerpt>;
} {
  const llmSummary = post.reel_summary?.trim() ?? "";
  const fallbackSummary = captionFallbackSummary(post);
  const reelSummary = llmSummary || fallbackSummary;
  const summaryExcerpt = getCaptionExcerpt(reelSummary, 160);
  return { llmSummary, fallbackSummary, reelSummary, summaryExcerpt };
}

/** Returns indices of dots to show — at most `maxVisible`, centered on `active`. */
export function windowedDotIndices(count: number, active: number, maxVisible = 7): number[] {
  if (count <= maxVisible) {
    return Array.from({ length: count }, (_, i) => i);
  }
  const half = Math.floor(maxVisible / 2);
  const start = Math.max(0, Math.min(active - half, count - maxVisible));
  return Array.from({ length: maxVisible }, (_, i) => start + i);
}

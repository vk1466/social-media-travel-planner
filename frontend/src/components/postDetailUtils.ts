import type {
  ExtractedMovie,
  ExtractedPlace,
  Place,
  PlatformPlace,
  ResolvedMovie,
  SavedPost,
} from "../api";
import { categoryLabel } from "../categoryLabels";
import { contentCategoryLabel, effectiveContentCategory } from "../contentCategory";
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

/** Bottom-strip card for travel stops, movies, or generic reel details. */
export interface ReelDetailItem {
  key: string;
  name: string;
  category?: string | null;
  metaParts: string[];
  details?: string | null;
  tip?: string | null;
  placeId?: string;
  mapUrl?: string | null;
  actionLabel?: string | null;
  actionHref?: string | null;
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

export function movieKindLabel(kind?: string | null): string {
  return kind?.trim().toLowerCase() === "tv" ? "TV series" : "Film";
}

function formatRuntime(minutes?: number | null): string | undefined {
  if (minutes == null || minutes <= 0) {
    return undefined;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  if (rest === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${rest}m`;
}

function movieCatalogUrl(movie: ResolvedMovie): { href: string; label: string } {
  const imdbId = movie.imdb_id?.trim();
  if (imdbId) {
    return { href: `https://www.imdb.com/title/${imdbId}/`, label: "IMDb" };
  }
  const path = movie.kind?.trim().toLowerCase() === "tv" ? "tv" : "movie";
  return { href: `https://www.themoviedb.org/${path}/${movie.tmdb_id}`, label: "TMDB" };
}

function movieMetaParts(movie: ResolvedMovie, extracted?: ExtractedMovie): string[] {
  const seasons = movie.number_of_seasons;
  return [
    movie.year != null ? String(movie.year) : extracted?.year != null ? String(extracted.year) : undefined,
    formatRuntime(movie.runtime_minutes),
    seasons != null && seasons > 0 ? `${seasons} season${seasons === 1 ? "" : "s"}` : undefined,
    movie.classification,
    movie.imdb_rating != null ? `IMDb ${movie.imdb_rating.toFixed(1)}` : undefined,
    movie.rotten_tomatoes_percent != null ? `RT ${movie.rotten_tomatoes_percent}%` : undefined,
    movie.genres.slice(0, 3).join(" · ") || undefined,
  ].filter((part): part is string => Boolean(part));
}

function detailItemFromResolvedMovie(
  movie: ResolvedMovie,
  extracted: ExtractedMovie | undefined,
  key: string,
): ReelDetailItem {
  const catalog = movieCatalogUrl(movie);
  return {
    key,
    name: movie.title,
    category: movieKindLabel(movie.kind ?? extracted?.kind),
    metaParts: movieMetaParts(movie, extracted),
    details: extracted?.details?.trim() || movie.plot_summary,
    tip: movie.review_summary,
    actionHref: catalog.href,
    actionLabel: catalog.label,
  };
}

export function buildMovieDetailItems(post: SavedPost): ReelDetailItem[] {
  const extracted = post.extracted_movies ?? [];
  const resolved = post.resolved_movies ?? [];
  const usedResolved = new Set<number>();
  const items: ReelDetailItem[] = [];

  extracted.forEach((mention, index) => {
    const matchIndex = resolved.findIndex((movie, resolvedIndex) => {
      if (usedResolved.has(resolvedIndex)) {
        return false;
      }
      return movie.title.trim().toLowerCase() === mention.title.trim().toLowerCase();
    });
    if (matchIndex >= 0) {
      usedResolved.add(matchIndex);
      const movie = resolved[matchIndex]!;
      items.push(detailItemFromResolvedMovie(movie, mention, `movie-${movie.tmdb_id}`));
      return;
    }
    items.push({
      key: `extracted-movie-${index}`,
      name: mention.title,
      category: movieKindLabel(mention.kind),
      metaParts: mention.year != null ? [String(mention.year)] : [],
      details: mention.details,
    });
  });

  resolved.forEach((movie, index) => {
    if (usedResolved.has(index)) {
      return;
    }
    items.push(detailItemFromResolvedMovie(movie, undefined, `movie-${movie.tmdb_id}-${index}`));
  });

  return items;
}

export function placeSummaryToDetailItem(place: PlaceSummary): ReelDetailItem {
  const metaParts = [place.locationLine].filter((part): part is string => Boolean(part));
  return {
    key: place.key,
    name: place.name,
    category: place.category ? categoryLabel(place.category) : undefined,
    metaParts,
    details: place.details,
    tip: place.tips[0],
    placeId: place.placeId,
    mapUrl: place.mapUrl,
  };
}

export function buildGenericReelDetailItems(post: SavedPost): ReelDetailItem[] {
  const { reelSummary } = buildReelSummary(post);
  const heading = shortHeading(post);
  if (!reelSummary && !heading) {
    return [];
  }
  return [
    {
      key: "reel-details",
      name: heading || "Saved post",
      category: contentCategoryLabel(effectiveContentCategory(post)),
      metaParts: post.hashtags.slice(0, 4).map((tag) => tag.replace(/^#/, "")),
      details: reelSummary || undefined,
    },
  ];
}

export function buildReelDetailItems(
  post: SavedPost,
  placeSummaries: PlaceSummary[],
): ReelDetailItem[] {
  const category = effectiveContentCategory(post);
  if (category === "travel") {
    return placeSummaries.map(placeSummaryToDetailItem);
  }
  if (category === "movies") {
    const movies = buildMovieDetailItems(post);
    return movies.length > 0 ? movies : buildGenericReelDetailItems(post);
  }
  return buildGenericReelDetailItems(post);
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

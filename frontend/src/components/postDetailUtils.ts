import type {
  ExtractedMovie,
  ExtractedPlace,
  Place,
  PlaceFacts,
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
  stateProvince?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  providerPlaceId?: string | null;
  facts?: PlaceFacts | null;
  parentPlaceId?: string | null;
}

export interface TrailStats {
  distance?: string;
  elevation?: string;
  difficulty?: string;
  routeType?: string;
  rating?: number;
  reviewsCount?: number;
  alltrailsUrl?: string;
}

export interface PlaceSummary {
  key: string;
  name: string;
  placeId?: string;
  parentPlaceId?: string | null;
  locationLine?: string;
  parentPlaceName?: string | null;
  category?: string | null;
  attributes: string[];
  details?: string | null;
  tips: string[];
  mapUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  facts?: PlaceFacts | null;
}

/** Bottom-strip card for travel stops, movies, or generic reel details. */
export interface ReelDetailItem {
  key: string;
  name: string;
  category?: string | null;
  metaParts: string[];
  details?: string | null;
  tip?: string | null;
  tips?: string[];
  actionHref?: string;
  actionLabel?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  trailerKey?: string | null;
  directors?: string[];
  cast?: string[];
  watchProviders?: string[];
  imdbRating?: number | null;
  rottenTomatoesPercent?: number | null;
  facts?: PlaceFacts | null;
  trailStats?: TrailStats;
  placeId?: string;
  mapUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function locationFromExtracted(extracted: ExtractedPlace): string | undefined {
  const parts = [extracted.city, extracted.state_province, extracted.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function locationFromTagged(place: PlatformPlace): string | undefined {
  const parts = [place.city, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function locationFromLinked(linked: LinkedPlace): string | undefined {
  const parts = [linked.city, linked.stateProvince, linked.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function mapsQueryForSummary(
  name: string,
  extracted?: ExtractedPlace,
  linked?: LinkedPlace,
): string {
  const url = googleMapsUrl({
    display_name: name,
    city: extracted?.city ?? linked?.city ?? undefined,
    state_province: extracted?.state_province ?? linked?.stateProvince ?? undefined,
    country: extracted?.country ?? linked?.country ?? undefined,
    latitude: linked?.latitude,
    longitude: linked?.longitude,
    provider_place_id: linked?.providerPlaceId ?? undefined,
  });
  return url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}

export function mapPlaceStub(place: PlaceSummary): Place | null {
  if (place.latitude == null || place.longitude == null) {
    return null;
  }
  return {
    place_id: place.placeId ?? place.key,
    display_name: place.name,
    parent_place_id: place.parentPlaceId ?? null,
    location: {
      display_name: place.name,
      city: place.city ?? null,
      state_province: place.stateProvince ?? null,
      country: place.country ?? null,
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

export function humanizePlaceSlug(slug: string): string {
  const raw = slug.trim().toLowerCase();
  const parts = raw.split("-").filter(Boolean);
  if (parts.length === 0) {
    return "Unknown place";
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
          parentPlaceId: linked?.parentPlaceId ?? null,
          locationLine: locationFromExtracted(extracted) ?? (linked ? locationFromLinked(linked) : undefined),
          parentPlaceName: extracted.parent_place_name,
          category: extracted.category,
          attributes: extracted.attributes ?? [],
          details: extracted.details,
          tips: extracted.tips,
          mapUrl: mapsQueryForSummary(name, extracted, linked),
          latitude: linked?.latitude,
          longitude: linked?.longitude,
          city: extracted.city ?? linked?.city ?? null,
          stateProvince: extracted.state_province ?? linked?.stateProvince ?? null,
          country: extracted.country ?? linked?.country ?? null,
          facts: linked?.facts,
        });
        continue;
      }

      if (linked) {
        const name = readablePlaceName(undefined, linked.displayName, linked.placeId);
        summaries.push({
          key: linked.placeId,
          name,
          placeId: linked.placeId,
          parentPlaceId: linked.parentPlaceId ?? null,
          locationLine: locationFromLinked(linked),
          attributes: [],
          tips: [],
          mapUrl: mapsQueryForSummary(name, undefined, linked),
          latitude: linked.latitude,
          longitude: linked.longitude,
          city: linked.city ?? null,
          stateProvince: linked.stateProvince ?? null,
          country: linked.country ?? null,
          facts: linked.facts,
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
    posterUrl: movie.poster_url,
    backdropUrl: movie.backdrop_url,
    trailerKey: movie.trailer_youtube_key,
    directors: movie.directors,
    cast: movie.cast,
    watchProviders: movie.watch_providers,
    imdbRating: movie.imdb_rating,
    rottenTomatoesPercent: movie.rotten_tomatoes_percent,
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

export function buildTrailStats(
  facts?: PlaceFacts | null,
  tips?: string[],
  details?: string | null,
): TrailStats | null {
  let distance: string | undefined;
  let elevation: string | undefined;
  let difficulty: string | undefined = facts?.difficulty ?? undefined;
  let routeType: string | undefined = facts?.route_type ? facts.route_type.replace(/_/g, " ") : undefined;
  const rating = facts?.rating ?? undefined;
  const reviewsCount = facts?.reviews_count ?? undefined;
  const alltrailsUrl =
    facts?.website_url && facts.website_url.includes("alltrails.com") ? facts.website_url : undefined;

  if (facts?.distance_km != null) {
    const mi = (facts.distance_km * 0.621371).toFixed(1);
    distance = `${mi} mi (${facts.distance_km.toFixed(1)} km)`;
  }
  if (facts?.elevation_gain_m != null) {
    const ft = Math.round(facts.elevation_gain_m * 3.28084);
    elevation = `↗ ${ft} ft (${facts.elevation_gain_m} m)`;
  }

  // Fallback to text parsing from creator tips/details if structured facts aren't populated yet
  if (!distance || !elevation) {
    const combined = [...(tips ?? []), details ?? ""].join(" ");
    if (!distance) {
      const distMatch = combined.match(/(\d+(?:\.\d+)?)\s*(?:mi(?:les)?\b|rt\b|round\s*trip)/i);
      if (distMatch) {
        distance = `${distMatch[1]} mi rt`;
      }
    }
    if (!elevation) {
      const elevMatch = combined.match(/(\d+(?:,\d+)?)\s*(?:ft|feet|m|meters)?\s*(?:of\s*)?(?:gain|elevation)/i);
      if (elevMatch) {
        elevation = `↗ ${elevMatch[1]} ft gain`;
      }
    }
  }

  if (!distance && !elevation && !difficulty && !routeType && !rating && !alltrailsUrl) {
    return null;
  }

  return {
    distance,
    elevation,
    difficulty,
    routeType,
    rating,
    reviewsCount,
    alltrailsUrl,
  };
}

export function placeSummaryToDetailItem(place: PlaceSummary): ReelDetailItem {
  const metaParts = [place.locationLine].filter((part): part is string => Boolean(part));
  const isHike = place.category?.toLowerCase() === "hike" || place.facts?.distance_km != null;
  const trailStats = isHike ? (buildTrailStats(place.facts, place.tips, place.details) ?? undefined) : undefined;

  return {
    key: place.key,
    name: place.name,
    category: place.category ? categoryLabel(place.category) : undefined,
    metaParts,
    details: place.details,
    tip: place.tips[0],
    tips: place.tips,
    placeId: place.placeId,
    mapUrl: place.mapUrl,
    facts: place.facts,
    trailStats,
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
      tips: post.trip_tips ?? [],
    },
  ];
}

export function buildReelDetailItems(
  post: SavedPost,
  placeSummaries: PlaceSummary[],
): ReelDetailItem[] {
  const category = effectiveContentCategory(post);
  if (category === "food" && post.extracted_recipe) {
    const recipe = post.extracted_recipe;
    return [{
      key: "recipe",
      name: recipe.title || "Recipe idea",
      category: recipe.cuisine || "Food",
      metaParts: [
        recipe.meal_type,
        recipe.difficulty,
        recipe.ingredients.length ? `${recipe.ingredients.length} ingredients` : null,
      ].filter((part): part is string => Boolean(part)),
      details: recipe.summary || undefined,
      tip: recipe.tips?.[0],
      tips: recipe.tips ?? [],
    }];
  }
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

function approxDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/**
 * Detects if a place in a post's place list is an enclosing/parent entity
 * (such as a containing National Park, State Park, or City) when more specific
 * child places (landmarks, trails, attractions) within it are also present.
 */
export function isEnclosingParentPlace(
  place: Place,
  allPlaces: Place[],
  parentPlaceIds: Set<string>,
  parentPlaceNames: Set<string>,
  postTextCorpus: string,
): boolean {
  if (allPlaces.length <= 1) {
    return false;
  }

  const pid = place.place_id?.trim().toLowerCase();
  const rawName = place.display_name?.trim().toLowerCase() || "";
  const clean = rawName.replace(/['’]/g, "").replace(/\s+/g, " ");

  // 1. Explicit parent match by ID
  if (pid && parentPlaceIds.has(pid)) {
    return true;
  }

  // 2. Explicit parent match by name
  if (clean) {
    for (const parentName of parentPlaceNames) {
      const cleanParent = parentName.replace(/['’]/g, "").replace(/\s+/g, " ");
      if (
        clean === cleanParent ||
        clean.startsWith(cleanParent) ||
        cleanParent.startsWith(clean)
      ) {
        return true;
      }
    }
  }

  // 3. Category / Name based broad parent detection:
  // Check if this place is a broad container (Park, National Park, City, Region)
  const category = (place.category || "").toLowerCase().trim();
  const isParkCategory =
    category === "park" ||
    category === "national_park" ||
    category === "state_park" ||
    category === "provincial_park" ||
    category === "protected_area";
  const isCityOrRegionCategory =
    category === "city" ||
    category === "town" ||
    category === "administrative" ||
    category === "region" ||
    category === "county";
  const hasParkInName =
    /\b(national park|state park|provincial park|national forest|national monument|national preserve)\b/i.test(
      place.display_name,
    );

  const isBroadContainer = isParkCategory || isCityOrRegionCategory || hasParkInName;

  if (isBroadContainer) {
    // Check if there are other more specific places in the list that belong to this broad area
    const otherPlaces = allPlaces.filter(
      (other) => (other.place_id || other.display_name) !== (place.place_id || place.display_name),
    );

    const specificChildren = otherPlaces.filter((other) => {
      const otherCategory = (other.category || "").toLowerCase().trim();
      const otherIsBroad =
        otherCategory === "park" ||
        otherCategory === "national_park" ||
        otherCategory === "city" ||
        /\b(national park|state park)\b/i.test(other.display_name);

      if (!otherIsBroad) {
        // Name keyword of the broad container (e.g. "Yellowstone", "Banff", "Zion")
        const coreName = place.display_name
          .replace(/\b(national park|state park|provincial park|park|city|county|region)\b/gi, "")
          .trim()
          .toLowerCase();

        // 1. Direct name match (e.g. "Yellowstone Lake" contains "yellowstone")
        if (coreName.length >= 3 && other.display_name.toLowerCase().includes(coreName)) {
          return true;
        }

        // 2. Geographic proximity (e.g. within 90km for park or 35km for city)
        if (
          place.location?.latitude != null &&
          place.location?.longitude != null &&
          other.location?.latitude != null &&
          other.location?.longitude != null
        ) {
          const distKm = approxDistanceKm(
            place.location.latitude,
            place.location.longitude,
            other.location.latitude,
            other.location.longitude,
          );
          const maxDistance = isParkCategory || hasParkInName ? 90 : 35;
          if (distKm <= maxDistance) {
            const sameState = Boolean(
              place.location.state_province &&
              other.location.state_province &&
              place.location.state_province === other.location.state_province,
            );
            const corpusMentionsParent =
              coreName.length >= 3 && postTextCorpus.toLowerCase().includes(coreName);

            if (sameState || corpusMentionsParent) {
              return true;
            }
          }
        }

        // 3. Matching city or same parent area
        const sameCity = Boolean(
          place.location?.city &&
          other.location?.city &&
          place.location.city.toLowerCase() === other.location.city.toLowerCase(),
        );
        if (sameCity) {
          return true;
        }

        // 4. Mentioned in caption alongside core name if state matches
        const sameState = Boolean(
          place.location?.state_province &&
          other.location?.state_province &&
          place.location.state_province === other.location.state_province,
        );
        const corpusMentionsParent =
          coreName.length >= 3 && postTextCorpus.toLowerCase().includes(coreName);
        if (sameState && corpusMentionsParent) {
          return true;
        }
      }
      return false;
    });

    if (specificChildren.length > 0) {
      return true;
    }
  }

  return false;
}



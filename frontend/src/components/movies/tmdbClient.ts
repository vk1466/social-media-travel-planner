/**
 * Client-side TMDB enrichment for movies/TV shows that have a tmdb_id
 * but were saved before backend enrichment fields existed.
 */

const TMDB_API_KEY = "7fb131ef9e2f958cb0865495a76cc943";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TmdbEnrichedData {
  poster_url?: string | null;
  backdrop_url?: string | null;
  trailer_youtube_key?: string | null;
  genres?: string[];
  directors?: string[];
  cast?: string[];
  watch_providers?: string[];
  runtime_minutes?: number | null;
  plot_summary?: string | null;
}

const memoryCache = new Map<string, TmdbEnrichedData>();

function extractTrailer(videos: unknown): string | null {
  if (!videos || typeof videos !== "object" || !("results" in videos)) return null;
  const results = (videos as { results?: Array<Record<string, unknown>> }).results;
  if (!Array.isArray(results)) return null;

  for (const item of results) {
    if (String(item.site || "").toLowerCase() === "youtube") {
      if (String(item.type || "").toLowerCase() === "trailer" && item.key) {
        return String(item.key).trim();
      }
    }
  }
  for (const item of results) {
    if (String(item.site || "").toLowerCase() === "youtube" && item.key) {
      return String(item.key).trim();
    }
  }
  return null;
}

function extractDirectors(details: Record<string, unknown>, isTv: boolean): string[] {
  const directors: string[] = [];
  const createdBy = details.created_by;
  if (Array.isArray(createdBy)) {
    for (const c of createdBy) {
      if (c && typeof c === "object" && "name" in c) {
        const name = String(c.name).trim();
        if (name && !directors.includes(name)) directors.push(name);
      }
    }
  }
  const credits = details.credits as Record<string, unknown> | undefined;
  const crew = credits?.crew;
  if (Array.isArray(crew)) {
    for (const member of crew) {
      if (!member || typeof member !== "object") continue;
      const job = String(member.job || "").trim();
      if (job === "Director" || (isTv && (job === "Executive Producer" || job === "Director"))) {
        const name = String(member.name || "").trim();
        if (name && !directors.includes(name)) directors.push(name);
      }
      if (directors.length >= 3) break;
    }
  }
  return directors;
}

function extractCast(details: Record<string, unknown>): string[] {
  const cast: string[] = [];
  const credits = details.credits as Record<string, unknown> | undefined;
  const list = credits?.cast;
  if (Array.isArray(list)) {
    for (const member of list) {
      if (!member || typeof member !== "object") continue;
      const name = String(member.name || "").trim();
      if (name && !cast.includes(name)) cast.push(name);
      if (cast.length >= 5) break;
    }
  }
  return cast;
}

function extractProviders(details: Record<string, unknown>): string[] {
  const providers: string[] = [];
  const wp = (details["watch/providers"] || details.watch_providers) as Record<string, unknown> | undefined;
  const results = wp?.results as Record<string, Record<string, unknown>> | undefined;
  if (!results || typeof results !== "object") return providers;

  const country = results.US || results.IN || Object.values(results)[0];
  if (country && typeof country === "object") {
    const lists = [country.flatrate, country.free, country.ads];
    for (const list of lists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item === "object" && "provider_name" in item) {
            const name = String(item.provider_name).trim();
            if (name && !providers.includes(name)) providers.push(name);
          }
        }
      }
    }
  }
  return providers;
}

export async function fetchTmdbExtras(
  tmdbId: number,
  kind?: string | null
): Promise<TmdbEnrichedData | null> {
  const isTv = kind === "tv";
  const cacheKey = `${isTv ? "tv" : "movie"}-${tmdbId}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Try sessionStorage
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(`tmdb_extra_${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as TmdbEnrichedData;
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  const endpoint = `${TMDB_BASE_URL}/${isTv ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,watch/providers`;

  try {
    const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    const posterPath = typeof data.poster_path === "string" ? data.poster_path : null;
    const backdropPath = typeof data.backdrop_path === "string" ? data.backdrop_path : null;

    const enriched: TmdbEnrichedData = {
      poster_url: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
      backdrop_url: backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : null,
      trailer_youtube_key: extractTrailer(data.videos),
      directors: extractDirectors(data, isTv),
      cast: extractCast(data),
      watch_providers: extractProviders(data),
      runtime_minutes:
        typeof data.runtime === "number"
          ? data.runtime
          : Array.isArray(data.episode_run_time) && typeof data.episode_run_time[0] === "number"
          ? (data.episode_run_time[0] as number)
          : null,
      plot_summary: typeof data.overview === "string" && data.overview.trim() ? data.overview.trim() : null,
    };

    if (Array.isArray(data.genres)) {
      enriched.genres = data.genres
        .map((g) => (g && typeof g === "object" && "name" in g ? String(g.name).trim() : ""))
        .filter(Boolean);
    }

    memoryCache.set(cacheKey, enriched);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(`tmdb_extra_${cacheKey}`, JSON.stringify(enriched));
      } catch {
        // ignore storage quota errors
      }
    }
    return enriched;
  } catch {
    return null;
  }
}

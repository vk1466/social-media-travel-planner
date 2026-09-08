import { useEffect, useMemo, useState, type JSX } from "react";
import type { SavedPost } from "../../api";
import { MovieCard, type AggregatedMovie } from "./MovieCard";
import { MovieDetailModal } from "./MovieDetailModal";
import { fetchTmdbExtras, type TmdbEnrichedData } from "./tmdbClient";
import { TrailerModal } from "./TrailerModal";
import "./movie-library.css";

export interface MovieLibraryProps {
  posts: SavedPost[];
  onSelectPost?: (post: SavedPost) => void;
}

type KindFilter = "all" | "movie" | "tv";
type SortOption = "rating" | "year" | "recent";

export function aggregateMoviesFromPosts(posts: SavedPost[]): AggregatedMovie[] {
  const map = new Map<string, AggregatedMovie>();

  for (const post of posts) {
    const resolved = post.resolved_movies ?? [];
    const extracted = post.extracted_movies ?? [];
    const usedResolved = new Set<number>();

    // Process extracted mentions and match with resolved catalog records
    for (const mention of extracted) {
      const matchIndex = resolved.findIndex((m, idx) => {
        if (usedResolved.has(idx)) return false;
        return m.title.trim().toLowerCase() === mention.title.trim().toLowerCase();
      });

      if (matchIndex >= 0) {
        usedResolved.add(matchIndex);
        const movie = resolved[matchIndex]!;
        const key = `tmdb-${movie.tmdb_id}`;
        const existing = map.get(key);
        if (existing) {
          if (!existing.source_posts.some((p) => p.post_id === post.post_id)) {
            existing.source_posts.push(post);
          }
        } else {
          map.set(key, {
            key,
            tmdb_id: movie.tmdb_id,
            title: movie.title,
            year: movie.year ?? mention.year,
            runtime_minutes: movie.runtime_minutes,
            kind: movie.kind ?? mention.kind,
            number_of_seasons: movie.number_of_seasons,
            poster_url: movie.poster_url,
            backdrop_url: movie.backdrop_url,
            trailer_youtube_key: movie.trailer_youtube_key,
            imdb_rating: movie.imdb_rating,
            rotten_tomatoes_percent: movie.rotten_tomatoes_percent,
            genres: [...movie.genres],
            directors: [...(movie.directors ?? [])],
            cast: [...(movie.cast ?? [])],
            watch_providers: [...(movie.watch_providers ?? [])],
            plot_summary: movie.plot_summary,
            review_summary: movie.review_summary,
            source_posts: [post],
          });
        }
      } else {
        // Unresolved mention
        const key = `mention-${mention.title.trim().toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          if (!existing.source_posts.some((p) => p.post_id === post.post_id)) {
            existing.source_posts.push(post);
          }
        } else {
          map.set(key, {
            key,
            title: mention.title,
            year: mention.year,
            kind: mention.kind,
            genres: [],
            directors: [],
            cast: [],
            watch_providers: [],
            plot_summary: mention.details,
            source_posts: [post],
          });
        }
      }
    }

    // Any remaining resolved movies that weren't matched to an extracted mention
    resolved.forEach((movie, idx) => {
      if (usedResolved.has(idx)) return;
      const key = `tmdb-${movie.tmdb_id}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.source_posts.some((p) => p.post_id === post.post_id)) {
          existing.source_posts.push(post);
        }
      } else {
        map.set(key, {
          key,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year,
          runtime_minutes: movie.runtime_minutes,
          kind: movie.kind,
          number_of_seasons: movie.number_of_seasons,
          poster_url: movie.poster_url,
          backdrop_url: movie.backdrop_url,
          trailer_youtube_key: movie.trailer_youtube_key,
          imdb_rating: movie.imdb_rating,
          rotten_tomatoes_percent: movie.rotten_tomatoes_percent,
          genres: [...movie.genres],
          directors: [...(movie.directors ?? [])],
          cast: [...(movie.cast ?? [])],
          watch_providers: [...(movie.watch_providers ?? [])],
          plot_summary: movie.plot_summary,
          review_summary: movie.review_summary,
          source_posts: [post],
        });
      }
    });

    // Fallback for saved movie posts where titles have not been extracted yet
    if (extracted.length === 0 && resolved.length === 0) {
      const fallbackTitle = post.author_handle
        ? `@${post.author_handle}`
        : post.caption?.trim()
          ? post.caption.slice(0, 40)
          : "Saved Reel";
      const key = `post-${post.post_id}`;
      map.set(key, {
        key,
        title: fallbackTitle,
        genres: [],
        directors: [],
        cast: [],
        watch_providers: [],
        plot_summary: post.reel_summary || post.caption || undefined,
        poster_url: post.thumbnail_url,
        source_posts: [post],
      });
    }
  }

  return Array.from(map.values());
}

export function MovieLibrary({ posts, onSelectPost }: MovieLibraryProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [selectedMovie, setSelectedMovie] = useState<AggregatedMovie | null>(null);
  const [activeTrailer, setActiveTrailer] = useState<{ key: string; title: string } | null>(null);
  const [enrichedDataMap, setEnrichedDataMap] = useState<Record<string, TmdbEnrichedData>>({});

  const allMovies = useMemo(() => aggregateMoviesFromPosts(posts), [posts]);

  // Client-side enrichment for saved movies that lack posters or streaming details
  useEffect(() => {
    let active = true;
    for (const m of allMovies) {
      if (
        m.tmdb_id &&
        (!m.poster_url || m.watch_providers.length === 0) &&
        !enrichedDataMap[m.key]
      ) {
        fetchTmdbExtras(m.tmdb_id, m.kind).then((data) => {
          if (active && data) {
            setEnrichedDataMap((prev) => ({ ...prev, [m.key]: data }));
          }
        });
      }
    }
    return () => {
      active = false;
    };
  }, [allMovies, enrichedDataMap]);

  const moviesWithEnrichment = useMemo(() => {
    return allMovies.map((m) => {
      const extra = enrichedDataMap[m.key];
      if (!extra) return m;
      return {
        ...m,
        poster_url: m.poster_url || extra.poster_url,
        backdrop_url: m.backdrop_url || extra.backdrop_url,
        trailer_youtube_key: m.trailer_youtube_key || extra.trailer_youtube_key,
        genres: m.genres.length > 0 ? m.genres : (extra.genres ?? []),
        directors: m.directors.length > 0 ? m.directors : (extra.directors ?? []),
        cast: m.cast.length > 0 ? m.cast : (extra.cast ?? []),
        watch_providers:
          m.watch_providers.length > 0 ? m.watch_providers : (extra.watch_providers ?? []),
        runtime_minutes: m.runtime_minutes ?? extra.runtime_minutes,
        plot_summary: m.plot_summary || extra.plot_summary,
      };
    });
  }, [allMovies, enrichedDataMap]);

  // Compute available providers for filter pills
  const availableProviders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of moviesWithEnrichment) {
      for (const p of m.watch_providers) {
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [moviesWithEnrichment]);

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    let list = moviesWithEnrichment;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        if (m.title.toLowerCase().includes(q)) return true;
        if (m.genres.some((g) => g.toLowerCase().includes(q))) return true;
        if (m.directors.some((d) => d.toLowerCase().includes(q))) return true;
        if (m.cast.some((c) => c.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Kind filter
    if (kindFilter !== "all") {
      list = list.filter((m) => m.kind === kindFilter);
    }

    // Provider filter
    if (providerFilter !== "all") {
      list = list.filter((m) => m.watch_providers.includes(providerFilter));
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === "rating") {
        const ratingA = a.imdb_rating ?? (a.rotten_tomatoes_percent ? a.rotten_tomatoes_percent / 10 : -1);
        const ratingB = b.imdb_rating ?? (b.rotten_tomatoes_percent ? b.rotten_tomatoes_percent / 10 : -1);
        if (ratingB !== ratingA) return ratingB - ratingA;
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "year") {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        if (yearB !== yearA) return yearB - yearA;
        return a.title.localeCompare(b.title);
      }
      // "recent": by source post count, then title
      if (b.source_posts.length !== a.source_posts.length) {
        return b.source_posts.length - a.source_posts.length;
      }
      return a.title.localeCompare(b.title);
    });
  }, [moviesWithEnrichment, searchQuery, kindFilter, providerFilter, sortBy]);

  const handlePlayTrailer = (key: string, title: string) => {
    setActiveTrailer({ key, title });
  };

  return (
    <div className="movie-library-shelf">
      {/* Search and Filter Controls */}
      <div className="movie-library-toolbar">
        <div className="movie-search-wrap">
          <svg className="movie-search-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"
              fill="currentColor"
            />
          </svg>
          <input
            type="search"
            className="movie-search-input"
            placeholder="Search titles, directors, actors, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search titles"
          />
          {searchQuery && (
            <button
              type="button"
              className="movie-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="movie-filters-row">
          {/* Format / Kind toggle */}
          <div className="movie-seg-control" role="group" aria-label="Format filter">
            <button
              type="button"
              className={kindFilter === "all" ? "is-active" : ""}
              onClick={() => setKindFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={kindFilter === "movie" ? "is-active" : ""}
              onClick={() => setKindFilter("movie")}
            >
              Movies
            </button>
            <button
              type="button"
              className={kindFilter === "tv" ? "is-active" : ""}
              onClick={() => setKindFilter("tv")}
            >
              TV Series
            </button>
          </div>

          {/* Sort selector */}
          <div className="movie-sort-wrap">
            <span className="movie-sort-label">Sort:</span>
            <select
              className="movie-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort movies"
            >
              <option value="rating">Top Rated (IMDb)</option>
              <option value="year">Release Year</option>
              <option value="recent">Most Recommended</option>
            </select>
          </div>
        </div>

        {/* Streaming platform pills */}
        {availableProviders.length > 0 && (
          <div className="movie-provider-filter-row" role="group" aria-label="Filter by streaming service">
            <span className="movie-filter-lead">Stream:</span>
            <button
              type="button"
              className={`movie-provider-filter-chip${providerFilter === "all" ? " is-active" : ""}`}
              onClick={() => setProviderFilter("all")}
            >
              All Platforms
            </button>
            {availableProviders.slice(0, 6).map((provider) => (
              <button
                key={provider}
                type="button"
                className={`movie-provider-filter-chip${providerFilter === provider ? " is-active" : ""}`}
                onClick={() => setProviderFilter(provider === providerFilter ? "all" : provider)}
              >
                {provider}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary Bar */}
      <div className="movie-library-summary-bar">
        <p className="movie-library-count">
          Showing <strong>{filteredMovies.length}</strong> {filteredMovies.length === 1 ? "title" : "titles"}
          {allMovies.length !== filteredMovies.length && ` (filtered from ${allMovies.length})`}
        </p>
      </div>

      {/* Poster Grid */}
      {filteredMovies.length > 0 ? (
        <div className="movie-library-grid">
          {filteredMovies.map((movie) => (
            <MovieCard
              key={movie.key}
              movie={movie}
              onSelect={(m) => setSelectedMovie(m)}
              onPlayTrailer={handlePlayTrailer}
            />
          ))}
        </div>
      ) : (
        <div className="movie-library-empty">
          <span className="movie-empty-icon">🎬</span>
          <h3>No titles found</h3>
          <p>
            {searchQuery || kindFilter !== "all" || providerFilter !== "all"
              ? "Try adjusting your search or filters to see more saved titles."
              : "Save Instagram or TikTok reels about movies and series to build your watchlist."}
          </p>
          {(searchQuery || kindFilter !== "all" || providerFilter !== "all") && (
            <button
              type="button"
              className="movie-empty-reset-btn"
              onClick={() => {
                setSearchQuery("");
                setKindFilter("all");
                setProviderFilter("all");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Detailed Inspection Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={
            moviesWithEnrichment.find((m) => m.key === selectedMovie.key) ?? selectedMovie
          }
          onClose={() => setSelectedMovie(null)}
          onPlayTrailer={handlePlayTrailer}
          onSelectPost={(post) => {
            setSelectedMovie(null);
            onSelectPost?.(post);
          }}
        />
      )}

      {/* Standalone Trailer Modal */}
      {activeTrailer && (
        <TrailerModal
          youtubeKey={activeTrailer.key}
          title={activeTrailer.title}
          onClose={() => setActiveTrailer(null)}
        />
      )}
    </div>
  );
}

import type { SavedPost } from "./api";

export interface AggregatedMovie {
  key: string;
  tmdb_id?: number;
  title: string;
  year?: number | null;
  runtime_minutes?: number | null;
  kind?: string | null;
  number_of_seasons?: number | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  trailer_youtube_key?: string | null;
  imdb_rating?: number | null;
  rotten_tomatoes_percent?: number | null;
  genres: string[];
  directors: string[];
  cast: string[];
  watch_providers: string[];
  plot_summary?: string | null;
  review_summary?: string | null;
  source_posts: SavedPost[];
}

export function aggregateMovies(posts: SavedPost[]): AggregatedMovie[] {
  const map = new Map<string, AggregatedMovie>();

  const addPost = (movie: AggregatedMovie, post: SavedPost) => {
    if (!movie.source_posts.some((item) => item.post_id === post.post_id)) {
      movie.source_posts.push(post);
    }
  };

  for (const post of posts) {
    const resolved = post.resolved_movies ?? [];
    const extracted = post.extracted_movies ?? [];
    const used = new Set<number>();

    for (const mention of extracted) {
      const matchIndex = resolved.findIndex((movie, index) => {
        if (used.has(index)) return false;
        return movie.title.trim().toLowerCase() === mention.title.trim().toLowerCase();
      });
      if (matchIndex >= 0) {
        used.add(matchIndex);
        const movie = resolved[matchIndex]!;
        const key = `tmdb-${movie.tmdb_id}`;
        const existing = map.get(key);
        if (existing) {
          addPost(existing, post);
        } else {
          map.set(key, fromResolved(key, movie, post));
        }
      } else {
        const key = `mention-${mention.title.trim().toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          addPost(existing, post);
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

    resolved.forEach((movie, index) => {
      if (used.has(index)) return;
      const key = `tmdb-${movie.tmdb_id}`;
      const existing = map.get(key);
      if (existing) {
        addPost(existing, post);
      } else {
        map.set(key, fromResolved(key, movie, post));
      }
    });
  }

  return [...map.values()];
}

function fromResolved(
  key: string,
  movie: NonNullable<SavedPost["resolved_movies"]>[number],
  post: SavedPost,
): AggregatedMovie {
  return {
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
  };
}

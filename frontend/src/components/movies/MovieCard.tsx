import type { JSX } from "react";

import type { SavedPost } from "../../api";
import { CoverCard } from "../CoverCard";
import { proxiedMediaUrl } from "../../postDisplayUtils";

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

export interface MovieCardProps {
  movie: AggregatedMovie;
  onSelect: (movie: AggregatedMovie) => void;
  onPlayTrailer?: (key: string, title: string) => void;
}

function formatDuration(minutes?: number | null, seasons?: number | null, isTv?: boolean): string | null {
  if (isTv && seasons && seasons > 0) {
    return `${seasons} season${seasons === 1 ? "" : "s"}`;
  }
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function MovieCard({ movie, onSelect, onPlayTrailer }: MovieCardProps): JSX.Element {
  const isTv = movie.kind === "tv";
  const duration = formatDuration(movie.runtime_minutes, movie.number_of_seasons, isTv);
  const reelCount = movie.source_posts.length;
  const displayPoster =
    movie.poster_url ||
    (movie.source_posts[0]?.thumbnail_url
      ? proxiedMediaUrl(movie.source_posts[0].thumbnail_url)
      : null);
  const location = [movie.year ? String(movie.year) : null, duration].filter(Boolean).join(" · ");
  const ratings = [
    movie.imdb_rating != null ? `IMDb ${movie.imdb_rating.toFixed(1)}` : null,
    movie.rotten_tomatoes_percent != null ? `${movie.rotten_tomatoes_percent}% RT` : null,
    reelCount > 1 ? `${reelCount} reels` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const kicker =
    movie.watch_providers.slice(0, 2).join(" · ") || movie.genres.slice(0, 2).join(" · ") || (isTv ? "Series" : "Feature");

  return (
    <CoverCard
      className="cover-card--movie"
      title={movie.title}
      category={isTv ? "TV Series" : "Movie"}
      kicker={kicker}
      location={location || (isTv ? "TV Series" : "Movie")}
      meta={ratings || "Saved to watch"}
      action="Watch ↗"
      imageUrl={displayPoster}
      onOpen={() => onSelect(movie)}
      ariaLabel={`View details for ${movie.title}`}
      badge={
        movie.trailer_youtube_key && onPlayTrailer ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPlayTrailer(movie.trailer_youtube_key!, movie.title);
            }}
            aria-label={`Watch ${movie.title} trailer`}
            title="Watch trailer"
          >
            ▶
          </button>
        ) : undefined
      }
    />
  );
}

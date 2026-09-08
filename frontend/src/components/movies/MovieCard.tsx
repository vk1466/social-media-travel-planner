import type { JSX } from "react";
import type { SavedPost } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import { ImdbRatingBadge, RottenTomatoesBadge, StreamingProviderPill } from "./MovieBadges";

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

  return (
    <article
      className="movie-grid-card"
      onClick={() => onSelect(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(movie);
        }
      }}
      aria-label={`View details for ${movie.title}`}
    >
      <div className="movie-poster-wrap">
        {displayPoster ? (
          <img
            src={displayPoster}
            alt=""
            className="movie-poster-img"
            loading="lazy"
          />
        ) : (
          <div className="movie-poster-placeholder">
            <span className="movie-placeholder-icon">🎬</span>
            <span className="movie-placeholder-title">{movie.title}</span>
          </div>
        )}

        <div className="movie-poster-overlay">
          {movie.trailer_youtube_key && onPlayTrailer && (
            <button
              type="button"
              className="movie-card-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPlayTrailer(movie.trailer_youtube_key!, movie.title);
              }}
              aria-label={`Watch ${movie.title} trailer`}
              title="Watch trailer"
            >
              ▶ Trailer
            </button>
          )}
        </div>

        {reelCount > 1 && (
          <span className="movie-reel-count-badge" title={`Saved in ${reelCount} reels`}>
            {reelCount} reels
          </span>
        )}
      </div>

      <div className="movie-card-content">
        <div className="movie-card-meta-line">
          <span className="movie-kind-tag">{isTv ? "TV Series" : "Movie"}</span>
          {movie.year && <span className="movie-year-tag">{movie.year}</span>}
          {duration && <span className="movie-duration-tag">{duration}</span>}
        </div>

        <h3 className="movie-card-title">{movie.title}</h3>

        {(movie.imdb_rating != null || movie.rotten_tomatoes_percent != null) && (
          <div className="movie-ratings-row">
            {movie.imdb_rating != null && <ImdbRatingBadge rating={movie.imdb_rating} />}
            {movie.rotten_tomatoes_percent != null && (
              <RottenTomatoesBadge percent={movie.rotten_tomatoes_percent} />
            )}
          </div>
        )}

        {movie.watch_providers.length > 0 && (
          <div className="movie-card-providers">
            {movie.watch_providers.slice(0, 2).map((provider) => (
              <StreamingProviderPill key={provider} provider={provider} />
            ))}
            {movie.watch_providers.length > 2 && (
              <span className="movie-more-providers">+{movie.watch_providers.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

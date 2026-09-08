import { useEffect, useState, type JSX } from "react";
import type { SavedPost } from "../../api";
import { formatPostDate, getPlatformLabel, proxiedMediaUrl } from "../../postDisplayUtils";
import { ImdbRatingBadge, RottenTomatoesBadge, StreamingProviderPill } from "./MovieBadges";
import type { AggregatedMovie } from "./MovieCard";
import { fetchTmdbExtras, type TmdbEnrichedData } from "./tmdbClient";

export interface MovieDetailModalProps {
  movie: AggregatedMovie;
  onClose: () => void;
  onPlayTrailer?: (key: string, title: string) => void;
  onSelectPost?: (post: SavedPost) => void;
}

export function MovieDetailModal({
  movie,
  onClose,
  onPlayTrailer,
  onSelectPost,
}: MovieDetailModalProps): JSX.Element {
  const [enriched, setEnriched] = useState<TmdbEnrichedData | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch TMDB extras on-the-fly if poster or streaming info is missing
  useEffect(() => {
    let cancelled = false;
    if (
      movie.tmdb_id &&
      (!movie.poster_url || !movie.backdrop_url || movie.watch_providers.length === 0)
    ) {
      fetchTmdbExtras(movie.tmdb_id, movie.kind).then((data) => {
        if (!cancelled && data) {
          setEnriched(data);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [movie.tmdb_id, movie.kind, movie.poster_url, movie.backdrop_url, movie.watch_providers.length]);

  const isTv = movie.kind === "tv";
  const imdbUrl = movie.tmdb_id
    ? `https://www.themoviedb.org/${isTv ? "tv" : "movie"}/${movie.tmdb_id}`
    : null;

  // Merge database fields with on-the-fly TMDB enrichment
  const posterUrl = movie.poster_url || enriched?.poster_url;
  const backdropUrl = movie.backdrop_url || enriched?.backdrop_url;
  const trailerKey = movie.trailer_youtube_key || enriched?.trailer_youtube_key;
  const genres = movie.genres.length > 0 ? movie.genres : (enriched?.genres ?? []);
  const directors = movie.directors.length > 0 ? movie.directors : (enriched?.directors ?? []);
  const cast = movie.cast.length > 0 ? movie.cast : (enriched?.cast ?? []);
  const providers =
    movie.watch_providers.length > 0 ? movie.watch_providers : (enriched?.watch_providers ?? []);
  const runtime = movie.runtime_minutes ?? enriched?.runtime_minutes;
  const plot = movie.plot_summary || enriched?.plot_summary;

  // Fallback cascade: poster -> source reel thumbnail -> null
  const displayPoster =
    posterUrl ||
    (movie.source_posts[0]?.thumbnail_url
      ? proxiedMediaUrl(movie.source_posts[0].thumbnail_url)
      : null);

  // Fallback cascade: backdrop -> displayPoster -> null
  const displayBackdrop = backdropUrl || displayPoster;

  return (
    <div
      className="movie-detail-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-detail-title"
    >
      <div className="movie-detail-modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Backdrop Hero Header */}
        <div className={`movie-detail-hero ${!displayBackdrop ? "is-empty" : ""}`}>
          {displayBackdrop ? (
            <img
              src={displayBackdrop}
              alt=""
              className={`movie-detail-backdrop-img ${
                !backdropUrl && displayPoster ? "is-poster-fallback" : ""
              }`}
            />
          ) : (
            <div className="movie-detail-backdrop-empty" />
          )}
          <div className="movie-detail-hero-scrim" />

          <button
            type="button"
            className="movie-detail-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        <div className="movie-detail-body">
          <div className="movie-detail-main-row">
            {/* Poster column */}
            <div className="movie-detail-poster-col">
              {displayPoster ? (
                <img
                  src={displayPoster}
                  alt={movie.title}
                  className="movie-detail-poster"
                />
              ) : (
                <div className="movie-detail-poster-empty">
                  <span className="movie-detail-poster-empty-icon">🎬</span>
                  <span className="movie-detail-poster-empty-title">{movie.title}</span>
                </div>
              )}

              {trailerKey && onPlayTrailer && (
                <button
                  type="button"
                  className="movie-detail-trailer-cta"
                  onClick={() => onPlayTrailer(trailerKey, movie.title)}
                >
                  ▶ Watch Trailer
                </button>
              )}

              {imdbUrl && (
                <a
                  href={imdbUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="movie-detail-catalog-link"
                >
                  View on TMDB ↗
                </a>
              )}
            </div>

            {/* Info column */}
            <div className="movie-detail-info-col">
              <div className="movie-detail-type-row">
                <span className="movie-detail-kind-badge">{isTv ? "TV Series" : "Movie"}</span>
                {movie.year && <span className="movie-detail-year">{movie.year}</span>}
                {isTv && movie.number_of_seasons ? (
                  <span className="movie-detail-runtime">
                    {movie.number_of_seasons} season{movie.number_of_seasons === 1 ? "" : "s"}
                  </span>
                ) : runtime ? (
                  <span className="movie-detail-runtime">
                    {Math.floor(runtime / 60)}h {runtime % 60}m
                  </span>
                ) : null}
              </div>

              <h2 id="movie-detail-title" className="movie-detail-title">
                {movie.title}
              </h2>

              {genres.length > 0 && (
                <p className="movie-detail-genres">{genres.join(" · ")}</p>
              )}

              {/* Ratings */}
              {(movie.imdb_rating != null || movie.rotten_tomatoes_percent != null) && (
                <div className="movie-detail-ratings-row">
                  {movie.imdb_rating != null && <ImdbRatingBadge rating={movie.imdb_rating} />}
                  {movie.rotten_tomatoes_percent != null && (
                    <RottenTomatoesBadge percent={movie.rotten_tomatoes_percent} />
                  )}
                </div>
              )}

              {/* Streaming Availability */}
              {providers.length > 0 && (
                <div className="movie-detail-section">
                  <h4 className="movie-detail-section-title">Where to stream</h4>
                  <div className="movie-detail-provider-list">
                    {providers.map((p) => (
                      <StreamingProviderPill key={p} provider={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {plot && (
                <div className="movie-detail-section">
                  <h4 className="movie-detail-section-title">Overview</h4>
                  <p className="movie-detail-synopsis">{plot}</p>
                </div>
              )}

              {/* Review summary */}
              {movie.review_summary && (
                <div className="movie-detail-section">
                  <h4 className="movie-detail-section-title">Critical consensus</h4>
                  <p className="movie-detail-review-quote">“{movie.review_summary}”</p>
                </div>
              )}

              {/* Cast and Director */}
              {(directors.length > 0 || cast.length > 0) && (
                <div className="movie-detail-section movie-detail-crew-section">
                  {directors.length > 0 && (
                    <p className="movie-detail-crew-item">
                      <span className="movie-crew-label">Director:</span>{" "}
                      <span className="movie-crew-val">{directors.join(", ")}</span>
                    </p>
                  )}
                  {cast.length > 0 && (
                    <p className="movie-detail-crew-item">
                      <span className="movie-crew-label">Starring:</span>{" "}
                      <span className="movie-crew-val">{cast.join(", ")}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recommending Social Media Reels */}
          {movie.source_posts.length > 0 && (
            <div className="movie-detail-sources-section">
              <h3 className="movie-detail-sources-title">
                Saved in {movie.source_posts.length} {movie.source_posts.length === 1 ? "reel" : "reels"}
              </h3>
              <div className="movie-detail-sources-grid">
                {movie.source_posts.map((post) => {
                  const thumb = proxiedMediaUrl(post.thumbnail_url);
                  const date = formatPostDate(post);
                  const platform = getPlatformLabel(post);
                  return (
                    <div
                      key={post.post_id}
                      className="movie-source-reel-card"
                      onClick={() => onSelectPost?.(post)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSelectPost?.(post);
                      }}
                    >
                      <div className="movie-source-reel-thumb-wrap">
                        {thumb ? (
                          <img src={thumb} alt="" className="movie-source-reel-thumb" />
                        ) : (
                          <div className="movie-source-reel-thumb-empty" />
                        )}
                        <span className="movie-source-reel-platform">{platform}</span>
                      </div>
                      <div className="movie-source-reel-meta">
                        <p className="movie-source-reel-author">
                          {post.author_handle ? `@${post.author_handle}` : "Reel"}
                        </p>
                        {post.reel_summary ? (
                          <p className="movie-source-reel-excerpt">{post.reel_summary}</p>
                        ) : post.caption ? (
                          <p className="movie-source-reel-excerpt">{post.caption.slice(0, 100)}</p>
                        ) : null}
                        {date && <span className="movie-source-reel-date">{date}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import type { JSX } from "react";

export function ImdbRatingBadge({ rating }: { rating: number }): JSX.Element {
  return (
    <span className="movie-badge movie-badge-imdb" title={`IMDb rating: ${rating.toFixed(1)}/10`}>
      <span className="movie-badge-icon" aria-hidden="true">★</span>
      <span className="movie-badge-value">{rating.toFixed(1)}</span>
    </span>
  );
}

export function RottenTomatoesBadge({ percent }: { percent: number }): JSX.Element {
  const isFresh = percent >= 60;
  return (
    <span
      className={`movie-badge movie-badge-rt ${isFresh ? "is-fresh" : "is-rotten"}`}
      title={`Rotten Tomatoes: ${percent}%`}
    >
      <span className="movie-badge-icon" aria-hidden="true">
        {isFresh ? "🍅" : "🟢"}
      </span>
      <span className="movie-badge-value">{percent}%</span>
    </span>
  );
}

export function StreamingProviderPill({ provider }: { provider: string }): JSX.Element {
  return (
    <span className="movie-provider-pill" title={`Available on ${provider}`}>
      {provider}
    </span>
  );
}

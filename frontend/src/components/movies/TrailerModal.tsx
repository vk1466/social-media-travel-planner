import type { JSX } from "react";
import "./movie-library.css";

export interface TrailerModalProps {
  youtubeKey: string;
  title: string;
  onClose: () => void;
}

export function TrailerModal({ youtubeKey, title, onClose }: TrailerModalProps): JSX.Element {
  return (
    <div
      className="movie-trailer-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
    >
      <div className="movie-trailer-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="movie-trailer-header">
          <span className="movie-trailer-title">{title} · Trailer</span>
          <button
            type="button"
            className="movie-trailer-close-btn"
            onClick={onClose}
            aria-label="Close trailer"
          >
            ✕
          </button>
        </div>
        <div className="movie-trailer-iframe-wrap">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1`}
            title={`${title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

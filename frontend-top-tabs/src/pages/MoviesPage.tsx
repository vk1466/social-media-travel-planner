import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { SavedPost } from "../api";
import { postTitle, proxiedMediaUrl } from "../display";
import { aggregateMovies, type AggregatedMovie } from "../movies";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState, Toolbar } from "../components/Toolbar";
import { PageHeading } from "../components/Shell";

export function MoviesPage({ posts }: { posts: SavedPost[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All");
  const [selected, setSelected] = useState<AggregatedMovie | null>(null);
  const movies = aggregateMovies(posts);
  const featured = movies[0];

  const filtered = movies.filter((movie) => {
    if (kind === "Unwatched") return true;
    if (kind === "Watched") return false;
    const haystack = [movie.title, movie.plot_summary, ...movie.genres, ...movie.directors]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <PageHeading
        kicker="Your watchlist"
        title="Movies"
        lede="A cinematic page foregrounds title, year, genre, and filming destinations."
        action={{ label: "Add links", onClick: () => navigate("/add") }}
      />
      {featured ? (
        <section
          className="movie-hero"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(12,16,15,.94),rgba(12,16,15,.16)),url('${
              featured.backdrop_url || featured.poster_url || proxiedMediaUrl(featured.source_posts[0]?.thumbnail_url) || ""
            }')`,
          }}
        >
          <p className="eyebrow">Up next</p>
          <h2>{featured.title}</h2>
          <p>{[featured.year, featured.genres[0], featured.kind === "tv" ? "TV" : "Movie"].filter(Boolean).join(" · ")}</p>
          <button type="button" onClick={() => setSelected(featured)}>
            View details →
          </button>
        </section>
      ) : null}
      <Toolbar
        placeholder="Search your watchlist"
        query={query}
        onQuery={setQuery}
        options={["All", "Unwatched", "Watched"]}
        selected={kind}
        onSelect={setKind}
      />
      {filtered.length === 0 ? (
        <EmptyState>No titles in this view yet.</EmptyState>
      ) : (
        <div className="media-grid">
          {filtered.map((movie) => {
            const poster =
              movie.poster_url || proxiedMediaUrl(movie.source_posts[0]?.thumbnail_url);
            return (
              <article
                key={movie.key}
                className="media-card"
                tabIndex={0}
                onClick={() => setSelected(movie)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(movie);
                  }
                }}
              >
                <div
                  className="photo is-poster"
                  style={poster ? { backgroundImage: `url('${poster}')` } : undefined}
                >
                  <span>{movie.kind === "tv" ? "tv" : "movie"}</span>
                </div>
                <div>
                  <h2>{movie.title}</h2>
                  <p>
                    {[movie.year, movie.genres[0], movie.imdb_rating ? `${movie.imdb_rating} IMDb` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <button type="button">Open movie →</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected ? <MovieDetail movie={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function MovieDetail({ movie, onClose }: { movie: AggregatedMovie; onClose: () => void }) {
  const poster = movie.poster_url || proxiedMediaUrl(movie.source_posts[0]?.thumbnail_url);
  const trailer = movie.trailer_youtube_key
    ? `https://www.youtube.com/watch?v=${movie.trailer_youtube_key}`
    : null;

  return (
    <DetailSheet title={movie.title} onClose={onClose} wide>
      {poster ? <div className="sheet-hero is-poster" style={{ backgroundImage: `url('${poster}')` }} /> : null}
      <p className="eyebrow">{movie.kind === "tv" ? "TV series" : "Movie"}</p>
      <h2 className="sheet-title">{movie.title}</h2>
      <p className="sheet-meta">
        {[
          movie.year,
          movie.runtime_minutes ? `${movie.runtime_minutes} min` : null,
          movie.imdb_rating ? `IMDb ${movie.imdb_rating}` : null,
          movie.rotten_tomatoes_percent != null ? `RT ${movie.rotten_tomatoes_percent}%` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {movie.genres.length > 0 ? (
        <div className="tag-row">
          {movie.genres.map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
      ) : null}
      {movie.plot_summary ? <p className="sheet-copy">{movie.plot_summary}</p> : null}
      {movie.directors.length > 0 ? <p className="sheet-meta">Directed by {movie.directors.join(", ")}</p> : null}
      {movie.cast.length > 0 ? <p className="sheet-meta">{movie.cast.slice(0, 6).join(", ")}</p> : null}
      {movie.watch_providers.length > 0 ? (
        <div className="tag-row">
          {movie.watch_providers.map((provider) => (
            <span key={provider}>{provider}</span>
          ))}
        </div>
      ) : null}
      {movie.source_posts.length > 0 ? (
        <section>
          <h3 className="sheet-section">Saved from</h3>
          <ul className="sheet-list">
            {movie.source_posts.map((post) => (
              <li key={post.post_id}>
                <a href={post.post_url} target="_blank" rel="noreferrer">
                  {postTitle(post)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="sheet-actions">
        {trailer ? (
          <a href={trailer} target="_blank" rel="noreferrer">
            Watch trailer
          </a>
        ) : null}
      </div>
    </DetailSheet>
  );
}

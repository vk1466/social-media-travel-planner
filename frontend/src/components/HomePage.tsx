import { useMemo, useState, type CSSProperties, type FormEvent, type JSX } from "react";
import { Link, useNavigate } from "react-router-dom";

import { nativePostId, type Place, type SavedPost } from "../api";
import { mapSavedPosts, thumbStyle } from "../postBrowseModel";

import "../home-page.css";

export interface HomePageProps {
  posts: SavedPost[];
  places: Place[];
  visitCount: number;
  authReady: boolean;
}

interface CountryCover {
  name: string;
  total: number;
}

function hashHue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 360;
  }
  return hash;
}

function coverArt(name: string): CSSProperties {
  const hue = 120 + (hashHue(name) % 120);
  return {
    backgroundImage: `linear-gradient(155deg, hsl(${hue} 30% 32%), hsl(${(hue + 45) % 360} 24% 14%))`,
  };
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function statValue(authReady: boolean, count: number): string {
  return authReady ? String(count) : "—";
}

export function HomePage({ posts, places, visitCount, authReady }: HomePageProps): JSX.Element {
  const navigate = useNavigate();
  const [pasteValue, setPasteValue] = useState("");

  const recentPosts = useMemo(() => mapSavedPosts(posts).slice(0, 12), [posts]);

  const countryCovers = useMemo(() => {
    const totals = new Map<string, number>();
    for (const place of places) {
      const name =
        place.location.country?.trim() ||
        place.location.continent?.trim() ||
        "Unmapped";
      totals.set(name, (totals.get(name) ?? 0) + 1);
    }
    return Array.from(totals.entries())
      .map(([name, total]): CountryCover => ({ name, total }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [places]);

  function onPasteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pasteValue.trim();
    if (value) {
      navigate("/add", { state: { prefill: value } });
      return;
    }
    navigate("/add");
  }

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-map" aria-hidden="true" />
        <div className="wf-container home-hero-inner">
          <p className="home-eyebrow">Wanderfile</p>
          <h1 id="home-hero-title">The places you keep saving, finally on a map.</h1>
          <p className="home-lede">
            Paste Instagram reels, TikToks, and YouTube links. Wanderfile reads the caption,
            on-screen text, and audio for the actual places worth going — then puts them on
            your map.
          </p>
          <form className="home-paste" onSubmit={onPasteSubmit}>
            <input
              type="text"
              name="link"
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              placeholder="Paste an Instagram, TikTok, or YouTube link"
              aria-label="Paste an Instagram, TikTok, or YouTube link"
              autoComplete="off"
            />
            <button type="submit">Add</button>
          </form>
          <ul className="home-stats" aria-label="Library summary">
            <li>
              <span className="home-stats-value">{statValue(authReady, posts.length)}</span>
              <span className="home-stats-label">
                {pluralize(posts.length, "save", "saves")}
              </span>
            </li>
            <li>
              <span className="home-stats-value">{statValue(authReady, places.length)}</span>
              <span className="home-stats-label">
                {pluralize(places.length, "place", "places")}
              </span>
            </li>
            <li>
              <span className="home-stats-value">{statValue(authReady, visitCount)}</span>
              <span className="home-stats-label">
                {pluralize(visitCount, "visit", "visits")}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-recent-title">
        <div className="wf-container">
          <div className="home-section-head">
            <div>
              <p className="home-eyebrow">Recently saved</p>
              <h2 id="home-recent-title">Fresh from your feed</h2>
            </div>
            <Link className="home-section-link" to="/posts">
              All saves →
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <div className="home-empty">
              <p>Nothing saved yet</p>
              <p>
                <Link to="/add">Add your first link</Link>
              </p>
            </div>
          ) : (
            <div className="home-reel" role="list">
              {recentPosts.map((post, index) => {
                const nativeId = nativePostId({
                  post_id: post.key,
                  platform: post.platform,
                });
                return (
                  <Link
                    key={post.key}
                    className="home-tile"
                    to={`/posts/${post.platform}/${nativeId}`}
                    style={thumbStyle(post, index)}
                    role="listitem"
                  >
                    <span className="home-tile-scrim">
                      <span className="home-tile-title">{post.title}</span>
                      <span className="home-tile-meta">
                        {post.platformLabel} · {post.dateLabel}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-atlas-title">
        <div className="wf-container">
          <div className="home-section-head">
            <div>
              <p className="home-eyebrow">Your atlas</p>
              <h2 id="home-atlas-title">Where you&apos;re headed</h2>
            </div>
            <Link className="home-section-link" to="/places">
              Open the atlas →
            </Link>
          </div>
          {countryCovers.length === 0 ? (
            <div className="home-empty">
              <p>Your atlas fills in as you save</p>
              <p>
                <Link to="/add">Add a link</Link>
              </p>
            </div>
          ) : (
            <div className="home-covers">
              {countryCovers.map((cover) => (
                <Link key={cover.name} className="home-cover" to="/places">
                  <span className="home-cover-art" style={coverArt(cover.name)} aria-hidden="true" />
                  <span className="home-cover-scrim">
                    <span className="home-cover-name">{cover.name}</span>
                    <span className="home-cover-count">
                      {cover.total} {pluralize(cover.total, "place", "places")}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-steps-title">
        <div className="wf-container">
          <h2 id="home-steps-title" className="home-steps-heading">
            How it works
          </h2>
          <div className="home-steps">
            <div className="home-step">
              <span className="home-step-num">01</span>
              <h3 className="home-step-title">Paste</h3>
              <p className="home-step-body">
                Drop any reel, TikTok, or video link into Wanderfile.
              </p>
            </div>
            <div className="home-step">
              <span className="home-step-num">02</span>
              <h3 className="home-step-title">We read it</h3>
              <p className="home-step-body">
                Captions, on-screen text, and audio get scanned for real place names, then
                geocoded.
              </p>
            </div>
            <div className="home-step">
              <span className="home-step-num">03</span>
              <h3 className="home-step-title">Go</h3>
              <p className="home-step-body">
                Everything lands in your atlas, grouped by country, with what you&apos;ve
                already visited marked off.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-title">
        <div className="wf-container">
          <h2 id="home-cta-title">Start with one link.</h2>
          <p>One save is enough to start filling your atlas.</p>
          <Link className="home-cta-btn" to="/add">
            Add links
          </Link>
        </div>
      </section>
    </div>
  );
}

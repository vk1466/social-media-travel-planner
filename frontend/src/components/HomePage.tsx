import { useMemo, type JSX } from "react";
import { Link } from "react-router-dom";

import { type Place, type SavedPost } from "../api";
import { mapSavedPosts } from "../postBrowseModel";

import "../home-page.css";

export interface HomePageProps {
  posts: SavedPost[];
  places: Place[];
  visitCount: number;
  authReady: boolean;
}

interface BentoTile {
  src: string;
  caption: string;
}

const FALLBACK_TILES: BentoTile[] = [
  {
    src: "https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Cappadocia",
  },
  {
    src: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&h=1600&fit=crop&auto=format&q=80",
    caption: "Positano",
  },
  {
    src: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&h=1000&fit=crop&auto=format&q=80",
    caption: "Kyoto",
  },
  {
    src: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1800&h=1100&fit=crop&auto=format&q=80",
    caption: "Santorini",
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Nærøyfjord",
  },
];

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function statValue(authReady: boolean, count: number): string {
  return authReady ? String(count) : "—";
}

function pickBentoTiles(posts: ReturnType<typeof mapSavedPosts>): BentoTile[] {
  const seenCaptions = new Set<string>();
  const fromReels: BentoTile[] = [];
  for (const post of posts) {
    if (!post.thumbnailUrl) continue;
    const caption =
      (post.placeNames && post.placeNames[0]) ||
      post.author ||
      post.title?.slice(0, 28) ||
      "Saved";
    const captionKey = String(caption).toLowerCase();
    if (seenCaptions.has(captionKey)) continue;
    seenCaptions.add(captionKey);
    fromReels.push({ src: post.thumbnailUrl, caption });
    if (fromReels.length >= 5) break;
  }
  const tiles = [...fromReels];
  for (const fallback of FALLBACK_TILES) {
    if (tiles.length >= 5) break;
    if (tiles.some((t) => t.caption === fallback.caption)) continue;
    tiles.push(fallback);
  }
  while (tiles.length < 5) {
    tiles.push(FALLBACK_TILES[tiles.length % FALLBACK_TILES.length]);
  }
  return tiles.slice(0, 5);
}

export function HomePage({ posts, places, visitCount, authReady }: HomePageProps): JSX.Element {
  const browsePosts = useMemo(() => mapSavedPosts(posts), [posts]);
  const tiles = useMemo(() => pickBentoTiles(browsePosts), [browsePosts]);

  const placesMeta = authReady
    ? `${places.length} ${pluralize(places.length, "place", "places")} · ${visitCount} visited`
    : "Sign in to open your atlas";
  const postsMeta = authReady
    ? `${posts.length} ${pluralize(posts.length, "save", "saves")}`
    : "Sign in to open your saves";

  return (
    <div className="home">
      <section className="home-bento" aria-label="Library highlight">
        <div className="home-tile home-tile--title home-tile--wide home-tile--tall">
          <span className="home-tile-kicker">Wanderfile</span>
          <h1>
            Places
            <br />
            you keep
            <br />
            <em>coming back to.</em>
          </h1>
        </div>

        {tiles.slice(0, 2).map((tile) => (
          <div key={`a-${tile.caption}`} className="home-tile home-tile--media">
            <img src={tile.src} alt="" />
            <span className="home-tile-caption">{tile.caption}</span>
          </div>
        ))}

        <div className="home-tile home-tile--data">
          <span className="home-tile-lbl">Saved</span>
          <span className="home-tile-val">{statValue(authReady, places.length)}</span>
        </div>

        {tiles.slice(2, 4).map((tile) => (
          <div key={`b-${tile.caption}`} className="home-tile home-tile--media">
            <img src={tile.src} alt="" />
            <span className="home-tile-caption">{tile.caption}</span>
          </div>
        ))}

        <div className="home-tile home-tile--data">
          <span className="home-tile-lbl">Visited so far</span>
          <span className="home-tile-val">
            <em>{statValue(authReady, visitCount)}</em>
          </span>
        </div>

        <div className="home-tile home-tile--media home-tile--wide">
          <img src={tiles[4].src} alt="" />
          <span className="home-tile-caption">{tiles[4].caption}</span>
        </div>
      </section>

      <section className="home-library" aria-labelledby="home-library-title">
        <div className="home-library-head">
          <p className="home-library-eyebrow">Your library</p>
          <h2 id="home-library-title">Open a shelf</h2>
          <p>Browse places on the atlas or saves in the lantern — same paper ground, coral accents.</p>
        </div>

        <div className="home-tabs">
          <Link className="home-tab home-tab--places" to="/places">
            <span className="home-tab-kicker">Atlas</span>
            <span className="home-tab-title">Places</span>
            <span className="home-tab-meta">{placesMeta}</span>
            <span className="home-tab-cta">Open atlas →</span>
          </Link>
          <Link className="home-tab home-tab--posts" to="/posts">
            <span className="home-tab-kicker">Lantern</span>
            <span className="home-tab-title">Posts</span>
            <span className="home-tab-meta">{postsMeta}</span>
            <span className="home-tab-cta">Open saves →</span>
          </Link>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-title">
        <div className="home-cta-inner">
          <h2 id="home-cta-title">Start with one link.</h2>
          <p>Paste a reel and fill the atlas from what you already save.</p>
          <Link className="home-cta-btn" to="/add">
            Add links
          </Link>
        </div>
      </section>
    </div>
  );
}

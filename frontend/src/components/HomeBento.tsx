import { useEffect, useMemo, useRef, useState, type JSX } from "react";

import { type SavedPost } from "../api";
import { initBentoMotion } from "../bentoMotion";
import { mapSavedPosts, type BrowsePost } from "../postBrowseModel";

export interface HomeBentoProps {
  posts: SavedPost[];
  visitCount: number;
  authReady: boolean;
  savedCount?: number;
  savedLabel?: string;
}

interface BentoTile {
  src: string;
  caption: string;
}

const SLOT_COUNT = 5;
const ROTATE_MS = 4200;
const TRANSITION_MS = 900;

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
  {
    src: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Dolomites",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Maldives",
  },
  {
    src: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&h=1000&fit=crop&auto=format&q=80",
    caption: "Paris",
  },
];

function statValue(authReady: boolean, count: number): string {
  return authReady ? String(count) : "—";
}

function tileFromPost(post: BrowsePost): BentoTile | null {
  if (!post.thumbnailUrl) return null;
  const caption =
    (post.placeNames && post.placeNames[0]) ||
    post.author ||
    post.title?.slice(0, 28) ||
    "Saved";
  return { src: post.thumbnailUrl, caption };
}

function buildPhotoPool(posts: BrowsePost[]): BentoTile[] {
  const seenSrc = new Set<string>();
  const pool: BentoTile[] = [];

  for (const post of posts) {
    const tile = tileFromPost(post);
    if (!tile || seenSrc.has(tile.src)) continue;
    seenSrc.add(tile.src);
    pool.push(tile);
  }

  if (pool.length >= SLOT_COUNT + 1) return pool;

  for (const fallback of FALLBACK_TILES) {
    if (seenSrc.has(fallback.src)) continue;
    seenSrc.add(fallback.src);
    pool.push(fallback);
  }

  return pool;
}

function pickInitialTiles(pool: BentoTile[]): BentoTile[] {
  if (pool.length === 0) return FALLBACK_TILES.slice(0, SLOT_COUNT);
  const tiles: BentoTile[] = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    tiles.push(pool[i % pool.length]);
  }
  return tiles;
}

function nextTileForSlot(
  pool: BentoTile[],
  current: BentoTile[],
  slotIndex: number,
): BentoTile | null {
  if (pool.length <= SLOT_COUNT) {
    const unused = pool.filter(
      (tile) => !current.some((shown, index) => index !== slotIndex && shown.src === tile.src),
    );
    const candidates = unused.filter((tile) => tile.src !== current[slotIndex]?.src);
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const usedElsewhere = new Set(
    current.filter((_, index) => index !== slotIndex).map((tile) => tile.src),
  );
  const candidates = pool.filter(
    (tile) => !usedElsewhere.has(tile.src) && tile.src !== current[slotIndex]?.src,
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function BentoMediaTile({
  tile,
  wide = false,
}: {
  tile: BentoTile;
  wide?: boolean;
}): JSX.Element {
  const [shown, setShown] = useState(tile);
  const [incoming, setIncoming] = useState<BentoTile | null>(null);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const settleTimer = useRef<number | null>(null);

  useEffect(() => {
    if (tile.src === shown.src && tile.caption === shown.caption) return;

    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }

    setIncoming(tile);
    setPhase("out");
    const raf = window.requestAnimationFrame(() => {
      setPhase("in");
    });

    settleTimer.current = window.setTimeout(() => {
      setShown(tile);
      setIncoming(null);
      setPhase("idle");
      settleTimer.current = null;
    }, TRANSITION_MS);

    return () => {
      window.cancelAnimationFrame(raf);
      if (settleTimer.current) {
        window.clearTimeout(settleTimer.current);
        settleTimer.current = null;
      }
    };
  }, [tile, shown.src, shown.caption]);

  const className = [
    "home-tile",
    "home-tile--media",
    wide ? "home-tile--wide" : "",
    phase !== "idle" ? "is-transitioning" : "",
    phase === "in" ? "is-in" : "",
    phase === "out" ? "is-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="home-tile-stack">
        <img className="home-tile-layer home-tile-layer--base" src={shown.src} alt="" />
        {incoming ? (
          <img className="home-tile-layer home-tile-layer--next" src={incoming.src} alt="" />
        ) : null}
      </div>
      <span className="home-tile-caption">{(incoming ?? shown).caption}</span>
    </div>
  );
}

export function HomeBento({
  posts,
  visitCount,
  authReady,
  savedCount,
  savedLabel = "Saved",
}: HomeBentoProps): JSX.Element {
  const browsePosts = useMemo(() => mapSavedPosts(posts), [posts]);
  const pool = useMemo(() => buildPhotoPool(browsePosts), [browsePosts]);
  const [tiles, setTiles] = useState<BentoTile[]>(() => pickInitialTiles(pool));
  const slotCursor = useRef(0);
  const displaySaved = savedCount ?? posts.length;

  useEffect(() => {
    initBentoMotion();
  }, []);

  useEffect(() => {
    setTiles(pickInitialTiles(pool));
    slotCursor.current = 0;
  }, [pool]);

  useEffect(() => {
    if (pool.length <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setTiles((current) => {
        const slotIndex = slotCursor.current % SLOT_COUNT;
        slotCursor.current += 1;
        const next = nextTileForSlot(pool, current, slotIndex);
        if (!next) return current;
        const updated = current.slice();
        updated[slotIndex] = next;
        return updated;
      });
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [pool]);

  return (
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

      <BentoMediaTile tile={tiles[0]} />
      <BentoMediaTile tile={tiles[1]} />

      <div className="home-tile home-tile--data">
        <span className="home-tile-lbl">{savedLabel}</span>
        <span className="home-tile-val">{statValue(authReady, displaySaved)}</span>
      </div>

      <BentoMediaTile tile={tiles[2]} />
      <BentoMediaTile tile={tiles[3]} />

      <div className="home-tile home-tile--data">
        <span className="home-tile-lbl">Visited so far</span>
        <span className="home-tile-val">
          <em>{statValue(authReady, visitCount)}</em>
        </span>
      </div>

      <BentoMediaTile tile={tiles[4]} wide />
    </section>
  );
}

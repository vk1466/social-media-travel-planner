import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deletePost, nativePostId, type Place, type SavedPost } from "../api";
import {
  BROWSE_PLATFORMS,
  groupByMonth,
  mapSavedPosts,
  thumbStyle,
  type BrowsePost,
} from "../postBrowseModel";
import { PostDetail } from "./PostDetail";

import "../post-lantern.css";
import "../wf-browse.css";

interface PostLibraryProps {
  posts: SavedPost[];
  places: Place[];
  onDeleted: () => void;
  onNavigateToPlace?: (placeId: string) => void;
}

interface PlaceRing {
  key: string;
  label: string;
  placeId: string | null;
  count: number;
  cover: BrowsePost | null;
  share: number;
}

type DeckMode = "deck" | "grid";

const MAX_PLACE_RINGS = 9;
const ERA_PREVIEW_FRAMES = 8;
const NO_ERA = "";

function vars(entries: Record<string, string | number>): CSSProperties {
  return entries as CSSProperties;
}

export function PostLibrary({ posts, places, onDeleted, onNavigateToPlace }: PostLibraryProps) {
  const { platform: routePlatform, postId: routePostId } = useParams();
  const navigate = useNavigate();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [ringKey, setRingKey] = useState("all");
  const [openEraKey, setOpenEraKey] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [deckMode, setDeckMode] = useState<DeckMode>("deck");
  const [searchQuery, setSearchQuery] = useState("");

  const placeNamesById = useMemo(
    () => Object.fromEntries(places.map((place) => [place.place_id, place.display_name])),
    [places],
  );

  const browsePosts = useMemo(
    () => mapSavedPosts(posts, placeNamesById),
    [posts, placeNamesById],
  );

  const postsByKey = useMemo(() => {
    const map = new Map<string, SavedPost>();
    for (const post of posts) {
      map.set(post.post_id, post);
    }
    return map;
  }, [posts]);

  const platformPosts = useMemo(() => {
    if (platformFilter === "all") {
      return browsePosts;
    }
    return browsePosts.filter((post) => post.platform === platformFilter);
  }, [browsePosts, platformFilter]);

  const placeRings = useMemo<PlaceRing[]>(() => {
    const tally = new Map<
      string,
      { label: string; placeId: string | null; count: number; cover: BrowsePost }
    >();

    for (const browse of platformPosts) {
      const post = postsByKey.get(browse.key);
      if (!post) {
        continue;
      }

      if (post.place_ids.length > 0) {
        for (const placeId of post.place_ids) {
          const key = `id:${placeId}`;
          const label = placeNamesById[placeId] ?? placeId;
          const existing = tally.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            tally.set(key, { label, placeId, count: 1, cover: browse });
          }
        }
      } else {
        const names = browse.placeNames.length > 0 ? browse.placeNames : ["Unplaced"];
        for (const name of names) {
          const key = `name:${name}`;
          const existing = tally.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            tally.set(key, { label: name, placeId: null, count: 1, cover: browse });
          }
        }
      }
    }

    const ranked = Array.from(tally.entries())
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .slice(0, MAX_PLACE_RINGS);
    const peak = Math.max(...ranked.map(([, entry]) => entry.count), 1);

    return [
      {
        key: "all",
        label: "All saves",
        placeId: null,
        count: platformPosts.length,
        cover: platformPosts[0] ?? null,
        share: 1,
      },
      ...ranked.map(([key, entry]) => ({
        key,
        label: entry.label,
        placeId: entry.placeId,
        count: entry.count,
        cover: entry.cover,
        share: entry.count / peak,
      })),
    ];
  }, [platformPosts, postsByKey, placeNamesById]);

  const filtered = useMemo(() => {
    let list = platformPosts;

    if (ringKey !== "all") {
      list = list.filter((browse) => {
        const post = postsByKey.get(browse.key);
        if (!post) {
          return false;
        }
        if (ringKey.startsWith("id:")) {
          return post.place_ids.includes(ringKey.slice(3));
        }
        if (ringKey.startsWith("name:")) {
          const name = ringKey.slice(5);
          if (name === "Unplaced") {
            return post.place_ids.length === 0 && browse.placeNames.length === 0;
          }
          return browse.placeNames.includes(name);
        }
        return false;
      });
    }

    const needle = searchQuery.trim().toLowerCase();
    if (needle) {
      list = list.filter((browse) => {
        if (browse.title.toLowerCase().includes(needle)) {
          return true;
        }
        if (browse.description.toLowerCase().includes(needle)) {
          return true;
        }
        if (browse.placeNames.some((name) => name.toLowerCase().includes(needle))) {
          return true;
        }
        if (browse.tags.some((tag) => tag.toLowerCase().includes(needle))) {
          return true;
        }
        return false;
      });
    }

    return list;
  }, [platformPosts, ringKey, postsByKey, searchQuery]);

  const eras = useMemo(() => groupByMonth(filtered), [filtered]);

  const openEraLabel = useMemo(() => {
    if (openEraKey && openEraKey !== NO_ERA) {
      const era = eras.find((entry) => entry.key === openEraKey);
      if (era) {
        return era.label;
      }
    }
    return "All months";
  }, [eras, openEraKey]);

  // Latest month opens by default; re-open latest when filters change the set.
  useEffect(() => {
    setOpenEraKey(null);
  }, [platformFilter, ringKey, searchQuery]);

  useEffect(() => {
    if (eras.length === 0) {
      return;
    }
    const stillPresent =
      openEraKey !== null &&
      openEraKey !== NO_ERA &&
      eras.some((era) => era.key === openEraKey);
    if (openEraKey === null || (openEraKey !== NO_ERA && !stillPresent)) {
      setOpenEraKey(eras[0].key);
    }
  }, [eras, openEraKey]);

  useEffect(() => {
    if (!routePlatform || !routePostId) {
      setSelectedPost(null);
      return;
    }
    const match = posts.find(
      (post) => post.platform === routePlatform && nativePostId(post) === routePostId,
    );
    setSelectedPost(match ?? null);
  }, [routePlatform, routePostId, posts]);

  useEffect(() => {
    if (!selectedPost) {
      return;
    }
    const updated = posts.find(
      (post) =>
        post.platform === selectedPost.platform && post.post_id === selectedPost.post_id,
    );
    if (updated) {
      setSelectedPost(updated);
    }
  }, [posts, selectedPost]);

  const openPost = (post: SavedPost) => {
    setSelectedPost(post);
    navigate(`/posts/${post.platform}/${nativePostId(post)}`);
  };

  const closePost = () => {
    setSelectedPost(null);
    navigate("/posts");
  };

  function toggleEra(key: string) {
    setOpenEraKey((current) => (current === key ? NO_ERA : key));
  }

  function pickTile(browse: BrowsePost) {
    const post = postsByKey.get(browse.key);
    if (post) {
      openPost(post);
    }
  }

  function placeChips(browse: BrowsePost): { placeId: string; name: string }[] {
    const post = postsByKey.get(browse.key);
    if (!post || post.place_ids.length === 0) {
      return [];
    }
    return post.place_ids.slice(0, 2).map((placeId) => ({
      placeId,
      name: placeNamesById[placeId] ?? placeId,
    }));
  }

  return (
    <section className="wf-browse library-section post-library-lantern">
      <div className="wf-container wf-browse-masthead">
        <div>
          <p className="wf-browse-eyebrow">Your library</p>
          <h1 className="wf-browse-title">Saves</h1>
          <p className="wf-browse-lede">
            Every reel, short, and post you've kept — grouped by the month you saved it and the
            places inside it.
          </p>
        </div>
        <div className="wf-browse-count">
          <span className="wf-browse-count-value">{filtered.length}</span>
          <span className="wf-browse-count-label">saves</span>
        </div>
      </div>

      <div className="wf-browse-bar">
        <div className="wf-container wf-browse-bar-inner">
          <p className="wf-browse-context">{openEraLabel}</p>
          <div className="wf-seg" role="group" aria-label="Layout">
            <button
              type="button"
              className={`wf-seg-btn ${deckMode === "deck" ? "is-active" : ""}`}
              onClick={() => setDeckMode("deck")}
            >
              Deck
            </button>
            <button
              type="button"
              className={`wf-seg-btn ${deckMode === "grid" ? "is-active" : ""}`}
              onClick={() => setDeckMode("grid")}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      <div className="wf-container wf-facets">
        <div className="wf-facet-row" role="tablist" aria-label="Platform filter">
          <span className="wf-facet-label">Platform</span>
          {BROWSE_PLATFORMS.map((platform) => (
            <button
              key={platform}
              type="button"
              role="tab"
              aria-selected={platformFilter === platform}
              className={`wf-pill ${platformFilter === platform ? "is-active" : ""}`}
              onClick={() => setPlatformFilter(platform)}
            >
              {platform}
            </button>
          ))}
        </div>
        <div className="wf-facet-row">
          <span className="wf-facet-label">Search</span>
          <label className="wf-search-field">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Title, place, tag…"
              aria-label="Search saves"
            />
          </label>
        </div>
      </div>

      <div className="wf-container wf-browse-body">
        <div className="p3" data-view="lantern-deck" data-mode={deckMode}>
          <div className="p3-shell post-library-lantern-shell">
            {browsePosts.length === 0 ? (
              <div className="empty-state">
                <p>Paste your first Instagram links above to get started.</p>
              </div>
            ) : (
              <div className="p3-body p3-body--lantern">
                <div
                  className="wf-rail p3-rings p3-rings--glow"
                  style={vars({ "--slots": placeRings.length })}
                  role="tablist"
                  aria-label="Place filter"
                >
                  {placeRings.map((ring, index) => (
                    <button
                      key={ring.key}
                      type="button"
                      role="tab"
                      aria-selected={ringKey === ring.key}
                      className={`p3-ring ${ringKey === ring.key ? "is-active" : ""}`}
                      style={vars({ "--i": index, "--share": ring.share })}
                      onClick={() => setRingKey(ring.key)}
                    >
                      <span className="p3-ring-halo">
                        <span
                          className="p3-ring-thumb"
                          style={ring.cover ? thumbStyle(ring.cover, index) : undefined}
                        />
                      </span>
                      {ring.placeId ? (
                        <Link
                          className="p3-ring-label"
                          to={`/places/${ring.placeId}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {ring.label}
                        </Link>
                      ) : (
                        <span className="p3-ring-label">{ring.label}</span>
                      )}
                      <span className="p3-ring-count">{ring.count}</span>
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <p className="p3-empty">No posts in this filter.</p>
                ) : (
                  <div className="p3-timeline">
                    {eras.map((era) => {
                      const open = openEraKey === era.key;
                      return (
                        <section key={era.key} className={`p3-era ${open ? "is-open" : ""}`}>
                          <button
                            type="button"
                            className="p3-era-head"
                            aria-expanded={open}
                            onClick={() => toggleEra(era.key)}
                          >
                            <span className="p3-era-pin" aria-hidden="true" />
                            <span className="p3-era-label">{era.label}</span>
                            <span className="p3-era-count">
                              {era.posts.length} save{era.posts.length === 1 ? "" : "s"}
                            </span>
                            <span className="p3-era-strip" aria-hidden="true">
                              {era.posts.slice(0, ERA_PREVIEW_FRAMES).map((post, index) => (
                                <span
                                  key={post.key}
                                  className="p3-era-frame"
                                  style={thumbStyle(post, index)}
                                />
                              ))}
                            </span>
                            <span className="p3-era-chevron" aria-hidden="true" />
                          </button>
                          {open && (
                            <div className="p3-lattice" aria-label={`${era.label} saves`}>
                              {era.posts.map((post, index) => {
                                const chips = placeChips(post);
                                return (
                                  <button
                                    key={post.key}
                                    type="button"
                                    className={`p3-tile ${
                                      selectedPost?.post_id === post.key ? "is-selected" : ""
                                    }`}
                                    style={vars({ "--i": index })}
                                    onClick={() => pickTile(post)}
                                  >
                                    <span
                                      className="p3-tile-thumb"
                                      style={thumbStyle(post, index)}
                                      aria-hidden="true"
                                    />
                                    <span className="p3-tile-veil" aria-hidden="true" />
                                    <span className="p3-tile-copy">
                                      <span className="p3-tile-title">{post.title}</span>
                                      <span className="p3-tile-reveal">
                                        <span className="p3-tile-desc">{post.description}</span>
                                        <span className="p3-tile-meta">
                                          <span>{post.platformLabel}</span>
                                          {chips.length > 0 ? (
                                            <span className="p3-tile-chips">
                                              {chips.map((chip) => (
                                                <Link
                                                  key={chip.placeId}
                                                  className="wf-chip"
                                                  to={`/places/${chip.placeId}`}
                                                  onClick={(event) => event.stopPropagation()}
                                                >
                                                  {chip.name}
                                                </Link>
                                              ))}
                                            </span>
                                          ) : (
                                            post.placeCount > 0 && (
                                              <span>
                                                {post.placeCount} place
                                                {post.placeCount === 1 ? "" : "s"}
                                              </span>
                                            )
                                          )}
                                          <span>{post.dateLabel}</span>
                                        </span>
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={closePost}
          onNavigateToPlace={onNavigateToPlace}
          onDelete={async () => {
            await deletePost(selectedPost.platform, nativePostId(selectedPost));
            closePost();
            onDeleted();
          }}
        />
      )}
    </section>
  );
}

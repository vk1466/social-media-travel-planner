import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  deletePost,
  nativePostId,
  type Place,
  type SavedPost,
} from "../api";
import {
  formatDate,
  platformLabel,
  postTitle,
  proxiedMediaUrl,
} from "../display";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState, Toolbar } from "../components/Toolbar";
import { PageHeading } from "../components/Shell";

export function PostsPage({
  posts,
  places,
  onDeleted,
}: {
  posts: SavedPost[];
  places: Place[];
  onDeleted: () => void;
}) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("All");
  const [selected, setSelected] = useState<SavedPost | null>(null);
  const names = Object.fromEntries(places.map((place) => [place.place_id, place.display_name]));

  const platforms = ["All", ...new Set(posts.map((post) => platformLabel(post.platform)))];
  const filtered = posts.filter((post) => {
    if (platform !== "All" && platformLabel(post.platform) !== platform) return false;
    const haystack = `${postTitle(post)} ${post.caption} ${post.author_handle ?? ""}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <PageHeading
        kicker="All sources"
        title="Posts"
        lede="Every social save in one feed. Filter here without changing the other category pages."
      />
      <Toolbar
        placeholder="Search saved posts"
        query={query}
        onQuery={setQuery}
        options={platforms}
        selected={platform}
        onSelect={setPlatform}
      />
      {filtered.length === 0 ? (
        <EmptyState>No posts match that filter.</EmptyState>
      ) : (
        <div className="media-grid">
          {filtered.map((post) => {
            const image = proxiedMediaUrl(post.thumbnail_url);
            const meta = [
              platformLabel(post.platform),
              formatDate(post.posted_at ?? post.fetched_at),
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <article
                key={post.post_id}
                className="media-card"
                tabIndex={0}
                onClick={() => setSelected(post)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(post);
                  }
                }}
              >
                <div
                  className="photo"
                  style={image ? { backgroundImage: `url('${image}')` } : undefined}
                >
                  <span>{post.media_kind || "post"}</span>
                </div>
                <div>
                  <h2>{postTitle(post)}</h2>
                  <p>{meta}</p>
                  <button type="button">Open post →</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected ? (
        <PostDetail
          post={selected}
          placeNames={names}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            onDeleted();
          }}
        />
      ) : null}
    </>
  );
}

function PostDetail({
  post,
  placeNames,
  onClose,
  onDeleted,
}: {
  post: SavedPost;
  placeNames: Record<string, string>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const image = proxiedMediaUrl(post.thumbnail_url);
  const [busy, setBusy] = useState(false);

  return (
    <DetailSheet title={postTitle(post)} onClose={onClose}>
      {image ? <div className="sheet-hero" style={{ backgroundImage: `url('${image}')` }} /> : null}
      <p className="eyebrow">{platformLabel(post.platform)}</p>
      <h2 className="sheet-title">{postTitle(post)}</h2>
      <p className="sheet-meta">
        {[post.author_handle, formatDate(post.posted_at ?? post.fetched_at)].filter(Boolean).join(" · ")}
      </p>
      {post.reel_summary ? <p className="sheet-copy">{post.reel_summary}</p> : null}
      {post.caption ? <p className="sheet-copy">{post.caption}</p> : null}
      {post.place_ids.length > 0 ? (
        <ul className="sheet-list">
          {post.place_ids.map((placeId) => (
            <li key={placeId}>
              <button type="button" onClick={() => navigate(`/travel/${placeId}`)}>
                {placeNames[placeId] ?? "Place"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="sheet-actions">
        <a href={post.post_url} target="_blank" rel="noreferrer">
          Open original
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await deletePost(post.platform, nativePostId(post));
              onDeleted();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Removing…" : "Remove from library"}
        </button>
      </div>
    </DetailSheet>
  );
}

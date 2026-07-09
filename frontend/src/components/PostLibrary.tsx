import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { deletePost, type CanonicalPlace, type SavedPost } from "../api";
import { PostCard } from "./PostCard";
import { PostDetail } from "./PostDetail";

interface PostLibraryProps {
  posts: SavedPost[];
  places: CanonicalPlace[];
  onDeleted: () => void;
  onNavigateToPlace?: (placeId: string) => void;
}

const PLATFORMS = ["all", "instagram", "youtube", "tiktok", "reddit"];

export function PostLibrary({ posts, places, onDeleted, onNavigateToPlace }: PostLibraryProps) {
  const { platform: routePlatform, postId: routePostId } = useParams();
  const navigate = useNavigate();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);

  const placeNamesById = Object.fromEntries(
    places.map((place) => [place.place_id, place.display_name]),
  );

  const filtered =
    platformFilter === "all"
      ? posts
      : posts.filter((post) => post.platform === platformFilter);

  useEffect(() => {
    if (!routePlatform || !routePostId) {
      setSelectedPost(null);
      return;
    }
    const match = posts.find(
      (post) => post.platform === routePlatform && post.post_id === routePostId,
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
    navigate(`/posts/${post.platform}/${post.post_id}`);
  };

  const closePost = () => {
    setSelectedPost(null);
    navigate("/posts");
  };

  return (
    <section className="library-section">
      {posts.length > 0 && (
        <div className="library-toolbar">
          <select
            className="platform-filter"
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            aria-label="Filter by platform"
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>Paste your first Instagram links above to get started.</p>
        </div>
      ) : (
        <div className="post-grid">
          {filtered.map((post) => (
            <PostCard
              key={`${post.platform}-${post.post_id}`}
              post={post}
              placeNamesById={placeNamesById}
              onSelect={openPost}
              onNavigateToPlace={onNavigateToPlace}
              onDelete={async () => {
                await deletePost(post.platform, post.post_id);
                if (
                  selectedPost?.platform === post.platform &&
                  selectedPost.post_id === post.post_id
                ) {
                  closePost();
                }
                onDeleted();
              }}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={closePost}
          onNavigateToPlace={onNavigateToPlace}
          onDelete={async () => {
            await deletePost(selectedPost.platform, selectedPost.post_id);
            closePost();
            onDeleted();
          }}
        />
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";

import { fetchPosts, type SavedPost } from "../api";
import { toBrowsePosts, type BrowsePost } from "../postBrowseModel";

interface PostBrowseLibrary {
  posts: BrowsePost[];
  loading: boolean;
  usingSampleData: boolean;
}

/** Loads the signed-in user's posts for browse demos, falling back to samples. */
export function usePostBrowseLibrary(authReady: boolean): PostBrowseLibrary {
  const [apiPosts, setApiPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!authReady) {
        if (!cancelled) {
          setApiPosts([]);
          setLoading(false);
        }
        return;
      }
      try {
        const posts = await fetchPosts();
        if (!cancelled) {
          setApiPosts(posts);
        }
      } catch {
        if (!cancelled) {
          setApiPosts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const { posts, usingSampleData } = useMemo(() => toBrowsePosts(apiPosts), [apiPosts]);

  return { posts, loading, usingSampleData };
}

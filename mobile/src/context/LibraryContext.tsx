import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchPlaces,
  fetchPosts,
  fetchVisits,
  type Place,
  type SavedPost,
  type VisitDetail,
} from "../api";

interface LibraryContextValue {
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
  loading: boolean;
  error: string | null;
  refreshToken: number;
  refresh: () => Promise<void>;
  bumpRefresh: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<VisitDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPosts, nextPlaces, nextVisits] = await Promise.all([
        fetchPosts(),
        fetchPlaces(),
        fetchVisits(),
      ]);
      setPosts(nextPosts);
      setPlaces(nextPlaces);
      setVisits(nextVisits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshToken]);

  const value = useMemo(
    () => ({
      posts,
      places,
      visits,
      loading,
      error,
      refreshToken,
      refresh,
      bumpRefresh,
    }),
    [posts, places, visits, loading, error, refreshToken, refresh, bumpRefresh],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error("useLibrary must be used within LibraryProvider");
  }
  return ctx;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  fetchAdminMe,
  fetchPlaces,
  fetchPosts,
  fetchVisits,
  type Place,
  type SavedPost,
  type VisitDetail,
} from "../api";

const CACHE_POSTS_KEY = "wanderfile.library.posts.v1";
const CACHE_PLACES_KEY = "wanderfile.library.places.v1";
const CACHE_VISITS_KEY = "wanderfile.library.visits.v1";

interface LibraryContextValue {
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
  loading: boolean;
  error: string | null;
  refreshToken: number;
  isAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const isHydrated = useRef(false);

  // Fast offline hydration from local storage
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([
          CACHE_POSTS_KEY,
          CACHE_PLACES_KEY,
          CACHE_VISITS_KEY,
        ]);
        if (!active) return;
        const [postsEntry, placesEntry, visitsEntry] = pairs;
        let hasCachedData = false;
        if (postsEntry && postsEntry[1]) {
          const parsed = JSON.parse(postsEntry[1]) as SavedPost[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPosts(parsed);
            hasCachedData = true;
          }
        }
        if (placesEntry && placesEntry[1]) {
          const parsed = JSON.parse(placesEntry[1]) as Place[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlaces(parsed);
            hasCachedData = true;
          }
        }
        if (visitsEntry && visitsEntry[1]) {
          const parsed = JSON.parse(visitsEntry[1]) as VisitDetail[];
          if (Array.isArray(parsed)) {
            setVisits(parsed);
          }
        }
        if (hasCachedData) {
          setLoading(false);
        }
      } catch {
        // Cache read failed silently, network will populate
      } finally {
        isHydrated.current = true;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    // Only show full loading spinner if we have no cached data at all
    setPosts((current) => {
      if (current.length === 0) setLoading(true);
      return current;
    });
    setError(null);
    try {
      const [nextPosts, nextPlaces, nextVisits, admin] = await Promise.all([
        fetchPosts(),
        fetchPlaces(),
        fetchVisits(),
        fetchAdminMe().catch(() => ({ is_admin: false, is_super_admin: false })),
      ]);
      setPosts(nextPosts);
      setPlaces(nextPlaces);
      setVisits(nextVisits);
      setIsAdmin(admin.is_admin);

      // Async write to disk in background without blocking UI
      void AsyncStorage.multiSet([
        [CACHE_POSTS_KEY, JSON.stringify(nextPosts)],
        [CACHE_PLACES_KEY, JSON.stringify(nextPlaces)],
        [CACHE_VISITS_KEY, JSON.stringify(nextVisits)],
      ]).catch(() => {
        // Ignore cache write errors
      });
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
      isAdmin,
      refresh,
      bumpRefresh,
    }),
    [posts, places, visits, loading, error, refreshToken, isAdmin, refresh, bumpRefresh],
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

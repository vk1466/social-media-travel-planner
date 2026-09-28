import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "wanderfile.pending-shares.v1";

interface PendingShareState {
  urls: string[];
  autoSubmit: boolean;
}

interface PendingShareContextValue extends PendingShareState {
  pendingUrls: string[];
  hydrated: boolean;
  setPendingShare: (urls: string[], autoSubmit?: boolean) => Promise<void>;
  clearPendingUrls: (submittedUrls: string[]) => void;
}

const PendingShareContext = createContext<PendingShareContextValue | null>(null);

export function PendingShareProvider({ children }: { children: ReactNode }) {
  const [pendingShare, setPendingShareState] = useState<PendingShareState>({ urls: [], autoSubmit: false });
  const [hydrated, setHydrated] = useState(false);
  const currentState = useRef(pendingShare);
  const writeQueue = useRef(Promise.resolve());
  const hydrationPromise = useRef<Promise<void> | null>(null);

  const ensurePendingShareHydrated = useCallback((): Promise<void> => {
    if (hydrationPromise.current) return hydrationPromise.current;

    const hydration = AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          const parsed: unknown = JSON.parse(stored);
          if (
            parsed &&
            typeof parsed === "object" &&
            "urls" in parsed &&
            Array.isArray(parsed.urls) &&
            parsed.urls.every((url) => typeof url === "string")
          ) {
            const saved = parsed as PendingShareState;
            const merged = {
              urls: Array.from(new Set([...saved.urls, ...currentState.current.urls])),
              autoSubmit: Boolean(saved.autoSubmit || currentState.current.autoSubmit),
            };
            currentState.current = merged;
            setPendingShareState(merged);
          }
        } catch {
          // Ignore malformed persisted data and keep the in-memory queue.
        }
      })
      .catch((error: unknown) => {
        hydrationPromise.current = null;
        throw error;
      });
    hydrationPromise.current = hydration;
    return hydration;
  }, []);

  const persistPendingShare = useCallback((next: PendingShareState): Promise<void> => {
    const write = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)));
    // Keep the queue usable after a failure, while returning this write's actual result.
    writeQueue.current = write.then(() => undefined, () => undefined);
    return write;
  }, []);

  const updatePendingShare = useCallback(
    async (update: (current: PendingShareState) => PendingShareState): Promise<void> => {
      await ensurePendingShareHydrated();
      const next = update(currentState.current);
      currentState.current = next;
      setPendingShareState(next);
      await persistPendingShare(next);
    },
    [ensurePendingShareHydrated, persistPendingShare],
  );

  useEffect(() => {
    let active = true;
    void ensurePendingShareHydrated()
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [ensurePendingShareHydrated]);

  const setPendingShare = useCallback((urls: string[], shouldAutoSubmit = false): Promise<void> => {
    if (urls.length === 0) return Promise.resolve();
    return updatePendingShare((current) => ({
      urls: Array.from(new Set([...current.urls, ...urls])),
      autoSubmit: current.autoSubmit || shouldAutoSubmit,
    }));
  }, [updatePendingShare]);

  const clearPendingUrls = useCallback((submittedUrls: string[]) => {
    const submitted = new Set(submittedUrls);
    void updatePendingShare((current) => {
      const remaining = current.urls.filter((url) => !submitted.has(url));
      return { urls: remaining, autoSubmit: current.autoSubmit && remaining.length > 0 };
    }).catch(() => undefined);
  }, [updatePendingShare]);

  const value = useMemo(
    () => ({ ...pendingShare, pendingUrls: pendingShare.urls, hydrated, setPendingShare, clearPendingUrls }),
    [pendingShare, hydrated, setPendingShare, clearPendingUrls],
  );

  return <PendingShareContext.Provider value={value}>{children}</PendingShareContext.Provider>;
}

export function usePendingShare(): PendingShareContextValue {
  const ctx = useContext(PendingShareContext);
  if (!ctx) throw new Error("usePendingShare must be used within PendingShareProvider");
  return ctx;
}

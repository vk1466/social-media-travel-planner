import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface PendingShareContextValue {
  pendingUrls: string[];
  autoSubmit: boolean;
  setPendingShare: (urls: string[], autoSubmit?: boolean) => void;
  clearPendingUrls: () => void;
}

const PendingShareContext = createContext<PendingShareContextValue | null>(null);

export function PendingShareProvider({ children }: { children: ReactNode }) {
  const [pendingUrls, setPendingUrlsState] = useState<string[]>([]);
  const [autoSubmit, setAutoSubmit] = useState(false);

  const setPendingShare = useCallback((urls: string[], shouldAutoSubmit = false) => {
    setPendingUrlsState(urls);
    setAutoSubmit(shouldAutoSubmit && urls.length > 0);
  }, []);

  const clearPendingUrls = useCallback(() => {
    setPendingUrlsState([]);
    setAutoSubmit(false);
  }, []);

  const value = useMemo(
    () => ({
      pendingUrls,
      autoSubmit,
      setPendingShare,
      clearPendingUrls,
    }),
    [pendingUrls, autoSubmit, setPendingShare, clearPendingUrls],
  );

  return (
    <PendingShareContext.Provider value={value}>{children}</PendingShareContext.Provider>
  );
}

export function usePendingShare(): PendingShareContextValue {
  const ctx = useContext(PendingShareContext);
  if (!ctx) {
    throw new Error("usePendingShare must be used within PendingShareProvider");
  }
  return ctx;
}

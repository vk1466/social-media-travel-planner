import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface PendingShareContextValue {
  pendingUrls: string[];
  setPendingUrls: (urls: string[]) => void;
  clearPendingUrls: () => void;
}

const PendingShareContext = createContext<PendingShareContextValue | null>(null);

export function PendingShareProvider({ children }: { children: ReactNode }) {
  const [pendingUrls, setPendingUrlsState] = useState<string[]>([]);

  const value = useMemo(
    () => ({
      pendingUrls,
      setPendingUrls: setPendingUrlsState,
      clearPendingUrls: () => setPendingUrlsState([]),
    }),
    [pendingUrls],
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

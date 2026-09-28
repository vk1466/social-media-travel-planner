import { useRouter, useSegments } from "expo-router";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import { useEffect, type ReactNode } from "react";

import { usePendingShare } from "@/src/context/PendingShareContext";
import { extractShareUrls } from "@/src/lib/shareUrl";

export function useShareIntentHandler(canOpenIngest: boolean): void {
  const router = useRouter();
  const segments = useSegments();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { setPendingShare } = usePendingShare();

  useEffect(() => {
    if (!hasShareIntent) {
      return;
    }
    let active = true;
    void (async () => {
      const text = [shareIntent.webUrl, shareIntent.text].filter(Boolean).join("\n");
      const urls = extractShareUrls(text);
      if (urls.length > 0) {
        try {
          await setPendingShare(urls, true);
        } catch {
          // Keep the native intent available so the share is not lost on storage failure.
          return;
        }
        if (!active) return;
        if (canOpenIngest) {
          const onIngest = (segments as string[]).includes("ingest");
          if (!onIngest) {
            router.push({
              pathname: "/(app)/ingest",
              params: { shared: "1" },
            });
          }
        }
      }
      // Persist first so an app restart cannot lose a share cleared from the OS.
      if (active) resetShareIntent();
    })();
    return () => {
      active = false;
    };
  }, [
    hasShareIntent,
    shareIntent,
    resetShareIntent,
    router,
    segments,
    setPendingShare,
    canOpenIngest,
  ]);
}

export function ShareIntentRoot({ children }: { children: ReactNode }) {
  return (
    <ShareIntentProvider
      options={{
        resetOnBackground: false,
      }}
    >
      {children}
    </ShareIntentProvider>
  );
}

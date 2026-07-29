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
    const text = [shareIntent.webUrl, shareIntent.text].filter(Boolean).join("\n");
    const urls = extractShareUrls(text);
    if (urls.length > 0) {
      setPendingShare(urls, true);
      if (canOpenIngest) {
        const onIngest = segments.includes("ingest");
        if (!onIngest) {
          router.replace({
            pathname: "/(app)/ingest",
            params: { shared: "1" },
          });
        }
      }
    }
    // Clear the native share payload only — do not navigate away (onResetShareIntent
    // used to send users back to Posts and cancel auto-ingest).
    resetShareIntent();
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
        resetOnBackground: true,
      }}
    >
      {children}
    </ShareIntentProvider>
  );
}

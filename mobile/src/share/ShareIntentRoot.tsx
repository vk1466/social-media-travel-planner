import { useRouter } from "expo-router";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import { useEffect, type ReactNode } from "react";

import { usePendingShare } from "@/src/context/PendingShareContext";
import { extractShareUrls } from "@/src/lib/shareUrl";

export function useShareIntentHandler(canOpenIngest: boolean): void {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { setPendingUrls } = usePendingShare();

  useEffect(() => {
    if (!hasShareIntent) {
      return;
    }
    const text = [shareIntent.webUrl, shareIntent.text].filter(Boolean).join("\n");
    const urls = extractShareUrls(text);
    if (urls.length > 0) {
      setPendingUrls(urls);
      if (canOpenIngest) {
        router.push({
          pathname: "/(app)/ingest",
          params: { shared: "1" },
        });
      }
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, router, setPendingUrls, canOpenIngest]);
}

export function ShareIntentRoot({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ShareIntentProvider
      options={{
        resetOnBackground: true,
        onResetShareIntent: onReset,
      }}
    >
      {children}
    </ShareIntentProvider>
  );
}

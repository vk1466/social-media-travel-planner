import { createContext, useContext, useState, type ReactNode } from "react";

import type { SavedPost } from "./api";

export const LIBRARY_PLATFORMS = ["instagram", "web"] as const;
export type LibraryPlatform = (typeof LIBRARY_PLATFORMS)[number];

const LibraryPlatformContext = createContext<{
  platforms: string[];
  togglePlatform: (value: string) => void;
  setPlatforms: (value: string[]) => void;
} | null>(null);

export function orderedLibraryPlatforms(platforms: readonly string[]): string[] {
  return LIBRARY_PLATFORMS.filter((key) => platforms.includes(key));
}

function toggleInList(current: string[], value: string): string[] {
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : orderedLibraryPlatforms([...current, value]);
  if (next.length === LIBRARY_PLATFORMS.length) {
    return [];
  }
  return next;
}

export function LibraryPlatformProvider({ children }: { children: ReactNode }) {
  const [platforms, setPlatforms] = useState<string[]>([]);
  return (
    <LibraryPlatformContext.Provider
      value={{
        platforms,
        setPlatforms,
        togglePlatform: (value) => setPlatforms((current) => toggleInList(current, value)),
      }}
    >
      {children}
    </LibraryPlatformContext.Provider>
  );
}

export function useLibraryPlatform() {
  const shared = useContext(LibraryPlatformContext);
  if (!shared) {
    throw new Error("useLibraryPlatform must be used within LibraryPlatformProvider");
  }
  return shared;
}

export function libraryPlatformLabel(key: string): string {
  if (key === "instagram") return "Instagram";
  if (key === "web") return "Web";
  return key;
}

export function libraryPlatformIcon(
  platform: string,
): "logo-instagram" | "globe-outline" {
  if (platform === "instagram") return "logo-instagram";
  return "globe-outline";
}

export const LIBRARY_PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E4405F",
  web: "#4fe8f6",
};

export function postsForPlatforms(posts: SavedPost[], platforms: string[]): SavedPost[] {
  if (platforms.length === 0) return posts;
  const allowed = new Set(platforms);
  return posts.filter((post) => allowed.has(post.platform));
}

export function placeMatchesPlatform(
  sourcePostIds: string[],
  posts: SavedPost[],
  platforms: string[],
): boolean {
  if (platforms.length === 0) return true;
  const allowed = new Set(
    posts.filter((post) => platforms.includes(post.platform)).map((post) => post.post_id),
  );
  return sourcePostIds.some((postId) => allowed.has(postId));
}

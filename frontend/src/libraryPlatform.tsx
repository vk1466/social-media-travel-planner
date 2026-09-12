import { createContext, useContext, useState, type ReactNode } from "react";
import { siInstagram, siTiktok, siYoutube, type SimpleIcon } from "simple-icons";

import type { SavedPost } from "./api";

export const LIBRARY_PLATFORMS = ["instagram", "youtube", "tiktok", "web"] as const;
export type LibraryPlatform = (typeof LIBRARY_PLATFORMS)[number];

export function orderedLibraryPlatforms(platforms: readonly string[]): string[] {
  return LIBRARY_PLATFORMS.filter((key) => platforms.includes(key));
}

const LibraryPlatformContext = createContext<{
  platforms: string[];
  togglePlatform: (value: string) => void;
  setPlatforms: (value: string[]) => void;
} | null>(null);

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
  const [localPlatforms, setLocalPlatforms] = useState<string[]>([]);
  if (shared) {
    return shared;
  }
  return {
    platforms: localPlatforms,
    setPlatforms: setLocalPlatforms,
    togglePlatform: (value: string) => setLocalPlatforms((current) => toggleInList(current, value)),
  };
}

export function libraryPlatformLabel(key: string): string {
  if (key === "instagram") return "Instagram";
  if (key === "tiktok") return "TikTok";
  if (key === "youtube") return "YouTube";
  if (key === "web") return "Web";
  return key;
}

const PLATFORM_LOGOS: Record<string, SimpleIcon> = {
  instagram: siInstagram,
  youtube: siYoutube,
  tiktok: siTiktok,
};

export const LIBRARY_PLATFORM_COLOR: Record<string, string> = {
  instagram: `#${siInstagram.hex}`,
  youtube: `#${siYoutube.hex}`,
  tiktok: `#${siTiktok.hex}`,
  web: "var(--dark)",
};

/** Material “public” glyph — web has no brand logo. */
const WEB_GLOBE_PATH =
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z";

export function PlatformIcon({
  platform,
  size = 20,
}: {
  platform: string;
  size?: number;
}) {
  const path = platform === "web" ? WEB_GLOBE_PATH : PLATFORM_LOGOS[platform]?.path;
  if (!path) return null;
  return (
    <svg
      className="lab-platform-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

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

/**
 * Shared view model for post-library browse demos.
 * Normalizes API posts (or sample posts) into one flat shape the layout
 * concepts can group, sort, and render without knowing the API.
 */

import type { CSSProperties } from "react";

import type { SavedPost } from "./api";
import { DEMO_POSTS, type DemoPost } from "./postListDemoData";
import {
  getPlatformLabel,
  getPostDescription,
  getPostTitle,
} from "./postDisplayUtils";

/** Below this many real posts the demos fall back to sample content. */
export const SAMPLE_DATA_THRESHOLD = 8;

export interface BrowsePost {
  key: string;
  platform: string;
  platformLabel: string;
  title: string;
  description: string;
  placeNames: string[];
  placeCount: number;
  tags: string[];
  dateLabel: string;
  dayKey: string;
  monthKey: string;
  monthLabel: string;
  timestamp: number;
  savedAt?: string | null;
  postedAt?: string | null;
  thumbnailUrl: string | null;
  author: string | null;
  postUrl: string;
  /** width / height — drives masonry and justified rows. */
  aspect: number;
}

function timeParts(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      dayKey: "unknown",
      monthKey: "unknown",
      monthLabel: "Undated",
      timestamp: 0,
    };
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return {
    dayKey: `${year}-${month}-${day}`,
    monthKey: `${year}-${month}`,
    monthLabel: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    timestamp: date.getTime(),
  };
}

function aspectFor(platform: string, mediaKind: string): number {
  if (mediaKind === "reel" || platform === "tiktok") {
    return 0.72;
  }
  if (mediaKind === "article") {
    return 1.3;
  }
  return 1.35;
}

export type PostTimeline = "saved" | "posted";

function dateLabelFromIso(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString();
}

function fromSavedPost(post: SavedPost): BrowsePost {
  const savedAt = post.fetched_at ?? null;
  const postedAt = post.posted_at ?? null;
  const time = timeParts(savedAt ?? postedAt);
  const placeNames = Array.from(
    new Set(
      [
        ...post.extracted_places.map((place) => place.place_name),
        ...post.places.map((place) => place.place_name),
      ].filter((name): name is string => Boolean(name)),
    ),
  );
  return {
    key: post.post_id,
    platform: post.platform,
    platformLabel: getPlatformLabel(post),
    title: getPostTitle(post),
    description: getPostDescription(post),
    placeNames,
    placeCount: placeNames.length || post.place_ids.length,
    tags: post.hashtags.map((tag) => tag.replace(/^#/, "").toLowerCase()).slice(0, 4),
    dateLabel: dateLabelFromIso(savedAt ?? postedAt),
    ...time,
    savedAt,
    postedAt,
    thumbnailUrl: post.thumbnail_url ?? null,
    author: post.author_handle ?? null,
    postUrl: post.post_url,
    aspect: aspectFor(post.platform, post.media_kind),
  };
}

function fromDemoPost(post: DemoPost): BrowsePost {
  const [headline, ...rest] = post.caption.split("\n");
  const time = timeParts(post.posted_at);
  return {
    key: post.post_id,
    platform: post.platform,
    platformLabel: post.platform.toUpperCase(),
    title: headline ?? post.caption,
    description: rest.join(" ") || (headline ?? post.caption),
    placeNames: post.place_names,
    placeCount: post.place_names.length,
    tags: post.hashtags.slice(0, 4),
    dateLabel: new Date(post.posted_at).toLocaleDateString(),
    ...time,
    savedAt: post.posted_at,
    postedAt: post.posted_at,
    thumbnailUrl: post.thumbnail_url,
    author: post.author_handle,
    postUrl: post.post_url,
    aspect: aspectFor(post.platform, post.media_kind),
  };
}

/** Re-key month groups and sort by saved date or original post date. */
export function withPostTimeline(posts: BrowsePost[], timeline: PostTimeline): BrowsePost[] {
  return posts
    .map((post) => {
      const iso = timeline === "posted" ? post.postedAt ?? post.savedAt : post.savedAt ?? post.postedAt;
      return {
        ...post,
        dateLabel: dateLabelFromIso(iso),
        ...timeParts(iso),
      };
    })
    .sort((left, right) => {
      if (right.timestamp !== left.timestamp) {
        return right.timestamp - left.timestamp;
      }
      return left.title.localeCompare(right.title);
    });
}

/** Newest first; sample content fills in when the account has few posts. */
export function toBrowsePosts(apiPosts: SavedPost[]): {
  posts: BrowsePost[];
  usingSampleData: boolean;
} {
  const usingSampleData = apiPosts.length < SAMPLE_DATA_THRESHOLD;
  const mapped = usingSampleData
    ? DEMO_POSTS.map(fromDemoPost)
    : apiPosts.map(fromSavedPost);
  const posts = [...mapped].sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return a.title.localeCompare(b.title);
  });
  return { posts, usingSampleData };
}

export interface BrowseGroup {
  key: string;
  label: string;
  posts: BrowsePost[];
}

export function groupByMonth(posts: BrowsePost[]): BrowseGroup[] {
  const groups = new Map<string, BrowseGroup>();
  for (const post of posts) {
    const existing = groups.get(post.monthKey);
    if (existing) {
      existing.posts.push(post);
    } else {
      groups.set(post.monthKey, {
        key: post.monthKey,
        label: post.monthLabel,
        posts: [post],
      });
    }
  }
  // Newest month first (`YYYY-MM` sorts lexicographically); undated last.
  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === "unknown") {
      return 1;
    }
    if (b.key === "unknown") {
      return -1;
    }
    return b.key.localeCompare(a.key);
  });
}

/** Map API posts for the live library — never falls back to sample content. */
export function mapSavedPosts(
  apiPosts: SavedPost[],
  placeNamesById: Record<string, string> = {},
): BrowsePost[] {
  return apiPosts
    .map((post) => {
      const browse = fromSavedPost(post);
      if (Object.keys(placeNamesById).length === 0) {
        return browse;
      }
      const resolved = Array.from(
        new Set(
          post.place_ids
            .map((placeId, index) =>
              placeNamesById[placeId] ??
              post.extracted_places[index]?.place_name ??
              post.places[index]?.place_name ??
              null,
            )
            .filter((name): name is string => Boolean(name)),
        ),
      );
      if (resolved.length === 0) {
        return browse;
      }
      return { ...browse, placeNames: resolved, placeCount: resolved.length };
    })
    .sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return a.title.localeCompare(b.title);
    });
}

const PLATFORM_ORDER = ["instagram", "youtube", "tiktok", "web", "reddit"];

export function groupByPlatform(posts: BrowsePost[]): BrowseGroup[] {
  const groups = new Map<string, BrowsePost[]>();
  for (const post of posts) {
    const list = groups.get(post.platform) ?? [];
    list.push(post);
    groups.set(post.platform, list);
  }
  const known = PLATFORM_ORDER.filter((platform) => groups.has(platform));
  const extra = Array.from(groups.keys()).filter(
    (platform) => !PLATFORM_ORDER.includes(platform),
  );
  return [...known, ...extra].map((platform) => ({
    key: platform,
    label: platform.toUpperCase(),
    posts: groups.get(platform) ?? [],
  }));
}

export function groupByPlace(posts: BrowsePost[]): BrowseGroup[] {
  const groups = new Map<string, BrowsePost[]>();
  for (const post of posts) {
    const chapter = post.placeNames[0] ?? "Unplaced";
    const list = groups.get(chapter) ?? [];
    list.push(post);
    groups.set(chapter, list);
  }
  return Array.from(groups.entries())
    .map(([name, groupPosts]) => ({ key: name, label: name, posts: groupPosts }))
    .sort((a, b) => b.posts.length - a.posts.length);
}

export function countByTag(posts: BrowsePost[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

const FALLBACK_HUES = [152, 28, 205, 168, 42];

/** Real thumbnail when present, otherwise a palette-consistent gradient. */
export function thumbStyle(post: BrowsePost, index: number): CSSProperties {
  if (post.thumbnailUrl) {
    return { backgroundImage: `url(${post.thumbnailUrl})` };
  }
  const hue = FALLBACK_HUES[index % FALLBACK_HUES.length];
  return {
    backgroundImage: `linear-gradient(145deg, hsl(${hue} 28% 42%), hsl(${hue + 30} 18% 22%))`,
  };
}

export const BROWSE_PLATFORMS = ["all", "instagram", "youtube", "tiktok", "web"] as const;

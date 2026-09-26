import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SavedPost } from "../api";

export interface MasonryConfig {
  columnCount: number;
  gutter: number;
}

/**
 * Returns dynamic column count (1 to 5 columns) based on viewport width.
 */
export function getMasonryConfig(viewportWidth: number): MasonryConfig {
  if (viewportWidth < 520) {
    return { columnCount: 1, gutter: 12 };
  }
  if (viewportWidth < 820) {
    return { columnCount: 2, gutter: 14 };
  }
  if (viewportWidth < 1200) {
    return { columnCount: 3, gutter: 16 };
  }
  if (viewportWidth < 1620) {
    return { columnCount: 4, gutter: 18 };
  }
  return { columnCount: 5, gutter: 20 };
}

/**
 * Derives natural dimensions per specification:
 * - 9:16 for vertical reels and shorts
 * - 4:5 for photos and food recipes
 * - 2:3 for movie posters
 * - 16:9 for landscape places
 */
export function postAspectRatio(post: SavedPost, contentCategory?: string): string {
  // Places are always horizontal 16:9
  if (
    contentCategory === "travel" ||
    (post.place_ids && post.place_ids.length > 0) ||
    (post.extracted_places && post.extracted_places.length > 0) ||
    (post.places && post.places.length > 0)
  ) {
    return "16 / 9";
  }

  // Food / Recipes are 4:5
  if (contentCategory === "food" || post.extracted_recipe) {
    return "4 / 5";
  }

  // Movie / Watch posters are 2:3
  if (
    contentCategory === "movies" ||
    (post.resolved_movies && post.resolved_movies.length > 0) ||
    (post.extracted_movies && post.extracted_movies.length > 0)
  ) {
    return "2 / 3";
  }

  const kind = post.media_kind?.toLowerCase();
  if (kind === "photo" || kind === "carousel") {
    return "4 / 5";
  }

  // Default to 9:16 for vertical reels and shorts
  return "9 / 16";
}

export function postAspectRatioValue(post: SavedPost, contentCategory?: string): number {
  const ratio = postAspectRatio(post, contentCategory);
  switch (ratio) {
    case "16 / 9":
      return 16 / 9;
    case "4 / 5":
      return 4 / 5;
    case "2 / 3":
      return 2 / 3;
    case "9 / 16":
      return 9 / 16;
    default:
      return 9 / 16;
  }
}

/**
 * Hook for shortest-column greedy height balancing across 1 to 5 columns.
 */
export function useMasonryColumns<T>(
  items: T[],
  getItemAspectRatioValue: (item: T) => number,
  forcedColumnCount?: number,
) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const config = useMemo(() => {
    const base = getMasonryConfig(viewportWidth);
    if (forcedColumnCount && forcedColumnCount > 0) {
      return { columnCount: forcedColumnCount, gutter: base.gutter };
    }
    return base;
  }, [viewportWidth, forcedColumnCount]);

  const columns = useMemo(() => {
    const colCount = Math.max(1, Math.min(5, config.columnCount));
    const result: T[][] = Array.from({ length: colCount }, () => []);
    const heights: number[] = Array.from({ length: colCount }, () => 0);

    for (const item of items) {
      const ratio = getItemAspectRatioValue(item) || 0.75;
      const unitHeight = 1 / ratio;

      let minIndex = 0;
      let minHeight = heights[0];
      for (let i = 1; i < colCount; i++) {
        if (heights[i] < minHeight) {
          minHeight = heights[i];
          minIndex = i;
        }
      }

      result[minIndex].push(item);
      heights[minIndex] += unitHeight;
    }

    return result;
  }, [items, getItemAspectRatioValue, config.columnCount]);

  return {
    columns,
    columnCount: config.columnCount,
    gutter: config.gutter,
    viewportWidth,
  };
}

export function MasonryGrid<T>({
  items,
  getItemKey,
  getItemAspectRatioValue,
  renderItem,
  className,
}: {
  items: T[];
  getItemKey: (item: T) => string | number;
  getItemAspectRatioValue: (item: T) => number;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const { columns, gutter } = useMasonryColumns(items, getItemAspectRatioValue);

  return (
    <div
      className={["wf-masonry-grid", className].filter(Boolean).join(" ")}
      style={{ gap: `${gutter}px` }}
    >
      {columns.map((colItems, colIdx) => (
        <div key={colIdx} className="wf-masonry-column" style={{ gap: `${gutter}px` }}>
          {colItems.map((item) => (
            <div key={getItemKey(item)} className="wf-masonry-item">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Doherty Threshold: Skeleton placeholder grid shown while real data loads.
   Eliminates blank-flash latency so interaction feels < 400 ms.
   --------------------------------------------------------------------------- */

const SKELETON_ASPECT_RATIOS = [9 / 16, 4 / 5, 16 / 9, 2 / 3, 4 / 5, 9 / 16, 16 / 9, 4 / 5];

function SkeletonCard({ aspectRatio }: { aspectRatio: number }) {
  return (
    <div
      className="cover-card wf-skeleton-card"
      style={{ aspectRatio: `${aspectRatio}` }}
      aria-hidden="true"
    >
      <span className="cover-card-media wf-skeleton-shimmer" />
    </div>
  );
}

/**
 * Masonry-shaped skeleton grid displayed during initial data fetch.
 * Uses the same column balancing as MasonryGrid for seamless transition.
 */
export function MasonrySkeletonGrid({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const skeletonItems = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `skel-${i}`,
        aspectRatio: SKELETON_ASPECT_RATIOS[i % SKELETON_ASPECT_RATIOS.length],
      })),
    [count],
  );

  const { columns, gutter } = useMasonryColumns(
    skeletonItems,
    (item) => item.aspectRatio,
  );

  return (
    <div
      className={["wf-masonry-grid", className].filter(Boolean).join(" ")}
      style={{ gap: `${gutter}px` }}
      role="status"
      aria-label="Loading saves…"
    >
      {columns.map((colItems, colIdx) => (
        <div key={colIdx} className="wf-masonry-column" style={{ gap: `${gutter}px` }}>
          {colItems.map((item) => (
            <div key={item.id} className="wf-masonry-item">
              <SkeletonCard aspectRatio={item.aspectRatio} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

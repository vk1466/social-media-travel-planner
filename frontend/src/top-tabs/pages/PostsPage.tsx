import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  deletePost,
  fetchVisitedPlaceIds,
  nativePostId,
  type Place,
  type SavedPost,
} from "../../api";
import { categoryLabel } from "../../categoryLabels";
import { CoverCard } from "../../components/CoverCard";
import {
  contentCategoryTabs,
  effectiveContentCategory,
} from "../../contentCategory";
import { BROWSE_PLATFORMS } from "../../postBrowseModel";
import {
  formatDate,
  platformLabel,
  postTitle,
  proxiedMediaUrl,
} from "../display";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState, FilterChrome, FilterPills, Toolbar } from "../components/Toolbar";
import { PageHeading } from "../components/Shell";
import { useLabTheme } from "../theme";

type PlaceStatus = "all" | "visited" | "inspiration";
type DateMode = "saved" | "posted";

interface FacetPill {
  key: string;
  label: string;
  count: number;
}

export function PostsPage({
  posts,
  places,
  onDeleted,
}: {
  posts: SavedPost[];
  places: Place[];
  onDeleted: () => void;
}) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [contentCategory, setContentCategory] = useState("all");
  const [dateMode, setDateMode] = useState<DateMode>("saved");
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("all");
  const [facetKeys, setFacetKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<SavedPost | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [pillsExpanded, setPillsExpanded] = useState(false);

  const names = useMemo(
    () => Object.fromEntries(places.map((place) => [place.place_id, place.display_name])),
    [places],
  );
  const placesById = useMemo(
    () => Object.fromEntries(places.map((place) => [place.place_id, place])),
    [places],
  );
  const topicTabs = useMemo(() => contentCategoryTabs(posts), [posts]);
  const travelFilters = contentCategory === "travel";

  useEffect(() => {
    if (!travelFilters) {
      setVisitedIds(new Set());
      return;
    }
    let cancelled = false;
    void fetchVisitedPlaceIds()
      .then((ids) => {
        if (!cancelled) setVisitedIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setVisitedIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [travelFilters]);

  const topicPosts = useMemo(() => {
    if (contentCategory === "all") return posts;
    return posts.filter((post) => effectiveContentCategory(post) === contentCategory);
  }, [posts, contentCategory]);

  const platformPosts = useMemo(() => {
    if (platform === "all") return topicPosts;
    return topicPosts.filter((post) => post.platform === platform);
  }, [topicPosts, platform]);

  const secondLevel = useMemo(() => {
    const eligible = travelFilters
      ? platformPosts.filter((post) => matchesPlaceStatus(post, placeStatus, visitedIds))
      : platformPosts;
    return buildSecondLevel(contentCategory, eligible, placesById);
  }, [travelFilters, platformPosts, placeStatus, visitedIds, contentCategory, placesById]);

  const filtered = useMemo(() => {
    let list = platformPosts;

    if (travelFilters) {
      list = list.filter((post) => matchesPlaceStatus(post, placeStatus, visitedIds));
    }
    if (facetKeys.length > 0) {
      list = list.filter((post) =>
        postFacetKeys(post, contentCategory, placesById).some((key) => facetKeys.includes(key)),
      );
    }

    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((post) => {
        const haystack = [
          postTitle(post),
          post.caption,
          post.reel_summary,
          post.author_handle,
          ...(post.hashtags ?? []),
          ...post.place_ids.map((placeId) => names[placeId]),
          ...post.extracted_places.map((place) => place.place_name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    return [...list].sort((left, right) => postTimestamp(right, dateMode) - postTimestamp(left, dateMode));
  }, [
    platformPosts,
    travelFilters,
    placeStatus,
    visitedIds,
    facetKeys,
    contentCategory,
    placesById,
    query,
    names,
    dateMode,
  ]);

  const visiblePills = previewPills(secondLevel.pills, facetKeys, pillsExpanded);

  return (
    <>
      <PageHeading
        kicker="All sources"
        title="Posts"
        lede="Every social save in one feed. Filter here without changing the other category pages."
      />
      <FilterChrome>
      <Toolbar
        placeholder="Title, place, tag…"
        query={query}
        onQuery={setQuery}
        groups={[
          {
            ariaLabel: "Category filter",
            selected: contentCategory,
            onSelect: (value) => {
              setContentCategory(value);
              setPlaceStatus("all");
              setFacetKeys([]);
              setPillsExpanded(false);
            },
            options: [
              { value: "all", label: "All" },
              ...topicTabs.map((tab) => ({ value: tab.key, label: tab.label })),
            ],
          },
          {
            ariaLabel: "Platform filter",
            selected: platform,
            onSelect: setPlatform,
            options: BROWSE_PLATFORMS.map((key) => ({
              value: key,
              label: key === "all" ? "Everything" : platformLabel(key),
            })),
          },
          {
            ariaLabel: "Timeline",
            selected: dateMode,
            onSelect: (value) => setDateMode(value as DateMode),
            options: [
              { value: "saved", label: "Saved" },
              { value: "posted", label: "Posted" },
            ],
          },
          ...(travelFilters
            ? [
                {
                  ariaLabel: "Place status",
                  selected: placeStatus,
                  onSelect: (value: string) => setPlaceStatus(value as PlaceStatus),
                  options: [
                    { value: "all", label: "Everything" },
                    { value: "visited", label: "Visited" },
                    { value: "inspiration", label: "Inspiration" },
                  ],
                },
              ]
            : []),
        ]}
      />
      {secondLevel.pills.length > 0 ? (
        <FilterPills
          allLabel={secondLevel.allLabel}
          pills={visiblePills}
          selectedKeys={facetKeys}
          multi
          ariaLabel={secondLevel.ariaLabel}
          moreLabel={
            secondLevel.pills.length > 5
              ? pillsExpanded
                ? "Show less"
                : `+${secondLevel.pills.length - visiblePills.length} more`
              : undefined
          }
          onMore={() => setPillsExpanded((value) => !value)}
          onSelect={(key) => {
            if (key === "all") {
              setFacetKeys([]);
              return;
            }
            setFacetKeys((current) =>
              current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
            );
          }}
        />
      ) : null}
      </FilterChrome>
      {filtered.length === 0 ? (
        <EmptyState>No posts match that filter.</EmptyState>
      ) : (
        <div className="cover-grid">
          {filtered.map((post) => (
            <PostMediaCard
              key={post.post_id}
              post={post}
              dateMode={dateMode}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}
      {selected ? (
        <PostDetail
          post={selected}
          placeNames={names}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            onDeleted();
          }}
        />
      ) : null}
    </>
  );
}

function matchesPlaceStatus(post: SavedPost, placeStatus: PlaceStatus, visitedIds: Set<string>): boolean {
  if (placeStatus === "visited") {
    return post.place_ids.some((placeId) => visitedIds.has(placeId));
  }
  if (placeStatus === "inspiration") {
    return post.place_ids.length > 0 && !post.place_ids.some((placeId) => visitedIds.has(placeId));
  }
  return true;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function postFacetKeys(
  post: SavedPost,
  contentCategory: string,
  placesById: Record<string, Place>,
): string[] {
  if (contentCategory === "travel") {
    return [...new Set(post.place_ids.map((placeId) => placesById[placeId]?.category ?? "other"))];
  }
  if (contentCategory === "food") {
    const recipe = post.extracted_recipe;
    const meal = recipe?.meal_type?.trim().toLowerCase();
    if (meal) return [meal];
    const cuisine = recipe?.cuisine?.trim();
    return cuisine ? [cuisine] : [];
  }
  if (contentCategory === "movies") {
    const genres = (post.resolved_movies ?? []).flatMap((movie) => movie.genres);
    if (genres.length > 0) return [...new Set(genres)];
    const kinds = [
      ...(post.resolved_movies ?? []).map((movie) => movie.kind),
      ...(post.extracted_movies ?? []).map((movie) => movie.kind),
    ].filter((kind): kind is string => Boolean(kind));
    return [...new Set(kinds)];
  }
  if (contentCategory === "all") {
    const handle = post.author_handle?.trim();
    return handle ? [handle.replace(/^@/, "")] : [];
  }
  const tags = (post.hashtags ?? []).map((tag) => tag.replace(/^#/, "").toLowerCase()).filter(Boolean);
  if (tags.length > 0) return [...new Set(tags)];
  const handle = post.author_handle?.trim();
  return handle ? [handle.replace(/^@/, "")] : [];
}

function buildSecondLevel(
  contentCategory: string,
  posts: SavedPost[],
  placesById: Record<string, Place>,
): { allLabel: string; ariaLabel: string; pills: FacetPill[] } {
  const copy =
    contentCategory === "travel"
      ? { allLabel: "All types", ariaLabel: "Place type" }
      : contentCategory === "food"
        ? { allLabel: "All meals", ariaLabel: "Meal" }
        : contentCategory === "movies"
          ? { allLabel: "All genres", ariaLabel: "Genre" }
          : contentCategory === "all"
            ? { allLabel: "All creators", ariaLabel: "Creator" }
            : { allLabel: "All tags", ariaLabel: "Tag" };

  const counts = new Map<string, { label: string; count: number }>();
  for (const post of posts) {
    for (const key of postFacetKeys(post, contentCategory, placesById)) {
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        const label =
          contentCategory === "travel"
            ? categoryLabel(key === "other" ? null : key)
            : contentCategory === "movies" && (key === "tv" || key === "movie")
              ? key === "tv"
                ? "TV"
                : "Movie"
              : contentCategory === "all"
                ? `@${key}`
                : titleCase(key);
        counts.set(key, { label, count: 1 });
      }
    }
  }

  const pills = Array.from(counts.entries())
    .map(([key, entry]) => ({ key, label: entry.label, count: entry.count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 12);

  return { ...copy, pills };
}

function previewPills(
  pills: { key: string; label: string; count: number }[],
  selectedKeys: string[],
  expanded: boolean,
) {
  if (expanded || pills.length <= 5) return pills;
  const top = pills.slice(0, 5);
  const topKeys = new Set(top.map((pill) => pill.key));
  const extra = pills.filter((pill) => selectedKeys.includes(pill.key) && !topKeys.has(pill.key));
  return [...top, ...extra];
}

function postTimestamp(post: SavedPost, dateMode: DateMode): number {
  const raw = dateMode === "posted" ? post.posted_at : post.fetched_at ?? post.posted_at;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function PostMediaCard({
  post,
  dateMode = "saved",
  onOpen,
}: {
  post: SavedPost;
  dateMode?: DateMode;
  onOpen: (post: SavedPost) => void;
}) {
  const handle = post.author_handle?.trim();
  const dateRaw = dateMode === "posted" ? post.posted_at : post.fetched_at ?? post.posted_at;
  return (
    <CoverCard
      title={postTitle(post)}
      category={post.media_kind || "post"}
      kicker={platformLabel(post.platform)}
      location={handle ? (handle.startsWith("@") ? handle : `@${handle}`) : platformLabel(post.platform)}
      meta={formatDate(dateRaw) ?? "Saved"}
      action="Open ↗"
      imageUrl={proxiedMediaUrl(post.thumbnail_url)}
      onOpen={() => onOpen(post)}
      ariaLabel={`Open post ${postTitle(post)}`}
    />
  );
}

export function PostDetail({
  post,
  placeNames,
  onClose,
  onDeleted,
}: {
  post: SavedPost;
  placeNames: Record<string, string>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const image = proxiedMediaUrl(post.thumbnail_url);
  const [busy, setBusy] = useState(false);

  return (
    <DetailSheet title={postTitle(post)} onClose={onClose}>
      {image ? <div className="sheet-hero" style={{ backgroundImage: `url('${image}')` }} /> : null}
      <p className="eyebrow">{platformLabel(post.platform)}</p>
      <h2 className="sheet-title">{postTitle(post)}</h2>
      <p className="sheet-meta">
        {[post.author_handle, formatDate(post.posted_at ?? post.fetched_at)].filter(Boolean).join(" · ")}
      </p>
      {post.reel_summary ? <p className="sheet-copy">{post.reel_summary}</p> : null}
      {post.caption ? <p className="sheet-copy">{post.caption}</p> : null}
      {post.place_ids.length > 0 ? (
        <ul className="sheet-list">
          {post.place_ids.map((placeId) => (
            <li key={placeId}>
              <button type="button" onClick={() => navigate(`${basePath}/travel/${placeId}`)}>
                {placeNames[placeId] ?? "Place"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="sheet-actions">
        <a href={post.post_url} target="_blank" rel="noreferrer">
          Open original
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await deletePost(post.platform, nativePostId(post));
              onDeleted();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Removing…" : "Remove from library"}
        </button>
      </div>
    </DetailSheet>
  );
}

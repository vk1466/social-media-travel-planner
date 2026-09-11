import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  deletePost,
  fetchVisitedPlaceIds,
  nativePostId,
  postRouteParts,
  type Place,
  type SavedPost,
} from "../../api";
import { categoryLabel } from "../../categoryLabels";
import { CoverCard } from "../../components/CoverCard";
import {
  contentCategoryTabs,
  effectiveContentCategory,
} from "../../contentCategory";
import { postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
import { PageHeading } from "../../components/PageHeading";
import {
  formatDate,
  platformLabel,
  postTitle,
  proxiedMediaUrl,
} from "../display";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState, FilterChrome, FilterPills, Toolbar } from "../components/Toolbar";
import { useLabTheme } from "../theme";

type PlaceStatus = "all" | "visited" | "inspiration";
type DateMode = "saved" | "posted";

const UNDATED_MONTH = "undated";

interface MonthGroup {
  key: string;
  year: string;
  label: string;
  short: string;
  posts: SavedPost[];
}

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
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const { platform: routePlatform, postId: routePostId } = useParams();
  const [query, setQuery] = useState("");
  const { platforms } = useLibraryPlatform();
  const [contentCategory, setContentCategory] = useState("all");
  const [dateMode, setDateMode] = useState<DateMode>("saved");
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("all");
  const [facetKeys, setFacetKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<SavedPost | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [monthKey, setMonthKey] = useState<string | null>(null);

  useEffect(() => {
    if (!routePlatform || !routePostId) {
      setSelected(null);
      return;
    }
    const routePost = posts.find(
      (post) => post.platform === routePlatform && nativePostId(post) === routePostId,
    );
    setSelected(routePost ?? null);
  }, [posts, routePlatform, routePostId]);

  const openPost = (post: SavedPost) => {
    const route = postRouteParts(post.platform, nativePostId(post));
    setSelected(post);
    navigate(`${basePath}/posts/${route.platform}/${route.nativeId}`);
  };

  const closePost = () => {
    setSelected(null);
    navigate(`${basePath}/posts`);
  };

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

  const platformPosts = useMemo(
    () => postsForPlatforms(topicPosts, platforms),
    [topicPosts, platforms],
  );

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

  const monthGroups = useMemo(() => groupPostsByMonth(filtered, dateMode), [filtered, dateMode]);
  const yearBuckets = useMemo(() => bucketMonthsByYear(monthGroups), [monthGroups]);
  const activeMonth = monthGroups.find((group) => group.key === monthKey) ?? monthGroups[0];

  useEffect(() => {
    if (monthGroups.length === 0) {
      setMonthKey(null);
      return;
    }
    if (!monthKey || !monthGroups.some((group) => group.key === monthKey)) {
      setMonthKey(monthGroups[0].key);
    }
  }, [monthGroups, monthKey]);

  useEffect(() => {
    if (!selected) return;
    const key = monthKeyForPost(selected, dateMode);
    if (monthGroups.some((group) => group.key === key)) {
      setMonthKey(key);
    }
  }, [selected?.post_id, dateMode, monthGroups]);

  return (
    <>
      <PageHeading
        kicker="Your inspiration library"
        title="Saved posts"
        lede={`${posts.length} ${posts.length === 1 ? "idea" : "ideas"} ready to revisit.`}
        count={{ value: filtered.length, label: "posts" }}
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
            },
            options: [
              { value: "all", label: "All" },
              ...topicTabs.map((tab) => ({ value: tab.key, label: tab.label })),
            ],
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
          allCount={platformPosts.length}
          pills={secondLevel.pills}
          selectedKeys={facetKeys}
          multi
          ariaLabel={secondLevel.ariaLabel}
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
      {filtered.length === 0 || !activeMonth ? (
        <EmptyState>No posts match that filter.</EmptyState>
      ) : (
        <div className="book-spine">
          <nav className="book-spine-index" aria-label="Jump by month">
            {yearBuckets.map((bucket) => (
              <div key={bucket.year} className="book-spine-year-block">
                <p className="book-spine-year">{bucket.year}</p>
                {bucket.months.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={group.key === activeMonth.key ? "is-on" : undefined}
                    aria-current={group.key === activeMonth.key ? "true" : undefined}
                    onClick={() => setMonthKey(group.key)}
                  >
                    <span>{group.short}</span>
                    <small>{group.posts.length}</small>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="book-spine-page">
            <p className="book-spine-open">
              {activeMonth.label}{" "}
              <span>
                {activeMonth.posts.length} {activeMonth.posts.length === 1 ? "save" : "saves"}
              </span>
            </p>
            <div className="cover-grid">
              {activeMonth.posts.map((post) => (
                <PostMediaCard
                  key={post.post_id}
                  post={post}
                  dateMode={dateMode}
                  onOpen={openPost}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {selected ? (
        <PostDetail
          post={selected}
          placeNames={names}
          onClose={closePost}
          onDeleted={() => {
            setSelected(null);
            onDeleted();
            navigate(`${basePath}/posts`);
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
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  return { ...copy, pills };
}

function postDateRaw(post: SavedPost, dateMode: DateMode): string | null {
  return dateMode === "posted" ? post.posted_at ?? null : post.fetched_at ?? post.posted_at ?? null;
}

function postTimestamp(post: SavedPost, dateMode: DateMode): number {
  const raw = postDateRaw(post, dateMode);
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function monthKeyForPost(post: SavedPost, dateMode: DateMode): string {
  const raw = postDateRaw(post, dateMode);
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return UNDATED_MONTH;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function groupPostsByMonth(posts: SavedPost[], dateMode: DateMode): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const post of posts) {
    const key = monthKeyForPost(post, dateMode);
    const existing = groups.get(key);
    if (existing) {
      existing.posts.push(post);
      continue;
    }
    if (key === UNDATED_MONTH) {
      groups.set(key, {
        key,
        year: "Other",
        label: "Undated",
        short: "—",
        posts: [post],
      });
      continue;
    }
    const [year, month] = key.split("-");
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    groups.set(key, {
      key,
      year,
      label: date.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }),
      short: date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }),
      posts: [post],
    });
  }
  return Array.from(groups.values()).sort((left, right) => {
    if (left.key === UNDATED_MONTH) return 1;
    if (right.key === UNDATED_MONTH) return -1;
    return right.key.localeCompare(left.key);
  });
}

function bucketMonthsByYear(groups: MonthGroup[]): { year: string; months: MonthGroup[] }[] {
  const buckets: { year: string; months: MonthGroup[] }[] = [];
  for (const group of groups) {
    const last = buckets[buckets.length - 1];
    if (last && last.year === group.year) {
      last.months.push(group);
    } else {
      buckets.push({ year: group.year, months: [group] });
    }
  }
  return buckets;
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

import { useEffect, useMemo, useRef, useState } from "react";
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
type SpineGrain = "month" | "day";

const UNDATED_SPINE = "undated";

interface SpinePeriod {
  key: string;
  section: string;
  sectionLabel: string;
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
  const [spineGrain, setSpineGrain] = useState<SpineGrain>("month");
  const [focusedMonth, setFocusedMonth] = useState<string | null>(null);
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("all");
  const [facetKeys, setFacetKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<SavedPost | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const monthIndexRef = useRef<HTMLElement>(null);
  const monthKeyRef = useRef<string | null>(null);
  const spineSyncing = useRef(false);
  monthKeyRef.current = monthKey;

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

  const spineGroups = useMemo(() => {
    const groups = groupPostsByPeriod(filtered, dateMode, spineGrain);
    if (spineGrain !== "day" || !focusedMonth) return groups;
    return groups.filter((group) => group.key.startsWith(`${focusedMonth}-`) || group.key === focusedMonth);
  }, [filtered, dateMode, spineGrain, focusedMonth]);
  const sectionBuckets = useMemo(() => bucketSpineSections(spineGroups), [spineGroups]);
  const activePeriod = spineGroups.find((group) => group.key === monthKey) ?? spineGroups[0];

  useEffect(() => {
    setMonthKey((current) => mappedSpineKey(current, spineGrain, spineGroups));
  }, [spineGroups, spineGrain]);

  useEffect(() => {
    if (spineGrain !== "day" || spineGroups.length > 0 || !focusedMonth) return;
    setSpineGrain("month");
    setMonthKey(focusedMonth);
    setFocusedMonth(null);
  }, [spineGrain, spineGroups.length, focusedMonth]);

  useEffect(() => {
    if (!selected) return;
    const key = periodKeyForPost(selected, dateMode, spineGrain);
    if (spineGroups.some((group) => group.key === key)) {
      setMonthKey(key);
    }
  }, [selected?.post_id, dateMode, spineGrain, spineGroups]);

  useEffect(() => {
    const nav = monthIndexRef.current;
    if (!nav) return;
    const onScroll = () => {
      paintSpineWheel(nav);
      if (spineSyncing.current) return;
      const key = nearestMonthButton(nav)?.dataset.month;
      if (key && key !== monthKeyRef.current) {
        setMonthKey(key);
      }
    };
    onScroll();
    nav.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(nav);
    return () => {
      nav.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [spineGroups]);

  useEffect(() => {
    const nav = monthIndexRef.current;
    const active = nav?.querySelector<HTMLElement>(`[data-month="${activePeriod?.key ?? ""}"]`);
    if (!nav || !active) return;
    if (nearestMonthButton(nav)?.dataset.month === activePeriod.key) {
      paintSpineWheel(nav);
      return;
    }
    spineSyncing.current = true;
    scrollSpineToElement(nav, active, false);
    paintSpineWheel(nav);
    const frame = window.requestAnimationFrame(() => {
      spineSyncing.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePeriod?.key, spineGroups]);

  function zoomIntoMonth(group: SpinePeriod) {
    if (group.key === UNDATED_SPINE) return;
    setFocusedMonth(group.key);
    setSpineGrain("day");
  }

  function zoomOutToMonths() {
    const month = focusedMonth;
    setSpineGrain("month");
    setFocusedMonth(null);
    if (month) setMonthKey(month);
  }

  function onSpineItemClick(group: SpinePeriod, button: HTMLButtonElement) {
    if (spineGrain === "month" && group.key === activePeriod?.key) {
      zoomIntoMonth(group);
      return;
    }
    const nav = monthIndexRef.current;
    if (nav) scrollSpineToElement(nav, button, true);
  }

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
      {filtered.length === 0 || !activePeriod ? (
        <EmptyState>No posts match that filter.</EmptyState>
      ) : (
        <div className="book-spine">
          <div className="book-spine-rail">
            {spineGrain === "day" ? (
              <button type="button" className="book-spine-back" onClick={zoomOutToMonths}>
                {sectionBuckets[0]?.sectionLabel ?? "Months"}
              </button>
            ) : null}
            <nav ref={monthIndexRef} className="book-spine-index" aria-label="Jump by date">
              {sectionBuckets.map((bucket) => (
                <div key={bucket.section} className="book-spine-year-block">
                  {spineGrain === "month" ? <p className="book-spine-year">{bucket.sectionLabel}</p> : null}
                  {bucket.periods.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      data-month={group.key}
                      className={group.key === activePeriod.key ? "is-on" : undefined}
                      aria-current={group.key === activePeriod.key ? "true" : undefined}
                      aria-label={
                        spineGrain === "month" && group.key === activePeriod.key
                          ? `${group.label}, ${group.posts.length} saves. Open days.`
                          : undefined
                      }
                      onClick={(event) => onSpineItemClick(group, event.currentTarget)}
                    >
                      <span>{group.short}</span>
                      {spineGrain === "month" && group.key === activePeriod.key ? (
                        <small className="book-spine-hint">Days</small>
                      ) : (
                        <small>{group.posts.length}</small>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </div>
          <div className="book-spine-page">
            {spineGrain === "month" ? (
              <button
                type="button"
                className="book-spine-open"
                key={activePeriod.key}
                onClick={() => zoomIntoMonth(activePeriod)}
              >
                {activePeriod.label}{" "}
                <span>
                  {activePeriod.posts.length} {activePeriod.posts.length === 1 ? "save" : "saves"} · View days
                </span>
              </button>
            ) : (
              <p className="book-spine-open" key={activePeriod.key}>
                {activePeriod.label}{" "}
                <span>
                  {activePeriod.posts.length} {activePeriod.posts.length === 1 ? "save" : "saves"}
                </span>
              </p>
            )}
            <div className="cover-grid">
              {activePeriod.posts.map((post) => (
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

function periodKeyForPost(post: SavedPost, dateMode: DateMode, grain: SpineGrain): string {
  const raw = postDateRaw(post, dateMode);
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return UNDATED_SPINE;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  if (grain === "month") return `${year}-${month}`;
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function groupPostsByPeriod(
  posts: SavedPost[],
  dateMode: DateMode,
  grain: SpineGrain,
): SpinePeriod[] {
  const groups = new Map<string, SpinePeriod>();
  for (const post of posts) {
    const key = periodKeyForPost(post, dateMode, grain);
    const existing = groups.get(key);
    if (existing) {
      existing.posts.push(post);
      continue;
    }
    groups.set(key, makeSpinePeriod(key, grain, post));
  }
  return Array.from(groups.values()).sort((left, right) => {
    if (left.key === UNDATED_SPINE) return 1;
    if (right.key === UNDATED_SPINE) return -1;
    return right.key.localeCompare(left.key);
  });
}

function makeSpinePeriod(key: string, grain: SpineGrain, post: SavedPost): SpinePeriod {
  if (key === UNDATED_SPINE) {
    return {
      key,
      section: "other",
      sectionLabel: "Other",
      label: "Undated",
      short: "—",
      posts: [post],
    };
  }
  const [year, month, day] = key.split("-");
  const monthDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  if (grain === "month") {
    return {
      key,
      section: year,
      sectionLabel: year,
      label: monthDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      short: monthDate.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }),
      posts: [post],
    };
  }
  const dayDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return {
    key,
    section: `${year}-${month}`,
    sectionLabel: monthDate.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    label: dayDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    short: String(Number(day)),
    posts: [post],
  };
}

function bucketSpineSections(
  groups: SpinePeriod[],
): { section: string; sectionLabel: string; periods: SpinePeriod[] }[] {
  const buckets: { section: string; sectionLabel: string; periods: SpinePeriod[] }[] = [];
  for (const group of groups) {
    const last = buckets[buckets.length - 1];
    if (last && last.section === group.section) {
      last.periods.push(group);
    } else {
      buckets.push({
        section: group.section,
        sectionLabel: group.sectionLabel,
        periods: [group],
      });
    }
  }
  return buckets;
}

function mappedSpineKey(
  current: string | null,
  grain: SpineGrain,
  groups: SpinePeriod[],
): string | null {
  if (groups.length === 0) return null;
  if (current && groups.some((group) => group.key === current)) return current;
  if (current && current !== UNDATED_SPINE) {
    if (grain === "month") {
      const monthKey = current.slice(0, 7);
      const match = groups.find((group) => group.key === monthKey);
      if (match) return match.key;
    }
    if (grain === "day" && current.length === 7) {
      const match = groups.find((group) => group.key.startsWith(`${current}-`));
      if (match) return match.key;
    }
  }
  return groups[0].key;
}

function spineAxis(nav: HTMLElement): "x" | "y" {
  return nav.scrollWidth - nav.clientWidth > nav.scrollHeight - nav.clientHeight ? "x" : "y";
}

function elementOffset(nav: HTMLElement, el: HTMLElement, axis: "x" | "y"): number {
  const navBox = nav.getBoundingClientRect();
  const elBox = el.getBoundingClientRect();
  if (axis === "y") return elBox.top - navBox.top + nav.scrollTop;
  return elBox.left - navBox.left + nav.scrollLeft;
}

function paintSpineWheel(nav: HTMLElement) {
  const axis = spineAxis(nav);
  const viewport = axis === "y" ? nav.clientHeight : nav.clientWidth;
  const scroll = axis === "y" ? nav.scrollTop : nav.scrollLeft;
  const mid = scroll + viewport / 2;
  const radius = Math.max(viewport / 2, 1);
  nav.querySelectorAll<HTMLElement>("button, .book-spine-year").forEach((el) => {
    const size = axis === "y" ? el.offsetHeight : el.offsetWidth;
    const t = Math.max(-1, Math.min(1, (elementOffset(nav, el, axis) + size / 2 - mid) / radius));
    el.style.setProperty("--spine-t", t.toFixed(3));
    el.style.setProperty("--spine-abs", Math.abs(t).toFixed(3));
  });
}

function nearestMonthButton(nav: HTMLElement): HTMLButtonElement | null {
  const axis = spineAxis(nav);
  const viewport = axis === "y" ? nav.clientHeight : nav.clientWidth;
  const mid = (axis === "y" ? nav.scrollTop : nav.scrollLeft) + viewport / 2;
  let nearest: HTMLButtonElement | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  nav.querySelectorAll<HTMLButtonElement>("button[data-month]").forEach((button) => {
    const size = axis === "y" ? button.offsetHeight : button.offsetWidth;
    const dist = Math.abs(elementOffset(nav, button, axis) + size / 2 - mid);
    if (dist < nearestDist) {
      nearest = button;
      nearestDist = dist;
    }
  });
  return nearest;
}

function scrollSpineToElement(nav: HTMLElement, el: HTMLElement, smooth: boolean) {
  const axis = spineAxis(nav);
  const viewport = axis === "y" ? nav.clientHeight : nav.clientWidth;
  const size = axis === "y" ? el.offsetHeight : el.offsetWidth;
  const target = Math.max(0, elementOffset(nav, el, axis) - viewport / 2 + size / 2);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = smooth && !reduced ? "smooth" : "auto";
  if (axis === "y") nav.scrollTo({ top: target, behavior });
  else nav.scrollTo({ left: target, behavior });
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

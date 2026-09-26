import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { nativePostId, type SavedPost } from "@/src/api";
import { categoryLabel } from "@/src/categoryLabels";
import { FilterBar, MultiFilterChips, PageHeading } from "@/src/components/LibraryChrome";
import { PostCard, postKey } from "@/src/components/PostCard";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { contentCategoryTabs, effectiveContentCategory } from "@/src/contentCategory";
import { useLibrary } from "@/src/context/LibraryContext";
import { postTitle } from "@/src/display";
import { postsForPlatforms, useLibraryPlatform } from "@/src/libraryPlatform";
import { appHref } from "@/src/nav";
import { colors, shadow, spacing } from "@/src/theme";

type DateMode = "saved" | "posted";
type PostGridRow = { key: string; posts: SavedPost[] };

const GRID_GAP = 12;

function chunkPostRows(posts: SavedPost[]): PostGridRow[] {
  const rows: PostGridRow[] = [];
  for (let index = 0; index < posts.length; index += 2) {
    rows.push({
      key: `${postKey(posts[index])}-${posts[index + 1] ? postKey(posts[index + 1]) : "solo"}`,
      posts: posts.slice(index, index + 2),
    });
  }
  return rows;
}

function postDateRaw(post: SavedPost, dateMode: DateMode): string | null {
  return dateMode === "posted" ? post.posted_at ?? null : post.fetched_at ?? post.posted_at ?? null;
}

function monthKey(post: SavedPost, dateMode: DateMode): string {
  const raw = postDateRaw(post, dateMode);
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "undated";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  if (key === "undated") return "Undated";
  const [year, month] = key.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PostsScreen() {
  const router = useRouter();
  const { posts, places, loading, error, refresh } = useLibrary();
  const { platforms } = useLibraryPlatform();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [contentCategory, setContentCategory] = useState("all");
  const [dateMode, setDateMode] = useState<DateMode>("saved");
  const [facetKeys, setFacetKeys] = useState<string[]>([]);

  const topicTabs = useMemo(() => contentCategoryTabs(posts), [posts]);
  const placesById = useMemo(
    () => Object.fromEntries(places.map((place) => [place.place_id, place])),
    [places],
  );

  const filtered = useMemo(() => {
    let list = posts;
    if (contentCategory !== "all") {
      list = list.filter((post) => effectiveContentCategory(post) === contentCategory);
    }
    list = postsForPlatforms(list, platforms);
    if (facetKeys.length > 0) {
      list = list.filter((post) =>
        postFacetKeys(post, contentCategory, placesById).some((key) => facetKeys.includes(key)),
      );
    }
    const needle = query.trim().toLowerCase();
    if (needle) {
      const names = Object.fromEntries(places.map((place) => [place.place_id, place.display_name]));
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
    return [...list].sort(
      (left, right) => timestamp(right, dateMode) - timestamp(left, dateMode),
    );
  }, [posts, contentCategory, platforms, facetKeys, placesById, query, places, dateMode]);

  const facetOptions = useMemo(() => {
    const scoped = postsForPlatforms(
      contentCategory === "all"
        ? posts
        : posts.filter((post) => effectiveContentCategory(post) === contentCategory),
      platforms,
    );
    const counts = new Map<string, { label: string; count: number }>();
    for (const post of scoped) {
      for (const key of postFacetKeys(post, contentCategory, placesById)) {
        const existing = counts.get(key);
        if (existing) existing.count += 1;
        else {
          counts.set(key, {
            label:
              contentCategory === "travel"
                ? categoryLabel(key === "other" ? null : key)
                : contentCategory === "all"
                  ? `@${key}`
                  : key.charAt(0).toUpperCase() + key.slice(1),
            count: 1,
          });
        }
      }
    }
    return Array.from(counts.entries())
      .map(([value, entry]) => ({ value, label: `${entry.label} (${entry.count})` }))
      .sort((left, right) => left.label.localeCompare(right.label))
      .slice(0, 16);
  }, [posts, contentCategory, platforms, placesById]);

  const sections = useMemo(() => {
    const groups = new Map<string, SavedPost[]>();
    for (const post of filtered) {
      const key = monthKey(post, dateMode);
      const existing = groups.get(key) ?? [];
      existing.push(post);
      groups.set(key, existing);
    }
    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        if (left === "undated") return 1;
        if (right === "undated") return -1;
        return right.localeCompare(left);
      })
      .map(([key, data]) => ({ title: monthLabel(key), data: chunkPostRows(data) }));
  }, [filtered, dateMode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.chrome}>
        <PageHeading
          kicker="Your inspiration library"
          title="Saved posts"
          lede={`${posts.length} ${posts.length === 1 ? "idea" : "ideas"} ready to revisit.`}
          count={{ value: filtered.length, label: "posts" }}
        />
        <FilterBar
          placeholder="Title, place, tag…"
          query={query}
          onQuery={setQuery}
          groups={[
            {
              ariaLabel: "Category filter",
              selected: contentCategory,
              onSelect: (value) => {
                setContentCategory(value);
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
          ]}
          trailing={
            facetOptions.length > 0 ? (
              <MultiFilterChips
                allLabel={
                  contentCategory === "travel"
                    ? "All types"
                    : contentCategory === "all"
                      ? "All creators"
                      : "All"
                }
                options={facetOptions}
                selected={facetKeys}
                onToggle={(value) => {
                  if (value === "all") {
                    setFacetKeys([]);
                    return;
                  }
                  setFacetKeys((current) =>
                    current.includes(value)
                      ? current.filter((entry) => entry !== value)
                      : [...current, value],
                  );
                }}
              />
            ) : null
          }
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            body="Tap Save to paste Instagram, TikTok, YouTube, or web links — or share a reel to Wanderfile."
          />
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.gridRow}>
            {item.posts.map((post) => (
              <View key={postKey(post)} style={styles.gridCell}>
                <PostCard
                  post={post}
                  dateMode={dateMode}
                  onPress={() => router.push(`/posts/${post.platform}/${nativePostId(post)}`)}
                />
              </View>
            ))}
            {item.posts.length === 1 ? <View style={styles.gridCell} /> : null}
          </View>
        )}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save links"
        onPress={() => router.push(appHref("/(app)/ingest"))}
        style={({ pressed }) => [styles.saveAction, pressed && styles.saveActionPressed]}
      >
        <Ionicons name="add" size={22} color={colors.onFill} />
        <Text style={styles.saveActionLabel}>Save</Text>
      </Pressable>
    </View>
  );
}

function timestamp(post: SavedPost, dateMode: DateMode): number {
  const raw = postDateRaw(post, dateMode);
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function postFacetKeys(
  post: SavedPost,
  contentCategory: string,
  placesById: Record<string, { category?: string | null }>,
): string[] {
  if (contentCategory === "travel") {
    return [...new Set(post.place_ids.map((placeId) => placesById[placeId]?.category ?? "other"))];
  }
  if (contentCategory === "food") {
    const meal = post.extracted_recipe?.meal_type?.trim().toLowerCase();
    if (meal) return [meal];
    const cuisine = post.extracted_recipe?.cuisine?.trim();
    return cuisine ? [cuisine] : [];
  }
  if (contentCategory === "movies") {
    const genres = (post.resolved_movies ?? []).flatMap((movie) => movie.genres);
    if (genres.length > 0) return [...new Set(genres)];
  }
  const handle = post.author_handle?.trim();
  return handle ? [handle.replace(/^@/, "")] : [];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.md, paddingBottom: 88, flexGrow: 1 },
  chrome: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  section: {
    backgroundColor: colors.bg,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  saveAction: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 56,
    minWidth: 104,
    paddingHorizontal: spacing.md,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    ...shadow(3),
  },
  saveActionPressed: { opacity: 0.8 },
  saveActionLabel: { color: colors.onFill, fontSize: 16, fontWeight: "800" },
});

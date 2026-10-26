import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchActiveJob, fetchJobs, nativePostId, type Job, type SavedPost } from "@/src/api";
import { categoryLabel } from "@/src/categoryLabels";
import { QuietSaveStatusCard } from "@/src/components/QuietSaveStatusCard";
import { PostCard, postKey } from "@/src/components/PostCard";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { effectiveContentCategory } from "@/src/contentCategory";
import { useLibrary } from "@/src/context/LibraryContext";
import { usePendingShare } from "@/src/context/PendingShareContext";
import { postTitle } from "@/src/display";
import { postsForPlatforms, useLibraryPlatform } from "@/src/libraryPlatform";
import { appHref } from "@/src/nav";
import { colors, radius, shadow } from "@/src/theme";

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
  const insets = useSafeAreaInsets();
  const { posts, places, loading, error, refresh, bumpRefresh } = useLibrary();
  const { platforms, setPlatforms } = useLibraryPlatform();
  const { pendingUrls } = usePendingShare();
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [attentionJob, setAttentionJob] = useState<Job | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<"all" | "recipes" | "watch" | "location">("all");
  const [dateMode, setDateMode] = useState<DateMode>("saved");
  const [facetKeys, setFacetKeys] = useState<string[]>([]);
  const refreshedCompletedJobs = useRef(new Set<string>());

  useFocusEffect(useCallback(() => {
    let focused = true;
    let timer: ReturnType<typeof setTimeout>;
    const refreshJobs = async () => {
      let isRunning = false;
      try {
        const [active, history] = await Promise.all([fetchActiveJob("link_ingest"), fetchJobs()]);
        if (!focused) return;
        isRunning = active?.status === "running";
        setActiveJob(isRunning ? active : null);
        const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
        const newlyCompletedJobs = history.filter((job) => {
          if (job.kind !== "link_ingest" || job.status !== "done" || !job.created_at) return false;
          const createdAt = new Date(job.created_at).getTime();
          if (!Number.isFinite(createdAt) || createdAt < recentCutoff) return false;
          if (refreshedCompletedJobs.current.has(job.job_id)) return false;
          refreshedCompletedJobs.current.add(job.job_id);
          return true;
        });
        if (newlyCompletedJobs.length > 0) bumpRefresh();
        setAttentionJob(history.find((job) => {
          if (job.kind !== "link_ingest" || job.status !== "done" || !job.created_at) return false;
          const createdAt = new Date(job.created_at).getTime();
          return Number.isFinite(createdAt) && createdAt >= recentCutoff;
        }) ?? null);
      } catch {
        // Keep status visible during transient network failures
      }
      const isIngesting = isRunning || pendingUrls.length > 0;
      if (focused) timer = setTimeout(refreshJobs, isIngesting ? 4000 : 15000);
    };
    void refreshJobs();
    return () => { focused = false; clearTimeout(timer); };
  }, [bumpRefresh, pendingUrls.length]));

  const placesById = useMemo(
    () => Object.fromEntries(places.map((place) => [place.place_id, place])),
    [places],
  );

  const filtered = useMemo(() => {
    let list = posts;
    if (collectionFilter === "recipes") {
      list = list.filter((p) => p.content_category === "food");
    } else if (collectionFilter === "watch") {
      list = list.filter((p) => p.content_category === "movies");
    } else if (collectionFilter === "location") {
      list = list.filter((p) => (p.place_ids && p.place_ids.length > 0) || (p.extracted_places && p.extracted_places.length > 0));
    }

    list = postsForPlatforms(list, platforms);
    if (facetKeys.length > 0) {
      list = list.filter((post) =>
        postFacetKeys(post, collectionFilter, placesById).some((key) => facetKeys.includes(key)),
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
  }, [posts, collectionFilter, platforms, facetKeys, placesById, query, places, dateMode]);

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
      .map(([key, data]) => ({
        title: monthLabel(key),
        count: data.length,
        data: chunkPostRows(data),
      }));
  }, [filtered, dateMode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (loading && posts.length === 0 && pendingUrls.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? <ErrorBanner message={error} /> : null}

      {/* Chrome header with exact insets and design elements */}
      <View style={[styles.chrome, { paddingTop: insets.top + 12 }]}>
        <QuietSaveStatusCard
          pendingUrls={pendingUrls}
          activeJob={activeJob}
          attentionJob={attentionJob}
          onDismissAttention={() => setAttentionJob(null)}
        />

        {/* L2: Title row: "Library 274" + "Select" text button */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            Library{" "}
            <Text style={styles.headerCount}>{filtered.length}</Text>
          </Text>
          <Pressable hitSlop={8} style={styles.selectBtn}>
            <Text style={styles.selectBtnText}>Select</Text>
          </Pressable>
        </View>

        {/* L3: Search row with input pill + 2 round 48px buttons */}
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              placeholder="Search title, place or tag"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter by source"
            onPress={() => {
              // Toggle platform filter
              setPlatforms(platforms.length > 0 ? [] : ["instagram"]);
            }}
            style={[styles.roundBtn, platforms.length > 0 && styles.roundBtnActive]}
          >
            <Ionicons name="albums-outline" size={20} color={colors.ink} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filters"
            onPress={() => {
              setDateMode((mode) => (mode === "saved" ? "posted" : "saved"));
            }}
            style={[styles.roundBtn, dateMode === "posted" && styles.roundBtnActive]}
          >
            <Ionicons name="options-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {/* L4: Horizontally scrolling collection chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          style={styles.chipsContainer}
        >
          <Pressable
            onPress={() => setCollectionFilter("all")}
            style={[styles.chip, collectionFilter === "all" && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, collectionFilter === "all" && styles.chipTextActive]}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCollectionFilter((c) => (c === "recipes" ? "all" : "recipes"))}
            style={[styles.chip, collectionFilter === "recipes" && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, collectionFilter === "recipes" && styles.chipTextActive]}
            >
              Recipes
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCollectionFilter((c) => (c === "watch" ? "all" : "watch"))}
            style={[styles.chip, collectionFilter === "watch" && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, collectionFilter === "watch" && styles.chipTextActive]}
            >
              Watch
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.push(appHref("/(app)/settings"));
            }}
            style={styles.chipDashed}
          >
            <Text style={styles.chipDashedText}>+ Workouts?</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Soon</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setCollectionFilter((c) => (c === "location" ? "all" : "location"))}
            style={[styles.chip, collectionFilter === "location" && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, collectionFilter === "location" && styles.chipTextActive]}
            >
              Has location
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 84 + insets.bottom + 24 },
        ]}
        stickySectionHeadersEnabled={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          posts.length === 0 ? (
            <EmptyState
              title="Your library starts with one link"
              body="Tap the + button to save Instagram reels."
            />
          ) : (
            <EmptyState
              title="No saves match these filters"
              body="Clear search or collection filters to see your saved items."
            />
          )
        }
        /* L5: Month heading: "October 2026" at 18px weight 800 + "28 saves" in muted 14px */
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>{section.title}</Text>
            <Text style={styles.monthCount}>{section.count} saves</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.gridRow}>
            {item.posts.map((post, idx) => (
              <View key={postKey(post)} style={styles.gridCell}>
                <PostCard
                  post={post}
                  dateMode={dateMode}
                  height={idx % 2 === 0 ? 170 : 195}
                  onPress={() => router.push(`/posts/${post.platform}/${nativePostId(post)}`)}
                />
              </View>
            ))}
            {item.posts.length === 1 ? <View style={styles.gridCell} /> : null}
          </View>
        )}
      />
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
  const keys: string[] = [];
  if (contentCategory === "travel") {
    for (const placeId of post.place_ids) {
      const place = placesById[placeId];
      if (place?.category) keys.push(place.category);
    }
  } else if (post.author_handle) {
    keys.push(post.author_handle);
  }
  return keys;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  chrome: {
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  headerCount: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0,
  },
  selectBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  selectBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.ink,
  },
  chipsContainer: {
    marginHorizontal: -20,
    marginBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#D9D5CB",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chipDashed: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderDashed,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipDashedText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.routineInk,
  },
  soonBadge: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  monthCount: {
    fontSize: 14,
    color: colors.muted,
  },
  list: {
    paddingHorizontal: 20,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});

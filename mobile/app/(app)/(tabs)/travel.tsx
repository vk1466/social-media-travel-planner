import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fetchVisitedPlaceIds, type Place, type SavedPost } from "@/src/api";
import { coverFallbackColor } from "@/src/coverArt";
import { CoverCard } from "@/src/components/CoverCard";
import { FilterBar, MultiFilterChips, PageHeading } from "@/src/components/LibraryChrome";
import { PlaceMap } from "@/src/components/PlaceMap";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { placeMatchesPlatform, useLibraryPlatform } from "@/src/libraryPlatform";
import {
  atlasTrail,
  buildAtlas,
  countByCategory,
  leafPlaces,
  levelLabel,
  resolveScopeKey,
  searchAtlas,
  toAtlasPlaces,
  type AtlasGrouping,
  type AtlasNode,
} from "@/src/placeAtlasModel";
import { getPlatformLabel, getPostTitle, proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow, spacing } from "@/src/theme";

const GRID_GAP = 12;

type Pane = "browse" | "map";
type StatusFilter = "all" | "visited" | "inspiration";

function atlasNodeImage(node: AtlasNode): string | null {
  return leafPlaces(node).find((place) => place.imageUrl)?.imageUrl ?? null;
}

export default function TravelScreen() {
  const router = useRouter();
  const { posts, places, loading, error, refresh, refreshToken } = useLibrary();
  const { platforms } = useLibraryPlatform();
  const [pane, setPane] = useState<Pane>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [grouping, setGrouping] = useState<AtlasGrouping>("region");
  const [rawScopeKey, setScopeKey] = useState("world");
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    void fetchVisitedPlaceIds()
      .then((ids) => setVisitedPlaceIds(new Set(ids)))
      .catch(() => setVisitedPlaceIds(new Set()));
  }, [refreshToken]);

  const placesById = useMemo(
    () => new Map(places.map((place) => [place.place_id, place])),
    [places],
  );

  const atlasPlaces = useMemo(
    () => toAtlasPlaces(places, visitedPlaceIds, { posts }),
    [places, visitedPlaceIds, posts],
  );

  const platformPlaces = useMemo(
    () =>
      atlasPlaces.filter((place) =>
        placeMatchesPlatform(place.sourcePostIds, posts, platforms),
      ),
    [atlasPlaces, posts, platforms],
  );

  const statusPlaces = useMemo(() => {
    if (statusFilter === "visited") {
      return platformPlaces.filter((place) => place.visited);
    }
    if (statusFilter === "inspiration") {
      return platformPlaces.filter((place) => !place.visited);
    }
    return platformPlaces;
  }, [platformPlaces, statusFilter]);

  const filteredPlaces = useMemo(() => {
    if (typeFilter.length === 0) {
      return statusPlaces;
    }
    return statusPlaces.filter((place) => typeFilter.includes(place.category ?? "other"));
  }, [statusPlaces, typeFilter]);

  const atlas = useMemo(() => buildAtlas(filteredPlaces, grouping), [filteredPlaces, grouping]);
  const typeAtlas = useMemo(() => buildAtlas(statusPlaces, grouping), [statusPlaces, grouping]);

  const scopeKey = resolveScopeKey(atlas, rawScopeKey);
  const scope = atlas.index.get(scopeKey) ?? atlas.root;
  const trail = useMemo(() => atlasTrail(atlas, scope.key), [atlas, scope.key]);

  const children = useMemo(() => scope.children.filter((child) => child.total > 0), [scope]);

  const typeOptions = useMemo(() => {
    const typeScope = typeAtlas.index.get(resolveScopeKey(typeAtlas, scopeKey)) ?? typeAtlas.root;
    return countByCategory(leafPlaces(typeScope));
  }, [typeAtlas, scopeKey]);

  const searching = searchQuery.trim().length > 0;

  const searchHits = useMemo(() => {
    if (!searching) {
      return [];
    }
    return searchAtlas(atlas, searchQuery, 40).filter((node) => node.place);
  }, [atlas, searchQuery, searching]);

  const postsById = useMemo(() => new Map(posts.map((post) => [post.post_id, post])), [posts]);

  const scopedAtlasPlaces = useMemo(
    () => leafPlaces(scope).filter((place) => place.lat !== null && place.lng !== null),
    [scope],
  );

  const mapPostEntries = useMemo(() => {
    const uniquePosts = new Map<string, SavedPost>();
    for (const place of scopedAtlasPlaces) {
      for (const postId of place.sourcePostIds) {
        const post = postsById.get(postId);
        if (post && !uniquePosts.has(post.post_id)) {
          uniquePosts.set(post.post_id, post);
        }
      }
    }
    return Array.from(uniquePosts.values());
  }, [scopedAtlasPlaces, postsById]);

  const selectedMapPost = selectedPostId ? postsById.get(selectedPostId) ?? null : null;

  const mapPlaces = useMemo(() => {
    const visible = selectedPostId
      ? scopedAtlasPlaces.filter((place) => place.sourcePostIds.includes(selectedPostId))
      : scopedAtlasPlaces;
    return visible
      .map((atlasPlace) => placesById.get(atlasPlace.placeId))
      .filter((place): place is Place => Boolean(place));
  }, [scopedAtlasPlaces, selectedPostId, placesById]);

  const openPlace = useCallback(
    (placeId: string) => {
      router.push(`/places/${placeId}`);
    },
    [router],
  );

  const openNode = useCallback(
    (node: AtlasNode) => {
      if (node.level === "place" && node.place) {
        openPlace(node.place.placeId);
        return;
      }
      setScopeKey(node.key);
    },
    [openPlace],
  );

  const toggleType = useCallback((category: string) => {
    if (category === "all") {
      setTypeFilter([]);
      return;
    }
    setTypeFilter((types) =>
      types.includes(category)
        ? types.filter((entry) => entry !== category)
        : [...types, category],
    );
  }, []);

  const changeGrouping = useCallback((nextGrouping: AtlasGrouping) => {
    setGrouping(nextGrouping);
    setScopeKey("world");
  }, []);

  useEffect(() => {
    if (!atlas.index.has(rawScopeKey) && rawScopeKey !== "world") {
      setScopeKey("world");
    }
  }, [atlas, rawScopeKey]);

  useEffect(() => {
    setSelectedPostId(null);
  }, [scopeKey]);

  if (loading && places.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const listEmpty = atlasPlaces.length === 0 ? (
    <EmptyState
      title="No places yet"
      body="Ingest a reel with locations to build your place library."
    />
  ) : filteredPlaces.length === 0 ? (
    <EmptyState
      title="No matches"
      body="Nothing matches these filters — clear a type or status."
    />
  ) : searching && searchHits.length === 0 ? (
    <EmptyState title="No results" body="No places match that search." />
  ) : null;

  return (
    <View style={styles.screen}>
      {error ? (
        <View style={styles.pad}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      <View style={styles.chrome}>
        <PageHeading
          kicker="Places to go"
          title="Travel"
          count={{ value: scope.total, label: "places" }}
        />
        <FilterBar
          placeholder="Search places"
          query={searchQuery}
          onQuery={setSearchQuery}
          groups={[
            {
              ariaLabel: "Status filter",
              selected: statusFilter,
              onSelect: (value) => setStatusFilter(value as StatusFilter),
              options: [
                { value: "all", label: "Everything" },
                { value: "visited", label: "Visited" },
                { value: "inspiration", label: "Want to go" },
              ],
            },
            {
              ariaLabel: "Grouping",
              selected: grouping,
              onSelect: (value) => changeGrouping(value as AtlasGrouping),
              options: [
                { value: "region", label: "Region" },
                { value: "type", label: "Type" },
              ],
            },
          ]}
          trailing={
            typeOptions.length > 0 ? (
              <MultiFilterChips
                allLabel="All types"
                options={typeOptions.map((option) => ({
                  value: option.category,
                  label: `${option.label} (${option.count})`,
                }))}
                selected={typeFilter}
                onToggle={toggleType}
              />
            ) : null
          }
        />
      </View>

      {!searching && trail.length > 1 ? (
        <View style={styles.breadcrumb}>
          {trail.map((node, index) => (
            <View key={node.key} style={styles.crumbItem}>
              {index > 0 ? <Text style={styles.crumbSep}>/</Text> : null}
              <Pressable onPress={() => openNode(node)}>
                <Text
                  style={node.key === scope.key ? styles.crumbCurrent : styles.crumbLink}
                  numberOfLines={1}
                >
                  {node.name}
                </Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => openNode(trail[trail.length - 2])} style={styles.upBtn}>
            <Text style={styles.upText}>↑ Up</Text>
          </Pressable>
        </View>
      ) : null}

      {pane === "map" ? (
        <View style={styles.mapPane}>
          {selectedMapPost ? (
            <View style={styles.postFilterChip}>
              <Text style={styles.postFilterCopy} numberOfLines={1}>
                Showing places from{" "}
                <Text style={styles.postFilterAuthor}>
                  {selectedMapPost.author_handle
                    ? `@${selectedMapPost.author_handle}`
                    : "this post"}
                </Text>
              </Text>
              <Pressable
                onPress={() => setSelectedPostId(null)}
                style={styles.postFilterClear}
                accessibilityRole="button"
                accessibilityLabel="Show places from all posts"
              >
                <Text style={styles.postFilterClearText}>Show all</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.mapCanvas}>
            <PlaceMap
              places={mapPlaces}
              visitedPlaceIds={visitedPlaceIds}
              onSelectPlace={(place) => openPlace(place.place_id)}
              height="100%"
            />
          </View>
          {mapPostEntries.length > 0 ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              style={styles.postRail}
              contentContainerStyle={styles.postRailContent}
              showsHorizontalScrollIndicator={false}
            >
              {mapPostEntries.map((post) => {
                const thumb = proxiedMediaUrl(post.thumbnail_url);
                const selected = selectedPostId === post.post_id;
                return (
                  <Pressable
                    key={post.post_id}
                    onPress={() =>
                      setSelectedPostId((current) =>
                        current === post.post_id ? null : post.post_id,
                      )
                    }
                    style={[styles.postRailCard, selected && styles.postRailCardActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show places from ${getPostTitle(post)}`}
                    accessibilityState={{ selected }}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.postRailThumb} />
                    ) : (
                      <View
                        style={[
                          styles.postRailThumb,
                          { backgroundColor: coverFallbackColor(getPostTitle(post)) },
                        ]}
                      />
                    )}
                    <View style={styles.postRailCopy}>
                      <Text style={styles.postRailMeta} numberOfLines={1}>
                        {getPlatformLabel(post)} · {post.media_kind}
                      </Text>
                      <Text style={styles.postRailTitle} numberOfLines={2}>
                        {getPostTitle(post)}
                      </Text>
                      <Text style={styles.postRailAuthor} numberOfLines={1}>
                        {post.author_handle ? `@${post.author_handle}` : "Processed post"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={searching ? searchHits : children}
          keyExtractor={(item) => item.key}
          numColumns={searching ? 1 : 2}
          columnWrapperStyle={searching ? undefined : styles.gridRow}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void refresh().finally(() => setRefreshing(false));
              }}
            />
          }
          ListEmptyComponent={listEmpty}
          renderItem={({ item: node }) => {
            if (searching) {
              const place = node.place!;
              return (
                <Pressable
                  style={styles.searchRow}
                  onPress={() => openPlace(place.placeId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open place: ${place.name}`}
                >
                  <View
                    style={[
                      styles.searchDot,
                      place.visited ? styles.searchDotVisited : styles.searchDotInspiration,
                    ]}
                  />
                  <View style={styles.searchCopy}>
                    <Text style={styles.searchName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.searchTrail} numberOfLines={1}>
                      {place.trail.join(" · ")}
                    </Text>
                  </View>
                </Pressable>
              );
            }

            const isPlace = node.level === "place";
            const trailText = node.trail.length > 0 ? node.trail.join(" · ") : scope.name;

            return (
              <View style={styles.gridCell}>
                <CoverCard
                  title={node.name}
                  category={node.place?.categoryLabel ?? levelLabel(node.level)}
                  location={
                    isPlace
                      ? node.place!.trail.slice(-2).join(" · ") || trailText
                      : trailText
                  }
                  meta={
                    isPlace
                      ? `${node.saves} saved ${node.saves === 1 ? "post" : "posts"}`
                      : `${node.total} saved places`
                  }
                  imageUrl={atlasNodeImage(node)}
                  onPress={() => openNode(node)}
                  accessibilityLabel={
                    isPlace
                      ? `Open place: ${node.name}`
                      : `Explore ${node.total} places: ${node.name}`
                  }
                />
              </View>
            );
          }}
        />
      )}

      <Pressable
        onPress={() => {
          setSearchQuery("");
          setPane((current) => (current === "browse" ? "map" : "browse"));
        }}
        style={({ pressed }) => [
          styles.mapPeek,
          pane === "map" && mapPostEntries.length > 0 ? styles.mapPeekAboveRail : null,
          pressed && styles.mapPeekPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={pane === "browse" ? "View map" : "View covers"}
      >
        <Ionicons
          name={pane === "browse" ? "location" : "grid"}
          size={18}
          color={colors.onFill}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  pad: { padding: spacing.md },
  chrome: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  mapPane: { flex: 1, minHeight: 0, padding: spacing.md },
  mapCanvas: { flex: 1, minHeight: 0 },
  postFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(2),
  },
  postFilterCopy: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 12,
  },
  postFilterAuthor: {
    fontWeight: "800",
  },
  postFilterClear: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  postFilterClearText: {
    color: colors.onFill,
    fontSize: 11,
    fontWeight: "800",
  },
  postRail: {
    flexGrow: 0,
    marginTop: spacing.sm,
    height: 76,
  },
  postRailContent: {
    paddingRight: 56,
    gap: 10,
    alignItems: "center",
  },
  postRailCard: {
    width: 228,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.surface,
    ...shadow(2),
  },
  postRailCardActive: {
    borderColor: colors.brand,
  },
  postRailThumb: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  postRailCopy: {
    flex: 1,
    minWidth: 0,
  },
  postRailMeta: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  postRailTitle: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  postRailAuthor: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
  },
  mapPeekAboveRail: {
    bottom: 92,
  },
  list: { padding: spacing.md, flexGrow: 1 },
  breadcrumb: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 4,
  },
  crumbItem: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
  },
  crumbLink: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  crumbSep: { color: colors.muted, marginHorizontal: 4 },
  crumbCurrent: { color: colors.ink, fontWeight: "600", fontSize: 13 },
  upBtn: { marginLeft: "auto" },
  upText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchDotVisited: {
    backgroundColor: colors.brand,
  },
  searchDotInspiration: {
    backgroundColor: colors.muted,
  },
  searchCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchName: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 15,
  },
  searchTrail: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  mapPeek: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.brand,
    ...shadow(3),
  },
  mapPeekPressed: {
    opacity: 0.85,
    transform: [{ translateY: -2 }],
  },
});

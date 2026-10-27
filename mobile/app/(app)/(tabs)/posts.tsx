import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { nativePostId } from "@/src/api";
import { PostCard, postKey } from "@/src/components/PostCard";
import { EmptyState } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow } from "@/src/theme";
import { CANONICAL_CATEGORIES, getCategoryVisual } from "@/src/categoryVisuals";

export default function PostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places, loading, refresh } = useLibrary();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"reels" | "places">("reels");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered reels
  const filteredPosts = useMemo(() => {
    let list = posts;
    if (activeCategory !== "all") {
      list = list.filter((post) => {
        const postPlaces = places.filter((p) => post.place_ids?.includes(p.place_id));
        return postPlaces.some((p) => getCategoryVisual(p.category).name === activeCategory);
      });
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const str = `${p.caption || ""} ${p.author_handle || ""}`.toLowerCase();
        return str.includes(q);
      });
    }
    return list;
  }, [posts, places, activeCategory, query]);

  // Filtered places
  const filteredPlaces = useMemo(() => {
    let list = places;
    if (activeCategory !== "all") {
      list = list.filter((p) => getCategoryVisual(p.category).name === activeCategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const str = `${p.display_name} ${p.location?.city || ""} ${p.location?.country || ""}`.toLowerCase();
        return str.includes(q);
      });
    }
    return list;
  }, [places, activeCategory, query]);

  return (
    <View style={styles.container}>
      {/* Header & Controls Area */}
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.topRow}>
          <Text style={styles.screenHeading}>Library</Text>

          {/* Segmented Reels | Places Toggle */}
          <View style={styles.segmentedToggle}>
            <Pressable
              onPress={() => setActiveTab("reels")}
              style={[
                styles.segmentBtn,
                activeTab === "reels" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === "reels" && styles.segmentTextActive,
                ]}
              >
                Reels ({posts.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("places")}
              style={[
                styles.segmentBtn,
                activeTab === "places" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === "places" && styles.segmentTextActive,
                ]}
              >
                Places ({places.length})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder={activeTab === "reels" ? "Search captions, creators..." : "Search places, cities..."}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Horizontal Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <Pressable
            onPress={() => setActiveCategory("all")}
            style={[styles.chip, activeCategory === "all" && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeCategory === "all" && styles.chipTextActive]}>
              All
            </Text>
          </Pressable>

          {CANONICAL_CATEGORIES.map((cat) => {
            const vis = getCategoryVisual(cat);
            const isSelected = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(isSelected ? "all" : cat)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={styles.chipGlyph}>{vis.glyph}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 84 + insets.bottom + 24 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "reels" ? (
          filteredPosts.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              body="Save reels to start building your library."
            />
          ) : (
            <View style={styles.twoColumnGrid}>
              {filteredPosts.map((post) => (
                <View key={postKey(post)} style={styles.columnItem}>
                  <PostCard
                    post={post}
                    height={190}
                    onPress={() => router.push(`/posts/${post.platform}/${nativePostId(post)}`)}
                  />
                </View>
              ))}
            </View>
          )
        ) : (
          filteredPlaces.length === 0 ? (
            <EmptyState
              title="No places match"
              body="Places from your saved reels will appear here."
            />
          ) : (
            <View style={styles.placesList}>
              {filteredPlaces.map((place) => {
                const vis = getCategoryVisual(place.category);
                const matchingPost = posts.find((p) => place.source_post_ids?.includes(p.post_id));
                const thumb = matchingPost?.thumbnail_url ? proxiedMediaUrl(matchingPost.thumbnail_url) : null;

                return (
                  <Pressable
                    key={place.place_id}
                    onPress={() => router.push(appHref(`/(app)/places/${place.place_id}`))}
                    style={styles.placeRow}
                  >
                    <View style={[styles.placeThumb, { backgroundColor: vis.tint }]}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.placeThumbImg} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 24 }}>{vis.glyph}</Text>
                      )}
                    </View>

                    <View style={styles.placeInfo}>
                      <Text style={styles.placeTitle} numberOfLines={1}>
                        {place.display_name}
                      </Text>
                      <View style={styles.placeMetaRow}>
                        <View style={[styles.catDot, { backgroundColor: vis.hue }]} />
                        <Text style={[styles.catName, { color: vis.hue }]}>{vis.name}</Text>
                        {place.location?.city && (
                          <Text style={styles.placeCity}>· {place.location.city}</Text>
                        )}
                      </View>
                      {place.tips?.[0] && (
                        <Text style={styles.placeTip} numberOfLines={1}>
                          "{place.tips[0]}"
                        </Text>
                      )}
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerArea: {
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenHeading: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  segmentedToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  segmentBtnActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.bg,
  },
  searchBar: {
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipGlyph: {
    fontSize: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink2,
  },
  chipTextActive: {
    color: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  columnItem: {
    width: "48%",
  },
  placesList: {
    gap: 12,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    ...shadow.sm,
  },
  placeThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  placeThumbImg: {
    width: "100%",
    height: "100%",
  },
  placeInfo: {
    flex: 1,
    gap: 2,
  },
  placeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  placeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catName: {
    fontSize: 12,
    fontWeight: "600",
  },
  placeCity: {
    fontSize: 12,
    color: colors.muted,
  },
  placeTip: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 2,
  },
});

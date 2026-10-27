import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow } from "@/src/theme";
import { CANONICAL_CATEGORIES, getCategoryVisual } from "@/src/categoryVisuals";

interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  thumbnails: string[];
  route: string;
}

export default function MobileCollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places } = useLibrary();
  const [activeFilter, setActiveFilter] = useState<"all" | "city" | "category" | "creator">("all");

  // Auto-collections by City
  const cityCollections = useMemo<CollectionItem[]>(() => {
    const map = new Map<string, { count: number; thumbs: string[] }>();
    for (const place of places) {
      const city = place.location?.city;
      if (!city) continue;
      const data = map.get(city) || { count: 0, thumbs: [] };
      data.count += 1;
      const post = posts.find((p) => place.source_post_ids?.includes(p.post_id));
      if (post?.thumbnail_url && data.thumbs.length < 4 && !data.thumbs.includes(post.thumbnail_url)) {
        data.thumbs.push(post.thumbnail_url);
      }
      map.set(city, data);
    }
    return Array.from(map.entries())
      .map(([city, data]) => ({
        id: `city-${city}`,
        title: city,
        subtitle: "City collection",
        count: data.count,
        thumbnails: data.thumbs,
        route: "/(app)/(tabs)/travel",
      }))
      .sort((a, b) => b.count - a.count);
  }, [places, posts]);

  // Auto-collections by Category
  const categoryCollections = useMemo<CollectionItem[]>(() => {
    return CANONICAL_CATEGORIES.map((cat) => {
      const vis = getCategoryVisual(cat);
      const catPlaces = places.filter((p) => getCategoryVisual(p.category).name === cat);
      const thumbs: string[] = [];
      for (const p of catPlaces) {
        if (thumbs.length >= 4) break;
        const post = posts.find((item) => p.source_post_ids?.includes(item.post_id));
        if (post?.thumbnail_url && !thumbs.includes(post.thumbnail_url)) {
          thumbs.push(post.thumbnail_url);
        }
      }
      return {
        id: `cat-${cat}`,
        title: `${vis.glyph} ${cat}`,
        subtitle: "Category collection",
        count: catPlaces.length,
        thumbnails: thumbs,
        route: "/(app)/(tabs)/travel",
      };
    }).filter((c) => c.count > 0);
  }, [places, posts]);

  // Auto-collections by Creator
  const creatorCollections = useMemo<CollectionItem[]>(() => {
    const map = new Map<string, { count: number; thumbs: string[] }>();
    for (const post of posts) {
      const creator = post.author_handle;
      if (!creator) continue;
      const data = map.get(creator) || { count: 0, thumbs: [] };
      data.count += (post.place_ids?.length || 1);
      if (post.thumbnail_url && data.thumbs.length < 4 && !data.thumbs.includes(post.thumbnail_url)) {
        data.thumbs.push(post.thumbnail_url);
      }
      map.set(creator, data);
    }
    return Array.from(map.entries())
      .map(([creator, data]) => ({
        id: `creator-${creator}`,
        title: `@${creator}`,
        subtitle: "Creator guides",
        count: data.count,
        thumbnails: data.thumbs,
        route: "/(app)/(tabs)/posts",
      }))
      .filter((c) => c.count > 1)
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  const displayedCollections = useMemo(() => {
    if (activeFilter === "city") return cityCollections;
    if (activeFilter === "category") return categoryCollections;
    if (activeFilter === "creator") return creatorCollections;
    return [...cityCollections.slice(0, 4), ...categoryCollections.slice(0, 4), ...creatorCollections.slice(0, 4)];
  }, [activeFilter, cityCollections, categoryCollections, creatorCollections]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 12, 20),
          paddingBottom: 84 + insets.bottom + 24,
        },
      ]}
    >
      {/* Title */}
      <View style={styles.headerRow}>
        <Text style={styles.screenHeading}>Collections</Text>
      </View>
      <Text style={styles.subtitle}>
        Auto-organized from your saved reels by city, category, and creator.
      </Text>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRail}
      >
        {(["all", "city", "category", "creator"] as const).map((key) => {
          const isSelected = activeFilter === key;
          const label = key === "all" ? "All" : key === "city" ? "Cities" : key === "category" ? "Categories" : "Creators";
          return (
            <Pressable
              key={key}
              onPress={() => setActiveFilter(key)}
              style={[
                styles.filterChip,
                isSelected ? styles.filterChipActive : styles.filterChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 2-Column Grid of 2x2 Mosaics */}
      <View style={styles.grid}>
        {displayedCollections.map((col) => (
          <Pressable
            key={col.id}
            onPress={() => router.push(appHref(col.route as any))}
            style={styles.card}
          >
            {/* 2x2 Mosaic Container */}
            <View style={styles.mosaicWrap}>
              {[0, 1, 2, 3].map((idx) => {
                const raw = col.thumbnails[idx];
                const uri = raw ? proxiedMediaUrl(raw) : null;
                return (
                  <View key={idx} style={styles.mosaicCell}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.mosaicImg} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 16, opacity: 0.35 }}>📍</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {col.title}
              </Text>
              <Text style={styles.cardCount}>
                {col.count} {col.count === 1 ? "place" : "places"}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
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
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  filterRail: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.ink,
  },
  filterChipInactive: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.bg,
  },
  filterChipTextInactive: {
    color: colors.ink2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
  },
  card: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 10,
    ...shadow.sm,
  },
  mosaicWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    backgroundColor: colors.surface2,
  },
  mosaicCell: {
    width: "49%",
    height: "49%",
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mosaicImg: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  cardCount: {
    fontSize: 12,
    color: colors.muted,
  },
});

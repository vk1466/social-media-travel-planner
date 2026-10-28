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
import { proxiedMediaUrl, getPlaceBestImageUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow } from "@/src/theme";
import { CANONICAL_CATEGORIES, getCategoryVisual, type CategoryVisual } from "@/src/categoryVisuals";

interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  thumbnails: string[];
  route: string;
  visual?: CategoryVisual;
}

function MobileCollectionMosaic({
  thumbnails,
  title,
  visual,
}: {
  thumbnails: string[];
  title: string;
  visual?: CategoryVisual;
}) {
  const distinct = useMemo(() => {
    const set = new Set<string>();
    const res: string[] = [];
    for (const t of thumbnails) {
      if (t && !set.has(t)) {
        set.add(t);
        res.push(t);
      }
    }
    return res;
  }, [thumbnails]);

  if (distinct.length === 0) {
    const vis = visual || getCategoryVisual(title);
    return (
      <View
        style={[
          styles.mosaicEmpty,
          {
            backgroundColor: vis.tint,
            borderColor: vis.hue + "33",
            borderWidth: 1,
            gap: 4,
          },
        ]}
      >
        <Text style={{ fontSize: 28 }}>{vis.glyph}</Text>
        <Text style={{ fontSize: 12, fontWeight: "700", color: vis.hue }}>{title}</Text>
      </View>
    );
  }

  if (distinct.length === 1) {
    const uri = proxiedMediaUrl(distinct[0]);
    return (
      <View style={styles.mosaicWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.mosaicImgFull} resizeMode="cover" />
        ) : (
          <View style={styles.mosaicEmpty}><Text style={{ fontSize: 24, opacity: 0.6 }}>📍</Text></View>
        )}
      </View>
    );
  }

  if (distinct.length === 2) {
    return (
      <View style={[styles.mosaicWrap, { flexDirection: "row", gap: 2 }]}>
        {distinct.slice(0, 2).map((thumb, idx) => {
          const uri = proxiedMediaUrl(thumb);
          return (
            <View key={idx} style={{ flex: 1, height: "100%", overflow: "hidden" }}>
              {uri ? <Image source={{ uri }} style={styles.mosaicImgFull} resizeMode="cover" /> : null}
            </View>
          );
        })}
      </View>
    );
  }

  if (distinct.length === 3) {
    return (
      <View style={[styles.mosaicWrap, { flexDirection: "column", gap: 2 }]}>
        <View style={{ width: "100%", height: "55%", overflow: "hidden" }}>
          {proxiedMediaUrl(distinct[0]) ? (
            <Image source={{ uri: proxiedMediaUrl(distinct[0])! }} style={styles.mosaicImgFull} resizeMode="cover" />
          ) : null}
        </View>
        <View style={{ width: "100%", height: "43%", flexDirection: "row", gap: 2 }}>
          {distinct.slice(1, 3).map((thumb, idx) => {
            const uri = proxiedMediaUrl(thumb);
            return (
              <View key={idx} style={{ flex: 1, height: "100%", overflow: "hidden" }}>
                {uri ? <Image source={{ uri }} style={styles.mosaicImgFull} resizeMode="cover" /> : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // 4 or more -> 2x2 grid
  return (
    <View style={styles.mosaicWrap}>
      {distinct.slice(0, 4).map((thumb, idx) => {
        const uri = proxiedMediaUrl(thumb);
        return (
          <View key={idx} style={styles.mosaicCell}>
            {uri ? <Image source={{ uri }} style={styles.mosaicImg} resizeMode="cover" /> : null}
          </View>
        );
      })}
    </View>
  );
}

export default function MobileCollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places } = useLibrary();
  const [activeFilter, setActiveFilter] = useState<"all" | "city" | "category" | "creator">("all");

  const { cityCollections, categoryCollections, creatorCollections } = useMemo(() => {
    const usedThumbs = new Set<string>();

    // 1. City collections
    const cityMap = new Map<string, { count: number; places: typeof places }>();
    for (const place of places) {
      const city = place.location?.city;
      if (!city) continue;
      const data = cityMap.get(city) || { count: 0, places: [] };
      data.count += 1;
      data.places.push(place);
      cityMap.set(city, data);
    }
    const sortedCities = Array.from(cityMap.entries()).sort((a, b) => b[1].count - a[1].count);

    const cities: CollectionItem[] = sortedCities.map(([city, data]) => {
      const thumbs: string[] = [];
      // Pick images not yet used in previous collection covers
      for (const place of data.places) {
        if (thumbs.length >= 4) break;
        const img = getPlaceBestImageUrl(place, posts);
        if (img && !usedThumbs.has(img) && !thumbs.includes(img)) {
          thumbs.push(img);
          usedThumbs.add(img);
        }
      }
      // Search matching posts if needed
      if (thumbs.length < 4) {
        for (const post of posts) {
          if (thumbs.length >= 4) break;
          const matches = post.place_ids?.some(
            (pid) => places.find((pl) => pl.place_id === pid)?.location?.city === city
          );
          if (matches && post.thumbnail_url && !usedThumbs.has(post.thumbnail_url) && !thumbs.includes(post.thumbnail_url)) {
            thumbs.push(post.thumbnail_url);
            usedThumbs.add(post.thumbnail_url);
          }
        }
      }
      return {
        id: `city-${city}`,
        title: city,
        subtitle: "City collection",
        count: data.count,
        thumbnails: thumbs,
        route: "/(app)/(tabs)/travel",
      };
    });

    // 2. Category collections
    const categories: CollectionItem[] = CANONICAL_CATEGORIES.map((cat) => {
      const vis = getCategoryVisual(cat);
      const catPlaces = places.filter((p) => getCategoryVisual(p.category).name === cat);
      const thumbs: string[] = [];
      for (const p of catPlaces) {
        if (thumbs.length >= 4) break;
        const img = getPlaceBestImageUrl(p, posts);
        if (img && !usedThumbs.has(img) && !thumbs.includes(img)) {
          thumbs.push(img);
          usedThumbs.add(img);
        }
      }
      return {
        id: `cat-${cat}`,
        title: cat,
        subtitle: "Category collection",
        count: catPlaces.length,
        thumbnails: thumbs,
        visual: vis,
        route: "/(app)/(tabs)/travel",
      };
    }).filter((c) => c.count > 0);

    // 3. Creator collections
    const creatorMap = new Map<string, { count: number; thumbs: string[] }>();
    for (const post of posts) {
      const creator = post.author_handle;
      if (!creator) continue;
      const data = creatorMap.get(creator) || { count: 0, thumbs: [] };
      data.count += (post.place_ids?.length || 1);
      if (post.thumbnail_url && data.thumbs.length < 4 && !usedThumbs.has(post.thumbnail_url) && !data.thumbs.includes(post.thumbnail_url)) {
        data.thumbs.push(post.thumbnail_url);
        usedThumbs.add(post.thumbnail_url);
      }
      for (const pid of post.place_ids || []) {
        if (data.thumbs.length >= 4) break;
        const pl = places.find((p) => p.place_id === pid);
        if (pl) {
          const img = getPlaceBestImageUrl(pl, posts);
          if (img && !usedThumbs.has(img) && !data.thumbs.includes(img)) {
            data.thumbs.push(img);
            usedThumbs.add(img);
          }
        }
      }
      creatorMap.set(creator, data);
    }
    const creators: CollectionItem[] = Array.from(creatorMap.entries())
      .map(([creator, data]) => ({
        id: `creator-${creator}`,
        title: `@${creator}`,
        subtitle: "Creator guides",
        count: data.count,
        thumbnails: data.thumbs,
        route: "/(app)/(tabs)/travel",
      }))
      .filter((c) => c.count > 1)
      .sort((a, b) => b.count - a.count);

    return { cityCollections: cities, categoryCollections: categories, creatorCollections: creators };
  }, [places, posts]);

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

      {/* 2-Column Grid of Adaptive Mosaics */}
      <View style={styles.grid}>
        {displayedCollections.map((col) => (
          <Pressable
            key={col.id}
            onPress={() => router.push(appHref(col.route as any))}
            style={styles.card}
          >
            <MobileCollectionMosaic thumbnails={col.thumbnails} title={col.title} visual={col.visual} />

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
  mosaicEmpty: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  mosaicImgFull: {
    width: "100%",
    height: "100%",
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

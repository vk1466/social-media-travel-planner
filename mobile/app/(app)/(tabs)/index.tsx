import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow } from "@/src/theme";
import { getCategoryVisual } from "@/src/categoryVisuals";

export default function MobileHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places, loading } = useLibrary();
  const [pasteInput, setPasteInput] = useState("");

  const hasSaves = posts.length > 0;

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Stats
  const placesCount = places.length;
  const cities = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.location?.city).filter(Boolean))) as string[];
  }, [places]);
  const countries = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.location?.country).filter(Boolean))) as string[];
  }, [places]);

  // Top cities aggregation with thumbnail
  const topCities = useMemo(() => {
    const cityMap = new Map<string, { count: number; image: string | null }>();
    for (const place of places) {
      const c = place.location?.city;
      if (!c) continue;
      const existing = cityMap.get(c) || { count: 0, image: null };
      existing.count += 1;
      if (!existing.image) {
        const matchingPost = posts.find((p) => place.source_post_ids?.includes(p.post_id));
        if (matchingPost?.thumbnail_url) {
          existing.image = matchingPost.thumbnail_url;
        }
      }
      cityMap.set(c, existing);
    }
    return Array.from(cityMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [places, posts]);

  // Rediscover (serendipitous selection of 3 places)
  const rediscoverPlaces = useMemo(() => {
    if (places.length <= 3) return places;
    return places.slice(1, 4);
  }, [places]);

  const handlePasteSubmit = () => {
    if (pasteInput.trim()) {
      router.push({
        pathname: "/(app)/ingest" as any,
        params: { link: pasteInput.trim() },
      });
      setPasteInput("");
    } else {
      router.push("/(app)/ingest" as any);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: 84 + insets.bottom + 24,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Bar: Brand & Avatar */}
      <View style={styles.headerRow}>
        <View style={styles.brandGroup}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>W</Text>
          </View>
          <Text style={styles.brandTitle}>Wanderfile</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account and Settings"
          onPress={() => router.push(appHref("/(app)/settings"))}
          style={styles.avatarButton}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.ink} />
        </Pressable>
      </View>

      {/* Greeting */}
      <Text style={styles.greetingTitle}>
        {hasSaves ? `${greeting}.` : "Save your first reel."}
      </Text>
      <Text style={styles.greetingSubtitle}>
        {hasSaves
          ? "Your saved spots, organized and ready to explore."
          : "Paste an Instagram reel to turn recommendations into a map."}
      </Text>

      {/* Paste Bar */}
      <View style={styles.pasteBar}>
        <Ionicons name="link-outline" size={20} color={colors.muted} />
        <TextInput
          placeholder="Paste an Instagram reel link..."
          placeholderTextColor={colors.muted}
          value={pasteInput}
          onChangeText={setPasteInput}
          onSubmitEditing={handlePasteSubmit}
          style={styles.pasteInput}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={handlePasteSubmit} hitSlop={8} style={styles.pasteSubmitBtn}>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {!hasSaves ? (
        /* Empty State */
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIllustrationCard}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Copy any reel link</Text>
                <Text style={styles.stepDesc}>Find a travel or restaurant recommendation on Instagram.</Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={[styles.stepNumBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Paste & AI organizes it</Text>
                <Text style={styles.stepDesc}>Spots, tips, and categories are extracted automatically.</Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Explore on your map</Text>
                <Text style={styles.stepDesc}>All your saves in one clean, uncluttered basemap.</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        /* Populated Home */
        <View style={styles.populatedContainer}>
          {/* Recently Saved Rail */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recently saved</Text>
            <Pressable onPress={() => router.push(appHref("/(app)/(tabs)/posts"))}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalRail}
          >
            {posts.slice(0, 8).map((post) => {
              const thumbUrl = proxiedMediaUrl(post.thumbnail_url);
              const spotCount = post.place_ids?.length ?? 0;
              return (
                <Pressable
                  key={post.post_id}
                  onPress={() => router.push(appHref(`/(app)/posts/instagram/${post.post_id}`))}
                  style={styles.reelCard}
                >
                  <View style={styles.reelThumbContainer}>
                    {thumbUrl ? (
                      <Image
                        source={{ uri: thumbUrl }}
                        style={styles.reelThumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.reelThumbImage, styles.thumbFallback]}>
                        <Ionicons name="film-outline" size={28} color={colors.muted} />
                      </View>
                    )}

                    {/* IG Glyph Badge */}
                    <View style={styles.igBadge}>
                      <Ionicons name="logo-instagram" size={13} color="#FFFFFF" />
                    </View>

                    {/* Spot Count Badge */}
                    {spotCount > 0 && (
                      <View style={styles.spotCountBadge}>
                        <Text style={styles.spotCountText}>
                          {spotCount} {spotCount === 1 ? "place" : "places"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Creator & Caption */}
                  <View style={styles.reelMeta}>
                    <Text style={styles.reelCreator} numberOfLines={1}>
                      @{post.author_handle || "instagram"}
                    </Text>
                    <Text style={styles.reelCaption} numberOfLines={2}>
                      {post.caption || "Saved reel"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Stat Strip: Places · Cities · Countries */}
          <View style={styles.statStrip}>
            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/travel"))}
              style={styles.statItem}
            >
              <Text style={styles.statValue}>{placesCount}</Text>
              <Text style={styles.statLabel}>Places saved</Text>
            </Pressable>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{cities.length}</Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{countries.length}</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
          </View>

          {/* Top Cities Rail */}
          {topCities.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Top cities</Text>
                <Pressable onPress={() => router.push(appHref("/(app)/(tabs)/travel"))}>
                  <Text style={styles.seeAllText}>Explore map</Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalRail}
              >
                {topCities.map((city) => {
                  const img = proxiedMediaUrl(city.image);
                  return (
                    <Pressable
                      key={city.name}
                      onPress={() => router.push(appHref("/(app)/(tabs)/travel"))}
                      style={styles.cityCard}
                    >
                      <View style={styles.cityThumbWrap}>
                        {img ? (
                          <Image source={{ uri: img }} style={styles.cityImage} resizeMode="cover" />
                        ) : (
                          <View style={[styles.cityImage, styles.cityFallback]}>
                            <Ionicons name="location" size={24} color={colors.accent} />
                          </View>
                        )}
                        <View style={styles.cityScrim} />
                        <View style={styles.cityInfoOverlay}>
                          <Text style={styles.cityNameText} numberOfLines={1}>{city.name}</Text>
                          <Text style={styles.cityCountText}>
                            {city.count} {city.count === 1 ? "place" : "places"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Rediscover (Serendipity) */}
          {rediscoverPlaces.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.rediscoverTitleGroup}>
                  <Text style={styles.sectionTitle}>Rediscover</Text>
                  <Text style={styles.serendipityTag}>✨ Serendipity</Text>
                </View>
              </View>

              <View style={styles.rediscoverList}>
                {rediscoverPlaces.map((place) => {
                  const vis = getCategoryVisual(place.category);
                  const matchingPost = posts.find((p) => place.source_post_ids?.includes(p.post_id));
                  const thumb = proxiedMediaUrl(matchingPost?.thumbnail_url);

                  return (
                    <Pressable
                      key={place.place_id}
                      onPress={() => router.push(appHref(`/(app)/places/${place.place_id}`))}
                      style={styles.rediscoverCard}
                    >
                      <View style={[styles.rediscoverThumb, { backgroundColor: vis.tint }]}>
                        {thumb ? (
                          <Image source={{ uri: thumb }} style={styles.rediscoverImg} resizeMode="cover" />
                        ) : (
                          <Text style={{ fontSize: 24 }}>{vis.glyph}</Text>
                        )}
                      </View>

                      <View style={styles.rediscoverMeta}>
                        <Text style={styles.rediscoverTitle} numberOfLines={1}>
                          {place.display_name}
                        </Text>
                        <View style={styles.rediscoverCatRow}>
                          <Text style={{ fontSize: 12 }}>{vis.glyph}</Text>
                          <Text style={[styles.rediscoverCategory, { color: vis.hue }]}>
                            {vis.name}
                          </Text>
                          {place.location?.city && (
                            <Text style={styles.rediscoverCity}>· {place.location.city}</Text>
                          )}
                        </View>
                        {place.tips?.[0] && (
                          <Text style={styles.rediscoverTip} numberOfLines={1}>
                            "{place.tips[0]}"
                          </Text>
                        )}
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  avatarButton: {
    padding: 2,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.ink,
    lineHeight: 34,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 20,
  },
  pasteBar: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 28,
    ...shadow.sm,
  },
  pasteInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  pasteSubmitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateContainer: {
    marginTop: 10,
  },
  emptyIllustrationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
    ...shadow.sm,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: 40,
  },
  populatedContainer: {
    gap: 28,
  },
  sectionWrap: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
  horizontalRail: {
    gap: 14,
    paddingRight: 20,
  },
  reelCard: {
    width: 140,
    gap: 8,
  },
  reelThumbContainer: {
    width: 140,
    height: 180,
    borderRadius: radius.md,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surface2,
  },
  reelThumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  igBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  spotCountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  spotCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  reelMeta: {
    gap: 2,
  },
  reelCreator: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  reelCaption: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  statStrip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-around",
    ...shadow.sm,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  cityCard: {
    width: 130,
    height: 90,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  cityThumbWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  cityImage: {
    width: "100%",
    height: "100%",
  },
  cityFallback: {
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  cityScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  cityInfoOverlay: {
    position: "absolute",
    bottom: 8,
    left: 10,
    right: 10,
  },
  cityNameText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cityCountText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "500",
  },
  rediscoverTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serendipityTag: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  rediscoverList: {
    gap: 10,
  },
  rediscoverCard: {
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
  rediscoverThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  rediscoverImg: {
    width: "100%",
    height: "100%",
  },
  rediscoverMeta: {
    flex: 1,
    gap: 2,
  },
  rediscoverTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  rediscoverCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rediscoverCategory: {
    fontSize: 12,
    fontWeight: "600",
  },
  rediscoverCity: {
    fontSize: 12,
    color: colors.muted,
  },
  rediscoverTip: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 2,
  },
});

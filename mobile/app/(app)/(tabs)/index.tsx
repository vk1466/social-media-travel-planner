import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function MobileHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places, loading } = useLibrary();
  const [pasteInput, setPasteInput] = useState("");

  const hasSaves = posts.length > 0;
  const placesCount = places.length;
  const recipesCount = posts.filter((p) => p.content_category === "food").length;
  const titlesCount = posts.filter((p) => p.content_category === "movies").length;

  const topPlace = places.length > 0 ? places[0] : null;
  const topPlacePhoto = topPlace
    ? posts.find((p) => topPlace.source_post_ids?.includes(p.post_id))?.thumbnail_url ?? null
    : null;

  // Check if any link failed
  const failedJobsCount: number = 0; // Or from inbox failures if any

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
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandGroup}>
          <View style={styles.brandIcon}>
            <Ionicons name="location" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>Wanderfile</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          onPress={() => router.push(appHref("/(app)/settings"))}
          style={styles.avatarButton}
        >
          <Text style={styles.avatarText}>V</Text>
        </Pressable>
      </View>

      <Text style={styles.screenHeading}>
        {hasSaves ? "Pick something to do next." : "Nothing saved yet"}
      </Text>

      {!hasSaves && (
        <Text style={styles.emptySubtext}>
          Paste a link and it will show up here, already filed.
        </Text>
      )}

      {/* H5: Paste bar: height 48px, white, 1px border, fully rounded, with arrow button */}
      <View style={styles.pasteBar}>
        <Ionicons name="link-outline" size={20} color={colors.muted} />
        <TextInput
          placeholder={hasSaves ? "Paste a link or search" : "Paste a link"}
          placeholderTextColor={colors.muted}
          value={pasteInput}
          onChangeText={setPasteInput}
          onSubmitEditing={handlePasteSubmit}
          style={styles.pasteInput}
          returnKeyType="go"
        />
        <Pressable onPress={handlePasteSubmit} hitSlop={8} style={styles.pasteArrowBtn}>
          <Ionicons name="arrow-forward-circle" size={28} color={colors.ink} />
        </Pressable>
      </View>

      {/* H3: Inbox banner when links couldn't be read */}
      {failedJobsCount > 0 && (
        <View style={styles.inboxBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inboxBannerText}>
              {failedJobsCount} {failedJobsCount === 1 ? "link couldn't be read" : "links couldn't be read"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(appHref("/(app)/ingest"))}
            style={styles.inboxReviewBtn}
          >
            <Text style={styles.inboxReviewBtnText}>Review</Text>
          </Pressable>
        </View>
      )}

      {!hasSaves ? (
        /* Empty Home matching Mobile-Empty-Home.dc.html */
        <View style={styles.emptySection}>
          <View style={styles.getStartedCard}>
            <View style={styles.getStartedHeader}>
              <Text style={styles.getStartedTitle}>Get started</Text>
              <Text style={styles.getStartedCount}>0 of 3</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={styles.progressBarFill} />
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.ink }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>1</Text>
              </View>
              <Text style={styles.stepText}>Save a link</Text>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.brandSoft }]}>
                <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.muted }]}>Look at your library</Text>
            </View>

            <View style={[styles.stepRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.stepBadge, { backgroundColor: colors.brandSoft }]}>
                <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.muted }]}>Make a collection</Text>
            </View>
          </View>

          <View style={styles.dashedPrompt}>
            <Text style={styles.dashedPromptTitle}>Collections group your saves</Text>
            <Text style={styles.dashedPromptSub}>
              We'll suggest one when you save a few similar posts.
            </Text>
          </View>
        </View>
      ) : (
        /* Populated Home matching Mobile-Home.dc.html */
        <View style={styles.populatedSection}>
          {/* H2: Next Up Hero with photo + dark bottom gradient */}
          {topPlace && (
            <Pressable
              onPress={() => router.push(appHref(`/(app)/places/${topPlace.place_id}`))}
              style={styles.heroCard}
            >
              {topPlacePhoto ? (
                <Image
                  source={{ uri: proxiedMediaUrl(topPlacePhoto) ?? topPlacePhoto }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.heroImage, styles.heroFallbackBg]} />
              )}
              {/* Bottom gradient overlay */}
              <View style={styles.heroGradient}>
                <View style={styles.nextUpPill}>
                  <Text style={styles.nextUpPillText}>Next up</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {topPlace.display_name}
                </Text>
                <Text style={styles.heroRegion} numberOfLines={1}>
                  {[
                    topPlace.location?.city,
                    topPlace.location?.state_province,
                    topPlace.location?.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            </Pressable>
          )}

          {/* H4: 3 Collection Metric Link Cards */}
          <View style={styles.metricRow}>
            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/travel"))}
              style={styles.metricCard}
            >
              <Text style={styles.metricCount}>{placesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.travelInk }]}>On the map</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/food"))}
              style={styles.metricCard}
            >
              <Text style={styles.metricCount}>{recipesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.foodInk }]}>Recipes</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/movies"))}
              style={styles.metricCard}
            >
              <Text style={styles.metricCount}>{titlesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.movieInk }]}>Watch</Text>
            </Pressable>
          </View>

          {/* H1: Recently Saved section with thumbnail images */}
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recently saved</Text>
            <Pressable onPress={() => router.push(appHref("/(app)/(tabs)/posts"))}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.recentRow}>
            {posts.slice(0, 2).map((post) => {
              const thumbUrl = proxiedMediaUrl(post.thumbnail_url);
              return (
                <Pressable
                  key={post.post_id}
                  onPress={() => router.push(appHref("/(app)/(tabs)/posts"))}
                  style={styles.recentCard}
                >
                  <View style={styles.recentThumbWrap}>
                    {thumbUrl ? (
                      <Image
                        source={{ uri: thumbUrl }}
                        style={styles.recentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.recentImage, styles.recentFallbackBg]} />
                    )}
                  </View>
                  <Text style={styles.recentCaption} numberOfLines={2}>
                    {post.caption || "Saved post"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
    gap: 10,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  screenHeading: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
    lineHeight: 34,
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.bodyTinted,
    marginBottom: 20,
    lineHeight: 22,
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
    marginBottom: 20,
  },
  pasteInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  pasteArrowBtn: {
    padding: 2,
  },
  inboxBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FBEBDD",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    marginBottom: 20,
  },
  inboxBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A3A12",
  },
  inboxReviewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF",
  },
  inboxReviewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  emptySection: {
    gap: 20,
  },
  getStartedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  getStartedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  getStartedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  getStartedCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderSubtle,
    marginVertical: 14,
  },
  progressBarFill: {
    width: "4%",
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  dashedPrompt: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderDashed,
    backgroundColor: colors.surfaceAlt,
    padding: 20,
  },
  dashedPromptTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  dashedPromptSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  populatedSection: {
    gap: 20,
  },
  heroCard: {
    height: 190,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "flex-end",
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroFallbackBg: {
    backgroundColor: "#2D6A82",
  },
  heroGradient: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  nextUpPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 8,
  },
  nextUpPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: "#FFFFFF",
  },
  heroRegion: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
  },
  metricCount: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  recentRow: {
    flexDirection: "row",
    gap: 12,
  },
  recentCard: {
    flex: 1,
  },
  recentThumbWrap: {
    height: 130,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ECECEA",
  },
  recentImage: {
    ...StyleSheet.absoluteFill,
  },
  recentFallbackBg: {
    backgroundColor: "#2D6A82",
  },
  recentCaption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.ink,
    marginTop: 8,
  },
});

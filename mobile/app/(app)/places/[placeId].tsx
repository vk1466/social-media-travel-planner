import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  fetchPlaceDetail,
  fetchVisitedPlaceIds,
  markPlaceVisited,
  nativePostId,
  unmarkPlaceVisited,
  type PlaceDetail,
} from "@/src/api";
import { DetailSheetChrome } from "@/src/components/DetailSheetChrome";
import { PlaceMap } from "@/src/components/PlaceMap";
import { ErrorBanner, TagChip } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { googleMapsUrl } from "@/src/maps";
import { compactMentionDetails } from "@/src/mentionDetails";
import { factsAttribution, factsStructuredRows } from "@/src/placeFacts";
import { capitalizePlaceName, getPlatformLabel, getPostTitle, proxiedMediaUrl } from "@/src/postDisplayUtils";
import { FeatureFlags } from "@/src/featureRegistry";
import { appHref } from "@/src/nav";
import { colors, radius, shadow, spacing } from "@/src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function locationBreadcrumb(place: PlaceDetail["place"]): string {
  const { city, state_province: stateProvince, country, continent } = place.location;
  return [city, stateProvince, country, continent].filter(Boolean).join(" · ") || "Location unknown";
}

function getEffectiveAddress(place: PlaceDetail["place"]): string | null {
  const rawLoc = place.location?.display_name?.trim() || "";
  const displayName = (place.display_name || "").trim().toLowerCase();

  if (rawLoc) {
    const rawLower = rawLoc.toLowerCase();
    if (rawLower !== displayName) {
      if (rawLower.startsWith(displayName + ",") || rawLower.startsWith(displayName + " -")) {
        const stripped = rawLoc.slice(displayName.length + 1).trim().replace(/^[,\s-]+/, "");
        if (stripped) return stripped;
      }
      return rawLoc;
    }
  }

  const parts = [
    place.location?.city,
    place.location?.state_province,
    place.location?.country,
  ].filter(Boolean);

  if (parts.length > 0) {
    const regionStr = parts.join(", ");
    if (regionStr.toLowerCase() !== displayName) {
      return regionStr;
    }
  }

  return null;
}


function SectionBlock({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={15} color={colors.brand} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const { bumpRefresh } = useLibrary();
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisited, setIsVisited] = useState(false);
  const [visitedSaving, setVisitedSaving] = useState(false);
  const [visitedError, setVisitedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!placeId) return;
      setLoading(true);
      try {
        const [next, visitedIds] = await Promise.all([
          fetchPlaceDetail(placeId),
          fetchVisitedPlaceIds(),
        ]);
        if (!cancelled) {
          setDetail(next);
          setIsVisited(visitedIds.includes(placeId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load place");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const handleToggleVisited = async () => {
    if (!placeId) return;
    setVisitedError(null);
    setVisitedSaving(true);
    const next = !isVisited;
    try {
      if (next) {
        await markPlaceVisited(placeId);
      } else {
        await unmarkPlaceVisited(placeId);
      }
      setIsVisited(next);
      bumpRefresh();
    } catch (err) {
      setVisitedError(err instanceof Error ? err.message : "Failed to update visited status");
    } finally {
      setVisitedSaving(false);
    }
  };

  if (loading) {
    return (
      <DetailSheetChrome>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </DetailSheetChrome>
    );
  }

  if (error || !detail) {
    return (
      <DetailSheetChrome>
        <View style={styles.pad}>
          <ErrorBanner message={error ?? "Place not found"} />
        </View>
      </DetailSheetChrome>
    );
  }

  const { place, parent, children, source_posts: sourcePosts } = detail;
  const whyGoDetails = compactMentionDetails(place.details, place.display_name).filter((item) => {
    if (!place.summary) return true;
    const lowerSummary = place.summary.toLowerCase();
    const lowerItem = item.toLowerCase().trim();
    return !lowerSummary.includes(lowerItem) && !lowerItem.includes(lowerSummary);
  });
  const mapUrl = place.google_maps_url || googleMapsUrl(place.location);
  const appleMapUrl = place.location?.latitude != null && place.location?.longitude != null
    ? `https://maps.apple.com/?q=${encodeURIComponent(place.display_name)}&ll=${place.location.latitude},${place.location.longitude}`
    : `https://maps.apple.com/?q=${encodeURIComponent(place.display_name)}`;
  const breadcrumb = locationBreadcrumb(place);
  const heroPost = sourcePosts.find((p) => p.thumbnail_url);
  const heroImageUrl = heroPost?.thumbnail_url ? proxiedMediaUrl(heroPost.thumbnail_url) : null;
  const postTips = sourcePosts.flatMap((p) => (p.extracted_places || []).flatMap((ep) => ep.tips || []));
  const allTips = Array.from(new Set([...(place.tips || []), ...postTips].filter(Boolean)));
  const effectiveAddress = getEffectiveAddress(place);

  return (
    <DetailSheetChrome>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.main}>
        {/* Place Detail Hero with real proxied thumbnail */}
        <View style={styles.heroCard}>
          {heroImageUrl ? (
            <Image source={{ uri: heroImageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImageFallback} />
          )}
          <View style={styles.heroCopy}>
            <View style={styles.tagRow}>
              <TagChip category={place.category} />
              {(place.attributes ?? []).map((attr) => (
                <TagChip key={attr} label={attr} />
              ))}
            </View>
            <Text style={styles.breadcrumb}>{breadcrumb}</Text>
            <Text style={styles.title}>{capitalizePlaceName(place.display_name)}</Text>
            {place.aliases.length > 0 ? (
              <Text style={styles.aliases}>Also known as {place.aliases.join(", ")}</Text>
            ) : null}
            {place.summary ? (
              <Text style={styles.summaryText}>{place.summary}</Text>
            ) : null}
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.actionChip, isVisited && styles.actionChipVisited]}
                onPress={() => void handleToggleVisited()}
                disabled={visitedSaving}
              >
                <Text style={[styles.actionChipText, isVisited && styles.actionChipVisitedText]}>
                  {visitedSaving ? "Saving…" : isVisited ? "✓ Visited" : "Mark visited"}
                </Text>
              </Pressable>
              {FeatureFlags.isEnabled("trips") ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(appHref("/(app)/coming-soon"))}
                  style={styles.actionChip}
                >
                  <Text style={styles.actionChipText}>Add to trip</Text>
                </Pressable>
              ) : null}
              {mapUrl ? (
                <Pressable accessibilityRole="button" style={[styles.actionChip, styles.mapsAction]} onPress={() => void Linking.openURL(mapUrl)}>
                  <Ionicons name="navigate-outline" size={16} color={colors.onFill} />
                  <Text style={styles.mapsActionText}>Google Maps</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" style={[styles.actionChip, styles.mapsActionSecondary]} onPress={() => void Linking.openURL(appleMapUrl)}>
                <Ionicons name="map-outline" size={16} color="#1B5E78" />
                <Text style={styles.mapsActionSecondaryText}>Apple Maps</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {parent ? (
          <Pressable
            onPress={() => router.push(`/places/${parent.place_id}`)}
            style={styles.parentRow}
          >
            <Text style={styles.parent}>
              Part of <Text style={styles.parentLink}>{parent.display_name}</Text>
            </Text>
          </Pressable>
        ) : null}

        {visitedError ? <ErrorBanner message={visitedError} /> : null}

        {/* Location & Address Section */}
        <SectionBlock icon="location-outline" title="Location">
          {place.location?.latitude != null && place.location?.longitude != null ? (
            <View style={{ borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.sm, height: 180 }}>
              <PlaceMap places={[place]} selectedPlaceId={place.place_id} height={180} />
            </View>
          ) : null}
          <View style={styles.surface}>
            {effectiveAddress ? (
              <View style={styles.locationDetailRow}>
                <Text style={styles.locationDetailLabel}>Address:</Text>
                <Text style={styles.locationDetailValue}>{effectiveAddress}</Text>
              </View>
            ) : null}
            {place.location?.city && (!effectiveAddress || !effectiveAddress.toLowerCase().includes(place.location.city.toLowerCase())) ? (
              <View style={styles.locationDetailRow}>
                <Text style={styles.locationDetailLabel}>City:</Text>
                <Text style={styles.locationDetailValue}>{place.location.city}</Text>
              </View>
            ) : null}
            {place.location?.state_province && (!effectiveAddress || !effectiveAddress.toLowerCase().includes(place.location.state_province.toLowerCase())) ? (
              <View style={styles.locationDetailRow}>
                <Text style={styles.locationDetailLabel}>State / Region:</Text>
                <Text style={styles.locationDetailValue}>{place.location.state_province}</Text>
              </View>
            ) : null}
            {place.location?.country && (!effectiveAddress || !effectiveAddress.toLowerCase().includes(place.location.country.toLowerCase())) ? (
              <View style={styles.locationDetailRow}>
                <Text style={styles.locationDetailLabel}>Country:</Text>
                <Text style={styles.locationDetailValue}>{place.location.country}</Text>
              </View>
            ) : null}
          </View>
        </SectionBlock>

        <SectionBlock icon="flash-outline" title="At a glance">
          {detail.facts_refresh_queued ? (
            <Text style={styles.muted}>Looking up source-backed facts…</Text>
          ) : null}
          {place.facts == null && !detail.facts_refresh_queued ? (
            <Text style={styles.muted}>No source-backed facts yet.</Text>
          ) : null}
          {place.facts?.status === "empty" ? (
            <Text style={styles.muted}>No objective facts found for this place.</Text>
          ) : null}
          {place.facts && factsStructuredRows(place.facts).length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.glanceRow}
            >
              {factsStructuredRows(place.facts).slice(0, 5).map((row) => (
                <View key={row.label} style={styles.glanceCard}>
                  <Text style={styles.glanceLabel}>{row.label}</Text>
                  <Text style={styles.glanceValue} numberOfLines={3}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
          {place.facts && factsAttribution(place.facts) ? (
            <Text style={styles.sourceNote}>{factsAttribution(place.facts)}</Text>
          ) : null}
        </SectionBlock>

        <SectionBlock icon="heart-outline" title="Why go">
          <View style={styles.surface}>
            {whyGoDetails.length > 0 ? whyGoDetails.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Ionicons name="ellipse" size={5} color={colors.brand} style={styles.bulletDot} />
                <Text style={styles.bullet}>{item}</Text>
              </View>
            )) : null}
            {whyGoDetails.length === 0 && !(place.facts?.highlights && place.facts.highlights.length > 0) ? (
              <Text style={styles.muted}>No additional details yet.</Text>
            ) : null}
            {place.facts?.highlights?.map((highlight) => (
              <View key={highlight} style={styles.highlightCard}>
                <Ionicons name="sparkles-outline" size={16} color={colors.brand} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
            {place.facts && factsAttribution(place.facts) ? <Text style={styles.sourceNote}>{factsAttribution(place.facts)}</Text> : null}
          </View>
        </SectionBlock>

        {(place.facts?.recommendations?.length ?? 0) > 0 ||
        (place.facts?.caveats?.length ?? 0) > 0 ? (
          <SectionBlock icon="shield-checkmark-outline" title="Know before you go">
            <View style={styles.surface}>
              {place.facts?.recommendations?.map((recommendation) => (
                <View key={recommendation} style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Recommendation</Text>
                  <Text style={styles.factValue}>{recommendation}</Text>
                </View>
              ))}
              {place.facts?.caveats?.map((caveat) => (
                <View key={caveat} style={[styles.insightRow, styles.caveatRow]}>
                  <Text style={styles.caveatLabel}>Caveat</Text>
                  <Text style={styles.factValue}>{caveat}</Text>
                </View>
              ))}
              {place.facts && factsAttribution(place.facts) ? (
                <Text style={styles.sourceNote}>{factsAttribution(place.facts)}</Text>
              ) : null}
            </View>
          </SectionBlock>
        ) : null}

        {allTips.length > 0 ? (
          <SectionBlock icon="bulb-outline" title={`Creator tips (${allTips.length})`}>
            <View style={styles.surface}>
              <Text style={styles.attributedLabel}>From creators</Text>
              {allTips.map((tip, idx) => (
                <View key={idx} style={styles.tipCard}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </SectionBlock>
        ) : null}

        {sourcePosts.length > 0 ? (
          <SectionBlock
            icon="albums-outline"
            title={`Mentioned in ${sourcePosts.length} ${sourcePosts.length === 1 ? "reel" : "reels"}`}
          >
            <View style={styles.surface}>
              {sourcePosts.map((post) => {
                const thumb = proxiedMediaUrl(post.thumbnail_url);
                return (
                  <Pressable
                    key={post.post_id}
                    style={styles.sourceRow}
                    onPress={() => {
                      if (post.post_url) {
                        void Linking.openURL(post.post_url);
                      } else {
                        router.push(`/posts/${post.platform}/${nativePostId(post)}`);
                      }
                    }}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.sourceThumb} />
                    ) : (
                      <View style={[styles.sourceThumb, styles.sourceThumbEmpty]} />
                    )}
                    <View style={styles.sourceCopy}>
                      <Text style={styles.sourceTitle} numberOfLines={2}>
                        {getPostTitle(post)}
                      </Text>
                      <View style={styles.sourceMetaRow}>
                        {post.author_handle ? (
                          <Text style={styles.sourceAuthor}>@{post.author_handle}</Text>
                        ) : null}
                        <Text style={styles.sourcePlatform}>Instagram reel ↗</Text>
                      </View>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.faint} />
                  </Pressable>
                );
              })}
            </View>
          </SectionBlock>
        ) : null}

        {children.length > 0 ? (
          <SectionBlock icon="pin-outline" title={`Related spots (${children.length})`}>
            <View style={styles.surface}>
              {children.map((child) => (
                <Pressable key={child.place_id} style={styles.row} onPress={() => router.push(`/places/${child.place_id}`)}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{child.display_name}</Text>
                    <View style={styles.rowTags}><TagChip category={child.category} /></View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                </Pressable>
              ))}
            </View>
          </SectionBlock>
        ) : null}
      </View>
      </ScrollView>
    </DetailSheetChrome>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: { padding: spacing.md },
  main: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.md },
  headerCopy: { gap: 4 },
  breadcrumb: { color: colors.muted, fontSize: 13 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  aliases: { color: colors.faint, fontSize: 13, fontStyle: "italic" },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  mapsAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    minHeight: 44,
  },
  mapsActionText: { color: colors.onFill, fontWeight: "800", fontSize: 13 },
  actionChipVisited: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  actionChipText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  actionChipVisitedText: { color: colors.success },
  parentRow: { marginTop: -spacing.sm },
  parent: { color: colors.muted, fontSize: 13 },
  parentLink: { color: colors.brand, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  glanceRow: { gap: spacing.sm, paddingVertical: 2 },
  glanceCard: {
    width: 132,
    minHeight: 76,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "space-between",
  },
  glanceLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  glanceValue: { color: colors.ink, fontSize: 14, fontWeight: "700", lineHeight: 18, marginTop: 6 },
  sourceNote: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  attributedLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 2 },
  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 6,
  },
  highlightText: { flex: 1, color: colors.ink, lineHeight: 20 },
  insightRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  insightLabel: { color: colors.brand, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  caveatRow: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 0 },
  caveatLabel: { color: colors.danger, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    ...shadow(1),
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow(1),
  },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  muted: { color: colors.muted, fontSize: 13 },
  factRow: { marginBottom: spacing.sm },
  factLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.faint,
    marginBottom: 2,
  },
  factValue: { color: colors.ink, lineHeight: 20 },
  factLink: { color: colors.brand, fontWeight: "600", lineHeight: 20 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  bulletDot: { marginTop: 8 },
  bullet: { flex: 1, color: colors.ink, lineHeight: 22 },
  tipCard: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 6,
  },
  tipIcon: { fontSize: 16 },
  tipText: { flex: 1, color: colors.ink, lineHeight: 21 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { flex: 1, gap: 6 },
  rowTitle: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  rowTags: { flexDirection: "row", flexWrap: "wrap" },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sourceThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  sourceThumbEmpty: { backgroundColor: colors.surfaceAlt },
  sourceCopy: { flex: 1 },
  sourceTitle: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  sourcePlatform: { color: colors.muted, fontSize: 12, marginTop: 2 },
  sourceMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  sourceAuthor: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow(1),
  },
  heroImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  heroImageFallback: {
    width: "100%",
    height: 160,
    backgroundColor: "#2D6A82",
  },
  heroCopy: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  mapsActionSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    minHeight: 44,
  },
  mapsActionSecondaryText: { color: "#1B5E78", fontWeight: "700", fontSize: 13 },
  locationDetailRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 3,
  },
  locationDetailLabel: {
    fontWeight: "700",
    color: colors.ink,
    fontSize: 13,
    width: 90,
  },
  locationDetailValue: {
    color: colors.bodyTinted,
    fontSize: 13,
    flex: 1,
  },
});

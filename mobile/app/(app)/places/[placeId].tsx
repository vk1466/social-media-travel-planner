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
import { ErrorBanner, TagChip } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { googleMapsUrl } from "@/src/maps";
import { compactMentionDetails } from "@/src/mentionDetails";
import { factsAttribution, factsStructuredRows } from "@/src/placeFacts";
import { getPlatformLabel, getPostTitle, proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow, spacing } from "@/src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function locationBreadcrumb(place: PlaceDetail["place"]): string {
  const { city, state_province: stateProvince, country, continent } = place.location;
  return [city, stateProvince, country, continent].filter(Boolean).join(" · ") || "Location unknown";
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
  const breadcrumb = locationBreadcrumb(place);
  return (
    <DetailSheetChrome>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.main}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.breadcrumb}>{breadcrumb}</Text>
            <Text style={styles.title}>{place.display_name}</Text>
            {place.aliases.length > 0 ? (
              <Text style={styles.aliases}>Also known as {place.aliases.join(", ")}</Text>
            ) : null}
          </View>
          <View style={styles.headerActions}>
            {mapUrl ? (
              <Pressable accessibilityRole="button" style={[styles.actionChip, styles.mapsAction]} onPress={() => void Linking.openURL(mapUrl)}>
                <Ionicons name="navigate-outline" size={16} color={colors.onFill} />
                <Text style={styles.mapsActionText}>Open in Google Maps</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionChip, isVisited && styles.actionChipVisited]}
              onPress={() => void handleToggleVisited()}
              disabled={visitedSaving}
            >
              <Text style={[styles.actionChipText, isVisited && styles.actionChipVisitedText]}>
                {visitedSaving ? "Saving…" : isVisited ? "✓ Visited" : "Mark visited"}
              </Text>
            </Pressable>
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

        <View style={styles.tagRow}>
          <TagChip category={place.category} />
          {(place.attributes ?? []).map((attr) => (
            <TagChip key={attr} label={attr} />
          ))}
        </View>

        {place.summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={13} color={colors.brand} />
              <Text style={styles.summaryTitle}>Overview</Text>
            </View>
            <Text style={styles.summaryText}>{place.summary}</Text>
          </View>
        ) : null}

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

        {place.tips.length > 0 ? (
          <SectionBlock icon="bulb-outline" title={`Creator tips (${place.tips.length})`}>
            <View style={styles.surface}>
              <Text style={styles.attributedLabel}>From the creator</Text>
              {place.tips.map((tip) => (
                <View key={tip} style={styles.tipCard}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </SectionBlock>
        ) : null}

        {sourcePosts.length > 0 ? (
          <SectionBlock icon="albums-outline" title={`Saved from (${sourcePosts.length})`}>
            <View style={styles.surface}>
              {sourcePosts.map((post) => {
                const thumb = proxiedMediaUrl(post.thumbnail_url);
                return (
                  <Pressable
                    key={post.post_id}
                    style={styles.sourceRow}
                    onPress={() =>
                      router.push(`/posts/${post.platform}/${nativePostId(post)}`)
                    }
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
                      <Text style={styles.sourcePlatform}>{getPlatformLabel(post)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.faint} />
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
});

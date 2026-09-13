import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { coverFallbackColor } from "@/src/coverArt";
import { useLibrary } from "@/src/context/LibraryContext";
import { googleMapsUrl } from "@/src/maps";
import { factsAttribution, factsRows } from "@/src/placeFacts";
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

  const heroUrl = useMemo(() => {
    const thumb = detail?.source_posts[0]?.thumbnail_url;
    return thumb ? proxiedMediaUrl(thumb) : null;
  }, [detail?.source_posts]);

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
  const mapUrl = place.google_maps_url || googleMapsUrl(place.location);
  const breadcrumb = locationBreadcrumb(place);
  const heroFallback = coverFallbackColor(place.display_name);

  return (
    <DetailSheetChrome>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroWrap}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: heroFallback }]} />
        )}
        <View style={styles.heroScrim} />
        <View style={styles.heroCaption}>
          <Text style={styles.heroCategory}>{place.category || "Saved place"}</Text>
          <Text style={styles.heroLocation} numberOfLines={2}>
            {breadcrumb}
          </Text>
        </View>
      </View>

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
              <Pressable style={styles.actionChip} onPress={() => void Linking.openURL(mapUrl)}>
                <Text style={styles.actionChipText}>Maps ↗</Text>
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

        <View style={styles.surface}>
          <PlaceMap places={[place, ...children]} height={220} />
          {mapUrl ? (
            <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapLink}>
              <Text style={styles.mapLinkText}>Open in Google Maps ↗</Text>
            </Pressable>
          ) : null}
        </View>

        {children.length > 0 ? (
          <SectionBlock icon="pin-outline" title={`Spots here (${children.length})`}>
            <View style={styles.surface}>
              {children.map((child) => (
                <Pressable
                  key={child.place_id}
                  style={styles.row}
                  onPress={() => router.push(`/places/${child.place_id}`)}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{child.display_name}</Text>
                    <View style={styles.rowTags}>
                      <TagChip category={child.category} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                </Pressable>
              ))}
            </View>
          </SectionBlock>
        ) : null}

        <SectionBlock icon="document-text-outline" title="Facts">
          <View style={styles.surface}>
            {detail.facts_refresh_queued ? (
              <Text style={styles.muted}>Looking up source-backed facts…</Text>
            ) : null}
            {place.facts == null && !detail.facts_refresh_queued ? (
              <Text style={styles.muted}>No source-backed facts yet.</Text>
            ) : null}
            {place.facts?.status === "empty" ? (
              <Text style={styles.muted}>No objective facts found for this place.</Text>
            ) : null}
            {place.facts && place.facts.status !== "empty"
              ? factsRows(place.facts).map((row) => (
                  <View key={row.label} style={styles.factRow}>
                    <Text style={styles.factLabel}>{row.label}</Text>
                    {row.label === "Website" ? (
                      <Pressable onPress={() => void Linking.openURL(row.value)}>
                        <Text style={styles.factLink}>{row.value}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.factValue}>{row.value}</Text>
                    )}
                  </View>
                ))
              : null}
            {place.facts && factsAttribution(place.facts) ? (
              <Text style={styles.muted}>{factsAttribution(place.facts)}</Text>
            ) : null}
          </View>
        </SectionBlock>

        {place.details.length > 0 ? (
          <SectionBlock icon="information-circle-outline" title="Details">
            <View style={styles.surface}>
              {place.details.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <Ionicons name="ellipse" size={5} color={colors.brand} style={styles.bulletDot} />
                  <Text style={styles.bullet}>{item}</Text>
                </View>
              ))}
            </View>
          </SectionBlock>
        ) : null}

        {place.tips.length > 0 ? (
          <SectionBlock icon="bulb-outline" title={`Tips from creator (${place.tips.length})`}>
            <View style={styles.surface}>
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
  heroWrap: { height: 220, position: "relative" },
  heroImage: { ...StyleSheet.absoluteFill },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 42, 53, 0.45)",
  },
  heroCaption: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  heroCategory: {
    color: colors.onFill,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroLocation: { color: "rgba(243, 250, 252, 0.85)", fontSize: 13, marginTop: 4 },
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
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
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow(1),
  },
  mapLink: { alignSelf: "flex-start", marginTop: 4 },
  mapLinkText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
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

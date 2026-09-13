import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  acceptTimelineReview,
  cleanupVisits,
  createVisit,
  discardTimelineReview,
  fetchTimelineReviews,
  importTimelineFile,
  startInstagramImport,
  type Place,
  type TimelineReviewDetail,
} from "@/src/api";
import { PageHeading, SearchField } from "@/src/components/LibraryChrome";
import {
  Button,
  EmptyState,
  ErrorBanner,
  SuccessBanner,
  TagChip,
} from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { formatDate, locationLine } from "@/src/display";
import { colors, radius, shadow, spacing } from "@/src/theme";

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function HistoryScreen() {
  const router = useRouter();
  const { places, visits, loading, error, bumpRefresh, refreshToken } = useLibrary();
  const [instagramUsername, setInstagramUsername] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [reviews, setReviews] = useState<TimelineReviewDetail[]>([]);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const [destination, setDestination] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [visitedFrom, setVisitedFrom] = useState("");
  const [visitedTo, setVisitedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timelineImporting, setTimelineImporting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setReviews(await fetchTimelineReviews());
      } catch {
        setReviews([]);
      }
    })();
  }, [refreshToken]);

  const countries = useMemo(() => {
    return new Set(visits.map((item) => item.place?.location.country).filter(Boolean)).size;
  }, [visits]);

  const cities = useMemo(() => {
    return new Set(visits.map((item) => item.place?.location.city).filter(Boolean)).size;
  }, [visits]);

  const suggestions = useMemo(() => {
    const q = destination.trim().toLowerCase();
    if (q.length < 2 || selectedPlace) {
      return [];
    }
    return places
      .filter(
        (place) =>
          place.display_name.toLowerCase().includes(q) ||
          place.aliases.some((alias) => alias.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [destination, places, selectedPlace]);

  const handleImportInstagram = async () => {
    setFormError(null);
    setFormSuccess(null);
    const username = instagramUsername.trim();
    if (!username) {
      setFormError("Enter an Instagram username");
      return;
    }
    setBusy(true);
    try {
      await startInstagramImport(username);
      setInstagramUsername("");
      setFormSuccess("Import started — open Add links to watch progress");
      bumpRefresh();
      router.push("/ingest");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to start Instagram import");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickLogVisit = async () => {
    setFormError(null);
    setFormSuccess(null);
    const query = placeQuery.trim();
    if (!query) {
      setFormError("Enter a place name to log a visit");
      return;
    }
    setBusy(true);
    try {
      await createVisit({ place_query: query });
      setPlaceQuery("");
      setFormSuccess("Visit logged");
      bumpRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to log visit");
    } finally {
      setBusy(false);
    }
  };

  const handleImportTimeline = async () => {
    setFormError(null);
    setFormSuccess(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "application/zip", "public.zip-archive", "*/*"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) {
      return;
    }
    const asset = picked.assets[0];
    const filename = asset.name || "Timeline.json";
    if (!/\.(json|zip)$/i.test(filename)) {
      setFormError("Choose a Timeline .json or Takeout .zip file");
      return;
    }
    setTimelineImporting(true);
    try {
      await importTimelineFile(asset.uri, filename);
      setFormSuccess("Timeline import started — open Add links to watch progress");
      bumpRefresh();
      router.push("/ingest");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to import Timeline");
    } finally {
      setTimelineImporting(false);
    }
  };

  const handleAcceptReview = (visitId: string) => {
    setReviewBusyId(visitId);
    void (async () => {
      try {
        await acceptTimelineReview(visitId);
        setFormSuccess("Kept in travel history");
        bumpRefresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to keep place");
      } finally {
        setReviewBusyId(null);
      }
    })();
  };

  const handleDiscardReview = (visitId: string) => {
    setReviewBusyId(visitId);
    void (async () => {
      try {
        await discardTimelineReview(visitId);
        setFormSuccess("Discarded");
        bumpRefresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to discard place");
      } finally {
        setReviewBusyId(null);
      }
    })();
  };

  const handleCleanupVisits = (scope: "timeline" | "all") => {
    const title = scope === "timeline" ? "Clear Timeline visits" : "Clear all visit history";
    const message =
      scope === "timeline"
        ? "Delete all visits imported from Google Maps Timeline?"
        : "Delete ALL visited-place history?";
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const result = await cleanupVisits(scope);
              setFormSuccess(`Cleared ${result.visits_deleted} visit${result.visits_deleted === 1 ? "" : "s"}`);
              bumpRefresh();
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Failed to clear visits");
            }
          })();
        },
      },
    ]);
  };

  const handleSaveDetailed = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (!selectedPlace && !destination.trim()) {
      setFormError("Pick a place from your library or enter a destination");
      return;
    }
    if (visitedTo && !visitedFrom) {
      setFormError("Enter a start date if you set an end date");
      return;
    }
    setSaving(true);
    try {
      await createVisit({
        visited_from: visitedFrom || null,
        visited_to: visitedTo || null,
        notes: notes.trim() || null,
        place_id: selectedPlace?.place_id,
        place_query: selectedPlace ? null : destination.trim(),
      });
      setFormSuccess("Saved to your visits");
      setDestination("");
      setSelectedPlace(null);
      setVisitedFrom("");
      setVisitedTo("");
      setNotes("");
      bumpRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  if (loading && visits.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={visits}
      keyExtractor={(item) => item.visit.visit_id}
      ListHeaderComponent={
        <View style={styles.header}>
          <PageHeading
            kicker="Places you’ve been"
            title="Travel history"
            lede="Keep a personal record of past trips, then use it to shape what comes next."
            count={{ value: visits.length, label: "visits" }}
          />

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{visits.length}</Text>
              <Text style={styles.statLabel}>visits</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{countries}</Text>
              <Text style={styles.statLabel}>countries</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{cities}</Text>
              <Text style={styles.statLabel}>cities</Text>
            </View>
          </View>

          {error ? <ErrorBanner message={error} /> : null}
          {formError ? <ErrorBanner message={formError} /> : null}
          {formSuccess ? <SuccessBanner message={formSuccess} /> : null}

          <View style={styles.toolbar}>
            <View style={styles.toolbarForm}>
              <SearchField
                value={instagramUsername}
                onChange={setInstagramUsername}
                placeholder="Instagram username"
              />
              <Pressable
                style={[styles.toolbarBtn, busy && styles.toolbarBtnDisabled]}
                onPress={() => void handleImportInstagram()}
                disabled={busy}
              >
                <Text style={styles.toolbarBtnText}>{busy ? "Importing…" : "Import Instagram"}</Text>
              </Pressable>
            </View>
            <View style={styles.toolbarForm}>
              <SearchField value={placeQuery} onChange={setPlaceQuery} placeholder="Log a visit" />
              <Pressable
                style={[styles.toolbarBtn, busy && styles.toolbarBtnDisabled]}
                onPress={() => void handleQuickLogVisit()}
                disabled={busy}
              >
                <Text style={styles.toolbarBtnText}>Log visit</Text>
              </Pressable>
            </View>
          </View>

          {visits.length > 0 ? null : (
            <EmptyState
              title="No visits logged yet"
              body="Mark places as visited or import from Instagram."
            />
          )}
        </View>
      }
      renderItem={({ item, index }) => {
        const { visit, place } = item;
        const dateLabel =
          formatDate(visit.visited_from ?? visit.created_at) ?? "—";
        const metaLine =
          [place ? locationLine(place) : null, visit.notes].filter(Boolean).join(" · ") ||
          visit.source;
        const canOpen = Boolean(visit.place_id);

        return (
          <Pressable
            style={styles.timelineRow}
            disabled={!canOpen}
            onPress={() => visit.place_id && router.push(`/places/${visit.place_id}`)}
          >
            <Text style={styles.timelineDate}>{dateLabel}</Text>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot} />
              {index < visits.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>{visit.place_name}</Text>
              {metaLine ? <Text style={styles.timelineMeta}>{metaLine}</Text> : null}
            </View>
          </Pressable>
        );
      }}
      ListFooterComponent={
        <View style={styles.footer}>
          <Pressable style={styles.moreToggle} onPress={() => setShowMore((value) => !value)}>
            <Text style={styles.moreToggleText}>
              {showMore ? "Hide import & tools" : "Import & tools"}
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.brand}
            />
          </Pressable>

          {showMore ? (
            <View style={styles.morePanel}>
              <Text style={styles.moreTitle}>Google Maps Timeline</Text>
              <Text style={styles.moreSubtitle}>
                Upload a Timeline .json or Takeout .zip. Processes in the background.
              </Text>
              <Button
                label={timelineImporting ? "Uploading…" : "Choose Timeline file"}
                icon="cloud-upload-outline"
                loading={timelineImporting}
                onPress={() => void handleImportTimeline()}
              />

              {reviews.length > 0 ? (
                <>
                  <Text style={[styles.moreTitle, { marginTop: spacing.lg }]}>
                    Review Timeline places
                  </Text>
                  <Text style={styles.moreSubtitle}>
                    Ambiguous imports — keep trip memories, discard everyday stops.
                  </Text>
                  {reviews.map((item) => (
                    <View key={item.visit.visit_id} style={styles.reviewCard}>
                      <TagChip category={item.place?.category} />
                      <Text style={styles.reviewName}>{item.visit.place_name}</Text>
                      {item.suggestion ? (
                        <Text style={styles.reviewMeta}>Suggested: {item.suggestion}</Text>
                      ) : null}
                      <View style={styles.reviewActions}>
                        <Button
                          label="Keep"
                          icon="checkmark"
                          loading={reviewBusyId === item.visit.visit_id}
                          onPress={() => handleAcceptReview(item.visit.visit_id)}
                        />
                        <Button
                          label="Discard"
                          icon="close"
                          variant="danger"
                          loading={reviewBusyId === item.visit.visit_id}
                          onPress={() => handleDiscardReview(item.visit.visit_id)}
                        />
                      </View>
                    </View>
                  ))}
                </>
              ) : null}

              <Text style={[styles.moreTitle, { marginTop: spacing.lg }]}>
                Log visit with dates
              </Text>
              <Text style={styles.label}>Destination</Text>
              <TextInput
                style={styles.input}
                value={selectedPlace?.display_name ?? destination}
                onChangeText={(value) => {
                  setSelectedPlace(null);
                  setDestination(value);
                }}
                placeholder="Search your places or type a name"
                placeholderTextColor={colors.muted}
              />
              {suggestions.map((place) => (
                <Pressable
                  key={place.place_id}
                  style={styles.suggestion}
                  onPress={() => {
                    setSelectedPlace(place);
                    setDestination(place.display_name);
                  }}
                >
                  <Text style={styles.suggestionName}>{place.display_name}</Text>
                  <Text style={styles.suggestionMeta}>{locationLine(place)}</Text>
                </Pressable>
              ))}

              <Text style={styles.label}>From (optional)</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowFromPicker(true)}>
                <Ionicons name="calendar-outline" size={16} color={colors.muted} />
                <Text style={[styles.dateText, !visitedFrom && styles.datePlaceholder]}>
                  {visitedFrom || "No date"}
                </Text>
              </Pressable>
              {showFromPicker ? (
                <DateTimePicker
                  value={visitedFrom ? new Date(visitedFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, date) => {
                    setShowFromPicker(Platform.OS === "ios");
                    if (date) setVisitedFrom(toDateInput(date));
                  }}
                />
              ) : null}

              <Text style={styles.label}>To (optional)</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowToPicker(true)}>
                <Ionicons name="calendar-outline" size={16} color={colors.muted} />
                <Text style={[styles.dateText, !visitedTo && styles.datePlaceholder]}>
                  {visitedTo || "No date"}
                </Text>
              </Pressable>
              {showToPicker ? (
                <DateTimePicker
                  value={visitedTo ? new Date(visitedTo) : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, date) => {
                    setShowToPicker(Platform.OS === "ios");
                    if (date) setVisitedTo(toDateInput(date));
                  }}
                />
              ) : null}

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notes]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes"
                placeholderTextColor={colors.muted}
              />
              <Button
                label="Mark as visited"
                icon="checkmark-circle-outline"
                loading={saving}
                onPress={() => void handleSaveDetailed()}
              />

              <View style={styles.cleanupRow}>
                <Button
                  label="Clear Timeline visits"
                  icon="trash-outline"
                  variant="danger"
                  onPress={() => handleCleanupVisits("timeline")}
                />
                <Button
                  label="Clear all visit history"
                  icon="trash-outline"
                  variant="danger"
                  onPress={() => handleCleanupVisits("all")}
                />
              </View>
            </View>
          ) : null}
        </View>
      }
    />
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
  list: { padding: spacing.md, flexGrow: 1, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    ...shadow(1),
  },
  statValue: {
    fontSize: 28,
    fontWeight: "400",
    color: colors.ink,
    lineHeight: 30,
  },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  toolbar: { gap: 9 },
  toolbarForm: { flexDirection: "row", alignItems: "center", gap: 9 },
  toolbarBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: "center",
  },
  toolbarBtnDisabled: { opacity: 0.6 },
  toolbarBtnText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: 78,
    paddingVertical: 10,
  },
  timelineDate: {
    width: 62,
    color: colors.muted,
    fontSize: 9,
    paddingTop: 6,
  },
  timelineRail: {
    width: 12,
    alignItems: "center",
    position: "relative",
    minHeight: 60,
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.bg,
    marginTop: 6,
  },
  timelineLine: {
    position: "absolute",
    top: 16,
    width: 1,
    bottom: -10,
    backgroundColor: colors.border,
  },
  timelineBody: { flex: 1, paddingTop: 2 },
  timelineTitle: {
    fontSize: 22,
    fontWeight: "400",
    color: colors.ink,
    lineHeight: 24,
  },
  timelineMeta: { color: colors.muted, fontSize: 9, marginTop: 5, lineHeight: 14 },
  footer: { marginTop: spacing.lg },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
  },
  moreToggleText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  morePanel: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow(1),
  },
  moreTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, marginBottom: 4 },
  moreSubtitle: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm, lineHeight: 18 },
  label: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  notes: { minHeight: 80, textAlignVertical: "top" },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },
  dateText: { color: colors.ink, fontWeight: "500" },
  datePlaceholder: { color: colors.muted, fontWeight: "400" },
  suggestion: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionName: { color: colors.ink, fontWeight: "600" },
  suggestionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  reviewCard: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  reviewName: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  reviewMeta: { color: colors.muted, fontSize: 12 },
  reviewActions: { marginTop: spacing.sm, gap: spacing.sm },
  cleanupRow: { marginTop: spacing.lg, gap: spacing.sm },
});

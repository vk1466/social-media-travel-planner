import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  fetchPlaceCandidates,
  type PlaceCandidate,
  type PlaceCandidateStatusFilter,
} from "@/src/api";
import { FilterChips, PageHeading } from "@/src/components/LibraryChrome";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

export default function AdminScreen() {
  const [status, setStatus] = useState<PlaceCandidateStatusFilter>("unresolved");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPlaceCandidates({ status })
      .then((result) => {
        if (!cancelled) {
          setCandidates(result.candidates);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load candidates");
          setCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PageHeading
        kicker="Internal"
        title="Admin"
        lede="Unresolved place candidates from locate. Retry from the CLI without re-fetching the reel."
        count={{ value: candidates.length, label: "open" }}
      />
      <FilterChips
        selected={status}
        onSelect={(value) => setStatus(value as PlaceCandidateStatusFilter)}
        options={[
          { value: "unresolved", label: "Unresolved" },
          { value: "low_confidence", label: "Low confidence" },
          { value: "open", label: "Open" },
        ]}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && candidates.length === 0 ? (
        <EmptyState title="No candidates" body="Locate is clean for this filter." />
      ) : null}
      {candidates.map((candidate) => (
        <View key={candidate.candidate_id} style={styles.card}>
          <Text style={styles.title}>{candidate.place_name}</Text>
          <Text style={styles.meta}>{candidate.status}</Text>
          <Text style={styles.meta}>
            {[candidate.hints.city, candidate.hints.state_province, candidate.hints.country]
              .filter(Boolean)
              .join(" · ") || "No region"}
          </Text>
          <Text style={styles.meta}>Post {candidate.source_post_id}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  title: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
});

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Place } from "../api";
import { colors, spacing } from "../theme";
import { TagChip } from "./ui";

interface PlaceCardProps {
  place: Place;
  visited?: boolean;
  onPress: () => void;
}

export function PlaceCard({ place, visited = false, onPress }: PlaceCardProps) {
  const locationLine = [place.location.city, place.location.country].filter(Boolean).join(", ");

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {place.display_name}
        </Text>
        {visited ? <Text style={styles.visited}>Visited</Text> : null}
      </View>
      {locationLine ? <Text style={styles.location}>{locationLine}</Text> : null}
      {place.tags.length > 0 ? (
        <View style={styles.tags}>
          {place.tags.slice(0, 4).map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
  visited: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "600",
  },
  location: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
});

import { useMemo } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";

import type { Place } from "../api";
import { mappablePlaces } from "../placeMapUtils";
import { colors, spacing } from "../theme";
import { OsmPlaceMap } from "./OsmPlaceMap";

interface PlaceMapProps {
  places: Place[];
  visitedPlaceIds?: ReadonlySet<string>;
  onSelectPlace?: (place: Place) => void;
  height?: DimensionValue;
}

export function PlaceMap({
  places,
  visitedPlaceIds,
  onSelectPlace,
  height = 280,
}: PlaceMapProps) {
  const mapped = useMemo(() => mappablePlaces(places), [places]);
  const visited = visitedPlaceIds ?? new Set<string>();

  const fill = height === "100%";

  if (mapped.length === 0) {
    return (
      <View style={[styles.empty, fill ? styles.fill : { height }]}>
        <Text style={styles.emptyText}>No mapped places yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, fill ? styles.fill : { height }]}>
      <OsmPlaceMap places={mapped} visitedPlaceIds={visited} onSelectPlace={onSelectPlace} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  fill: {
    flex: 1,
    alignSelf: "stretch",
    minHeight: 0,
    marginBottom: 0,
  },
  empty: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.muted,
  },
});

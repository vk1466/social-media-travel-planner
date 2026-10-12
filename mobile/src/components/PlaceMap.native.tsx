import { useMemo } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";

import type { Place } from "../api";
import { mappablePlaces } from "../placeMapUtils";
import { colors, radius, spacing } from "../theme";
import { OsmPlaceMap } from "./OsmPlaceMap";

interface PlaceMapProps {
  places: Place[];
  visitedPlaceIds?: ReadonlySet<string>;
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: Place | null) => void;
  height?: DimensionValue;
}

export function PlaceMap({
  places,
  visitedPlaceIds,
  selectedPlaceId,
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
      <OsmPlaceMap
        places={mapped}
        visitedPlaceIds={visited}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={onSelectPlace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 0,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    alignSelf: "stretch",
    minHeight: 0,
    marginBottom: 0,
  },
  empty: {
    backgroundColor: "#E6EFF2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.muted,
  },
});

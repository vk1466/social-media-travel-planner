import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { fetchCategories, fetchVisitedPlaceIds, type Place } from "@/src/api";
import { PlaceCard } from "@/src/components/PlaceCard";
import { PlaceMap } from "@/src/components/PlaceMap";
import { EmptyState, ErrorBanner, TagChip } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { colors, spacing } from "@/src/theme";

type Pane = "browse" | "map";

export default function PlacesScreen() {
  const router = useRouter();
  const { places, loading, error, refresh, refreshToken } = useLibrary();
  const [pane, setPane] = useState<Pane>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [continentScope, setContinentScope] = useState<string | null>(null);
  const [countryScope, setCountryScope] = useState<string | null>(null);

  useEffect(() => {
    void fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [refreshToken]);

  useEffect(() => {
    void fetchVisitedPlaceIds()
      .then((ids) => setVisitedPlaceIds(new Set(ids)))
      .catch(() => setVisitedPlaceIds(new Set()));
  }, [refreshToken]);

  const filtered = useMemo(() => {
    let next = places;
    if (continentScope) {
      next = next.filter((place) => place.location.continent === continentScope);
    }
    if (countryScope) {
      next = next.filter((place) => place.location.country === countryScope);
    }
    if (categoryFilter === "uncategorized") {
      next = next.filter((place) => place.category == null);
    } else if (categoryFilter) {
      next = next.filter((place) => place.category === categoryFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      next = next.filter(
        (place) =>
          place.display_name.toLowerCase().includes(q) ||
          place.aliases.some((alias) => alias.toLowerCase().includes(q)) ||
          place.location.city?.toLowerCase().includes(q) ||
          place.location.country?.toLowerCase().includes(q),
      );
    }
    return next;
  }, [places, continentScope, countryScope, categoryFilter, searchQuery]);

  const continents = useMemo(() => {
    return Array.from(
      new Set(places.map((place) => place.location.continent).filter(Boolean) as string[]),
    ).sort();
  }, [places]);

  const countries = useMemo(() => {
    const scoped = continentScope
      ? places.filter((place) => place.location.continent === continentScope)
      : places;
    return Array.from(
      new Set(scoped.map((place) => place.location.country).filter(Boolean) as string[]),
    ).sort();
  }, [places, continentScope]);

  const openPlace = (place: Place) => {
    router.push(`/places/${place.place_id}`);
  };

  if (loading && places.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? (
        <View style={styles.pad}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <View style={styles.paneToggle}>
          <Pressable
            onPress={() => setPane("browse")}
            style={[styles.paneBtn, pane === "browse" && styles.paneBtnActive]}
          >
            <Text style={[styles.paneText, pane === "browse" && styles.paneTextActive]}>Browse</Text>
          </Pressable>
          <Pressable
            onPress={() => setPane("map")}
            style={[styles.paneBtn, pane === "map" && styles.paneBtnActive]}
          >
            <Text style={[styles.paneText, pane === "map" && styles.paneTextActive]}>Map</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search places"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {(continentScope || countryScope) && (
        <View style={styles.breadcrumb}>
          <Pressable
            onPress={() => {
              setContinentScope(null);
              setCountryScope(null);
            }}
          >
            <Text style={styles.crumbLink}>All</Text>
          </Pressable>
          {continentScope ? (
            <>
              <Text style={styles.crumbSep}>/</Text>
              <Pressable onPress={() => setCountryScope(null)}>
                <Text style={styles.crumbLink}>{continentScope}</Text>
              </Pressable>
            </>
          ) : null}
          {countryScope ? (
            <>
              <Text style={styles.crumbSep}>/</Text>
              <Text style={styles.crumbCurrent}>{countryScope}</Text>
            </>
          ) : null}
        </View>
      )}

      {pane === "map" ? (
        <View style={styles.pad}>
          <PlaceMap
            places={filtered}
            visitedPlaceIds={visitedPlaceIds}
            onSelectPlace={openPlace}
            height={420}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void refresh().finally(() => setRefreshing(false));
              }}
            />
          }
          ListHeaderComponent={
            <View>
              {!countryScope && continents.length > 0 ? (
                <View style={styles.scopeSection}>
                  <Text style={styles.scopeTitle}>Continents</Text>
                  <View style={styles.scopeWrap}>
                    {continents.map((name) => (
                      <Pressable
                        key={name}
                        onPress={() => {
                          setContinentScope(name);
                          setCountryScope(null);
                        }}
                        style={[
                          styles.scopeChip,
                          continentScope === name && styles.scopeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.scopeChipText,
                            continentScope === name && styles.scopeChipTextActive,
                          ]}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {!countryScope && countries.length > 0 ? (
                <View style={styles.scopeSection}>
                  <Text style={styles.scopeTitle}>Countries</Text>
                  <View style={styles.scopeWrap}>
                    {countries.map((name) => (
                      <Pressable
                        key={name}
                        onPress={() => setCountryScope(name)}
                        style={styles.scopeChip}
                      >
                        <Text style={styles.scopeChipText}>{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {categories.length > 0 ? (
                <View style={styles.scopeSection}>
                  <Text style={styles.scopeTitle}>Categories</Text>
                  <View style={styles.scopeWrap}>
                    <Pressable onPress={() => setCategoryFilter(null)}>
                      <TagChip label={categoryFilter ? "Clear" : "All"} />
                    </Pressable>
                    {categories.slice(0, 12).map((category) => (
                      <Pressable key={category} onPress={() => setCategoryFilter(category)}>
                        <TagChip label={category} />
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setCategoryFilter("uncategorized")}>
                      <TagChip label="Uncategorized" />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No places yet"
              body="Ingest a reel with locations to build your place library."
            />
          }
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              visited={visitedPlaceIds.has(item.place_id)}
              onPress={() => openPlace(item)}
            />
          )}
        />
      )}
    </View>
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
  pad: { padding: spacing.md },
  list: { padding: spacing.md, flexGrow: 1 },
  toolbar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  paneToggle: {
    flexDirection: "row",
    backgroundColor: colors.brandSoft,
    borderRadius: 10,
    padding: 4,
  },
  paneBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  paneBtnActive: { backgroundColor: colors.surface },
  paneText: { color: colors.muted, fontWeight: "600" },
  paneTextActive: { color: colors.brand },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 6,
  },
  crumbLink: { color: colors.brand, fontWeight: "600" },
  crumbSep: { color: colors.muted },
  crumbCurrent: { color: colors.ink, fontWeight: "600" },
  scopeSection: { marginBottom: spacing.md },
  scopeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  scopeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scopeChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scopeChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  scopeChipText: { color: colors.ink, fontSize: 13, fontWeight: "500" },
  scopeChipTextActive: { color: "#fff" },
});

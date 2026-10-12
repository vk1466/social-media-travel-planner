import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchVisitedPlaceIds,
  markPlaceVisited,
  unmarkPlaceVisited,
  type Place,
} from "@/src/api";
import { CoverCard } from "@/src/components/CoverCard";
import { PlaceMap } from "@/src/components/PlaceMap";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { placeMatchesPlatform, useLibraryPlatform } from "@/src/libraryPlatform";
import { appHref } from "@/src/nav";
import {
  atlasTrail,
  buildAtlas,
  leafPlaces,
  levelLabel,
  resolveScopeKey,
  searchAtlas,
  toAtlasPlaces,
  type AtlasGrouping,
  type AtlasNode,
} from "@/src/placeAtlasModel";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, fonts, radius, shadow } from "@/src/theme";

type Pane = "map" | "browse";
type StatusFilter = "all" | "visited" | "inspiration";

function atlasNodeImage(node: AtlasNode): string | null {
  return leafPlaces(node).find((place) => place.imageUrl)?.imageUrl ?? null;
}

function placeLocationLine(place: Place): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ");
}

export default function TravelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places, loading, error, refresh, refreshToken } = useLibrary();
  const { platforms } = useLibraryPlatform();
  const [pane, setPane] = useState<Pane>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [updatingVisit, setUpdatingVisit] = useState(false);

  useEffect(() => {
    void fetchVisitedPlaceIds()
      .then((ids) => setVisitedPlaceIds(new Set(ids)))
      .catch(() => setVisitedPlaceIds(new Set()));
  }, [refreshToken]);

  const placesById = useMemo(
    () => new Map(places.map((place) => [place.place_id, place])),
    [places],
  );

  const atlasPlaces = useMemo(
    () => toAtlasPlaces(places, visitedPlaceIds, { posts }),
    [places, visitedPlaceIds, posts],
  );

  const placeImageMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ap of atlasPlaces) {
      if (ap.imageUrl) {
        map.set(ap.placeId, ap.imageUrl);
      }
    }
    return map;
  }, [atlasPlaces]);

  const platformPlaces = useMemo(
    () =>
      atlasPlaces.filter((place) =>
        placeMatchesPlatform(place.sourcePostIds, posts, platforms),
      ),
    [atlasPlaces, posts, platforms],
  );

  const statusPlaces = useMemo(() => {
    if (statusFilter === "visited") {
      return platformPlaces.filter((place) => place.visited);
    }
    if (statusFilter === "inspiration") {
      return platformPlaces.filter((place) => !place.visited);
    }
    return platformPlaces;
  }, [platformPlaces, statusFilter]);

  const searching = searchQuery.trim().length > 0;

  const atlas = useMemo(() => buildAtlas(statusPlaces, "region"), [statusPlaces]);

  const searchHits = useMemo(() => {
    if (!searching) {
      return [];
    }
    return searchAtlas(atlas, searchQuery, 40).filter((node) => node.place);
  }, [atlas, searchQuery, searching]);

  const searchedPlaces = useMemo(() => {
    if (!searching) {
      return statusPlaces;
    }
    const hitIds = new Set(searchHits.map((h) => h.place!.placeId));
    return statusPlaces.filter((p) => hitIds.has(p.placeId));
  }, [statusPlaces, searchHits, searching]);

  // Real Place objects for the map and carousel
  const activePlaces = useMemo(() => {
    return searchedPlaces
      .map((ap) => placesById.get(ap.placeId))
      .filter((p): p is Place => Boolean(p && p.location.latitude && p.location.longitude));
  }, [searchedPlaces, placesById]);

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return placesById.get(selectedPlaceId) ?? null;
  }, [selectedPlaceId, placesById]);

  const selectedAtlasPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return atlasPlaces.find((p) => p.placeId === selectedPlaceId) ?? null;
  }, [selectedPlaceId, atlasPlaces]);

  const openPlace = useCallback(
    (placeId: string) => {
      router.push(`/places/${placeId}`);
    },
    [router],
  );

  const handleToggleVisited = useCallback(async () => {
    if (!selectedPlace || updatingVisit) return;
    setUpdatingVisit(true);
    const pid = selectedPlace.place_id;
    const isVisited = visitedPlaceIds.has(pid);
    try {
      if (isVisited) {
        await unmarkPlaceVisited(pid);
        setVisitedPlaceIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
      } else {
        await markPlaceVisited(pid);
        setVisitedPlaceIds((prev) => new Set(prev).add(pid));
      }
    } catch {
      // optimistic rollback if failed
    } finally {
      setUpdatingVisit(false);
    }
  }, [selectedPlace, updatingVisit, visitedPlaceIds]);

  if (loading && places.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const isVisitedSelected = selectedPlace ? visitedPlaceIds.has(selectedPlace.place_id) : false;
  const selectedPostCount = selectedAtlasPlace ? selectedAtlasPlace.sourcePostIds.length : (selectedPlace?.tips.length ?? 1);

  return (
    <View style={styles.screen}>
      {/* Full-bleed map */}
      <View style={StyleSheet.absoluteFill}>
        <PlaceMap
          places={activePlaces}
          visitedPlaceIds={visitedPlaceIds}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={(place) => setSelectedPlaceId(place ? place.place_id : null)}
          height="100%"
        />
      </View>

      {/* M1 & M2: Floating search row and round buttons below top inset */}
      <View
        style={[
          styles.floatingHeader,
          { top: Math.max(insets.top, 16) + 8 },
        ]}
      >
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Ionicons name="search" size={18} color="#6B6F73" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${places.length > 0 ? places.length + " " : ""}places`}
              placeholderTextColor="#6B6F73"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#6B6F73" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter by source"
            onPress={() => router.push(appHref("/(app)/coming-soon"))}
            style={styles.roundIconButton}
          >
            <Ionicons name="layers-outline" size={20} color="#1B1D1F" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filters"
            onPress={() => router.push(appHref("/(app)/coming-soon"))}
            style={styles.roundIconButton}
          >
            <Ionicons name="options-outline" size={20} color="#1B1D1F" />
          </Pressable>
        </View>

        {/* M3: Status chips: All, Want to go, Been */}
        <View style={styles.statusChipsRow}>
          <Pressable
            onPress={() => setStatusFilter("all")}
            style={[
              styles.statusChip,
              statusFilter === "all" ? styles.statusChipActive : styles.statusChipInactive,
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                statusFilter === "all" ? styles.statusChipTextActive : styles.statusChipTextInactive,
              ]}
            >
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("inspiration")}
            style={[
              styles.statusChip,
              statusFilter === "inspiration" ? styles.statusChipActive : styles.statusChipInactive,
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                statusFilter === "inspiration" ? styles.statusChipTextActive : styles.statusChipTextInactive,
              ]}
            >
              Want to go
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("visited")}
            style={[
              styles.statusChip,
              statusFilter === "visited" ? styles.statusChipActive : styles.statusChipInactive,
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                statusFilter === "visited" ? styles.statusChipTextActive : styles.statusChipTextInactive,
              ]}
            >
              Been
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Browse (List) view if toggled on */}
      {pane === "browse" ? (
        <View
          style={[
            styles.browseOverlay,
            {
              paddingTop: Math.max(insets.top, 16) + 110,
              paddingBottom: 84 + insets.bottom + 20,
            },
          ]}
        >
          <FlatList
            data={activePlaces}
            keyExtractor={(item) => item.place_id}
            contentContainerStyle={styles.browseList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void refresh().finally(() => setRefreshing(false));
                }}
              />
            }
            ListEmptyComponent={
              <EmptyState title="No places" body="No places match these filters." />
            }
            renderItem={({ item: place }) => {
              const thumb = placeImageMap.get(place.place_id);
              return (
                <Pressable
                  onPress={() => {
                    setSelectedPlaceId(place.place_id);
                    setPane("map");
                  }}
                  style={styles.browseRow}
                >
                <View style={styles.browseThumb}>
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={styles.browseImage}
                    />
                  ) : (
                    <View style={styles.browseImageFallback} />
                  )}
                </View>
                <View style={styles.browseInfo}>
                  <Text style={styles.browseName} numberOfLines={1}>
                    {place.display_name}
                  </Text>
                  <Text style={styles.browseMeta} numberOfLines={1}>
                    {placeLocationLine(place)}
                  </Text>
                </View>
                {visitedPlaceIds.has(place.place_id) ? (
                  <View style={styles.visitedPill}>
                    <Text style={styles.visitedPillText}>Been</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
          />
        </View>
      ) : null}

      {/* M6: "Show as list" toggle above the carousel / sheet */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pane === "map" ? "Show as list" : "Show map"}
        onPress={() => setPane((p) => (p === "map" ? "browse" : "map"))}
        style={[
          styles.listTogglePill,
          {
            bottom:
              selectedPlace != null
                ? 84 + insets.bottom + 180
                : 84 + insets.bottom + 88,
          },
        ]}
      >
        <Ionicons
          name={pane === "map" ? "list" : "map"}
          size={16}
          color="#FFFFFF"
        />
        <Text style={styles.listToggleText}>
          {pane === "map" ? "Show as list" : "Show map"}
        </Text>
      </Pressable>

      {/* M4: Selected Place Bottom Sheet or Place Carousel */}
      {selectedPlace != null ? (
        <View
          style={[
            styles.selectedSheet,
            { bottom: 84 + insets.bottom },
          ]}
        >
          {/* Drag Handle */}
          <Pressable
            onPress={() => setSelectedPlaceId(null)}
            style={styles.sheetHandleWrap}
            hitSlop={10}
          >
            <View style={styles.sheetHandle} />
          </Pressable>

          {/* Place info */}
          <View style={styles.sheetInfoRow}>
            <View style={styles.sheetPhotoWrap}>
              {selectedPlace && placeImageMap.get(selectedPlace.place_id) ? (
                <Image
                  source={{ uri: placeImageMap.get(selectedPlace.place_id)! }}
                  style={styles.sheetPhoto}
                />
              ) : (
                <View style={styles.sheetPhotoFallback} />
              )}
            </View>
            <View style={styles.sheetTextWrap}>
              <Text style={styles.sheetPlaceName} numberOfLines={1}>
                {selectedPlace.display_name}
              </Text>
              <Text style={styles.sheetPlaceRegion} numberOfLines={1}>
                {placeLocationLine(selectedPlace)}
                {selectedPostCount ? ` · ${selectedPostCount} posts` : ""}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.sheetButtonsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={handleToggleVisited}
              disabled={updatingVisit}
              style={[
                styles.markVisitedBtn,
                isVisitedSelected && styles.markVisitedBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.markVisitedText,
                  isVisitedSelected && styles.markVisitedTextActive,
                ]}
              >
                {isVisitedSelected ? "Been ✓" : "Mark visited"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(appHref("/(app)/coming-soon"))}
              style={styles.addToTripBtn}
            >
              <Text style={styles.addToTripText}>Add to trip</Text>
              <View style={styles.tripSoonPill}>
                <Text style={styles.tripSoonText}>Soon</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Place details"
              onPress={() => openPlace(selectedPlace.place_id)}
              style={styles.detailsBtn}
            >
              <Ionicons name="navigate-outline" size={20} color="#1B1D1F" />
            </Pressable>
          </View>
        </View>
      ) : activePlaces.length > 0 && pane === "map" ? (
        /* M4: Place Carousel at bottom */
        <View
          style={[
            styles.carouselContainer,
            { bottom: 84 + insets.bottom + 8 },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          >
            {activePlaces.map((place) => {
              const photo = placeImageMap.get(place.place_id);
              const isSelected = selectedPlaceId === place.place_id;
              const postCount = place.tips?.length || 1;
              return (
                <Pressable
                  key={place.place_id}
                  onPress={() => setSelectedPlaceId(place.place_id)}
                  style={[
                    styles.placeCarouselCard,
                    isSelected && styles.placeCarouselCardActive,
                  ]}
                >
                  <View style={styles.carouselPhotoWrap}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.carouselPhoto} />
                    ) : (
                      <View style={styles.carouselPhotoFallback} />
                    )}
                  </View>
                  <View style={styles.carouselInfo}>
                    <Text style={styles.carouselName} numberOfLines={1}>
                      {place.display_name}
                    </Text>
                    <Text style={styles.carouselRegion} numberOfLines={1}>
                      {placeLocationLine(place)} · {postCount} {postCount === 1 ? "post" : "posts"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F5F1",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F5F1",
  },
  floatingHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    gap: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow(2),
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: "#1B1D1F",
    fontFamily: fonts.body,
    padding: 0,
  },
  roundIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2),
  },
  statusChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(1),
  },
  statusChipActive: {
    backgroundColor: "#1B1D1F",
  },
  statusChipInactive: {
    backgroundColor: "#FFFFFF",
  },
  statusChipText: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  statusChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statusChipTextInactive: {
    color: "#1B1D1F",
    fontWeight: "600",
  },
  listTogglePill: {
    position: "absolute",
    right: 16,
    zIndex: 25,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#1B1D1F",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...shadow(2),
  },
  listToggleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: fonts.bold,
  },
  carouselContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 15,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  placeCarouselCard: {
    width: 260,
    height: 74,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow(2),
  },
  placeCarouselCardActive: {
    borderWidth: 2,
    borderColor: "#1B1D1F",
  },
  carouselPhotoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#8CC3D6",
  },
  carouselPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  carouselPhotoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2D6A82",
  },
  carouselInfo: {
    flex: 1,
    minWidth: 0,
  },
  carouselName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B1D1F",
    letterSpacing: -0.3,
    fontFamily: fonts.heavy,
  },
  carouselRegion: {
    fontSize: 12,
    color: "#6B6F73",
    marginTop: 2,
    fontFamily: fonts.body,
  },
  selectedSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    ...shadow(3),
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9D5CB",
  },
  sheetInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sheetPhotoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#8CC3D6",
  },
  sheetPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  sheetPhotoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2D6A82",
  },
  sheetTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetPlaceName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#1B1D1F",
    fontFamily: fonts.heavy,
  },
  sheetPlaceRegion: {
    fontSize: 13,
    color: "#6B6F73",
    marginTop: 2,
    fontFamily: fonts.body,
  },
  sheetButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    alignItems: "center",
  },
  markVisitedBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: "#1B1D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  markVisitedBtnActive: {
    backgroundColor: "#25623A",
  },
  markVisitedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: fonts.bold,
  },
  markVisitedTextActive: {
    color: "#FFFFFF",
  },
  addToTripBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D9D5CB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addToTripText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1D1F",
    fontFamily: fonts.bold,
  },
  tripSoonPill: {
    backgroundColor: "#F0EFEA",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tripSoonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B6F73",
    textTransform: "uppercase",
  },
  detailsBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#D9D5CB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  browseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#F6F5F1",
    zIndex: 10,
  },
  browseList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  browseRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E3DC",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  browseThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#8CC3D6",
  },
  browseImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  browseImageFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2D6A82",
  },
  browseInfo: {
    flex: 1,
    minWidth: 0,
  },
  browseName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B1D1F",
    fontFamily: fonts.heavy,
  },
  browseMeta: {
    fontSize: 12,
    color: "#6B6F73",
    marginTop: 2,
    fontFamily: fonts.body,
  },
  visitedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E2F0D9",
  },
  visitedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#25623A",
  },
});

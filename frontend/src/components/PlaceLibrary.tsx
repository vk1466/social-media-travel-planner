import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchPlaces, fetchTags, fetchVisitedPlaceIds, type CanonicalPlace } from "../api";
import { PlaceCard } from "./PlaceCard";
import { PlaceDetail } from "./PlaceDetail";

const PlaceMap = lazy(() => import("./PlaceMap").then((module) => ({ default: module.PlaceMap })));

type MobilePane = "browse" | "map";

interface DestinationTile {
  name: string;
  placeCount: number;
}

function distinctSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function countBy(
  places: CanonicalPlace[],
  keyFn: (place: CanonicalPlace) => string | null | undefined,
): DestinationTile[] {
  const counts = new Map<string, number>();
  for (const place of places) {
    const key = keyFn(place) || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, placeCount]) => ({ name, placeCount }));
}

interface PlaceLibraryProps {
  refreshToken?: number;
  onNavigateToPost?: (platform: string, postId: string) => void;
}

export function PlaceLibrary({ refreshToken = 0, onNavigateToPost }: PlaceLibraryProps) {
  const { placeId: routePlaceId } = useParams();
  const navigate = useNavigate();

  const [allPlaces, setAllPlaces] = useState<CanonicalPlace[]>([]);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [continentScope, setContinentScope] = useState<string | null>(null);
  const [countryScope, setCountryScope] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobilePane, setMobilePane] = useState<MobilePane>("browse");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlace | null>(null);

  const hasSearch = searchQuery.trim().length > 0;
  const hasTagFilter = tagFilter !== "all";
  const isGallery = Boolean(countryScope) || hasSearch || hasTagFilter;

  useEffect(() => {
    void fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPlaces()
      .then((result) => {
        if (!cancelled) {
          setAllPlaces(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load places");
          setAllPlaces([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    void fetchVisitedPlaceIds()
      .then((ids) => setVisitedPlaceIds(new Set(ids)))
      .catch(() => setVisitedPlaceIds(new Set()));
  }, [refreshToken]);

  const rootCatalog = useMemo(
    () => allPlaces.filter((place) => !place.parent_place_id),
    [allPlaces],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CanonicalPlace[]>();
    for (const place of allPlaces) {
      if (!place.parent_place_id) {
        continue;
      }
      const siblings = map.get(place.parent_place_id) ?? [];
      siblings.push(place);
      map.set(place.parent_place_id, siblings);
    }
    for (const siblings of map.values()) {
      siblings.sort((a, b) => a.display_name.localeCompare(b.display_name));
    }
    return map;
  }, [allPlaces]);

  const continentTiles = useMemo(() => countBy(rootCatalog, (place) => place.location.continent), [rootCatalog]);

  const countryTiles = useMemo(() => {
    const scoped = continentScope
      ? rootCatalog.filter((place) => place.location.continent === continentScope)
      : rootCatalog;
    return countBy(scoped, (place) => place.location.country);
  }, [rootCatalog, continentScope]);

  useEffect(() => {
    if (isGallery || continentScope || continentTiles.length !== 1) {
      return;
    }
    setContinentScope(continentTiles[0].name);
  }, [continentTiles, continentScope, isGallery]);

  useEffect(() => {
    setStateFilter("all");
    setCityFilter("all");
  }, [countryScope, continentScope]);

  const scopedRoots = useMemo(() => {
    return rootCatalog.filter((place) => {
      if (continentScope && place.location.continent !== continentScope) {
        return false;
      }
      if (countryScope && place.location.country !== countryScope) {
        return false;
      }
      if (tagFilter !== "all" && !place.tags.includes(tagFilter)) {
        return false;
      }
      return true;
    });
  }, [rootCatalog, continentScope, countryScope, tagFilter]);

  const searchedPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return scopedRoots;
    }
    return scopedRoots.filter((place) => place.display_name.toLowerCase().includes(query));
  }, [scopedRoots, searchQuery]);

  const stateOptions = useMemo(
    () => distinctSorted(searchedPlaces.map((place) => place.location.state_province)),
    [searchedPlaces],
  );

  const cityOptions = useMemo(
    () =>
      distinctSorted(
        searchedPlaces
          .filter((place) => stateFilter === "all" || place.location.state_province === stateFilter)
          .map((place) => place.location.city),
      ),
    [searchedPlaces, stateFilter],
  );

  const places = useMemo(() => {
    return searchedPlaces.filter((place) => {
      if (stateFilter !== "all" && place.location.state_province !== stateFilter) {
        return false;
      }
      if (cityFilter !== "all" && place.location.city !== cityFilter) {
        return false;
      }
      return true;
    });
  }, [searchedPlaces, stateFilter, cityFilter]);

  useEffect(() => {
    if (stateFilter !== "all" && !stateOptions.includes(stateFilter)) {
      setStateFilter("all");
    }
  }, [stateOptions, stateFilter]);

  useEffect(() => {
    if (cityFilter !== "all" && !cityOptions.includes(cityFilter)) {
      setCityFilter("all");
    }
  }, [cityOptions, cityFilter]);

  useEffect(() => {
    if (!routePlaceId) {
      setSelectedPlace(null);
      return;
    }
    const fromRoots = rootCatalog.find((place) => place.place_id === routePlaceId);
    if (fromRoots) {
      setSelectedPlace(fromRoots);
      return;
    }
    const fromAll = allPlaces.find((place) => place.place_id === routePlaceId);
    if (fromAll) {
      setSelectedPlace(fromAll);
    }
  }, [routePlaceId, rootCatalog, allPlaces]);

  const openPlace = (place: CanonicalPlace) => {
    setSelectedPlace(place);
    navigate(`/places/${place.place_id}`);
  };

  const closePlace = () => {
    setSelectedPlace(null);
    navigate("/places");
  };

  const goToAll = () => {
    setContinentScope(null);
    setCountryScope(null);
    setStateFilter("all");
    setCityFilter("all");
    setSearchQuery("");
  };

  const goToContinent = (continent: string) => {
    setContinentScope(continent);
    setCountryScope(null);
    setStateFilter("all");
    setCityFilter("all");
  };

  const goToCountry = (country: string, continent?: string) => {
    if (continent) {
      setContinentScope(continent);
    } else if (!continentScope) {
      const match = rootCatalog.find((place) => place.location.country === country);
      if (match?.location.continent) {
        setContinentScope(match.location.continent);
      }
    }
    setCountryScope(country);
    setStateFilter("all");
    setCityFilter("all");
  };

  const galleryHeading = hasSearch
    ? `Search results${countryScope ? ` in ${countryScope}` : ""}`
    : hasTagFilter && !countryScope
      ? `Places tagged “${tagFilter}”`
      : countryScope
        ? countryScope
        : "Places";

  const showEmptyCatalog = !loading && rootCatalog.length === 0 && !error;
  const showEmptyGallery = isGallery && !loading && places.length === 0;

  return (
    <section className="library-section place-library">
      <div className="library-toolbar place-toolbar-row">
        <div className="place-toolbar">
          <input
            type="search"
            className="place-search"
            placeholder="Search places…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search places by name"
          />

          <nav className="place-breadcrumb" aria-label="Place geography">
            <button type="button" className="place-breadcrumb-link" onClick={goToAll}>
              All
            </button>
            {continentScope && (
              <>
                <span className="place-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
                <button
                  type="button"
                  className={`place-breadcrumb-link ${!countryScope && !hasSearch ? "place-breadcrumb-current" : ""}`}
                  onClick={() => goToContinent(continentScope)}
                >
                  {continentScope}
                </button>
              </>
            )}
            {countryScope && (
              <>
                <span className="place-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
                <span className="place-breadcrumb-current">{countryScope}</span>
              </>
            )}
          </nav>

          <div className="place-filters">
            {isGallery && cityOptions.length > 0 && (
              <select
                className="platform-filter"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                aria-label="Filter by city"
              >
                <option value="all">all cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}
            <select
              className="platform-filter"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              aria-label="Filter by tag"
            >
              <option value="all">all tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div className="place-view-toggle place-mobile-toggle" role="group" aria-label="Place view mode">
            <button
              type="button"
              className={`place-view-button ${mobilePane === "browse" ? "place-view-button-active" : ""}`}
              aria-pressed={mobilePane === "browse"}
              onClick={() => setMobilePane("browse")}
            >
              Browse
            </button>
            <button
              type="button"
              className={`place-view-button ${mobilePane === "map" ? "place-view-button-active" : ""}`}
              aria-pressed={mobilePane === "map"}
              onClick={() => setMobilePane("map")}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {error && <p className="banner-error">{error}</p>}

      {showEmptyCatalog ? (
        <div className="empty-state">
          <p>
            No places yet — ingest a post with a location tag, caption stops, or video place
            extraction and it will show up here.
          </p>
        </div>
      ) : (
        <div className={`place-split place-split-${mobilePane}`}>
          <div className="place-browse-pane">
            {loading ? (
              <p className="loading-copy">Loading places…</p>
            ) : isGallery ? (
              <div className="place-gallery">
                <div className="place-gallery-header">
                  <h3 className="place-gallery-heading">{galleryHeading}</h3>
                  <p className="place-gallery-meta">
                    {places.length} place{places.length === 1 ? "" : "s"}
                  </p>
                </div>

                {stateOptions.length > 1 && (
                  <div className="place-state-chips" role="group" aria-label="Filter by state or province">
                    <button
                      type="button"
                      className={`place-state-chip ${stateFilter === "all" ? "place-state-chip-active" : ""}`}
                      onClick={() => setStateFilter("all")}
                    >
                      All regions
                    </button>
                    {stateOptions.map((stateProvince) => (
                      <button
                        key={stateProvince}
                        type="button"
                        className={`place-state-chip ${stateFilter === stateProvince ? "place-state-chip-active" : ""}`}
                        onClick={() => setStateFilter(stateProvince)}
                      >
                        {stateProvince}
                      </button>
                    ))}
                  </div>
                )}

                {showEmptyGallery ? (
                  <div className="empty-state">
                    <p>No places match the current search or filters.</p>
                  </div>
                ) : (
                  <div className="place-gallery-grid">
                    {places.map((place) => (
                      <PlaceCard
                        key={place.place_id}
                        place={place}
                        children={childrenByParent.get(place.place_id) ?? []}
                        onSelect={openPlace}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="place-hub">
                {!continentScope ? (
                  <>
                    <h3 className="place-hub-heading">Destinations</h3>
                    <p className="place-hub-copy">Browse by continent, then drill into a country.</p>
                    <div className="place-hub-grid">
                      {continentTiles.map((tile) => (
                        <button
                          key={tile.name}
                          type="button"
                          className="place-hub-tile"
                          onClick={() => goToContinent(tile.name)}
                        >
                          <span className="place-hub-tile-name">{tile.name}</span>
                          <span className="place-hub-tile-meta">
                            {tile.placeCount} place{tile.placeCount === 1 ? "" : "s"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="place-hub-heading">{continentScope}</h3>
                    <p className="place-hub-copy">Choose a country to explore places.</p>
                    <div className="place-hub-grid">
                      {countryTiles.map((tile) => (
                        <button
                          key={tile.name}
                          type="button"
                          className="place-hub-tile"
                          onClick={() => goToCountry(tile.name)}
                        >
                          <span className="place-hub-tile-name">{tile.name}</span>
                          <span className="place-hub-tile-meta">
                            {tile.placeCount} place{tile.placeCount === 1 ? "" : "s"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="place-map-pane">
            <Suspense fallback={<p className="loading-copy">Loading map…</p>}>
              <PlaceMap
                places={places}
                visitedPlaceIds={visitedPlaceIds}
                selectedPlaceId={selectedPlace?.place_id}
                onSelectPlace={openPlace}
                className="place-map-shell place-map-shell-split"
                height="100%"
              />
            </Suspense>
          </div>
        </div>
      )}

      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          onClose={closePlace}
          onNavigateToPlace={openPlace}
          onNavigateToPost={onNavigateToPost}
        />
      )}
    </section>
  );
}

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchPlaces, fetchTags, type CanonicalPlace } from "../api";
import { PlaceCard } from "./PlaceCard";
import { PlaceDetail } from "./PlaceDetail";

const PlaceMap = lazy(() => import("./PlaceMap").then((module) => ({ default: module.PlaceMap })));

type PlaceViewMode = "list" | "map";

interface StateGroup {
  stateProvince: string;
  places: CanonicalPlace[];
}

interface CountryGroup {
  country: string;
  states: StateGroup[];
}

interface ContinentGroup {
  continent: string;
  countries: CountryGroup[];
}

function groupByLocation(places: CanonicalPlace[]): ContinentGroup[] {
  const byContinent = new Map<string, Map<string, Map<string, CanonicalPlace[]>>>();

  for (const place of places) {
    const continent = place.location.continent || "Unknown";
    const country = place.location.country || "Unknown";
    const stateProvince = place.location.state_province || "Unknown";
    if (!byContinent.has(continent)) {
      byContinent.set(continent, new Map());
    }
    const byCountry = byContinent.get(continent)!;
    if (!byCountry.has(country)) {
      byCountry.set(country, new Map());
    }
    const byState = byCountry.get(country)!;
    if (!byState.has(stateProvince)) {
      byState.set(stateProvince, []);
    }
    byState.get(stateProvince)!.push(place);
  }

  return Array.from(byContinent.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([continent, byCountry]) => ({
      continent,
      countries: Array.from(byCountry.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([country, byState]) => ({
          country,
          states: Array.from(byState.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([stateProvince, statePlaces]) => ({ stateProvince, places: statePlaces })),
        })),
    }));
}

function distinctSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b),
  );
}

interface PlaceLibraryProps {
  refreshToken?: number;
  onNavigateToPost?: (platform: string, postId: string) => void;
}

export function PlaceLibrary({ refreshToken = 0, onNavigateToPost }: PlaceLibraryProps) {
  const { placeId: routePlaceId } = useParams();
  const navigate = useNavigate();

  const [rootPlaces, setRootPlaces] = useState<CanonicalPlace[]>([]);
  const [allPlaces, setAllPlaces] = useState<CanonicalPlace[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [continentFilter, setContinentFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<PlaceViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlace | null>(null);

  const places = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rootPlaces;
    }
    return rootPlaces.filter((place) => place.display_name.toLowerCase().includes(query));
  }, [rootPlaces, searchQuery]);

  useEffect(() => {
    void fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    void fetchPlaces()
      .then(setAllPlaces)
      .catch(() => setAllPlaces([]));
  }, [refreshToken]);

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

  const continentOptions = useMemo(
    () => distinctSorted(allPlaces.map((place) => place.location.continent)),
    [allPlaces],
  );

  const countryOptions = useMemo(
    () =>
      distinctSorted(
        allPlaces
          .filter((place) => continentFilter === "all" || place.location.continent === continentFilter)
          .map((place) => place.location.country),
      ),
    [allPlaces, continentFilter],
  );

  const stateOptions = useMemo(
    () =>
      distinctSorted(
        allPlaces
          .filter((place) => continentFilter === "all" || place.location.continent === continentFilter)
          .filter((place) => countryFilter === "all" || place.location.country === countryFilter)
          .map((place) => place.location.state_province),
      ),
    [allPlaces, continentFilter, countryFilter],
  );

  const cityOptions = useMemo(
    () =>
      distinctSorted(
        allPlaces
          .filter((place) => continentFilter === "all" || place.location.continent === continentFilter)
          .filter((place) => countryFilter === "all" || place.location.country === countryFilter)
          .filter((place) => stateFilter === "all" || place.location.state_province === stateFilter)
          .map((place) => place.location.city),
      ),
    [allPlaces, continentFilter, countryFilter, stateFilter],
  );

  useEffect(() => {
    if (countryFilter !== "all" && !countryOptions.includes(countryFilter)) {
      setCountryFilter("all");
    }
  }, [countryOptions, countryFilter]);

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
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPlaces({
      roots_only: true,
      continent: continentFilter === "all" ? undefined : continentFilter,
      country: countryFilter === "all" ? undefined : countryFilter,
      state_province: stateFilter === "all" ? undefined : stateFilter,
      city: cityFilter === "all" ? undefined : cityFilter,
      tag: tagFilter === "all" ? undefined : tagFilter,
    })
      .then((result) => {
        if (!cancelled) {
          setRootPlaces(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load places");
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
  }, [continentFilter, countryFilter, stateFilter, cityFilter, tagFilter, refreshToken]);

  useEffect(() => {
    if (!routePlaceId) {
      setSelectedPlace(null);
      return;
    }
    const fromRoots = rootPlaces.find((place) => place.place_id === routePlaceId);
    if (fromRoots) {
      setSelectedPlace(fromRoots);
      return;
    }
    const fromAll = allPlaces.find((place) => place.place_id === routePlaceId);
    if (fromAll) {
      setSelectedPlace(fromAll);
    }
  }, [routePlaceId, rootPlaces, allPlaces]);

  const openPlace = (place: CanonicalPlace) => {
    setSelectedPlace(place);
    navigate(`/places/${place.place_id}`);
  };

  const closePlace = () => {
    setSelectedPlace(null);
    navigate("/places");
  };

  const groups = useMemo(() => groupByLocation(places), [places]);

  return (
    <section className="library-section">
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
          <div className="place-view-toggle" role="group" aria-label="Place view mode">
            <button
              type="button"
              className={`place-view-button ${viewMode === "list" ? "place-view-button-active" : ""}`}
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
            <button
              type="button"
              className={`place-view-button ${viewMode === "map" ? "place-view-button-active" : ""}`}
              aria-pressed={viewMode === "map"}
              onClick={() => setViewMode("map")}
            >
              Map
            </button>
          </div>
          <div className="place-filters">
            <select
              className="platform-filter"
              value={continentFilter}
              onChange={(event) => setContinentFilter(event.target.value)}
              aria-label="Filter by continent"
            >
              <option value="all">all continents</option>
              {continentOptions.map((continent) => (
                <option key={continent} value={continent}>
                  {continent}
                </option>
              ))}
            </select>
            <select
              className="platform-filter"
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              aria-label="Filter by country"
            >
              <option value="all">all countries</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <select
              className="platform-filter"
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
              aria-label="Filter by state or province"
            >
              <option value="all">all states/provinces</option>
              {stateOptions.map((stateProvince) => (
                <option key={stateProvince} value={stateProvince}>
                  {stateProvince}
                </option>
              ))}
            </select>
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
        </div>
      </div>

      {error && <p className="banner-error">{error}</p>}

      {loading ? (
        <p className="loading-copy">Loading places…</p>
      ) : places.length === 0 ? (
        <div className="empty-state">
          <p>
            No places yet — ingest a post with a location tag, caption stops, or video place
            extraction and it will show up here.
          </p>
        </div>
      ) : viewMode === "map" ? (
        <Suspense fallback={<p className="loading-copy">Loading map…</p>}>
          <PlaceMap
            places={places}
            selectedPlaceId={selectedPlace?.place_id}
            onSelectPlace={openPlace}
          />
        </Suspense>
      ) : (
        <div className="place-groups">
          {groups.map((group) => (
            <div key={group.continent} className="place-continent-group">
              <h3 className="place-continent-heading">{group.continent}</h3>
              {group.countries.map(({ country, states }) => (
                <div key={country} className="place-country-group">
                  <h4 className="place-country-heading">{country}</h4>
                  {states.map(({ stateProvince, places: statePlaces }) => (
                    <div key={stateProvince} className="place-state-group">
                      {stateProvince !== "Unknown" && (
                        <h5 className="place-state-heading">{stateProvince}</h5>
                      )}
                      <div className="post-grid">
                        {statePlaces.map((place) => (
                          <PlaceCard
                            key={place.place_id}
                            place={place}
                            children={childrenByParent.get(place.place_id) ?? []}
                            onSelect={openPlace}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
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

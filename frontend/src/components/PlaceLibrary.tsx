import { useEffect, useMemo, useState } from "react";

import { fetchPlaces, fetchTags, type CanonicalPlace } from "../api";
import { PlaceCard } from "./PlaceCard";
import { PlaceDetail } from "./PlaceDetail";

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

export function PlaceLibrary() {
  const [places, setPlaces] = useState<CanonicalPlace[]>([]);
  const [allPlaces, setAllPlaces] = useState<CanonicalPlace[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlace | null>(null);

  useEffect(() => {
    void fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  // Fetch the unfiltered list once to populate the country/state filter
  // options — these shouldn't shrink just because another filter is applied.
  useEffect(() => {
    void fetchPlaces()
      .then(setAllPlaces)
      .catch(() => setAllPlaces([]));
  }, []);

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

  const countryOptions = useMemo(
    () => distinctSorted(allPlaces.map((place) => place.location.country)),
    [allPlaces],
  );

  const stateOptions = useMemo(
    () =>
      distinctSorted(
        allPlaces
          .filter((place) => countryFilter === "all" || place.location.country === countryFilter)
          .map((place) => place.location.state_province),
      ),
    [allPlaces, countryFilter],
  );

  // Narrowing the country should clear a state selection that no longer applies.
  useEffect(() => {
    if (stateFilter !== "all" && !stateOptions.includes(stateFilter)) {
      setStateFilter("all");
    }
  }, [stateOptions, stateFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPlaces({
      country: countryFilter === "all" ? undefined : countryFilter,
      state_province: stateFilter === "all" ? undefined : stateFilter,
      tag: tagFilter === "all" ? undefined : tagFilter,
      roots_only: true,
    })
      .then((result) => {
        if (!cancelled) {
          setPlaces(result);
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
  }, [countryFilter, stateFilter, tagFilter]);

  const groups = useMemo(() => groupByLocation(places), [places]);

  return (
    <section className="panel">
      <div className="section-header">
        <h2>Place library ({places.length})</h2>
        <div className="place-filters">
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

      {error && <p className="banner-error">{error}</p>}

      {loading ? (
        <p className="loading-copy">Loading places…</p>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p>
            No places yet — ingest a post with a location tag, caption stops, or video place
            extraction and it will show up here.
          </p>
        </div>
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
                            onSelect={setSelectedPlace}
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
          onClose={() => setSelectedPlace(null)}
          onNavigateToPlace={setSelectedPlace}
        />
      )}
    </section>
  );
}

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchPlaceDetail, type Place } from "../api";
import { usePlaceAtlas } from "../hooks/usePlaceAtlas";
import { useBrandVersion } from "../hooks/useBrandVersion";
import { readBrandMode } from "../themeColor";
import type {
  LibraryShellMeta,
  PlacesShellFilters,
  PlacesStatusFilter,
  PlacesViewMode,
} from "../libraryShellModel";
import {
  atlasTrail,
  buildAtlas,
  childLevelLabel,
  countByCategory,
  leafPlaces,
  levelLabel,
  resolveScopeKey,
  searchAtlas,
  type AtlasGrouping,
  type AtlasNode,
} from "../placeAtlasModel";
import { AtlasMapPanel } from "./AtlasMapPanel";
import { PlaceDetail } from "./PlaceDetail";

import "../place-covers.css";
import "../wf-browse.css";

interface PlaceLibraryProps {
  authReady: boolean;
  onNavigateToPost?: (platform: string, postId: string) => void;
  /** Hide page chrome — parent LibraryShell owns filters/title. */
  omitChrome?: boolean;
  filters?: PlacesShellFilters;
  onMeta?: (meta: LibraryShellMeta) => void;
}

type StatusFilter = PlacesStatusFilter;
type ViewMode = PlacesViewMode;

function vars(entries: Record<string, string | number>): CSSProperties {
  return entries as CSSProperties;
}

function hashHue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 360;
  }
  return hash;
}

function coverArt(name: string): CSSProperties {
  const forests = [
    "linear-gradient(145deg, #243d32 0%, #0f1a14 100%)",
    "linear-gradient(155deg, #1f3a2c 0%, #0d1510 100%)",
    "linear-gradient(160deg, #2a4538 0%, #101c16 100%)",
    "linear-gradient(150deg, #1a3328 0%, #0a1210 100%)",
    "linear-gradient(148deg, #274438 0%, #0e1813 100%)",
  ];
  return {
    backgroundImage: forests[hashHue(name) % forests.length],
  };
}

/**
 * Production places page — Country Covers atlas.
 * Region covers with a visited meter; open a cover for city chips, drill
 * down through the hierarchy, or flip to the scoped map.
 */
export function PlaceLibrary({
  authReady,
  onNavigateToPost,
  omitChrome = false,
  filters,
  onMeta,
}: PlaceLibraryProps) {
  useBrandVersion();
  const dark = readBrandMode() === "dark";
  const { placeId: routePlaceId } = useParams();
  const navigate = useNavigate();
  const { places, apiPlaces, visitedIds, loading, refresh } = usePlaceAtlas(authReady, {
    allowSample: false,
  });

  const controlled = Boolean(filters);
  const [rawScopeKey, setScopeKey] = useState("world");
  const [localStatusFilter, setLocalStatusFilter] = useState<StatusFilter>("all");
  const [localTypeFilter, setLocalTypeFilter] = useState<string[]>([]);
  const [localGrouping, setLocalGrouping] = useState<AtlasGrouping>("region");
  const [localViewMode, setLocalViewMode] = useState<ViewMode>("covers");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  const statusFilter = filters?.statusFilter ?? localStatusFilter;
  const typeFilter = filters?.typeFilter ?? localTypeFilter;
  const grouping = filters?.grouping ?? localGrouping;
  const viewMode = filters?.viewMode ?? localViewMode;
  const searchQuery = filters?.query ?? localSearchQuery;

  const setStatusFilter = (value: StatusFilter) => {
    if (!controlled) setLocalStatusFilter(value);
  };
  const setTypeFilter = (value: string[] | ((prev: string[]) => string[])) => {
    if (controlled) return;
    setLocalTypeFilter(value);
  };
  const setViewMode = (value: ViewMode) => {
    if (!controlled) setLocalViewMode(value);
  };
  const setSearchQuery = (value: string) => {
    if (!controlled) setLocalSearchQuery(value);
  };

  const placesById = useMemo(
    () => Object.fromEntries(apiPlaces.map((place) => [place.place_id, place])),
    [apiPlaces],
  );

  const [routedPlace, setRoutedPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!routePlaceId) {
      setRoutedPlace(null);
      return;
    }
    const fromList = placesById[routePlaceId];
    if (fromList) {
      setRoutedPlace(fromList);
      return;
    }
    if (loading) {
      return;
    }
    let cancelled = false;
    void fetchPlaceDetail(routePlaceId)
      .then((detail) => {
        if (!cancelled) {
          setRoutedPlace(detail.place);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoutedPlace(null);
          navigate(omitChrome ? "/?open=places" : "/places", { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [routePlaceId, placesById, loading, navigate, omitChrome]);

  const selectedApiPlace = routedPlace;

  const statusPlaces = useMemo(() => {
    if (statusFilter === "visited") {
      return places.filter((place) => place.visited);
    }
    if (statusFilter === "inspiration") {
      return places.filter((place) => !place.visited);
    }
    return places;
  }, [places, statusFilter]);

  const filteredPlaces = useMemo(() => {
    if (typeFilter.length === 0) {
      return statusPlaces;
    }
    return statusPlaces.filter((place) => typeFilter.includes(place.category ?? "other"));
  }, [statusPlaces, typeFilter]);

  const atlas = useMemo(() => buildAtlas(filteredPlaces, grouping), [filteredPlaces, grouping]);
  const typeAtlas = useMemo(() => buildAtlas(statusPlaces, grouping), [statusPlaces, grouping]);

  const scopeKey = resolveScopeKey(atlas, rawScopeKey);
  const scope = atlas.index.get(scopeKey) ?? atlas.root;
  const trail = useMemo(() => atlasTrail(atlas, scope.key), [atlas, scope.key]);

  const children = useMemo(
    () => scope.children.filter((child) => child.total > 0),
    [scope],
  );

  const typeOptions = useMemo(() => {
    const typeScope = typeAtlas.index.get(resolveScopeKey(typeAtlas, scopeKey)) ?? typeAtlas.root;
    return countByCategory(leafPlaces(typeScope));
  }, [typeAtlas, scopeKey]);

  const searchHits = useMemo(() => {
    const needle = searchQuery.trim();
    if (!needle) {
      return [];
    }
    return searchAtlas(atlas, needle, 40).filter((node) => node.place);
  }, [atlas, searchQuery]);

  const searching = searchQuery.trim().length > 0;

  function openNode(node: AtlasNode) {
    if (node.level === "place" && node.place) {
      navigate(`/places/${node.place.placeId}`);
      return;
    }
    setScopeKey(node.key);
    setExpandedKeys([]);
  }

  function toggleExpanded(key: string) {
    setExpandedKeys((keys) =>
      keys.includes(key) ? keys.filter((entry) => entry !== key) : [...keys, key],
    );
  }

  function toggleType(category: string) {
    setTypeFilter((types) =>
      types.includes(category)
        ? types.filter((entry) => entry !== category)
        : [...types, category],
    );
  }

  function changeGrouping(nextGrouping: AtlasGrouping) {
    if (!controlled) {
      setLocalGrouping(nextGrouping);
    }
    setScopeKey("world");
    setExpandedKeys([]);
  }

  useEffect(() => {
    if (!controlled) return;
    setScopeKey("world");
    setExpandedKeys([]);
  }, [controlled, grouping]);

  function closePlace() {
    navigate(omitChrome ? "/?open=places" : "/places");
  }

  function handleVisitedChange(_placeId: string, visited: boolean) {
    void refresh();
    if (!visited && statusFilter === "visited") {
      navigate(omitChrome ? "/?open=places" : "/places");
    }
  }

  useEffect(() => {
    // Drop a deep scope if filters emptied its branch.
    if (!atlas.index.has(rawScopeKey) && rawScopeKey !== "world") {
      setScopeKey("world");
      setExpandedKeys([]);
    }
  }, [atlas, rawScopeKey]);

  useEffect(() => {
    if (!onMeta) return;
    onMeta({
      count: scope.total,
      countLabel: "places",
      context: searching
        ? `Search · ${searchHits.length}`
        : trail.map((node) => node.name).join(" / ") || "World",
      pills: typeOptions.map((option) => ({
        key: option.category,
        label: option.label,
        count: option.count,
      })),
    });
  }, [onMeta, scope.total, searching, searchHits.length, trail, typeOptions]);

  const hierarchyCrumbs = (
    <nav className={omitChrome ? "lib-shell-crumbs" : "wf-browse-context"} aria-label="Hierarchy">
      {trail.map((node, index) => (
        <span key={node.key}>
          {index > 0 && (
            <span className="wf-crumb-sep" aria-hidden="true">
              /
            </span>
          )}
          <button
            type="button"
            className={node.key === scope.key ? "is-current" : ""}
            onClick={() => openNode(node)}
          >
            {node.name}
          </button>
        </span>
      ))}
      {trail.length > 1 && (
        <button
          type="button"
          className="wf-crumb-up"
          onClick={() => openNode(trail[trail.length - 2])}
        >
          ↑ Up one level
        </button>
      )}
    </nav>
  );

  return (
    <div className={`wf-browse place-library-covers${omitChrome ? " wf-browse--core" : ""}`}>
      {!omitChrome ? (
        <>
          <div className="wf-container wf-browse-masthead">
            <div>
              <p className="wf-browse-eyebrow">Your atlas</p>
              <h1 className="wf-browse-title">Atlas</h1>
              <p className="wf-browse-lede">
                Everywhere your saves point to, from continents down to the single café — with what
                you've already visited marked off.
              </p>
            </div>
            <div className="wf-browse-count">
              <span className="wf-browse-count-value">{scope.total}</span>
              <span className="wf-browse-count-label">places</span>
            </div>
          </div>

          <div className="wf-browse-bar">
            <div className="wf-container wf-browse-bar-inner">
              {hierarchyCrumbs}
              <div className="wf-seg" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`wf-seg-btn ${viewMode === "covers" ? "is-active" : ""}`}
                  onClick={() => setViewMode("covers")}
                >
                  Covers
                </button>
                <button
                  type="button"
                  className={`wf-seg-btn ${viewMode === "map" ? "is-active" : ""}`}
                  onClick={() => setViewMode("map")}
                >
                  Map
                </button>
              </div>
            </div>
          </div>

          <div className="wf-container wf-facets">
            <div className="wf-facet-row" role="group" aria-label="Grouping">
              <span className="wf-facet-label">Group by</span>
              {(["region", "type"] as AtlasGrouping[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`wf-pill ${grouping === mode ? "is-active" : ""}`}
                  onClick={() => changeGrouping(mode)}
                >
                  {mode === "region" ? "Region" : "Type"}
                </button>
              ))}
            </div>

            <div className="wf-facet-row" role="group" aria-label="Status filter">
              <span className="wf-facet-label">Status</span>
              {(["all", "visited", "inspiration"] as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`wf-pill ${statusFilter === filter ? "is-active" : ""}`}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === "all"
                    ? "Everything"
                    : filter === "visited"
                      ? "Visited"
                      : "Inspiration"}
                </button>
              ))}
            </div>

            <div className="wf-facet-row" role="group" aria-label="Type filter">
              <span className="wf-facet-label">Type</span>
              <button
                type="button"
                className={`wf-pill ${typeFilter.length === 0 ? "is-active" : ""}`}
                onClick={() => setTypeFilter([])}
              >
                All types
              </button>
              {typeOptions.map((option) => (
                <button
                  key={option.category}
                  type="button"
                  className={`wf-pill ${typeFilter.includes(option.category) ? "is-active" : ""}`}
                  aria-pressed={typeFilter.includes(option.category)}
                  onClick={() => toggleType(option.category)}
                >
                  {option.label}
                  <span style={{ marginLeft: "0.35rem", opacity: 0.75 }}>{option.count}</span>
                </button>
              ))}
            </div>

            <div className="wf-facet-row">
              <span className="wf-facet-label">Search</span>
              <label className="wf-search-field">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Find a place…"
                  aria-label="Search places"
                />
              </label>
            </div>
          </div>
        </>
      ) : trail.length > 1 ? (
        hierarchyCrumbs
      ) : null}

      <div className="wf-container wf-browse-body">
        <div className={dark ? "pl2 pl2--dark" : "pl2"} data-view="country-covers" data-mode={viewMode} data-level={scope.level}>
          <div className="pl2-shell place-library-covers-shell">
            {!omitChrome ? (
              <>
                <div className="pl2-scopebar">
                  <div>
                    <strong>{scope.name}</strong>
                    <span>
                      {scope.total} places · {scope.visited} visited · {scope.inspiration}{" "}
                      inspiration · showing {childLevelLabel(scope).toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="pl2-legend">
                  <span>
                    <i className="pl2-dot visited" /> Visited
                  </span>
                  <span>
                    <i className="pl2-dot dream" /> Inspiration
                  </span>
                  <span className="pl2-legend-note">
                    {searching
                      ? "Search results · same filters"
                      : viewMode === "map"
                        ? "Map view · same scope and filters"
                        : "Making the atlas feel aspirational"}
                  </span>
                </div>
              </>
            ) : null}

            {loading ? (
              <p className="pl2-empty">Loading your atlas…</p>
            ) : places.length === 0 ? (
              <p className="pl2-empty">No places yet — ingest a post with locations, then come back.</p>
            ) : filteredPlaces.length === 0 ? (
              <p className="pl2-empty">Nothing matches these filters — clear a type or status.</p>
            ) : searching ? (
              searchHits.length === 0 ? (
                <p className="pl2-empty">No places match that search.</p>
              ) : (
                <div className="wf-search-results">
                  {searchHits.map((node) => {
                    const place = node.place!;
                    return (
                      <Link
                        key={place.placeId}
                        className="wf-search-row"
                        to={`/places/${place.placeId}`}
                      >
                        <i className={`pl2-dot ${place.visited ? "visited" : "dream"}`} />
                        <span className="wf-search-row-name">{place.name}</span>
                        <span className="wf-search-row-trail">{place.trail.join(" · ")}</span>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : viewMode === "map" ? (
              <AtlasMapPanel scope={scope} onOpenNode={openNode} />
            ) : (
              <div className="pl2-covers">
                {children.map((child) => {
                  const ratio = child.total ? child.visited / child.total : 0;
                  const open = expandedKeys.includes(child.key);
                  const isPlace = child.level === "place";
                  return (
                    <article key={child.key} className={`pl2-cover ${open ? "is-open" : ""}`}>
                      <button
                        type="button"
                        className="pl2-cover-art"
                        style={coverArt(child.name)}
                        onClick={() => (isPlace ? openNode(child) : toggleExpanded(child.key))}
                      >
                        <span className="pl2-cover-kicker">{levelLabel(child.level)}</span>
                        <h3>{child.name}</h3>
                        <span
                          className="pl2-cover-meter"
                          style={vars({ "--ratio": `${ratio * 100}%` })}
                        >
                          <i />
                        </span>
                        <span className="pl2-cover-stats">
                          {isPlace
                            ? child.place?.visited
                              ? "Visited"
                              : "Inspiration"
                            : `${child.visited} visited · ${child.total} saved`}
                        </span>
                      </button>
                      {open && !isPlace && (
                        <div className="pl2-cover-chips">
                          {child.children.slice(0, 16).map((grandchild) => (
                            <button
                              key={grandchild.key}
                              type="button"
                              onClick={() => openNode(grandchild)}
                            >
                              {grandchild.level === "place" && (
                                <i
                                  className={`pl2-dot ${
                                    grandchild.place?.visited ? "visited" : "dream"
                                  }`}
                                />
                              )}
                              {grandchild.name}
                              {grandchild.level !== "place" && <span>{grandchild.total}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedApiPlace && (
        <PlaceDetail
          place={selectedApiPlace}
          visited={visitedIds.has(selectedApiPlace.place_id)}
          onClose={closePlace}
          onNavigateToPlace={(place) => navigate(`/places/${place.place_id}`)}
          onNavigateToPost={onNavigateToPost}
          onVisitedChange={handleVisitedChange}
        />
      )}
    </div>
  );
}

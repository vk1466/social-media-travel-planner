import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import Supercluster, { type PointFeature } from "supercluster";
import { Search, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { useSavePipeline } from "../state/SavePipelineContext";
import type { Place } from "../../api";
import { visualForCategory } from "../../placeCategoryVisuals";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapPageProps {
  places: Place[];
  loading: boolean;
}

export function MapPage({ places, loading }: MapPageProps) {
  const { placeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet } = useSavePipeline();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    placeId || searchParams.get("selected") || null
  );
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showSearchThisArea, setShowSearchThisArea] = useState<boolean>(false);

  // Filter mappable places with valid coordinates
  const mappablePlaces = useMemo(() => {
    return places.filter(
      (p) => typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number"
    );
  }, [places]);

  const filteredPlaces = useMemo(() => {
    if (activeCategory === "all") return mappablePlaces;
    return mappablePlaces.filter((p) => (p.category || "other") === activeCategory);
  }, [mappablePlaces, activeCategory]);

  const selectedPlace = useMemo(() => {
    return mappablePlaces.find((p) => p.place_id === selectedPlaceId) || null;
  }, [mappablePlaces, selectedPlaceId]);

  // Sync route param with selected place
  useEffect(() => {
    if (placeId) {
      setSelectedPlaceId(placeId);
    }
  }, [placeId]);

  // Build Supercluster index
  const superclusterIndex = useMemo(() => {
    const sc = new Supercluster({
      radius: 45,
      maxZoom: 16,
    });
    const geojsonFeatures: Array<PointFeature<{ placeId: string; place: Place }>> =
      filteredPlaces.map((p) => ({
        type: "Feature",
        properties: {
          cluster: false,
          placeId: p.place_id,
          place: p,
        },
        geometry: {
          type: "Point",
          coordinates: [p.location.longitude!, p.location.latitude!],
        },
      }));
    sc.load(geojsonFeatures);
    return sc;
  }, [filteredPlaces]);

  // Render or update pins & clusters on map
  const updateMapMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const zoom = Math.floor(map.getZoom());
    const clusters = superclusterIndex.getClusters(bbox, zoom);

    for (const feature of clusters) {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = feature.properties.cluster;

      if (isCluster) {
        const count = feature.properties.point_count;
        const clusterId = feature.properties.cluster_id;
        const size = count < 10 ? 38 : count < 50 ? 44 : 50;

        const el = document.createElement("div");
        el.className = "wf-cluster-marker";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "9999px";
        el.style.background = "var(--wf-primary)";
        el.style.border = "2px solid #FFFFFF";
        el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "#FFFFFF";
        el.style.fontWeight = "700";
        el.style.fontSize = "13px";
        el.style.cursor = "pointer";
        el.innerText = `${count}`;

        el.addEventListener("click", () => {
          const expansionZoom = Math.min(superclusterIndex.getClusterExpansionZoom(clusterId), 17);
          map.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 800 });
        });

        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      } else {
        const place: Place = feature.properties.place;
        const isSelected = selectedPlaceId === place.place_id;
        const isHovered = hoveredPlaceId === place.place_id;
        const visual = visualForCategory(place.category);
        const pinColor = visual.color || "var(--wf-primary)";

        // Outer 44px tap target container
        const el = document.createElement("div");
        el.className = "wf-place-marker";
        el.style.width = "44px";
        el.style.height = "44px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.cursor = "pointer";

        // Inner visual dot/icon
        const dot = document.createElement("div");
        dot.style.width = isSelected ? "34px" : isHovered ? "30px" : "24px";
        dot.style.height = isSelected ? "34px" : isHovered ? "30px" : "24px";
        dot.style.borderRadius = "50%";
        dot.style.background = isSelected ? "var(--wf-text)" : pinColor;
        dot.style.border = "2px solid #FFFFFF";
        dot.style.boxShadow = isSelected
          ? "0 4px 14px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.25)";
        dot.style.display = "flex";
        dot.style.alignItems = "center";
        dot.style.justifyContent = "center";
        dot.style.color = "#FFFFFF";
        dot.style.fontSize = "12px";
        dot.style.transition = "all 0.15s ease";
        dot.innerText = visual.icon || "📍";

        el.appendChild(dot);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedPlaceId(place.place_id);
          setSearchParams({ selected: place.place_id });
          map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [superclusterIndex, selectedPlaceId, hoveredPlaceId, setSearchParams]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] =
      mappablePlaces.length > 0
        ? [mappablePlaces[0].location.longitude!, mappablePlaces[0].location.latitude!]
        : [0, 20];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: initialCenter,
      zoom: 3,
      minZoom: 2,
      maxZoom: 19,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Fit to all places on load
      if (mappablePlaces.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const p of mappablePlaces) {
          bounds.extend([p.location.longitude!, p.location.latitude!]);
        }
        map.fitBounds(bounds, { padding: 50, maxZoom: 13, duration: 0 });
      }
      updateMapMarkers();
    });

    map.on("dragstart", () => {
      setShowSearchThisArea(true);
    });

    map.on("moveend", () => {
      updateMapMarkers();
    });

    // InvalidateSize / map resize handled automatically on viewport changes
    map.resize();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mappablePlaces]);

  // Update markers when supercluster index or selections change
  useEffect(() => {
    if (mapRef.current?.loaded()) {
      updateMapMarkers();
    }
  }, [updateMapMarkers]);

  // When selected place changes externally, center map
  useEffect(() => {
    if (!selectedPlace || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedPlace.location.longitude!, selectedPlace.location.latitude!],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 600,
    });
  }, [selectedPlace]);

  if (loading && places.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 16px", width: "100%" }}>
        <div className="wf-skeleton" style={{ width: "100%", height: "600px", borderRadius: "24px" }} />
      </main>
    );
  }

  if (mappablePlaces.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 16px", width: "100%" }}>
        <EmptyState
          screenLabel="Map"
          headline="No places on the map yet"
          description="Save a reel with location spots to see them pinned here."
          primaryActionLabel="Paste a reel"
          onPrimaryAction={() => openSaveSheet()}
          iconPath="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
          tint="var(--wf-surface-2)"
          ink="var(--wf-text)"
        />
      </main>
    );
  }

  const categoryChips = [
    { key: "all", label: "All places", count: mappablePlaces.length },
    { key: "travel", label: "Places", count: mappablePlaces.filter((p) => p.category === "travel").length },
    { key: "food", label: "Food & Drinks", count: mappablePlaces.filter((p) => p.category === "food").length },
  ];

  return (
    <main className="wf-map-main" style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Desktop 380px Left List Panel */}
      <aside className="wf-map-sidebar">
        {/* Header & Category Filter */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--wf-border)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="wf-type-h2" style={{ margin: 0 }}>
              Places
            </h2>
            <span style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
              {filteredPlaces.length} spot{filteredPlaces.length === 1 ? "" : "s"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
            {categoryChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCategory(c.key)}
                style={{
                  height: "36px",
                  padding: "0 12px",
                  borderRadius: "var(--wf-radius-pill)",
                  border: activeCategory === c.key ? "1px solid var(--wf-text)" : "1px solid var(--wf-border)",
                  background: activeCategory === c.key ? "var(--wf-text)" : "var(--wf-surface)",
                  color: activeCategory === c.key ? "var(--wf-bg)" : "var(--wf-text)",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{c.label}</span>
                <span style={{ opacity: 0.6, fontSize: "11px" }}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list of places */}
        <div className="wf-map-sidebar-list">
          {filteredPlaces.map((p) => {
            const isSelected = selectedPlaceId === p.place_id;
            const visual = visualForCategory(p.category);

            return (
              <div
                key={p.place_id}
                onMouseEnter={() => setHoveredPlaceId(p.place_id)}
                onMouseLeave={() => setHoveredPlaceId(null)}
                onClick={() => {
                  setSelectedPlaceId(p.place_id);
                  setSearchParams({ selected: p.place_id });
                }}
                style={{
                  padding: "12px",
                  borderRadius: "var(--wf-radius-control)",
                  border: isSelected ? "2px solid var(--wf-primary)" : "1px solid var(--wf-border)",
                  background: isSelected ? "var(--wf-surface-2)" : "var(--wf-surface)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: visual.color || "var(--wf-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#FFFFFF",
                      flexShrink: 0,
                    }}
                  >
                    {visual.icon || "📍"}
                  </span>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--wf-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {p.display_name}
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
                  {[p.location?.city, p.location?.country].filter(Boolean).join(", ")}
                </div>

                {isSelected && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <Link
                      to={`/place/${p.place_id}`}
                      state={{ from: "/map" }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--wf-radius-pill)",
                        background: "var(--wf-text)",
                        color: "var(--wf-bg)",
                        fontSize: "12px",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View details
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Map Canvas Pane */}
      <div className="wf-map-pane">
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />

        {/* Floating "Search this area" button */}
        {showSearchThisArea && (
          <button
            type="button"
            onClick={() => {
              setShowSearchThisArea(false);
              updateMapMarkers();
            }}
            style={{
              position: "absolute",
              top: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              height: "40px",
              padding: "0 16px",
              borderRadius: "var(--wf-radius-pill)",
              background: "var(--wf-surface)",
              color: "var(--wf-text)",
              border: "1px solid var(--wf-border)",
              boxShadow: "var(--wf-shadow-card)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Search size={15} strokeWidth={2} />
            <span>Search this area</span>
          </button>
        )}

        {/* Selected place card on map */}
        {selectedPlace && (
          <div
            className="wf-map-selected-card"
            style={{
              position: "absolute",
              background: "var(--wf-surface)",
              borderRadius: "var(--wf-radius-card)",
              border: "1px solid var(--wf-border)",
              boxShadow: "var(--wf-shadow-elevated)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              zIndex: 30,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div>
                <h3 className="wf-type-h2" style={{ margin: 0, fontSize: "18px" }}>
                  {selectedPlace.display_name}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--wf-text-muted)" }}>
                  {[selectedPlace.location?.city, selectedPlace.location?.country].filter(Boolean).join(", ")}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setSelectedPlaceId(null);
                  setSearchParams({});
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--wf-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--wf-text-muted)",
                }}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <Link
                to={`/place/${selectedPlace.place_id}`}
                state={{ from: "/map" }}
                style={{
                  height: "38px",
                  padding: "0 16px",
                  borderRadius: "var(--wf-radius-pill)",
                  background: "var(--wf-primary)",
                  color: "var(--wf-on-primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                View place details
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

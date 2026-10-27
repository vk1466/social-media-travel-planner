import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import Supercluster, { type PointFeature } from "supercluster";
import { Search, X, ArrowRight } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { useSavePipeline } from "../state/SavePipelineContext";
import type { Place, SavedPost } from "../../api";
import { getCategoryVisual, CANONICAL_CATEGORIES } from "../categoryVisuals";
import { cartoMaplibreStyle } from "../../maps";
import { proxiedMediaUrl, getPlaceBestImageUrl } from "../../postDisplayUtils";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapPageProps {
  places: Place[];
  posts?: SavedPost[];
  loading: boolean;
}

export function MapPage({ places, posts, loading }: MapPageProps) {
  const { placeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet } = useSavePipeline();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const hasFittedInitialBoundsRef = useRef<boolean>(false);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    placeId || searchParams.get("selected") || null
  );
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showSearchThisArea, setShowSearchThisArea] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");


  // Filter mappable places with valid coordinates
  const mappablePlaces = useMemo(() => {
    return places.filter(
      (p) => typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number"
    );
  }, [places]);

  const filteredPlaces = useMemo(() => {
    if (activeCategory === "all") return mappablePlaces;
    return mappablePlaces.filter((p) => getCategoryVisual(p.category).name === activeCategory);
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
    const zoom = Math.floor(map.getZoom());
    // At world zoom (<= 3) or across antimeridian, query full global bounds to avoid dropping pins
    const bbox: [number, number, number, number] =
      zoom <= 3 || bounds.getEast() - bounds.getWest() > 300
        ? [-180, -85, 180, 85]
        : [
            Math.max(-180, bounds.getWest()),
            Math.max(-85, bounds.getSouth()),
            Math.min(180, bounds.getEast()),
            Math.min(85, bounds.getNorth()),
          ];
    const clusters = superclusterIndex.getClusters(bbox, zoom);

    for (const feature of clusters) {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = feature.properties.cluster;

      if (isCluster) {
        const count = feature.properties.point_count;
        const clusterId = feature.properties.cluster_id;
        const size = count < 10 ? 32 : count < 50 ? 40 : 48;
        const isDarkNow =
          typeof document !== "undefined" &&
          (document.documentElement.getAttribute("data-theme") === "dark" ||
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        const el = document.createElement("div");
        el.className = "wf-cluster-marker";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "9999px";
        el.style.background = isDarkNow ? "#23272E" : "#16181B";
        el.style.border = isDarkNow ? "2px solid rgba(255, 255, 255, 0.85)" : "2px solid #FFFFFF";
        el.style.boxShadow = isDarkNow
          ? "0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 5px rgba(255, 255, 255, 0.15)"
          : "0 2px 8px rgba(0, 0, 0, 0.25), 0 0 0 5px rgba(22, 24, 27, 0.18)";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "#FFFFFF";
        el.style.fontWeight = "700";
        el.style.fontSize = "13px";
        el.style.cursor = "pointer";
        el.innerText = `${count}`;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const expansionZoom = Math.min(superclusterIndex.getClusterExpansionZoom(clusterId), 17);
          map.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 600 });
        });

        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      } else {
        const place: Place = feature.properties.place;
        const isSelected = selectedPlaceId === place.place_id;
        const isHovered = hoveredPlaceId === place.place_id;
        const visual = getCategoryVisual(place.category);
        const pinColor = visual.hue;

        // Outer 44px tap target container
        const el = document.createElement("div");
        el.className = "wf-place-marker";
        el.style.width = "44px";
        el.style.height = "44px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.cursor = "pointer";

        // Inner visual 32px circle
        const dot = document.createElement("div");
        dot.style.width = "32px";
        dot.style.height = "32px";
        dot.style.borderRadius = "50%";
        dot.style.background = pinColor;
        dot.style.border = isSelected ? "2px solid var(--accent, #FF5A4E)" : "2px solid #FFFFFF";
        dot.style.boxShadow = isSelected
          ? "0 4px 14px rgba(255, 90, 78, 0.45)"
          : "0 2px 8px rgba(16, 24, 40, 0.15)";
        dot.style.transform = isSelected ? "scale(1.2)" : isHovered ? "scale(1.1)" : "scale(1)";
        dot.style.display = "flex";
        dot.style.alignItems = "center";
        dot.style.justifyContent = "center";
        dot.style.color = "#FFFFFF";
        dot.style.fontSize = "14px";
        dot.style.transition = "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)";
        dot.innerText = visual.glyph || "📍";

        el.appendChild(dot);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedPlaceId(place.place_id);
          setSearchParams({ selected: place.place_id });
          map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
          const listItem = document.getElementById(`wf-place-item-${place.place_id}`);
          if (listItem) {
            listItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [superclusterIndex, selectedPlaceId, hoveredPlaceId, setSearchParams]);

  const fitToMappablePlaces = useCallback((mapInstance?: maplibregl.Map | null, immediate = false) => {
    const targetMap = mapInstance || mapRef.current;
    if (!targetMap || mappablePlaces.length === 0) return;

    const container = mapContainerRef.current;
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
      // Narrow viewport / mobile container not measured yet; defer to next frame
      requestAnimationFrame(() => {
        if (mapRef.current) fitToMappablePlaces(mapRef.current, immediate);
      });
      return;
    }

    targetMap.resize();

    if (mappablePlaces.length === 1) {
      const p = mappablePlaces[0];
      targetMap.flyTo({
        center: [p.location.longitude!, p.location.latitude!],
        zoom: 13,
        duration: immediate ? 0 : 400,
      });
      return;
    }

    const b = new maplibregl.LngLatBounds();
    for (const p of mappablePlaces) {
      b.extend([p.location.longitude!, p.location.latitude!]);
    }
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    targetMap.fitBounds(b, {
      padding: isDesktop
        ? { top: 48, bottom: 48, left: 48, right: 48 }
        : { top: 70, bottom: 120, left: 24, right: 24 },
      maxZoom: 14,
      duration: immediate ? 0 : 400,
    });
  }, [mappablePlaces]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const calculateBounds = () => {
      if (mappablePlaces.length === 0) return null;
      const b = new maplibregl.LngLatBounds();
      for (const p of mappablePlaces) {
        b.extend([p.location.longitude!, p.location.latitude!]);
      }
      return b;
    };

    const allBounds = calculateBounds();
    const initialCenter: [number, number] = allBounds
      ? [allBounds.getCenter().lng, allBounds.getCenter().lat]
      : mappablePlaces[0]?.location?.longitude != null && mappablePlaces[0]?.location?.latitude != null
      ? [mappablePlaces[0].location.longitude, mappablePlaces[0].location.latitude]
      : [12.4964, 41.9028];

    const isDark =
      typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-theme") === "dark" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: cartoMaplibreStyle(isDark),
      center: initialCenter,
      zoom: mappablePlaces.length > 0 ? 11 : 4,
      minZoom: 2,
      maxZoom: 22,
    });

    mapRef.current = map;

    map.on("load", () => {
      // InvalidateSize / map resize handled automatically on viewport changes
      map.resize();
      if (mappablePlaces.length > 0) {
        hasFittedInitialBoundsRef.current = true;
        fitToMappablePlaces(map, true);
      }
      updateMapMarkers();
    });

    map.on("dragstart", () => {
      setShowSearchThisArea(true);
    });

    map.on("moveend", () => {
      updateMapMarkers();
    });

    // Handle container resize & orientation changes without layout flash
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0 && mapRef.current) {
          mapRef.current.resize();
          if (!hasFittedInitialBoundsRef.current && mappablePlaces.length > 0) {
            hasFittedInitialBoundsRef.current = true;
            fitToMappablePlaces(mapRef.current, true);
          }
        }
      }
    });
    ro.observe(mapContainerRef.current);

    map.resize();
    const resizeTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        if (mappablePlaces.length > 0 && !hasFittedInitialBoundsRef.current) {
          hasFittedInitialBoundsRef.current = true;
          fitToMappablePlaces(mapRef.current, true);
        }
      }
    }, 150);

    const handleThemeChange = () => {
      if (!mapRef.current) return;
      const nextIsDark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      mapRef.current.setStyle(cartoMaplibreStyle(nextIsDark));
      mapRef.current.once("style.load", () => {
        updateMapMarkers();
      });
    };

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          handleThemeChange();
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", handleThemeChange);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      ro.disconnect();
      mo.disconnect();
      mql.removeEventListener("change", handleThemeChange);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and fit bounds when mappable places become available
  useEffect(() => {
    if (!mapRef.current) return;
    if (mappablePlaces.length > 0 && !hasFittedInitialBoundsRef.current) {
      hasFittedInitialBoundsRef.current = true;
      fitToMappablePlaces(mapRef.current, true);
    }
    updateMapMarkers();
  }, [mappablePlaces, fitToMappablePlaces, updateMapMarkers]);

  // When switching mobile view between map and list
  useEffect(() => {
    if (mobileView === "map" && mapRef.current) {
      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.resize();
          if (!hasFittedInitialBoundsRef.current && mappablePlaces.length > 0) {
            hasFittedInitialBoundsRef.current = true;
            fitToMappablePlaces(mapRef.current, true);
          }
        }
      });
    }
  }, [mobileView, mappablePlaces, fitToMappablePlaces]);

  // When selected place changes externally, center map
  useEffect(() => {
    if (!selectedPlace || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedPlace.location.longitude!, selectedPlace.location.latitude!],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 600,
    });
  }, [selectedPlace]);

  if (!loading && mappablePlaces.length === 0) {
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

  const categoryChips = useMemo(() => {
    const list = [
      { key: "all", label: "All places", glyph: "🗺️", count: mappablePlaces.length },
    ];
    for (const cat of CANONICAL_CATEGORIES) {
      const vis = getCategoryVisual(cat);
      const count = mappablePlaces.filter((p) => getCategoryVisual(p.category).name === cat).length;
      if (count > 0) {
        list.push({ key: cat, label: cat, glyph: vis.glyph, count });
      }
    }
    return list;
  }, [mappablePlaces]);

  return (
    <main className="wf-map-main" data-mobile-view={mobileView} style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Desktop 400px Left List Panel */}
      <aside className="wf-map-sidebar">
        {/* Header & Category Filter */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--wf-border, var(--line))", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <h2 className="wf-type-h2" style={{ margin: 0 }}>
              Places
            </h2>
            {/* Mobile toggle pill in sidebar */}
            <div
              className="wf-mobile-only"
              style={{
                background: "var(--wf-surface)",
                borderRadius: "var(--wf-radius-pill)",
                padding: "2px",
                border: "1px solid var(--wf-border, var(--line))",
                display: "flex",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMobileView("map");
                  setTimeout(() => mapRef.current?.resize(), 50);
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--wf-text-muted)",
                  padding: "4px 10px",
                  borderRadius: "var(--wf-radius-pill)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🗺️ Map
              </button>
              <button
                type="button"
                style={{
                  border: 0,
                  background: "var(--wf-text)",
                  color: "var(--wf-bg)",
                  padding: "4px 10px",
                  borderRadius: "var(--wf-radius-pill)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "default",
                }}
              >
                ☰ Places ({filteredPlaces.length})
              </button>
            </div>
            <span style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
              {filteredPlaces.length} spot{filteredPlaces.length === 1 ? "" : "s"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {categoryChips.map((c) => {
              const isSelected = activeCategory === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCategory(c.key)}
                  style={{
                    height: "32px",
                    padding: "0 12px",
                    borderRadius: "999px",
                    border: isSelected ? "1px solid var(--ink, #16181B)" : "1px solid var(--line, #E7E6E3)",
                    background: isSelected ? "var(--ink, #16181B)" : "var(--surface-2, #F3F3F1)",
                    color: isSelected ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{c.glyph}</span>
                  <span>{c.label}</span>
                  <span style={{ opacity: 0.7, fontSize: "11px" }}>{c.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable list of places */}
        <div className="wf-map-sidebar-list">
          {filteredPlaces.map((p) => {
            const isSelected = selectedPlaceId === p.place_id;
            const visual = getCategoryVisual(p.category);
            const rawThumb = getPlaceBestImageUrl(p, posts);
            const thumbnail = rawThumb ? proxiedMediaUrl(rawThumb) : null;
            const tip = p.tips?.[0];

            return (
              <div
                key={p.place_id}
                id={`wf-place-item-${p.place_id}`}
                onMouseEnter={() => setHoveredPlaceId(p.place_id)}
                onMouseLeave={() => setHoveredPlaceId(null)}
                onClick={() => {
                  setSelectedPlaceId(p.place_id);
                  setSearchParams({ selected: p.place_id });
                }}
                style={{
                  padding: "10px",
                  borderRadius: "14px",
                  border: isSelected ? "2px solid var(--accent, #FF5A4E)" : "1px solid var(--line, #E7E6E3)",
                  background: isSelected ? "var(--surface-2, #F3F3F1)" : "var(--surface, #FFFFFF)",
                  cursor: "pointer",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  transition: "all 0.15s ease",
                }}
              >
                {/* 64px Thumbnail (radius 14) */}
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                    background: visual.tint,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{visual.glyph}</span>
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt={p.display_name}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "cover",
                      }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--ink, #16181B)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.display_name}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--ink-2, #5E636B)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: visual.hue, display: "inline-block" }} />
                    <span>{visual.name}</span>
                    {p.location?.city && <span>· {p.location.city}</span>}
                  </div>

                  {tip && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-2, #5E636B)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontStyle: "italic",
                      }}
                    >
                      "{tip}"
                    </div>
                  )}

                  {isSelected && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <Link
                        to={`/place/${p.place_id}`}
                        state={{ from: "/map" }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: "var(--ink, #16181B)",
                          color: "var(--bg, #FAFAF9)",
                          fontSize: "11px",
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
              bottom: "24px",
              left: "24px",
              width: "min(360px, calc(100% - 48px))",
              background: "var(--surface, #FFFFFF)",
              borderRadius: "20px",
              border: "1px solid var(--line, #E7E6E3)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              overflow: "hidden",
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {(() => {
              const visual = getCategoryVisual(selectedPlace.category);
              const rawThumb = getPlaceBestImageUrl(selectedPlace, posts);
              const thumb = rawThumb ? proxiedMediaUrl(rawThumb) : null;
              return (
                <>
                  <div
                    style={{
                      height: "140px",
                      width: "100%",
                      background: visual.tint,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ fontSize: "40px" }}>{visual.glyph}</span>
                    {thumb && (
                      <img
                        src={thumb}
                        alt={selectedPlace.display_name}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => {
                        setSelectedPlaceId(null);
                        setSearchParams({});
                      }}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(8px)",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(0,0,0,0.65)",
                        backdropFilter: "blur(6px)",
                        borderRadius: "999px",
                        padding: "3px 10px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: 600,
                        zIndex: 2,
                      }}
                    >
                      <span>{visual.glyph}</span>
                      <span>{visual.name}</span>
                    </div>
                  </div>

                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 700,
                          letterSpacing: "-0.015em",
                          color: "var(--ink, #16181B)",
                        }}
                      >
                        {selectedPlace.display_name}
                      </h3>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "13px",
                          color: "var(--ink-2, #5E636B)",
                        }}
                      >
                        {[selectedPlace.location?.city, selectedPlace.location?.country].filter(Boolean).join(", ") || "Location saved"}
                      </p>
                    </div>

                    <Link
                      to={`/place/${selectedPlace.place_id}`}
                      state={{ from: "/map" }}
                      style={{
                        height: "40px",
                        width: "100%",
                        borderRadius: "var(--radius-pill, 999px)",
                        background: "var(--accent, #FF5A4E)",
                        color: "#FFFFFF",
                        fontSize: "14px",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        boxShadow: "0 2px 8px rgba(255, 90, 78, 0.25)",
                      }}
                    >
                      <span>View place</span>
                      <ArrowRight size={16} strokeWidth={2} />
                    </Link>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Mobile floating Map/Places toggle pill */}
        <div
          className="wf-mobile-only"
          style={{
            position: "absolute",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 35,
            background: "var(--wf-surface)",
            borderRadius: "var(--wf-radius-pill)",
            padding: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            border: "1px solid var(--wf-border)",
            display: "flex",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMobileView("map");
              mapRef.current?.resize();
            }}
            style={{
              border: 0,
              background: mobileView === "map" ? "var(--wf-text)" : "transparent",
              color: mobileView === "map" ? "var(--wf-bg)" : "var(--wf-text-muted)",
              padding: "6px 14px",
              borderRadius: "var(--wf-radius-pill)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={() => setMobileView("list")}
            style={{
              border: 0,
              background: mobileView === "list" ? "var(--wf-text)" : "transparent",
              color: mobileView === "list" ? "var(--wf-bg)" : "var(--wf-text-muted)",
              padding: "6px 14px",
              borderRadius: "var(--wf-radius-pill)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ☰ Places ({filteredPlaces.length})
          </button>
        </div>
      </div>
    </main>
  );
}

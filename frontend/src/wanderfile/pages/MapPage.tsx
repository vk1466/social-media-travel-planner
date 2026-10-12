import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { useSavePipeline } from "../state/SavePipelineContext";
import type { Place } from "../../api";

interface MapPageProps {
  places: Place[];
  loading: boolean;
}

export function MapPage({ places, loading }: MapPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet } = useSavePipeline();

  const selectedPlaceId = searchParams.get("place") || (places.length > 0 ? places[0].place_id : null);
  const selectedPlace = useMemo(() => {
    return places.find((p) => p.place_id === selectedPlaceId) || places[0] || null;
  }, [places, selectedPlaceId]);

  if (places.length === 0 && !loading) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <EmptyState
          screenLabel="Map, no places yet"
          headline="Places appear here"
          description="When a saved post mentions a location, it is pinned on the map."
          primaryActionLabel="Save a travel link"
          onPrimaryAction={() => openSaveSheet()}
          iconPath="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
          tint="#E3F0F4"
          ink="#1B5E78"
        />
      </main>
    );
  }

  return (
    <main
      style={{
        display: "flex",
        flex: 1,
        minHeight: "calc(100vh - 73px)",
        position: "relative",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
    >
      {/* Places list sidebar */}
      <aside
        style={{
          width: "380px",
          borderRight: "1px solid #E6E3DC",
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #EFEDE7" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Places
          </h1>
          <div style={{ fontSize: "14px", color: "#6B6F73", marginTop: "4px" }}>
            {places.length} saved places on your map
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "8px" }}>
          {places.map((place) => {
            const isSelected = selectedPlace?.place_id === place.place_id;
            return (
              <button
                key={place.place_id}
                type="button"
                onClick={() => setSearchParams({ place: place.place_id })}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  border: 0,
                  background: isSelected ? "#F6F5F1" : "transparent",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#1B1D1F" }}>
                  {place.display_name}
                </div>
                <div style={{ fontSize: "13px", color: "#6B6F73" }}>
                  {[place.location?.city, place.location?.state_province, place.location?.country].filter(Boolean).join(", ")}
                </div>
                {place.category && (
                  <span
                    style={{
                      alignSelf: "flex-start",
                      marginTop: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "#E3F0F4",
                      color: "#1B5E78",
                    }}
                  >
                    {place.category}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Map pane & selected place overlay */}
      <section style={{ flex: 1, position: "relative", background: "#EAE7DF" }}>
        {/* Placeholder simulated map view with pins */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(#D9D5CB 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "#6B6F73" }}>
            <span
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                color: "#1B5E78",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: 600 }}>
              {selectedPlace ? selectedPlace.display_name : "Wanderfile Map"}
            </div>
          </div>
        </div>

        {/* Selected place card card overlay matching Places.dc.html */}
        {selectedPlace && (
          <div
            style={{
              position: "absolute",
              bottom: "32px",
              left: "32px",
              right: "32px",
              maxWidth: "480px",
              background: "#FFFFFF",
              borderRadius: "24px",
              border: "1px solid #E6E3DC",
              padding: "24px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "#E3F0F4",
                    color: "#1B5E78",
                  }}
                >
                  {selectedPlace.category || "Place"}
                </span>
                <h2 style={{ margin: "8px 0 2px", fontSize: "22px", fontWeight: 800 }}>
                  {selectedPlace.display_name}
                </h2>
                <div style={{ fontSize: "14px", color: "#6B6F73" }}>
                  {[selectedPlace.location?.city, selectedPlace.location?.state_province, selectedPlace.location?.country].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
              <Link
                to={`/place/${selectedPlace.place_id}`}
                style={{
                  height: "42px",
                  padding: "0 20px",
                  borderRadius: "999px",
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Details
              </Link>
              <ComingSoonButton
                featureId="trips"
                style={{
                  height: "42px",
                  padding: "0 18px",
                  borderRadius: "999px",
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Add to trip
              </ComingSoonButton>
              {selectedPlace.google_maps_url && (
                <a
                  href={selectedPlace.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: "42px",
                    padding: "0 16px",
                    borderRadius: "999px",
                    border: "1px solid #D9D5CB",
                    background: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#1B1D1F",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Directions
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

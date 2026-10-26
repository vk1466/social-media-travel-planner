import { useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import type { Place, SavedPost } from "../../api";

interface PlaceDetailPageProps {
  places: Place[];
  posts: SavedPost[];
}

export function PlaceDetailPage({ places, posts }: PlaceDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const place = places.find((p) => p.place_id === id);
  const [visited, setVisited] = useState(false);

  // Dynamic back navigation based on history/location state
  const from = (location.state as { from?: string } | null)?.from;
  let backLabel = "Back to Map";
  let fallbackTo = "/map";
  if (from) {
    if (from.startsWith("/library")) {
      backLabel = "Back to Library";
      fallbackTo = "/library";
    } else if (from.startsWith("/collections")) {
      backLabel = "Back to Collections";
      fallbackTo = "/collections";
    } else if (from.startsWith("/post/")) {
      backLabel = "Back to Post";
      fallbackTo = from;
    } else if (from === "/") {
      backLabel = "Back to Home";
      fallbackTo = "/";
    }
  }

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  };

  if (!place) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 16px 80px", width: "100%", boxSizing: "border-box" }}>
        <EmptyState
          screenLabel="Place detail"
          headline="Place not found"
          description="This place is not in your saved library."
          primaryActionLabel="Back to Map"
          onPrimaryAction={() => navigate("/map")}
          iconPath="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
          tint="#E3F0F4"
          ink="#1B5E78"
        />
      </main>
    );
  }

  const relatedPosts = posts.filter((p) => p.place_ids?.includes(place.place_id));

  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  const googleMapsUrl =
    place.google_maps_url ||
    (hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.display_name)}+${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.display_name)}`);

  const appleMapsUrl = hasCoords
    ? `https://maps.apple.com/?q=${encodeURIComponent(place.display_name)}&ll=${lat},${lng}`
    : `https://maps.apple.com/?q=${encodeURIComponent(place.display_name)}`;

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 16px 100px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Figtree', system-ui, sans-serif",
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#6B6F73",
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </button>
      </div>

      {/* Hero */}
      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E6E3DC",
          borderRadius: "24px",
          padding: "24px",
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
          marginBottom: "28px",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "260px",
            height: "240px",
            borderRadius: "20px",
            background: "linear-gradient(160deg, #8CC3D6, #2D6A82)",
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "#E3F0F4",
                  color: "#1B5E78",
                }}
              >
                {place.category || "Place"}
              </span>
              <span style={{ fontSize: "14px", color: "#6B6F73" }}>
                {[place.location?.city, place.location?.state_province, place.location?.country].filter(Boolean).join(", ")}
              </span>
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                fontSize: "clamp(24px, 5vw, 36px)",
                lineHeight: 1.15,
                fontWeight: 800,
                minWidth: 0,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {place.display_name}
            </h1>

            {place.aliases && place.aliases.length > 0 && (
              <div
                style={{
                  fontSize: "14px",
                  color: "#6B6F73",
                  marginBottom: "12px",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                Also known as {place.aliases.join(", ")}
              </div>
            )}

            {place.summary && (
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  lineHeight: 1.5,
                  color: "#4A4E52",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {place.summary}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setVisited((v) => !v)}
              style={{
                height: "42px",
                padding: "0 20px",
                borderRadius: "999px",
                border: 0,
                background: visited ? "#25623A" : "#1B1D1F",
                color: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {visited ? "Visited ✓" : "Mark visited"}
            </button>

            <ComingSoonButton
              featureId="trips"
              style={{
                height: "42px",
                padding: "0 18px",
                borderRadius: "999px",
                border: "1px solid #D9D5CB",
                background: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 700,
                color: "#1B1D1F",
                cursor: "pointer",
              }}
            >
              Add to trip
            </ComingSoonButton>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: "42px",
                padding: "0 16px",
                borderRadius: "999px",
                border: "1px solid #D9D5CB",
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                color: "#1B1D1F",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Google Maps
            </a>

            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: "42px",
                padding: "0 16px",
                borderRadius: "999px",
                border: "1px solid #D9D5CB",
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                color: "#1B1D1F",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
              Apple Maps
            </a>
          </div>
        </div>
      </section>

      {/* Two columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "24px",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Left Column: Guidance & Tips */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              borderRadius: "24px",
              padding: "24px",
              minWidth: 0,
              boxSizing: "border-box",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>About & Tips</h2>
            {place.details && place.details.length > 0 && (
              <p style={{ margin: "0 0 14px", fontSize: "15px", lineHeight: 1.5, color: "#4A4E52", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {place.details.join(" ")}
              </p>
            )}
            {place.tips && place.tips.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#4A4E52", fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {place.tips.map((t, idx) => (
                  <li key={idx} style={{ marginBottom: "6px" }}>{t}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>Tips from the reels will appear here.</div>
            )}
          </section>

          {/* Mentioned in reels */}
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              borderRadius: "24px",
              padding: "24px",
              minWidth: 0,
              boxSizing: "border-box",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>
              Mentioned in {relatedPosts.length} {relatedPosts.length === 1 ? "reel" : "reels"}
            </h2>
            {relatedPosts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}>
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.post_id}
                    to={`/post/${rp.post_id}`}
                    state={{ from: `/place/${place.place_id}` }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      textDecoration: "none",
                      color: "#1B1D1F",
                      padding: "8px 0",
                      borderBottom: "1px solid #EFEDE7",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "10px",
                        background: "linear-gradient(160deg, #8CC3D6, #2D6A82)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ fontSize: "14px", fontWeight: 600, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                      {rp.caption?.slice(0, 60) || "Saved reel"}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>No linked reels found.</div>
            )}
          </section>
        </div>

        {/* Right Column: Location */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              borderRadius: "24px",
              padding: "24px",
              minWidth: 0,
              boxSizing: "border-box",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>Location</h2>
            <div
              style={{
                height: "180px",
                borderRadius: "16px",
                background: "#EAE7DF",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                gap: "8px",
              }}
            >
              <div style={{ textAlign: "center", color: "#1B5E78" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>
                  {hasCoords
                    ? `${lat!.toFixed(4)}, ${lng!.toFixed(4)}`
                    : "Coordinates mapped"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1B5E78",
                    background: "#FFFFFF",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  Google Maps ↗
                </a>
                <a
                  href={appleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1B5E78",
                    background: "#FFFFFF",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  Apple Maps ↗
                </a>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#4A4E52", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {place.location?.display_name && (
                <div><b>Address:</b> {place.location.display_name}</div>
              )}
              {place.location?.city && <div><b>City:</b> {place.location.city}</div>}
              {place.location?.state_province && <div><b>State / Region:</b> {place.location.state_province}</div>}
              {place.location?.country && <div><b>Country:</b> {place.location.country}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

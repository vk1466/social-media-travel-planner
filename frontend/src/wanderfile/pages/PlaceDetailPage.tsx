import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import type { Place, SavedPost } from "../../api";

interface PlaceDetailPageProps {
  places: Place[];
  posts: SavedPost[];
}

export function PlaceDetailPage({ places, posts }: PlaceDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const place = places.find((p) => p.place_id === id);
  const [visited, setVisited] = useState(false);

  if (!place) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <EmptyState
          screenLabel="Place detail"
          headline="Place not found"
          description="This place is not in your saved library."
          primaryActionLabel="Back to Map"
          onPrimaryAction={() => {}}
          iconPath="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
          tint="#E3F0F4"
          ink="#1B5E78"
        />
      </main>
    );
  }

  const relatedPosts = posts.filter((p) => p.place_ids?.includes(place.place_id));

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "40px 24px 80px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <Link
          to="/map"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#6B6F73",
            textDecoration: "none",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Map
        </Link>
      </div>

      {/* Hero */}
      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E6E3DC",
          borderRadius: "28px",
          padding: "36px",
          display: "flex",
          gap: "36px",
          flexWrap: "wrap",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            width: "260px",
            height: "260px",
            borderRadius: "20px",
            background: "linear-gradient(160deg, #8CC3D6, #2D6A82)",
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
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

            <h1 style={{ margin: "0 0 10px", fontSize: "40px", lineHeight: 1.1, fontWeight: 800 }}>
              {place.display_name}
            </h1>

            {place.aliases && place.aliases.length > 0 && (
              <div style={{ fontSize: "14px", color: "#6B6F73", marginBottom: "12px" }}>
                Also known as {place.aliases.join(", ")}
              </div>
            )}

            {place.summary && (
              <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.5, color: "#4A4E52" }}>
                {place.summary}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setVisited((v) => !v)}
              style={{
                height: "44px",
                padding: "0 22px",
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
              {visited ? "Visited" : "Mark visited"}
            </button>

            <ComingSoonButton
              featureId="trips"
              style={{
                height: "44px",
                padding: "0 20px",
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

            {place.google_maps_url && (
              <a
                href={place.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  height: "44px",
                  padding: "0 20px",
                  borderRadius: "999px",
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#1B1D1F",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "28px" }}>
        {/* Left Column: Guidance & Tips */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>About & Tips</h2>
            {place.details && place.details.length > 0 && (
              <p style={{ margin: "0 0 14px", fontSize: "15px", lineHeight: 1.5, color: "#4A4E52" }}>
                {place.details.join(" ")}
              </p>
            )}
            {place.tips && place.tips.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#4A4E52", fontSize: "14px", lineHeight: 1.6 }}>
                {place.tips.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>Tips from the reels will appear here.</div>
            )}
          </section>

          {/* Mentioned in reels */}
          <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>
              Mentioned in {relatedPosts.length} reels
            </h2>
            {relatedPosts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.post_id}
                    to={`/post/${rp.post_id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      textDecoration: "none",
                      color: "#1B1D1F",
                      padding: "8px 0",
                      borderBottom: "1px solid #EFEDE7",
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
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>
                      {rp.caption?.slice(0, 50) || "Reel"}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>No linked reels found.</div>
            )}
          </section>
        </div>

        {/* Right Column: Location & mini map */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>Location</h2>
            <div style={{ height: "180px", borderRadius: "16px", background: "#EAE7DF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{ textAlign: "center", color: "#1B5E78" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>
                  {place.location?.latitude && place.location?.longitude
                    ? `${place.location.latitude.toFixed(4)}, ${place.location.longitude.toFixed(4)}`
                    : "Location mapped"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "#4A4E52" }}>
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

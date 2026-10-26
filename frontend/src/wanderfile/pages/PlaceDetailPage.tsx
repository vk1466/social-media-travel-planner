import { useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { Share2, Navigation, Compass } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { FeatureFlags } from "../comingSoon/featureRegistry";
import { useToast } from "../state/ToastContext";
import { getPostTitle, proxiedMediaUrl, capitalizePlaceName, getEffectiveAddress } from "../../postDisplayUtils";
import type { Place, SavedPost } from "../../api";

function MiniLocationMap({ lat, lng, displayName }: { lat: number; lng: number; displayName: string }) {
  return (
    <div
      style={{
        height: "180px",
        borderRadius: "16px",
        overflow: "hidden",
        position: "relative",
        marginBottom: "16px",
        border: "1px solid #E6E3DC",
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker
          position={[lat, lng]}
          icon={L.divIcon({
            className: "wf-place-marker",
            html: `<div style="
              width: 30px;
              height: 30px;
              border-radius: 999px;
              background: #1F6F8B;
              border: 3px solid #FFFFFF;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
              font-size: 14px;
            ">📍</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })}
        >
          <Tooltip direction="top" offset={[0, -16]}>
            {displayName}
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}

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
  const { showToast } = useToast();

  // Consistent back navigation based on history/location state, defaulting to Map
  const from = (location.state as { from?: string } | null)?.from;
  let backLabel = "Back to Map";
  let fallbackTo = "/map";
  if (from) {
    if (from.startsWith("/map")) {
      backLabel = "Back to Map";
      fallbackTo = "/map";
    } else if (from.startsWith("/library")) {
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

  const relatedPosts = posts.filter(
    (p) => p.place_ids?.includes(place.place_id) || place.source_post_ids?.includes(p.post_id),
  );
  const heroPost = relatedPosts.find((p) => p.thumbnail_url);
  const heroImageUrl = heroPost?.thumbnail_url
    ? proxiedMediaUrl(heroPost.thumbnail_url)
    : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";

  const displayName = capitalizePlaceName(place.display_name);
  const cleanTitle = (displayName || place.display_name || "").trim().toLowerCase();
  const rawTitle = (place.display_name || "").trim().toLowerCase();
  const distinctAliases = (place.aliases || [])
    .map((a) => capitalizePlaceName(a))
    .filter((a) => {
      const lower = a.trim().toLowerCase();
      return lower !== cleanTitle && lower !== rawTitle;
    });

  const summaryLower = (place.summary || "").trim().toLowerCase();

  // Filter details that are not identical or contained in the hero summary
  const distinctDetails = (place.details || []).filter((item) => {
    if (!summaryLower) return true;
    const itemLower = item.trim().toLowerCase();
    return (
      itemLower !== summaryLower &&
      !summaryLower.includes(itemLower) &&
      !itemLower.includes(summaryLower)
    );
  });

  const postTips = relatedPosts.flatMap((p) => p.trip_tips || []);
  const allTips = Array.from(new Set([...(place.tips || []), ...postTips].filter(Boolean)));

  // Filter tips that don't duplicate the summary or details
  const distinctTips = allTips.filter((tip) => {
    if (!summaryLower) return true;
    const tipLower = tip.trim().toLowerCase();
    if (tipLower === summaryLower || summaryLower.includes(tipLower) || tipLower.includes(summaryLower)) {
      return false;
    }
    return !distinctDetails.some((d) => {
      const dLower = d.trim().toLowerCase();
      return tipLower === dLower || dLower.includes(tipLower) || tipLower.includes(dLower);
    });
  });

  const hasDetails = distinctDetails.length > 0;
  const hasTips = distinctTips.length > 0;

  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  const effectiveAddress = getEffectiveAddress(place);

  const googleMapsUrl =
    place.google_maps_url ||
    (hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName || place.display_name)}+${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName || place.display_name)}`);

  const appleMapsUrl = hasCoords
    ? `https://maps.apple.com/?q=${encodeURIComponent(displayName || place.display_name)}&ll=${lat},${lng}`
    : `https://maps.apple.com/?q=${encodeURIComponent(displayName || place.display_name)}`;

  return (
    <main
      style={{
        maxWidth: "1040px",
        margin: "0 auto",
        padding: "24px 20px 60px",
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
      <section className="wf-place-hero">
        <div
          className="wf-place-hero-image"
          style={{
            backgroundImage: `url(${heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
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
              className="wf-type-h1"
              style={{
                margin: "0 0 10px",
                fontSize: "clamp(24px, 5vw, 36px)",
                lineHeight: 1.15,
                fontWeight: 800,
                minWidth: 0,
                wordBreak: "break-word",
                hyphens: "auto",
              }}
            >
              {displayName || place.display_name}
            </h1>

            {distinctAliases.length > 0 && (
              <div
                style={{
                  fontSize: "14px",
                  color: "#6B6F73",
                  marginBottom: "12px",
                  minWidth: 0,
                  wordBreak: "break-word",
                }}
              >
                Also known as {distinctAliases.join(", ")}
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
                height: "44px",
                padding: "0 20px",
                borderRadius: "var(--wf-radius-pill)",
                border: 0,
                background: visited ? "var(--wf-success)" : "var(--wf-text)",
                color: "var(--wf-bg)",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {visited ? "Visited ✓" : "Mark visited"}
            </button>

            {FeatureFlags.isEnabled("trips") && (
              <ComingSoonButton
                featureId="trips"
                style={{
                  height: "44px",
                  padding: "0 18px",
                  borderRadius: "var(--wf-radius-pill)",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface)",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--wf-text)",
                  cursor: "pointer",
                }}
              >
                Add to trip
              </ComingSoonButton>
            )}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: "44px",
                padding: "0 16px",
                borderRadius: "var(--wf-radius-pill)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--wf-text)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Navigation size={16} strokeWidth={2} />
              <span>Google Maps</span>
            </a>

            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: "44px",
                padding: "0 16px",
                borderRadius: "var(--wf-radius-pill)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--wf-text)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Compass size={16} strokeWidth={2} />
              <span>Apple Maps</span>
            </a>

            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Link copied to clipboard!");
                }
              }}
              style={{
                height: "44px",
                padding: "0 16px",
                borderRadius: "var(--wf-radius-pill)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--wf-text)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Share2 size={16} strokeWidth={2} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </section>

      {/* Two columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "24px",
          alignItems: "start",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Left Column: Guidance & Tips + Mentioned in Reels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          {(hasDetails || hasTips) && (
            <section
              style={{
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                borderRadius: "24px",
                padding: "24px",
                minWidth: 0,
                boxSizing: "border-box",
                wordBreak: "break-word",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>About & Tips</h2>
              {hasDetails && (
                <p style={{ margin: "0 0 14px", fontSize: "15px", lineHeight: 1.5, color: "#4A4E52", wordBreak: "break-word" }}>
                  {distinctDetails.join(" ")}
                </p>
              )}
              {hasTips && (
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#4A4E52", fontSize: "14px", lineHeight: 1.6, wordBreak: "break-word" }}>
                  {distinctTips.map((t, idx) => (
                    <li key={idx} style={{ marginBottom: "6px" }}>{t}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Mentioned in reels */}
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              borderRadius: "24px",
              padding: "24px",
              minWidth: 0,
              boxSizing: "border-box",
              wordBreak: "break-word",
            }}
          >
            <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 800 }}>
              Mentioned in {relatedPosts.length} {relatedPosts.length === 1 ? "reel" : "reels"}
            </h2>
            {relatedPosts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.post_id}
                    to={`/post/${rp.post_id}`}
                    state={{ from: `/place/${place.place_id}` }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      textDecoration: "none",
                      color: "#1B1D1F",
                      padding: "8px 0",
                      borderBottom: "1px solid #EFEDE7",
                      minWidth: 0,
                    }}
                  >
                    {rp.thumbnail_url ? (
                      <img
                        src={proxiedMediaUrl(rp.thumbnail_url) || ""}
                        alt=""
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "10px",
                          objectFit: "cover",
                          flexShrink: 0,
                          background: "#EAE7DF",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "10px",
                          background: "var(--wf-surface-2, #E8E6DF)",
                          color: "var(--wf-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        📍
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#1B1D1F",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {getPostTitle(rp)}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6B6F73",
                          marginTop: "2px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {rp.author_handle && <span>@{rp.author_handle}</span>}
                        <span>Instagram reel ↗</span>
                      </div>
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
              wordBreak: "break-word",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>Location</h2>
            {hasCoords ? (
              <MiniLocationMap lat={lat!} lng={lng!} displayName={place.display_name} />
            ) : (
              <div
                style={{
                  height: "140px",
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
                    Location not yet mapped
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1B5E78",
                  background: "#FFFFFF",
                  border: "1px solid #E6E3DC",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
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
                  border: "1px solid #E6E3DC",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Apple Maps ↗
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#4A4E52", minWidth: 0, wordBreak: "break-word" }}>
              {effectiveAddress && (
                <div><b>Address:</b> {effectiveAddress}</div>
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

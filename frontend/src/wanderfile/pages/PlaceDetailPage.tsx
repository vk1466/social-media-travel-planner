import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Share2, Navigation, Compass, Check, ExternalLink } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { FeatureFlags } from "../comingSoon/featureRegistry";
import { useToast } from "../state/ToastContext";
import { getPostTitle, proxiedMediaUrl, capitalizePlaceName, getEffectiveAddress } from "../../postDisplayUtils";
import { getCategoryVisual } from "../categoryVisuals";
import { cartoMaplibreStyle } from "../../maps";
import type { Place, SavedPost } from "../../api";

export interface FormattedTextResult {
  text: string;
  sourceUrls: string[];
}

export function parseFormattedText(raw: string | null | undefined): FormattedTextResult {
  if (!raw) return { text: "", sourceUrls: [] };
  const sourceUrls: string[] = [];
  let text = raw
    .replace(/\s*[([,]?(?:source_ref|source):\s*(https?:\/\/[^\s)\]]+)[)\]]?/gi, (_, url) => {
      const cleanUrl = url.replace(/[),;.]+$/, "");
      if (!sourceUrls.includes(cleanUrl)) {
        sourceUrls.push(cleanUrl);
      }
      return "";
    })
    .replace(/\s*[([,]?(?:source_ref|source):\s*[^)\]]+[)\]]?/gi, "")
    .trim();
  return { text, sourceUrls };
}

interface FormattedBullet {
  text: string;
  sourceUrl?: string;
}

function parseBullet(raw: string): FormattedBullet {
  const { text, sourceUrls } = parseFormattedText(raw);
  return { text, sourceUrl: sourceUrls[0] };
}

function MiniLocationMap({ lat, lng, displayName: _displayName, category }: { lat: number; lng: number; displayName: string; category?: string | null }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const visual = getCategoryVisual(category);
  const isDark =
    typeof document !== "undefined" &&
    (document.documentElement.getAttribute("data-theme") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: cartoMaplibreStyle(isDark),
      center: [lng, lat],
      zoom: 14,
      scrollZoom: false,
    });

    const el = document.createElement("div");
    el.className = "wf-place-marker";
    el.innerHTML = `<div style="
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: ${visual.hue};
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(16,24,40,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 14px;
    ">${visual.glyph}</div>`;

    new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    return () => {
      map.remove();
    };
  }, [lat, lng, isDark, visual.hue, visual.glyph]);

  return (
    <div
      style={{
        height: "200px",
        borderRadius: "16px",
        overflow: "hidden",
        position: "relative",
        marginBottom: "16px",
        border: "1px solid var(--line, #E7E6E3)",
      }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
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
          tint="var(--wf-surface-2, #E3F0F4)"
          ink="var(--wf-text, #1B5E78)"
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
  const placeVisual = getCategoryVisual(place.category);
  const cleanTitle = (displayName || place.display_name || "").trim().toLowerCase();
  const rawTitle = (place.display_name || "").trim().toLowerCase();
  const stripThe = (s: string) => s.trim().toLowerCase().replace(/^the\s+/, "");
  const normalizedTitle = stripThe(place.display_name || "");
  const distinctAliases = (place.aliases || [])
    .map((a) => capitalizePlaceName(a))
    .filter((a) => {
      const lower = a.trim().toLowerCase();
      const stripped = stripThe(a);
      return lower !== cleanTitle && lower !== rawTitle && stripped !== normalizedTitle;
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

  // Structured Key Facts (labeled rows)
  const keyFacts: { label: string; value: string }[] = [];
  if (place.facts?.rating != null) {
    const reviewsStr = place.facts.reviews_count ? ` (${place.facts.reviews_count.toLocaleString()} reviews)` : "";
    keyFacts.push({ label: "Rating", value: `★ ${place.facts.rating.toFixed(1)}${reviewsStr}` });
  }
  if (place.facts?.price_level != null && place.facts.price_level > 0) {
    keyFacts.push({ label: "Price level", value: "$".repeat(place.facts.price_level) });
  }
  if (place.facts?.opening_hours_text && place.facts.opening_hours_text.length > 0) {
    keyFacts.push({ label: "Hours", value: place.facts.opening_hours_text.join("; ") });
  }
  if (place.facts?.website_url) {
    keyFacts.push({ label: "Website", value: place.facts.website_url });
  }
  if (place.facts?.phone_number) {
    keyFacts.push({ label: "Phone", value: place.facts.phone_number });
  }
  if (place.facts?.admission_text) {
    keyFacts.push({ label: "Admission", value: place.facts.admission_text });
  }
  if (place.facts?.famous_for) {
    keyFacts.push({ label: "Famous for", value: place.facts.famous_for });
  }
  if (place.facts?.best_time_to_visit) {
    keyFacts.push({ label: "Best time to visit", value: place.facts.best_time_to_visit });
  }
  if (place.facts?.recommendations && place.facts.recommendations.length > 0) {
    keyFacts.push({ label: "Recommended", value: place.facts.recommendations.join(" · ") });
  }

  // Pure tips from creator & place notes only (no reel summaries or raw captions pasted into tips)
  const postTips = relatedPosts.flatMap((p) => p.trip_tips || []);
  const allTips = Array.from(new Set([...(place.tips || []), ...postTips].filter(Boolean)));
  const distinctTips = allTips.filter((t) => {
    const lower = t.toLowerCase();
    return !lower.startsWith("famous for:") && !lower.startsWith("best time to visit:");
  });

  const aboutText = distinctDetails.length > 0
    ? distinctDetails.join(" ")
    : (place.summary || null);

  const hasAboutOrTips = Boolean(aboutText) || distinctTips.length > 0;

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

  const isGenericBlurb = (summary?: string | null): boolean => {
    if (!summary) return true;
    const s = summary.trim().toLowerCase();
    if (s.startsWith("a notable ") || s.startsWith("notable ")) return true;
    if (/^a\s+\w+\s+in\s+[^.]+\.?$/i.test(s)) return true;
    return false;
  };

  const heroBlurb = !isGenericBlurb(place.summary)
    ? place.summary
    : (place.tips && place.tips.length > 0 && !isGenericBlurb(place.tips[0]))
    ? place.tips[0]
    : null;

  const cleanAddressLine = (() => {
    if (effectiveAddress) {
      const parts = [effectiveAddress];
      if (place.location?.city && !effectiveAddress.toLowerCase().includes(place.location.city.toLowerCase())) {
        parts.push(place.location.city);
      }
      if (place.location?.country && !effectiveAddress.toLowerCase().includes(place.location.country.toLowerCase())) {
        parts.push(place.location.country);
      }
      return parts.join(", ");
    }
    const fallbackParts = [place.location?.city, place.location?.state_province, place.location?.country].filter(Boolean);
    return fallbackParts.join(", ") || "Location details pending";
  })();

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
            color: "var(--wf-text-muted, var(--ink-2, #5E636B))",
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
            position: "relative",
            background: "var(--wf-surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <span style={{ fontSize: "48px" }}>{placeVisual.glyph}</span>
          {heroImageUrl && (
            <img
              src={heroImageUrl}
              alt={displayName || place.display_name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: placeVisual.tint,
                  color: placeVisual.hue,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{placeVisual.glyph}</span>
                <span>{placeVisual.name}</span>
              </span>
              <span style={{ fontSize: "14px", color: "var(--wf-text-muted, var(--ink-2, #5E636B))" }}>
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
                overflowWrap: "break-word",
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

            {heroBlurb && (() => {
              const { text } = parseFormattedText(heroBlurb);
              return (
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: 1.5,
                    color: "var(--wf-text-muted, #5E636B)",
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {text}
                </p>
              );
            })()}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setVisited((v) => !v)}
              aria-label={visited ? "Mark place as unvisited" : "Mark place as visited"}
              style={{
                height: "44px",
                padding: "0 20px",
                borderRadius: "var(--wf-radius-pill)",
                border: 0,
                background: visited ? "var(--wf-success, #1F9D6B)" : "var(--accent, #FF5A4E)",
                color: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Check size={16} strokeWidth={2.5} color="#FFFFFF" />
              <span>{visited ? "Visited" : "Mark visited"}</span>
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

      {/* Balanced 2-Column Grid: Left (Key Facts + About & Tips) + Right (Sticky Location Card) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "24px",
          alignItems: "start",
          marginBottom: "32px",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          {/* Labeled Key Facts Rows */}
          {keyFacts.length > 0 && (
            <section
              style={{
                background: "var(--wf-surface, #FFFFFF)",
                border: "1px solid var(--wf-border, #E6E3DC)",
                borderRadius: "24px",
                padding: "24px",
                minWidth: 0,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "var(--wf-text, #1B1D1F)" }}>Key Facts</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                  minWidth: 0,
                }}
              >
                {keyFacts.map((fact, idx) => {
                  const { text, sourceUrls } = parseFormattedText(fact.value);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--wf-text-muted, #5E636B)",
                        }}
                      >
                        {fact.label}
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--wf-text, #1B1D1F)",
                          lineHeight: 1.4,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {fact.label === "Phone" ? (
                          <a
                            href={`tel:${text.replace(/[^+\d]/g, "") || text}`}
                            style={{
                              color: "var(--wf-primary, #FF5A4E)",
                              textDecoration: "none",
                            }}
                          >
                            {text}
                          </a>
                        ) : fact.label === "Website" ? (
                          <a
                            href={text.startsWith("http") ? text : `https://${text}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--wf-primary, #FF5A4E)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>{text.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                            <ExternalLink size={12} strokeWidth={2} />
                          </a>
                        ) : (
                          text
                        )}
                        {sourceUrls.map((url, sIdx) => (
                          <a
                            key={sIdx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: "6px",
                              fontSize: "12px",
                              color: "var(--wf-primary, #FF5A4E)",
                              textDecoration: "none",
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            source ↗
                          </a>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* About & Tips Section */}
          {hasAboutOrTips && (
            <section
              style={{
                background: "var(--wf-surface, #FFFFFF)",
                border: "1px solid var(--wf-border, #E6E3DC)",
                borderRadius: "24px",
                padding: "24px",
                minWidth: 0,
                boxSizing: "border-box",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 800, color: "var(--wf-text, #1B1D1F)" }}>About & Tips</h2>
              {aboutText && (() => {
                const { text, sourceUrls } = parseFormattedText(aboutText);
                return (
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: "15px",
                      lineHeight: 1.6,
                      color: "var(--wf-text-muted, #5E636B)",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {text}
                    {sourceUrls.map((url, sIdx) => (
                      <a
                        key={sIdx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginLeft: "6px",
                          fontSize: "12px",
                          color: "var(--wf-primary, #FF5A4E)",
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "inline-block",
                        }}
                      >
                        source ↗
                      </a>
                    ))}
                  </p>
                );
              })()}
              {distinctTips.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--wf-text, #1B1D1F)", fontSize: "14px", lineHeight: 1.6, wordBreak: "break-word" }}>
                  {distinctTips.map((raw, idx) => {
                    const parsed = parseBullet(raw);
                    return (
                      <li key={idx} style={{ marginBottom: "8px" }}>
                        <span>{parsed.text}</span>
                        {parsed.sourceUrl && (
                          <a
                            href={parsed.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              color: "var(--wf-primary, #FF5A4E)",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            source ↗
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Sticky Location Card */}
        <section
          style={{
            background: "var(--wf-surface, #FFFFFF)",
            border: "1px solid var(--wf-border, #E6E3DC)",
            borderRadius: "24px",
            padding: "24px",
            minWidth: 0,
            boxSizing: "border-box",
            wordBreak: "break-word",
            position: "sticky",
            top: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800, color: "var(--wf-text, #1B1D1F)" }}>Location</h2>
          {hasCoords ? (
            <MiniLocationMap lat={lat!} lng={lng!} displayName={place.display_name} category={place.category} />
          ) : (
            <div
              style={{
                height: "140px",
                borderRadius: "16px",
                background: "var(--wf-surface-2, #EAE7DF)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                gap: "8px",
              }}
            >
              <div style={{ textAlign: "center", color: "var(--wf-accent, #1B5E78)" }}>
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
          {/* Single clean address line without duplicate pin icon */}
          <div
            style={{
              fontSize: "14px",
              color: "var(--wf-text, #1B1D1F)",
              lineHeight: 1.5,
              minWidth: 0,
              wordBreak: "break-word",
              fontWeight: 500,
            }}
          >
            {cleanAddressLine}
          </div>
        </section>
      </div>

      {/* Full-width Mentioned in reels across bottom */}
      <section
        style={{
          background: "var(--wf-surface, #FFFFFF)",
          border: "1px solid var(--wf-border, #E6E3DC)",
          borderRadius: "24px",
          padding: "24px",
          minWidth: 0,
          boxSizing: "border-box",
          wordBreak: "break-word",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "var(--wf-text, #1B1D1F)" }}>
          Mentioned in {relatedPosts.length} {relatedPosts.length === 1 ? "reel" : "reels"}
        </h2>
        {relatedPosts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
              gap: "16px",
              minWidth: 0,
            }}
          >
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
                  color: "var(--wf-text, #1B1D1F)",
                  padding: "12px",
                  borderRadius: "16px",
                  background: "var(--wf-surface-2, #F9F8F5)",
                  border: "1px solid var(--wf-border, #EFECE6)",
                  minWidth: 0,
                  transition: "background 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                    background: "var(--wf-surface-2, #E8E6DF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--wf-text-muted)",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>🎬</span>
                  {rp.thumbnail_url && (
                    <img
                      src={proxiedMediaUrl(rp.thumbnail_url) || ""}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "var(--wf-text, #1B1D1F)",
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
                      color: "var(--wf-text-muted, #5E636B)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rp.author_handle ? `@${rp.author_handle}` : ""}
                    </span>
                    <span style={{ color: "var(--accent, #FF5A4E)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                      Instagram reel ↗
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "14px", color: "var(--wf-text-muted, #6B6F73)" }}>No linked reels found.</div>
        )}
      </section>
    </main>
  );
}

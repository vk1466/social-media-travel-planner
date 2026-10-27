import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/ErrorBanner";
import { SkeletonGrid } from "../components/SkeletonCard";
import { ReelCard } from "../components/ReelCard";
import { EditPostModal } from "../components/EditPostModal";
import { useSavePipeline } from "../state/SavePipelineContext";
import { useToast } from "../state/ToastContext";
import { deletePost, parsePostId, type SavedPost, type Place } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import { getCategoryVisual } from "../categoryVisuals";

interface HomePageProps {
  posts: SavedPost[];
  places: Place[];
  loading: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
}

export function HomePage({ posts, places, loading, loadError, onRefresh }: HomePageProps) {
  const { inboxFailures, retryAllFailed, dismissAllFailed, openSaveSheet, saveUrl } = useSavePipeline();
  const { showToast } = useToast();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);
  const [removedPostIds, setRemovedPostIds] = useState<Set<string>>(new Set());
  const [pasteInput, setPasteInput] = useState("");
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  // Auto-read clipboard for instagram.com link on mount
  useEffect(() => {
    let active = true;
    const checkClipboard = async () => {
      try {
        if (!navigator.clipboard?.readText) return;
        const text = await navigator.clipboard.readText();
        if (!active) return;
        const trimmed = (text || "").trim();
        if (
          (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
          (trimmed.includes("instagram.com/") || trimmed.includes("instagr.am/"))
        ) {
          setClipboardUrl(trimmed);
        }
      } catch {
        // Ignored
      }
    };
    checkClipboard();
    return () => {
      active = false;
    };
  }, []);

  const handleDeletePost = (postToDelete: SavedPost) => {
    const id = postToDelete.post_id;
    setRemovedPostIds((prev) => new Set([...prev, id]));

    let undone = false;
    showToast({
      message: "Post deleted",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          setRemovedPostIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    });

    setTimeout(() => {
      if (!undone) {
        const { platform, nativeId } = parsePostId(id);
        deletePost(platform, nativeId)
          .then(() => onRefresh?.())
          .catch(() => {
            setRemovedPostIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            showToast({ message: "Failed to delete post. Restored." });
          });
      }
    }, 5000);
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const visiblePosts = posts.filter((p) => !removedPostIds.has(p.post_id));
  const hasSaves = visiblePosts.length > 0;

  // Stats
  const placesCount = places.length;
  const cities = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.location?.city).filter(Boolean))) as string[];
  }, [places]);
  const countries = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.location?.country).filter(Boolean))) as string[];
  }, [places]);

  // Top cities aggregation with photo
  const topCities = useMemo(() => {
    const cityMap = new Map<string, { count: number; image: string | null }>();
    for (const place of places) {
      const c = place.location?.city;
      if (!c) continue;
      const existing = cityMap.get(c) || { count: 0, image: null };
      existing.count += 1;
      if (!existing.image) {
        const matchingPost = visiblePosts.find((p) => place.source_post_ids?.includes(p.post_id));
        if (matchingPost?.thumbnail_url) {
          existing.image = matchingPost.thumbnail_url;
        }
      }
      cityMap.set(c, existing);
    }
    return Array.from(cityMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [places, visiblePosts]);

  // Rediscover: 3 serendipitous places
  const rediscoverPlaces = useMemo(() => {
    if (places.length <= 3) return places;
    return places.slice(1, 4);
  }, [places]);

  if (loading && visiblePosts.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <SkeletonGrid count={6} />
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px) 80px",
        display: "flex",
        flexDirection: "column",
        gap: "36px",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {loadError && <ErrorBanner message={loadError} onRetry={onRefresh} />}

      {/* Greeting & Header */}
      <section style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink, #16181B)",
            lineHeight: 1.2,
          }}
        >
          {hasSaves ? `${greeting}.` : "Save your first reel."}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "15px",
            color: "var(--ink-2, #5E636B)",
          }}
        >
          {hasSaves
            ? "Your saved spots, organized and ready to explore."
            : "Paste an Instagram reel to turn recommendations into a map."}
        </p>
      </section>

      {/* Paste Bar */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "8px 8px 8px 18px",
          background: "var(--surface, #FFFFFF)",
          border: "1px solid var(--line, #E7E6E3)",
          borderRadius: "999px",
          boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "16px", color: "var(--ink-2, #5E636B)" }}>🔗</span>
          <input
            type="text"
            placeholder="Paste an Instagram reel link..."
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && pasteInput.trim()) {
                await saveUrl(pasteInput.trim());
                openSaveSheet();
                setPasteInput("");
              }
            }}
            style={{
              flex: 1,
              height: "40px",
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--ink, #16181B)",
              fontSize: "15px",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={async () => {
              if (pasteInput.trim()) {
                await saveUrl(pasteInput.trim());
                openSaveSheet();
                setPasteInput("");
              } else {
                openSaveSheet();
              }
            }}
            style={{
              height: "40px",
              padding: "0 22px",
              borderRadius: "999px",
              border: 0,
              background: "var(--accent, #FF5A4E)",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              flexShrink: 0,
              transition: "opacity 0.15s ease",
            }}
          >
            Save
          </button>
        </div>

        {clipboardUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px 4px 0" }}>
            <button
              type="button"
              onClick={async () => {
                await saveUrl(clipboardUrl);
                openSaveSheet();
                setClipboardUrl(null);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "32px",
                padding: "0 14px",
                borderRadius: "999px",
                background: "var(--surface-2, #F3F3F1)",
                border: "1px solid var(--line, #E7E6E3)",
                color: "var(--ink, #16181B)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>📋 Paste link from clipboard</span>
            </button>
          </div>
        )}
      </section>

      {/* Inbox Attention Banner (if failed links) */}
      {inboxFailures.length > 0 && (
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "14px 20px",
            background: "var(--surface, #FFFFFF)",
            border: "1px solid var(--warn, #E59A1A)",
            borderRadius: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink, #16181B)" }}>
              {inboxFailures.length} {inboxFailures.length === 1 ? "link needs attention" : "links need attention"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => retryAllFailed()}
              style={{
                height: "32px",
                padding: "0 14px",
                borderRadius: "999px",
                background: "var(--surface-2, #F3F3F1)",
                border: "1px solid var(--line, #E7E6E3)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry all
            </button>
            <button
              type="button"
              onClick={() => dismissAllFailed()}
              style={{
                height: "32px",
                padding: "0 14px",
                borderRadius: "999px",
                background: "transparent",
                border: 0,
                color: "var(--ink-2, #5E636B)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {!hasSaves ? (
        /* Empty State */
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            padding: "40px 24px",
            background: "var(--surface, #FFFFFF)",
            borderRadius: "24px",
            border: "1px solid var(--line, #E7E6E3)",
            maxWidth: "600px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "20px",
                background: "var(--surface-2, #F3F3F1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              🗺️
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--ink, #16181B)" }}>
              Save your first reel
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--ink-2, #5E636B)" }}>
              Copy a reel from Instagram and paste it above to see your travel map come to life.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--ink, #16181B)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--ink, #16181B)" }}>Find a reel on Instagram</strong>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--ink-2, #5E636B)" }}>
                  Tap the share button on any travel or food reel and choose "Copy link".
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--accent, #FF5A4E)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--ink, #16181B)" }}>Paste & let AI organize</strong>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--ink-2, #5E636B)" }}>
                  We extract the exact spots, tips, and categories automatically.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--ink, #16181B)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--ink, #16181B)" }}>Explore your clean map</strong>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--ink-2, #5E636B)" }}>
                  Zero POI clutter. Clean pins in 8 category hues ready for your next trip.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Populated Home */
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {/* Recently Saved Rail */}
          <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink, #16181B)" }}>
                Recently saved
              </h2>
              <Link
                to="/library"
                style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent, #FF5A4E)", textDecoration: "none" }}
              >
                View all reels →
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gridAutoColumns: "clamp(160px, 22vw, 210px)",
                gap: "16px",
                overflowX: "auto",
                paddingBottom: "8px",
              }}
            >
              {visiblePosts.slice(0, 10).map((post) => (
                <ReelCard key={post.post_id} post={post} onDelete={handleDeletePost} />
              ))}
            </div>
          </section>

          {/* Desktop 12-Column Split: Stats + Top Cities (8 cols) & Rediscover / Mini map (4 cols) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "32px",
              alignItems: "start",
            }}
          >
            {/* Left Column: Stat Strip + Top Cities Rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Stat Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "16px",
                  padding: "20px",
                  background: "var(--surface, #FFFFFF)",
                  border: "1px solid var(--line, #E7E6E3)",
                  borderRadius: "20px",
                  boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
                  textAlign: "center",
                }}
              >
                <Link to="/map" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--ink, #16181B)", lineHeight: 1 }}>
                    {placesCount}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--ink-2, #5E636B)" }}>Places saved</span>
                </Link>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderLeft: "1px solid var(--line, #E7E6E3)", borderRight: "1px solid var(--line, #E7E6E3)" }}>
                  <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--ink, #16181B)", lineHeight: 1 }}>
                    {cities.length}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--ink-2, #5E636B)" }}>Cities</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--ink, #16181B)", lineHeight: 1 }}>
                    {countries.length}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--ink-2, #5E636B)" }}>Countries</span>
                </div>
              </div>

              {/* Top Cities Rail */}
              {topCities.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink, #16181B)" }}>
                      Top cities
                    </h2>
                    <Link
                      to="/map"
                      style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent, #FF5A4E)", textDecoration: "none" }}
                    >
                      Explore map →
                    </Link>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridAutoFlow: "column",
                      gridAutoColumns: "clamp(140px, 18vw, 180px)",
                      gap: "14px",
                      overflowX: "auto",
                      paddingBottom: "8px",
                    }}
                  >
                    {topCities.map((city) => {
                      const img = proxiedMediaUrl(city.image);
                      return (
                        <Link
                          key={city.name}
                          to={`/map`}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                            borderRadius: "16px",
                            overflow: "hidden",
                            height: "110px",
                            position: "relative",
                            display: "block",
                            background: "var(--surface-2, #F3F3F1)",
                            boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
                          }}
                          className="wf-card-hover"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={city.name}
                              loading="lazy"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                              🏛️
                            </div>
                          )}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)",
                            }}
                          />
                          <div style={{ position: "absolute", bottom: "10px", left: "12px", right: "12px", color: "#FFFFFF" }}>
                            <div style={{ fontSize: "15px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {city.name}
                            </div>
                            <div style={{ fontSize: "11px", opacity: 0.85 }}>
                              {city.count} {city.count === 1 ? "place" : "places"}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Rediscover (Serendipity) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink, #16181B)" }}>
                    Rediscover
                  </h2>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--accent, #FF5A4E)",
                      background: "rgba(255, 90, 78, 0.12)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    ✨ Serendipity
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {rediscoverPlaces.map((place) => {
                  const vis = getCategoryVisual(place.category);
                  const matchingPost = visiblePosts.find((p) => place.source_post_ids?.includes(p.post_id));
                  const thumb = matchingPost?.thumbnail_url ? proxiedMediaUrl(matchingPost.thumbnail_url) : null;

                  return (
                    <Link
                      key={place.place_id}
                      to={`/place/${place.place_id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        background: "var(--surface, #FFFFFF)",
                        borderRadius: "16px",
                        border: "1px solid var(--line, #E7E6E3)",
                        boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "all 0.15s ease",
                      }}
                      className="wf-card-hover"
                    >
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "12px",
                          overflow: "hidden",
                          flexShrink: 0,
                          background: vis.tint,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        <span style={{ fontSize: "22px" }}>{vis.glyph}</span>
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={place.display_name}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
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
                          {place.display_name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ink-2, #5E636B)" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: vis.hue }} />
                          <span>{vis.name}</span>
                          {place.location?.city && <span>· {place.location.city}</span>}
                        </div>
                      </div>

                      <span style={{ fontSize: "14px", color: "var(--ink-2, #5E636B)" }}>→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <EditPostModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSaved={() => onRefresh?.()}
      />
    </main>
  );
}

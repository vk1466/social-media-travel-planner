import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/ErrorBanner";
import { SkeletonGrid } from "../components/SkeletonCard";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { FeatureFlags } from "../comingSoon/featureRegistry";
import { PostCard } from "../components/PostCard";
import { EditPostModal } from "../components/EditPostModal";
import { useSavePipeline, toFriendlyErrorMessage } from "../state/SavePipelineContext";
import { useToast } from "../state/ToastContext";
import { deletePost, parsePostId, type SavedPost, type Place } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

interface HomePageProps {
  posts: SavedPost[];
  places: Place[];
  loading: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
}

export function HomePage({ posts, places, loading, loadError, onRefresh }: HomePageProps) {
  const { inboxFailures, retryAllFailed, retryFailedLink, removeFailedLink, dismissAllFailed, openSaveSheet, saveUrl } = useSavePipeline();
  const { showToast } = useToast();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);
  const [inboxExpanded, setInboxExpanded] = useState(false);
  const [removedPostIds, setRemovedPostIds] = useState<Set<string>>(new Set());
  const [pasteInput, setPasteInput] = useState("");
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

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

  const requestLocation = () => {
    if (!navigator.geolocation) {
      showToast({ message: "Geolocation not supported" });
      return;
    }
    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRequestingLocation(false);
        showToast({ message: "Location enabled" });
      },
      () => {
        setRequestingLocation(false);
        showToast({ message: "Location permission denied" });
      }
    );
  };

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

  const [dateStr] = useState(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  });

  if (loading && posts.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <SkeletonGrid count={6} />
      </main>
    );
  }

  const visiblePosts = posts.filter((p) => !removedPostIds.has(p.post_id));
  const hasSaves = visiblePosts.length > 0;
  const placesCount = places.length;
  const recipesCount = visiblePosts.filter((p) => p.content_category === "food").length;
  const titlesCount = visiblePosts.filter((p) => p.content_category === "movies").length;

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 24px) 80px",
        display: "flex",
        flexDirection: "column",
        gap: "36px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Figtree', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      {loadError && (
        <ErrorBanner
          message={loadError}
          onRetry={onRefresh}
        />
      )}

      {/* Top Paste a reel link bar */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "16px 20px",
          background: "var(--wf-surface)",
          border: "1px solid var(--wf-border-hairline)",
          borderRadius: "var(--wf-radius-card, 16px)",
          boxShadow: "var(--wf-shadow-sm)",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
              height: "44px",
              padding: "0 14px",
              borderRadius: "var(--wf-radius-pill, 9999px)",
              border: "1px solid var(--wf-border-hairline)",
              background: "var(--wf-surface-2)",
              color: "var(--wf-text)",
              fontSize: "14px",
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
              height: "44px",
              padding: "0 22px",
              borderRadius: "var(--wf-radius-pill, 9999px)",
              border: 0,
              background: "var(--wf-text)",
              color: "var(--wf-bg)",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Save
          </button>
        </div>

        {clipboardUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px" }}>
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
                minHeight: "44px",
                padding: "0 14px",
                borderRadius: "var(--wf-radius-pill, 9999px)",
                background: "var(--wf-surface-2)",
                border: "1px solid var(--wf-border)",
                color: "var(--wf-text)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>📋 Paste link from clipboard</span>
            </button>
          </div>
        )}
      </section>

      {/* Compact, collapsible notice for failed links */}
      {inboxFailures.length > 0 && (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "14px 20px",
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "18px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <span
                aria-hidden="true"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "#FBEBDD",
                  color: "#9A4513",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.01" />
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--wf-text)" }}>
                  {inboxFailures.length} {inboxFailures.length === 1 ? "link couldn't be read" : "links couldn't be read"}
                </span>
                <span style={{ fontSize: "13px", color: "var(--wf-text-muted)", marginLeft: "8px" }}>
                  Waiting in your inbox
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setInboxExpanded((prev) => !prev)}
                style={{
                  height: "34px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--wf-text)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {inboxExpanded ? "Hide details ▲" : "View details ▼"}
              </button>
              <button
                type="button"
                onClick={retryAllFailed}
                style={{
                  height: "34px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--wf-text)",
                  cursor: "pointer",
                }}
              >
                Retry all
              </button>
              <button
                type="button"
                onClick={dismissAllFailed}
                style={{
                  height: "34px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: 0,
                  background: "#ECECEA",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#4A4E52",
                  cursor: "pointer",
                }}
              >
                Dismiss all
              </button>
            </div>
          </div>

          {/* Individual items (Collapsible) */}
          {inboxExpanded && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                paddingTop: "12px",
                borderTop: "1px solid #EFEDE7",
              }}
            >
              {inboxFailures.map((item) => (
                <div
                  key={item.url}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 14px",
                    background: "#FBFAF7",
                    border: "1px solid #EFECE6",
                    borderRadius: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1B1D1F",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "540px",
                      }}
                      title={item.url}
                    >
                      {item.url}
                    </div>
                    <div style={{ fontSize: "13px", color: "#C53B27", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C53B27", flexShrink: 0 }} />
                      {toFriendlyErrorMessage(item.errorMessage, item.url)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => retryFailedLink(item.url)}
                      style={{
                        height: "32px",
                        padding: "0 14px",
                        borderRadius: "999px",
                        border: "1px solid #D9D5CB",
                        background: "#FFFFFF",
                        fontFamily: "inherit",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1B1D1F",
                        cursor: "pointer",
                      }}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFailedLink(item.url)}
                      style={{
                        height: "32px",
                        padding: "0 12px",
                        borderRadius: "999px",
                        border: 0,
                        background: "#ECECEA",
                        fontFamily: "inherit",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#4A4E52",
                        cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Header section */}
      <section
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6B6F73",
            }}
          >
            {dateStr}
          </div>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "clamp(26px, 7vw, 44px)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              fontWeight: 800,
              color: "#1B1D1F",
              maxWidth: "100%",
              wordBreak: "break-word",
            }}
          >
            {hasSaves ? "Pick something to do next." : "Nothing saved yet"}
          </h1>
        </div>
        {hasSaves && (
          <div style={{ fontSize: "15px", color: "#6B6F73" }}>
            {pluralize(posts.length, "save")} · {pluralize(placesCount, "place")} · {pluralize(recipesCount, "recipe")} · {titlesCount} to watch
          </div>
        )}
      </section>

      {!hasSaves ? (
        /* Empty Home matching Empty-States & Mobile-Empty-Home */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <p style={{ margin: 0, fontSize: "16px", color: "#4A4E52" }}>
            Paste a link and it will show up here, already filed.
          </p>

          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              borderRadius: "24px",
              padding: "28px",
              maxWidth: "600px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: "20px", letterSpacing: "-0.02em", fontWeight: 800 }}>
                Get started
              </h2>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#6B6F73" }}>0 of 3</span>
            </div>
            <div
              style={{
                display: "flex",
                height: "6px",
                borderRadius: "999px",
                background: "#ECECEA",
                margin: "14px 0 10px",
              }}
            >
              <div style={{ width: "4%", background: "#1B1D1F", borderRadius: "999px" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 0",
                  borderBottom: "1px solid #EFEDE7",
                  fontSize: "15px",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    flex: "none",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 800,
                    background: "#1B1D1F",
                    color: "#FFFFFF",
                  }}
                >
                  1
                </span>
                Save a link
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 0",
                  borderBottom: "1px solid #EFEDE7",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#6B6F73",
                }}
              >
                <span
                  style={{
                    flex: "none",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 800,
                    background: "#ECECEA",
                    color: "#6B6F73",
                  }}
                >
                  2
                </span>
                Look at your library
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 0",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#6B6F73",
                }}
              >
                <span
                  style={{
                    flex: "none",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 800,
                    background: "#ECECEA",
                    color: "#6B6F73",
                  }}
                >
                  3
                </span>
                Make a collection
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => openSaveSheet()}
                style={{
                  height: "46px",
                  padding: "0 24px",
                  borderRadius: "999px",
                  border: 0,
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Paste a link
              </button>
            </div>
          </section>

          <section
            style={{
              border: "2px dashed #C9C5BA",
              background: "#FBFAF7",
              borderRadius: "20px",
              padding: "20px 24px",
              maxWidth: "600px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Collections group your saves</div>
            <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.5, color: "#6B6F73" }}>
              We'll suggest one when you save a few similar posts.
            </div>
          </section>
        </div>
      ) : (
        /* Populated Home matching Main.dc.html */
        <>
          {/* Smart views */}
          <section style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", maxWidth: "100%", boxSizing: "border-box" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6B6F73",
                marginRight: "6px",
              }}
            >
              Smart views
            </span>
            <Link
              to="/library?tag=weekend"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "38px",
                padding: "0 16px",
                borderRadius: "999px",
                background: "var(--wf-surface)",
                border: "1px solid var(--wf-border)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "var(--wf-text)",
              }}
            >
              Weekend ideas
            </Link>
            <Link
              to="/library?category=food"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "38px",
                padding: "0 16px",
                borderRadius: "999px",
                background: "var(--wf-surface)",
                border: "1px solid var(--wf-border)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "var(--wf-text)",
              }}
            >
              Quick to cook
            </Link>
            <Link
              to="/library?status=unvisited"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "38px",
                padding: "0 16px",
                borderRadius: "999px",
                background: "var(--wf-surface)",
                border: "1px solid var(--wf-border)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "var(--wf-text)",
              }}
            >
              Not tried yet
            </Link>
            <Link
              to="/library?category=movies"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "38px",
                padding: "0 16px",
                borderRadius: "999px",
                background: "var(--wf-surface)",
                border: "1px solid var(--wf-border)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "var(--wf-text)",
              }}
            >
              Tonight's watch
            </Link>
          </section>

          <section style={{ display: "flex", gap: "24px", flexWrap: "wrap", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            {places.length > 0 ? (() => {
              const heroPlace = places[0];
              const heroPost = posts.find(
                (p) =>
                  heroPlace.source_post_ids?.includes(p.post_id) ||
                  p.place_ids?.includes(heroPlace.place_id),
              );
              const heroRawImage = heroPost?.thumbnail_url;
              const heroImageUrl = heroRawImage
                ? proxiedMediaUrl(heroRawImage)
                : "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80";

              return (
                <div
                  style={{
                    flex: "2 1 320px",
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    minHeight: "360px",
                    borderRadius: "28px",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "clamp(20px, 5vw, 32px)",
                    boxSizing: "border-box",
                    background: "var(--wf-surface-2, #20242A)",
                    color: "#FFFFFF",
                  }}
                >
                  {heroImageUrl ? (
                    <>
                      <img
                        src={heroImageUrl}
                        alt={heroPlace.display_name}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          zIndex: 0,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "rgba(0, 0, 0, 0.45)",
                          zIndex: 1,
                        }}
                      />
                    </>
                  ) : null}
                  <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        alignSelf: "flex-start",
                        fontSize: "13px",
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      Next up · Want to go
                    </span>
                    <h2
                      style={{
                        margin: "14px 0 4px",
                        fontSize: "56px",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                        fontWeight: 800,
                      }}
                    >
                      {heroPlace.display_name}
                    </h2>
                    <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.88)" }}>
                      {[heroPlace.location?.city, heroPlace.location?.state_province, heroPlace.location?.country].filter(Boolean).join(", ")}
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                      <Link
                        to={`/map?place=${heroPlace.place_id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          height: "46px",
                          padding: "0 22px",
                          borderRadius: "999px",
                          background: "#FFFFFF",
                          color: "#1B1D1F",
                          fontSize: "15px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Open on map
                      </Link>
                      <Link
                        to={`/place/${heroPlace.place_id}`}
                        state={{ from: "/" }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          height: "46px",
                          padding: "0 22px",
                          borderRadius: "999px",
                          border: "1px solid rgba(255,255,255,0.5)",
                          background: "rgba(255,255,255,0.12)",
                          color: "#FFFFFF",
                          fontSize: "15px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })() : (() => {
              const latestPost = posts[0];
              const latestImageUrl = latestPost?.thumbnail_url ? proxiedMediaUrl(latestPost.thumbnail_url) : null;
              return (
                <div
                  style={{
                    flex: "2 1 320px",
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    minHeight: "360px",
                    borderRadius: "28px",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "clamp(20px, 5vw, 32px)",
                    boxSizing: "border-box",
                    background: "var(--wf-surface-2, #20242A)",
                    color: "#FFFFFF",
                  }}
                >
                  {latestImageUrl ? (
                    <>
                      <img
                        src={latestImageUrl}
                        alt=""
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          zIndex: 0,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "rgba(0, 0, 0, 0.45)",
                          zIndex: 1,
                        }}
                      />
                    </>
                  ) : null}
                  <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        alignSelf: "flex-start",
                        fontSize: "13px",
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      Latest save
                    </span>
                    <h2 style={{ margin: "14px 0 4px", fontSize: "40px", lineHeight: 1.1, fontWeight: 800 }}>
                      {posts[0]?.caption?.slice(0, 50) || "Saved Reel"}
                    </h2>
                    <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                      <Link
                        to={`/post/${posts[0]?.post_id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          height: "46px",
                          padding: "0 22px",
                          borderRadius: "999px",
                          background: "#FFFFFF",
                          color: "#1B1D1F",
                          fontSize: "15px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Collections panel */}
            <div
              style={{
                flex: "1 1 300px",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                borderRadius: "28px",
                padding: "20px 12px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 14px 8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6F73" }}>
                  Collections
                </span>
                <Link to="/collections" style={{ fontSize: "14px", fontWeight: 700, textDecoration: "none", color: "#1B1D1F" }}>
                  All
                </Link>
              </div>

              <Link
                to="/map"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 14px",
                  borderRadius: "18px",
                  textDecoration: "none",
                  color: "#1B1D1F",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "13px",
                    background: "#E3F0F4",
                    color: "#1B5E78",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: "17px", fontWeight: 700 }}>Map</span>
                  <span style={{ display: "block", fontSize: "13px", color: "#6B6F73" }}>Everything with a location</span>
                </span>
                <span style={{ fontSize: "22px", fontWeight: 800 }}>{placesCount}</span>
              </Link>

              <Link
                to="/collections/recipes"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 14px",
                  borderRadius: "18px",
                  textDecoration: "none",
                  color: "#1B1D1F",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "13px",
                    background: "#FBEBDD",
                    color: "#9A4513",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" />
                    <path d="M17 21V3c-2.5 1.5-3 5-3 8h3" />
                  </svg>
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: "17px", fontWeight: 700 }}>Recipes</span>
                  <span style={{ display: "block", fontSize: "13px", color: "#6B6F73" }}>Recipe kit</span>
                </span>
                <span style={{ fontSize: "22px", fontWeight: 800 }}>{recipesCount}</span>
              </Link>

              <Link
                to="/collections/watch"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 14px",
                  borderRadius: "18px",
                  textDecoration: "none",
                  color: "#1B1D1F",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "13px",
                    background: "#ECE8F7",
                    color: "#4B3C8C",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="m10 9.5 5 2.5-5 2.5z" />
                  </svg>
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: "17px", fontWeight: 700 }}>Watch</span>
                  <span style={{ display: "block", fontSize: "13px", color: "#6B6F73" }}>Watch kit</span>
                </span>
                <span style={{ fontSize: "22px", fontWeight: 800 }}>{titlesCount}</span>
              </Link>

              {/* Dashed suggestion */}
              {FeatureFlags.isEnabled("new-kits") && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginTop: "6px",
                    padding: "14px",
                    borderRadius: "18px",
                    border: "2px dashed #C9C5BA",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "13px",
                      background: "#E4F2E7",
                      color: "#25623A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: "16px", fontWeight: 700 }}>Workouts?</span>
                    <span style={{ display: "block", fontSize: "13px", color: "#6B6F73" }}>A few saves look alike. Routine kit.</span>
                  </span>
                  <ComingSoonButton
                    featureId="new-kits"
                    style={{
                      height: "36px",
                      padding: "0 14px",
                      borderRadius: "999px",
                      border: 0,
                      background: "#1B1D1F",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    Create
                  </ComingSoonButton>
                </div>
              )}
            </div>
          </section>

          {/* Trip idea section */}
          {FeatureFlags.isEnabled("trips") && (
            <section
              style={{
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
                alignItems: "center",
                padding: "28px 32px",
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                borderRadius: "28px",
              }}
            >
              <div style={{ flex: "1 1 320px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1B5E78" }}>
                  Trip idea
                </div>
                <h2 style={{ margin: "8px 0 6px", fontSize: "28px", lineHeight: 1.15, letterSpacing: "-0.02em", fontWeight: 800 }}>
                  A weekend itinerary
                </h2>
                <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.5, color: "#6B6F73" }}>
                  Several places you saved sit in the same area. Turn them into a day-by-day plan in one click.
                </p>
              </div>
              <div style={{ flex: "2 1 480px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {places.slice(0, 5).map((place) => (
                  <span
                    key={place.place_id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      height: "40px",
                      padding: "0 16px",
                      borderRadius: "999px",
                      background: "#F6F5F1",
                      border: "1px solid #E6E3DC",
                      fontSize: "15px",
                      fontWeight: 600,
                    }}
                  >
                    <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1F6F8B" }} />
                    {place.display_name}
                  </span>
                ))}
              </div>
              <ComingSoonButton
                featureId="trips"
                style={{
                  height: "48px",
                  padding: "0 24px",
                  borderRadius: "999px",
                  border: 0,
                  background: "#1B1D1F",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Build itinerary
              </ComingSoonButton>
            </section>
          )}

          {/* Recently saved section (5 cards) */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.02em", fontWeight: 800 }}>
                Recently saved
              </h2>
              <Link to="/library" style={{ fontSize: "15px", fontWeight: 700, textDecoration: "none", color: "var(--wf-accent)" }}>
                See all {visiblePosts.length}
              </Link>
            </div>
            <div className="wf-responsive-grid">
              {visiblePosts.slice(0, 5).map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  onEdit={(p) => setEditingPost(p)}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          </section>

          {/* Near you row (Location requested only here) */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.02em", fontWeight: 800 }}>
                Near you
              </h2>
              <Link to="/map" style={{ fontSize: "15px", fontWeight: 700, textDecoration: "none", color: "var(--wf-accent)" }}>
                Open map
              </Link>
            </div>

            {!userLocation ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "20px 24px",
                  background: "var(--wf-surface)",
                  border: "1px solid var(--wf-border-hairline)",
                  borderRadius: "var(--wf-radius-card, 16px)",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--wf-text)" }}>
                    Find saved spots around you
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--wf-text-muted)", marginTop: "4px" }}>
                    We only check your location when you tap this button to show nearby places.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={requestingLocation}
                  style={{
                    height: "44px",
                    minHeight: "44px",
                    padding: "0 20px",
                    borderRadius: "var(--wf-radius-pill, 9999px)",
                    background: "var(--wf-accent)",
                    color: "var(--wf-surface)",
                    fontSize: "14px",
                    fontWeight: 700,
                    border: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                  {requestingLocation ? "Finding location..." : "Share location"}
                </button>
              </div>
            ) : (
              <div className="wf-responsive-grid">
                {places.slice(0, 5).map((place) => (
                  <Link
                    key={place.place_id}
                    to={`/place/${place.place_id}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "16px",
                      background: "var(--wf-surface)",
                      border: "1px solid var(--wf-border-hairline)",
                      borderRadius: "var(--wf-radius-card, 16px)",
                      textDecoration: "none",
                      color: "var(--wf-text)",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          background: "var(--wf-surface-2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--wf-accent)",
                        }}
                      >
                        📍
                      </span>
                      <div style={{ fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {place.display_name}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
                      {[place.location?.city, place.location?.state_province].filter(Boolean).join(", ") || "Saved location"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Your trips row */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.02em", fontWeight: 800 }}>
                Your trips
              </h2>
              <Link to="/collections" style={{ fontSize: "15px", fontWeight: 700, textDecoration: "none", color: "var(--wf-accent)" }}>
                All collections
              </Link>
            </div>
            <div className="wf-responsive-grid">
              <Link
                to="/collections"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "140px",
                  padding: "20px",
                  background: "var(--wf-surface)",
                  border: "1px solid var(--wf-border-hairline)",
                  borderRadius: "var(--wf-radius-card, 16px)",
                  textDecoration: "none",
                  color: "var(--wf-text)",
                }}
              >
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--wf-accent)", letterSpacing: "0.05em" }}>
                    Collection
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px" }}>
                    Weekend Getaway
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
                  {places.length} places saved
                </div>
              </Link>

              <Link
                to="/map"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "140px",
                  padding: "20px",
                  background: "var(--wf-surface)",
                  border: "1px solid var(--wf-border-hairline)",
                  borderRadius: "var(--wf-radius-card, 16px)",
                  textDecoration: "none",
                  color: "var(--wf-text)",
                }}
              >
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--wf-accent)", letterSpacing: "0.05em" }}>
                    Map Trip
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px" }}>
                    Road Trip Stops
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
                  View route on map →
                </div>
              </Link>
            </div>
          </section>
        </>
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

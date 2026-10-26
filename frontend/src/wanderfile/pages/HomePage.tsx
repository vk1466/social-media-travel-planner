import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/ErrorBanner";
import { SkeletonGrid } from "../components/SkeletonCard";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { PostCard } from "../components/PostCard";
import { EditPostModal } from "../components/EditPostModal";
import { useSavePipeline } from "../state/SavePipelineContext";
import { deletePost, parsePostId, type SavedPost, type Place } from "../../api";

interface HomePageProps {
  posts: SavedPost[];
  places: Place[];
  loading: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
}

export function HomePage({ posts, places, loading, loadError, onRefresh }: HomePageProps) {
  const { inboxFailures, retryAllFailed, retryFailedLink, removeFailedLink, openSaveSheet } = useSavePipeline();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);

  const handleDeletePost = async (postToDelete: SavedPost) => {
    try {
      const { platform, nativeId } = parsePostId(postToDelete.post_id);
      await deletePost(platform, nativeId);
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
    }
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

  const hasSaves = posts.length > 0;
  const placesCount = places.length;
  const recipesCount = posts.filter((p) => p.content_category === "food").length;
  const titlesCount = posts.filter((p) => p.content_category === "movies").length;

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "40px 24px 80px",
        display: "flex",
        flexDirection: "column",
        gap: "36px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
    >
      {loadError && (
        <ErrorBanner
          message={loadError}
          onRetry={onRefresh}
        />
      )}

      {/* Inbox card for failed links */}
      {inboxFailures.length > 0 && (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px 24px",
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#FBEBDD",
                color: "#9A4513",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.01" />
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: "240px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1B1D1F" }}>
                {inboxFailures.length} {inboxFailures.length === 1 ? "link couldn't be read" : "links couldn't be read"}
              </div>
              <div style={{ fontSize: "14px", color: "#6B6F73", marginTop: "2px" }}>
                Waiting in your inbox. You can retry or dismiss individual items below.
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={retryAllFailed}
                style={{
                  height: "38px",
                  padding: "0 16px",
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
                Retry all ({inboxFailures.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  inboxFailures.forEach((f) => removeFailedLink(f.url));
                }}
                style={{
                  height: "38px",
                  padding: "0 16px",
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
                Dismiss all
              </button>
            </div>
          </div>

          {/* Individual items */}
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
                <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "3px" }}>
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
                    {item.errorMessage}
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
              fontSize: "44px",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: 800,
              color: "#1B1D1F",
            }}
          >
            {hasSaves ? "Pick something to do next." : "Nothing saved yet"}
          </h1>
        </div>
        {hasSaves && (
          <div style={{ fontSize: "15px", color: "#6B6F73" }}>
            {posts.length} saves · {placesCount} places · {recipesCount} recipes · {titlesCount} to watch
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
          <section style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "#1B1D1F",
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
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "#1B1D1F",
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
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "#1B1D1F",
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
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "#1B1D1F",
              }}
            >
              Tonight's watch
            </Link>
          </section>

          {/* Hero next up card & Collections panel */}
          <section style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {places.length > 0 ? (
              <div
                style={{
                  flex: "2 1 640px",
                  minHeight: "440px",
                  borderRadius: "28px",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "32px",
                  boxSizing: "border-box",
                  background:
                    "linear-gradient(180deg, rgba(20,12,8,0) 30%, rgba(20,12,8,0.78) 100%), linear-gradient(120deg, #C98A5B 0%, #8E4A2B 45%, #3A2217 100%)",
                  color: "#FFFFFF",
                }}
              >
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.2)",
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
                  {places[0].display_name}
                </h2>
                <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.88)" }}>
                  {[places[0].location?.city, places[0].location?.state_province, places[0].location?.country].filter(Boolean).join(", ")}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                  <Link
                    to={`/map?place=${places[0].place_id}`}
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
                    to={`/place/${places[0].place_id}`}
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
            ) : (
              <div
                style={{
                  flex: "2 1 640px",
                  minHeight: "440px",
                  borderRadius: "28px",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "32px",
                  boxSizing: "border-box",
                  background:
                    "linear-gradient(180deg, rgba(20,12,8,0) 30%, rgba(20,12,8,0.78) 100%), linear-gradient(120deg, #5B8EC9 0%, #2B4E8E 45%, #17243A 100%)",
                  color: "#FFFFFF",
                }}
              >
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.2)",
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
            )}

            {/* Collections panel */}
            <div
              style={{
                flex: "1 1 340px",
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                borderRadius: "28px",
                padding: "20px 12px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
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
            </div>
          </section>

          {/* Trip idea section */}
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

          {/* Recently saved section */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.02em", fontWeight: 800 }}>
                Recently saved
              </h2>
              <Link to="/library" style={{ fontSize: "15px", fontWeight: 700, textDecoration: "none", color: "#1B1D1F" }}>
                See all {posts.length}
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "20px",
              }}
            >
              {posts.slice(0, 6).map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  onEdit={(p) => setEditingPost(p)}
                  onDelete={handleDeletePost}
                />
              ))}
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

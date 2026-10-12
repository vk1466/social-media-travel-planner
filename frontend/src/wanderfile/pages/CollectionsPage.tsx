import { Link } from "react-router-dom";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import type { SavedPost, Place } from "../../api";

interface CollectionsPageProps {
  posts: SavedPost[];
  places: Place[];
}

export function CollectionsPage({ posts, places }: CollectionsPageProps) {
  const placesCount = places.length;
  const recipesCount = posts.filter((p) => p.content_category === "food").length;
  const titlesCount = posts.filter((p) => p.content_category === "movies").length;

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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "32px" }}>
        <h1 style={{ margin: 0, fontSize: "40px", letterSpacing: "-0.03em", fontWeight: 800 }}>
          Collections
        </h1>
        <ComingSoonButton
          featureId="make-collection"
          style={{
            height: "44px",
            padding: "0 20px",
            borderRadius: "999px",
            border: 0,
            background: "#1B1D1F",
            color: "#FFFFFF",
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start a collection
        </ComingSoonButton>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Map collection card */}
        <Link
          to="/map"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "24px",
            padding: "24px",
            textDecoration: "none",
            color: "#1B1D1F",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              aria-hidden="true"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "#E3F0F4",
                color: "#1B5E78",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <span style={{ fontSize: "28px", fontWeight: 800 }}>{placesCount}</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Map</h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73" }}>
              Every saved post with a location
            </p>
          </div>
        </Link>

        {/* Recipes collection card */}
        <Link
          to="/collections/recipes"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "24px",
            padding: "24px",
            textDecoration: "none",
            color: "#1B1D1F",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              aria-hidden="true"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "#FBEBDD",
                color: "#9A4513",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" />
                <path d="M17 21V3c-2.5 1.5-3 5-3 8h3" />
              </svg>
            </span>
            <span style={{ fontSize: "28px", fontWeight: 800 }}>{recipesCount}</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Recipes</h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73" }}>
              Ingredients, steps, timers, servings · Recipe kit
            </p>
          </div>
        </Link>

        {/* Watch collection card */}
        <Link
          to="/collections/watch"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "24px",
            padding: "24px",
            textDecoration: "none",
            color: "#1B1D1F",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              aria-hidden="true"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "#ECE8F7",
                color: "#4B3C8C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m10 9.5 5 2.5-5 2.5z" />
              </svg>
            </span>
            <span style={{ fontSize: "28px", fontWeight: 800 }}>{titlesCount}</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Watch</h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73" }}>
              Movies and series to stream · Title kit
            </p>
          </div>
        </Link>

        {/* Suggested collection card */}
        <div
          style={{
            border: "2px dashed #C9C5BA",
            background: "#FBFAF7",
            borderRadius: "24px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "#E4F2E7",
                  color: "#25623A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#25623A" }}>
                Suggested
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>Workouts?</h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73" }}>
              A few saves look alike. Routine kit.
            </p>
          </div>

          <ComingSoonButton
            featureId="new-kits"
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "999px",
              border: 0,
              background: "#1B1D1F",
              color: "#FFFFFF",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            Create
          </ComingSoonButton>
        </div>
      </div>
    </main>
  );
}

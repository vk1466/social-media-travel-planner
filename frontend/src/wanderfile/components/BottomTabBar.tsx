import { Link, useLocation } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";

export function BottomTabBar() {
  const location = useLocation();
  const { openSaveSheet, isSaveSheetOpen } = useSavePipeline();

  // Hide bottom tab bar on detail pages, onboarding, or when save sheet is open
  const isDetailPage =
    location.pathname.startsWith("/post/") ||
    location.pathname.startsWith("/place/") ||
    location.pathname === "/welcome";

  if (isDetailPage || isSaveSheetOpen) {
    return null;
  }

  const isCurrent = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      aria-label="Main"
      className="wf-mobile-only"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "84px",
        boxSizing: "border-box",
        padding: "8px 12px 20px",
        background: "#FFFFFF",
        borderTop: "1px solid #E6E3DC",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 90,
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          minWidth: "56px",
          fontSize: "12px",
          fontWeight: isCurrent("/") ? 700 : 600,
          textDecoration: "none",
          color: isCurrent("/") ? "#1B1D1F" : "#6B6F73",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
        </svg>
        Home
      </Link>

      <Link
        to="/library"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          minWidth: "56px",
          fontSize: "12px",
          fontWeight: isCurrent("/library") ? 700 : 600,
          textDecoration: "none",
          color: isCurrent("/library") ? "#1B1D1F" : "#6B6F73",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
        Library
      </Link>

      <button
        type="button"
        aria-label="Save a link"
        onClick={() => openSaveSheet()}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#1B1D1F",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          marginTop: "-18px",
          boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
          border: 0,
          cursor: "pointer",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <Link
        to="/map"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          minWidth: "56px",
          fontSize: "12px",
          fontWeight: isCurrent("/map") ? 700 : 600,
          textDecoration: "none",
          color: isCurrent("/map") ? "#1B1D1F" : "#6B6F73",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        Map
      </Link>

      <Link
        to="/collections"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          minWidth: "56px",
          fontSize: "12px",
          fontWeight: isCurrent("/collections") ? 700 : 600,
          textDecoration: "none",
          color: isCurrent("/collections") ? "#1B1D1F" : "#6B6F73",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m12 4 9 5-9 5-9-5z" />
          <path d="m3 14 9 5 9-5" />
        </svg>
        Collections
      </Link>
    </nav>
  );
}

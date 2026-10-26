import { Link, useLocation } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";

export function BottomTabBar() {
  const location = useLocation();
  const { openSaveSheet, isSaveSheetOpen } = useSavePipeline();

  // Hide bottom tab bar on post detail, onboarding, or when save sheet is open
  const isDetailPage =
    location.pathname.startsWith("/post/") ||
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
        width: "100%",
        maxWidth: "100vw",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
        padding: "4px 6px env(safe-area-inset-bottom, 0px)",
        background: "var(--wf-surface)",
        borderTop: "1px solid var(--wf-border-hairline)",
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
          justifyContent: "center",
          gap: "2px",
          minWidth: "44px",
          minHeight: "44px",
          flex: 1,
          maxWidth: "68px",
          fontSize: "11px",
          fontWeight: isCurrent("/") ? 700 : 500,
          textDecoration: "none",
          color: isCurrent("/") ? "var(--wf-text)" : "var(--wf-text-muted)",
        }}
      >
        <svg
          width="22"
          height="22"
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
        <span>Home</span>
      </Link>

      <Link
        to="/library"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          minWidth: "44px",
          minHeight: "44px",
          flex: 1,
          maxWidth: "68px",
          fontSize: "11px",
          fontWeight: isCurrent("/library") ? 700 : 500,
          textDecoration: "none",
          color: isCurrent("/library") ? "var(--wf-text)" : "var(--wf-text-muted)",
        }}
      >
        <svg
          width="22"
          height="22"
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
        <span>Library</span>
      </Link>

      <button
        type="button"
        aria-label="Save a link"
        onClick={() => openSaveSheet()}
        style={{
          width: "48px",
          height: "48px",
          minWidth: "48px",
          minHeight: "48px",
          flexShrink: 0,
          borderRadius: "50%",
          background: "var(--wf-accent)",
          color: "var(--wf-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          marginTop: "-12px",
          boxShadow: "var(--wf-shadow-md)",
          border: 0,
          cursor: "pointer",
        }}
      >
        <svg
          width="24"
          height="24"
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
          justifyContent: "center",
          gap: "2px",
          minWidth: "44px",
          minHeight: "44px",
          flex: 1,
          maxWidth: "68px",
          fontSize: "11px",
          fontWeight: isCurrent("/map") ? 700 : 500,
          textDecoration: "none",
          color: isCurrent("/map") ? "var(--wf-text)" : "var(--wf-text-muted)",
        }}
      >
        <svg
          width="22"
          height="22"
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
        <span>Map</span>
      </Link>

      <Link
        to="/collections"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          minWidth: "44px",
          minHeight: "44px",
          flex: 1,
          maxWidth: "68px",
          fontSize: "11px",
          fontWeight: isCurrent("/collections") ? 700 : 500,
          textDecoration: "none",
          color: isCurrent("/collections") ? "var(--wf-text)" : "var(--wf-text-muted)",
        }}
      >
        <svg
          width="22"
          height="22"
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
        <span>Collections</span>
      </Link>
    </nav>
  );
}

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { clerkEnabled } from "../../authMode";
import { wanderfileClerkAppearance } from "../../clerkAppearance";
import { ViewAsSwitcher } from "../../components/ViewAsSwitcher";
import { useHorizontalSwipe } from "../../hooks/usePointerSwipe";
import { CATEGORY_NAV_ITEMS } from "../categoryNavStyle";
import { TOP_TABS_BASE } from "../paths";
import { CategoryStrip } from "./CategoryStrip";
import { QuietSaveBanner } from "./QuietSaveBanner";

const clerkAppearance = wanderfileClerkAppearance("dark");

function icon(name: "search" | "plus" | "queue") {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }
  if (name === "queue") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Shell({
  children,
  counts,
  loading = false,
  isAdmin = false,
  isSuperAdmin = false,
  onViewAsChange,
}: {
  children: ReactNode;
  counts: Record<string, number | string>;
  loading?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const pageRef = useRef<HTMLElement>(null);
  const homeTo = TOP_TABS_BASE || "/";
  const tabKeys = useMemo(() => {
    return CATEGORY_NAV_ITEMS.filter(
      (item) => item.key === "home" || loading || Number(counts[item.key] ?? 0) > 0,
    ).map((item) => item.key);
  }, [counts, loading]);
  const isHome =
    location.pathname === "/" ||
    location.pathname === TOP_TABS_BASE ||
    location.pathname === `${TOP_TABS_BASE}/`;
  const tabIndex = isHome
    ? tabKeys.indexOf("home")
    : tabKeys.findIndex((key) => key !== "home" && (location.pathname === `${TOP_TABS_BASE}/${key}` || location.pathname === `/${key}`));

  useHorizontalSwipe(pageRef, {
    enabled: tabIndex >= 0,
    onLeft: () => {
      const next = tabKeys[tabIndex + 1];
      if (next) navigate(next === "home" ? (TOP_TABS_BASE || "/") : `${TOP_TABS_BASE}/${next}`);
    },
    onRight: () => {
      const previous = tabKeys[tabIndex - 1];
      if (previous) navigate(previous === "home" ? (TOP_TABS_BASE || "/") : `${TOP_TABS_BASE}/${previous}`);
    },
  });

  useEffect(() => {
    document.documentElement.classList.add("top-tabs-active");
    return () => document.documentElement.classList.remove("top-tabs-active");
  }, []);

  return (
    <div className="top-tabs-root lab-pages lab-pages-light">
      <div className="app-shell" data-theme="top-tabs">
        <header className="lab-utility">
          <NavLink className="wordmark" to={homeTo}>
            Wander<b>file</b>
          </NavLink>
          <div>
            <ViewAsSwitcher enabled={isSuperAdmin} onChange={onViewAsChange} />
            {isAdmin ? (
              <NavLink to="/admin" className="classic-link">
                Admin
              </NavLink>
            ) : null}
            <NavLink
              to="/invisible-feed"
              className="classic-link invisible-feed-nav-btn"
            >
              <span aria-hidden="true">✨</span>
              <span className="invisible-feed-nav-label">Invisible Feed</span>
            </NavLink>
            <button type="button" aria-label="Search" onClick={() => navigate("/search")}>
              {icon("search")}
            </button>
            <NavLink to="/add" className="queue-button" aria-label="Open save queue">
              {icon("queue")}
              <span className="queue-button-label">Queue</span>
            </NavLink>
            {clerkEnabled ? <UserButton appearance={clerkAppearance} /> : null}
          </div>
        </header>
        <div className="lab-utility-tabs">
          <CategoryStrip counts={counts} loading={loading} />
        </div>
        <main ref={pageRef} className="page-content">
          <QuietSaveBanner />
          {children}
        </main>
        <button
          type="button"
          className="processing-fab"
          aria-label="Add a link"
          onClick={() => navigate("/add")}
        >
          {icon("plus")}
        </button>
      </div>
    </div>
  );
}

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { clerkEnabled } from "../../authMode";
import { wanderfileClerkAppearance } from "../../clerkAppearance";
import { ViewAsSwitcher } from "../../components/ViewAsSwitcher";
import { useHorizontalSwipe } from "../../hooks/usePointerSwipe";
import { CATEGORY_NAV_ITEMS } from "../categoryNavStyle";
import { TOP_TABS_BASE } from "../paths";
import { AddLinkSheet } from "./AddLinkSheet";
import { CategoryStrip } from "./CategoryStrip";

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
  onIngestComplete,
}: {
  children: ReactNode;
  counts: Record<string, number | string>;
  loading?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
  onIngestComplete: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const pageRef = useRef<HTMLElement>(null);
  const homeTo = TOP_TABS_BASE || "/";
  const [addOpen, setAddOpen] = useState(false);
  const tabKeys = useMemo(() => {
    const hasAnyEntries = CATEGORY_NAV_ITEMS.some((item) => Number(counts[item.key] ?? 0) > 0);
    const items =
      loading && !hasAnyEntries
        ? CATEGORY_NAV_ITEMS
        : CATEGORY_NAV_ITEMS.filter((item) => Number(counts[item.key] ?? 0) > 0);
    return items.map((item) => item.key);
  }, [counts, loading]);
  const tabIndex = tabKeys.findIndex((key) => location.pathname === `${TOP_TABS_BASE}/${key}` || location.pathname === `/${key}`);

  useHorizontalSwipe(pageRef, {
    enabled: tabIndex >= 0 && !addOpen,
    onLeft: () => {
      const next = tabKeys[tabIndex + 1];
      if (next) navigate(`${TOP_TABS_BASE}/${next}`);
    },
    onRight: () => {
      const previous = tabKeys[tabIndex - 1];
      if (previous) navigate(`${TOP_TABS_BASE}/${previous}`);
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
            <button type="button" aria-label="Search" onClick={() => navigate("/search")}>
              {icon("search")}
            </button>
            <NavLink to="/add" className="queue-button" aria-label="Open processing">
              {icon("queue")}
              <span className="queue-button-label">Processing</span>
            </NavLink>
            {clerkEnabled ? <UserButton appearance={clerkAppearance} /> : null}
          </div>
        </header>
        <div className="lab-utility-tabs">
          <CategoryStrip counts={counts} loading={loading} />
        </div>
        <main ref={pageRef} className="page-content">
          {children}
        </main>
        <button
          type="button"
          className="processing-fab"
          aria-label="Add a link"
          onClick={() => setAddOpen(true)}
        >
          {icon("plus")}
        </button>
        {addOpen ? (
          <AddLinkSheet onClose={() => setAddOpen(false)} onComplete={onIngestComplete} />
        ) : null}
      </div>
    </div>
  );
}

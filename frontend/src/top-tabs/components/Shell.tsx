import { NavLink, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useEffect, useState, type ReactNode } from "react";

import { clerkEnabled } from "../../authMode";
import { wanderfileClerkAppearance } from "../../clerkAppearance";
import { ViewAsSwitcher } from "../../components/ViewAsSwitcher";
import { TOP_TABS_BASE } from "../paths";
import { AddLinkSheet } from "./AddLinkSheet";
import { CategoryStrip } from "./CategoryStrip";

const clerkLight = wanderfileClerkAppearance("light");

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
  const homeTo = TOP_TABS_BASE || "/";
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("top-tabs-active");
    return () => document.documentElement.classList.remove("top-tabs-active");
  }, []);

  return (
    <div className="top-tabs-root lab-pages lab-pages-light">
      <div className="app-shell" data-theme="top-tabs">
        <header className="lab-utility">
          <NavLink className="wordmark" to={homeTo}>
            Wanderfile
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
              Processing
            </NavLink>
            {clerkEnabled ? <UserButton appearance={clerkLight} /> : null}
          </div>
        </header>
        <div className="lab-utility-tabs">
          <CategoryStrip counts={counts} loading={loading} />
        </div>
        <main className="page-content">{children}</main>
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

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useEffect, type ReactNode } from "react";

import { clerkEnabled } from "../../authMode";
import { wanderfileClerkAppearance } from "../../clerkAppearance";
import { ViewAsSwitcher } from "../../components/ViewAsSwitcher";
import { PlatformMenu } from "../../components/library";
import { TOP_TABS_BASE } from "../paths";
import { CategoryStrip } from "./CategoryStrip";

const PLATFORM_PATHS = ["posts", "travel", "food", "movies", "search"];

const clerkLight = wanderfileClerkAppearance("light");

function icon(name: "search" | "plus") {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
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
  isAdmin = false,
  isSuperAdmin = false,
  onViewAsChange,
}: {
  children: ReactNode;
  counts: Record<string, number | string>;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const homeTo = TOP_TABS_BASE || "/";
  const showPlatform = PLATFORM_PATHS.some(
    (key) => pathname === `/${key}` || pathname.startsWith(`/${key}/`),
  );

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
            {showPlatform ? <PlatformMenu /> : null}
            <button type="button" aria-label="Search" onClick={() => navigate("/search")}>
              {icon("search")}
            </button>
            <button type="button" className="add-button" onClick={() => navigate("/add")}>
              {icon("plus")} Add inspiration
            </button>
            {clerkEnabled ? <UserButton appearance={clerkLight} /> : null}
          </div>
        </header>
        <div className="lab-utility-tabs">
          <CategoryStrip counts={counts} />
        </div>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export function PageHeading({
  kicker,
  title,
  lede,
  action,
}: {
  kicker: string;
  title: string;
  lede: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p>{lede}</p>
      </div>
      {action ? (
        <button type="button" className="primary" onClick={action.onClick}>
          {icon("plus")} {action.label}
        </button>
      ) : null}
    </header>
  );
}

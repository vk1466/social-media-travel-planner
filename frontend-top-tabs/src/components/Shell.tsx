import { NavLink, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/react";
import type { ReactNode } from "react";

import { clerkEnabled } from "../auth";

const NAV = [
  { to: "/", key: "home", label: "Home", icon: "⌂" },
  { to: "/posts", key: "posts", label: "Posts", icon: "▦" },
  { to: "/travel", key: "travel", label: "Travel", icon: "⌖" },
  { to: "/food", key: "food", label: "Food", icon: "◒" },
  { to: "/movies", key: "movies", label: "Movies", icon: "▶" },
  { to: "/history", key: "history", label: "History", icon: "◷" },
] as const;

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
}: {
  children: ReactNode;
  counts: Record<string, number | string>;
}) {
  const navigate = useNavigate();

  return (
    <div className="app-shell" data-theme="top-tabs">
      <header className="top-navigation">
        <NavLink className="wordmark" to="/">
          Wanderfile
        </NavLink>
        <nav aria-label="Category pages">
          {NAV.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "is-on" : "")}
            >
              <span>{item.icon}</span>
              <b>{item.label}</b>
              {counts[item.key] ? <small>{counts[item.key]}</small> : null}
            </NavLink>
          ))}
        </nav>
        <div>
          <button type="button" aria-label="Search" onClick={() => navigate("/search")}>
            {icon("search")}
          </button>
          <button type="button" className="add-button" onClick={() => navigate("/add")}>
            {icon("plus")} Add
          </button>
          {clerkEnabled ? <UserButton /> : null}
        </div>
      </header>
      <main className="page-content">{children}</main>
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

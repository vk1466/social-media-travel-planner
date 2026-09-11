import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { CATEGORY_NAV_ITEMS, type CategoryNavKey } from "../categoryNavStyle";
import { useLabTheme } from "../theme";

import "../category-nav.css";

/** Category marks drawn from Lucide (ISC) — https://lucide.dev */
const CATEGORY_LOGOS: Record<CategoryNavKey, ReactNode> = {
  posts: (
    <>
      <path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
      <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
      <circle cx="13" cy="7" r="1" fill="currentColor" />
      <rect x="8" y="2" width="14" height="14" rx="2" />
    </>
  ),
  travel: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
    </>
  ),
  food: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  movies: (
    <>
      <path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z" />
      <path d="M7 21h10" />
      <rect width="20" height="14" x="2" y="3" rx="2" />
    </>
  ),
  history: (
    <>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </>
  ),
};

function CategoryLogo({ name }: { name: CategoryNavKey }) {
  return (
    <span className="category-nav-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {CATEGORY_LOGOS[name]}
      </svg>
    </span>
  );
}

function countFor(counts: Record<string, number | string>, key: string): number {
  const value = counts[key] ?? 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function CategoryStrip({
  counts,
  loading = false,
}: {
  counts: Record<string, number | string>;
  loading?: boolean;
}) {
  const { basePath } = useLabTheme();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const hasAnyEntries = CATEGORY_NAV_ITEMS.some((item) => countFor(counts, item.key) > 0);
  const visibleItems =
    loading && !hasAnyEntries
      ? CATEGORY_NAV_ITEMS
      : CATEGORY_NAV_ITEMS.filter((item) => countFor(counts, item.key) > 0);
  const activeKey = visibleItems.find((item) => {
    const to = `${basePath}/${item.key}`;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  })?.key;

  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>(".is-on");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    active?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeKey]);

  if (visibleItems.length === 0) return null;

  return (
    <nav ref={navRef} className="category-nav" aria-label="Library type">
      {visibleItems.map((item) => {
        const to = `${basePath}/${item.key}`;
        const active = item.key === activeKey;
        const count = countFor(counts, item.key);
        return (
          <NavLink key={item.key} to={to} className={`category-nav-card${active ? " is-on" : ""}`}>
            <CategoryLogo name={item.key} />
            <span>
              <b>{item.label}</b>
              <small>{item.hint}</small>
            </span>
            <em>{count}</em>
          </NavLink>
        );
      })}
    </nav>
  );
}

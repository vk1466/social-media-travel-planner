import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { CATEGORY_NAV_ITEMS } from "../categoryNavStyle";
import { useLabTheme } from "../theme";

import "../category-nav.css";

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
      {visibleItems.map((item, index) => {
        const to = `${basePath}/${item.key}`;
        const active = item.key === activeKey;
        const count = countFor(counts, item.key);
        return (
          <NavLink key={item.key} to={to} className={`category-nav-card${active ? " is-on" : ""}`}>
            <span className="category-nav-index">{String(index + 1).padStart(2, "0")}</span>
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

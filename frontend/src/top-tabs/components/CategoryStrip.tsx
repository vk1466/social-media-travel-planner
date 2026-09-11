import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { CATEGORY_NAV_ITEMS } from "../categoryNavStyle";
import { useLabTheme } from "../theme";

import "../category-nav.css";

export function CategoryStrip({ counts }: { counts: Record<string, number | string> }) {
  const { basePath } = useLabTheme();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const activeKey = CATEGORY_NAV_ITEMS.find((item) => {
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

  return (
    <nav ref={navRef} className="category-nav" aria-label="Library type">
      {CATEGORY_NAV_ITEMS.map((item, index) => {
        const to = `${basePath}/${item.key}`;
        const active = item.key === activeKey;
        const count = counts[item.key] ?? 0;
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

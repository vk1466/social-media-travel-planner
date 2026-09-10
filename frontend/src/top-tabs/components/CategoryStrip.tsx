import { NavLink, useLocation } from "react-router-dom";

import { useLabTheme } from "../theme";

const ITEMS = [
  { key: "posts", label: "Posts", icon: "▦", note: "Every save" },
  { key: "travel", label: "Travel", icon: "⌖", note: "Places + trips" },
  { key: "food", label: "Food", icon: "◒", note: "Your cookbook" },
  { key: "movies", label: "Movies", icon: "▶", note: "Your watchlist" },
  { key: "history", label: "History", icon: "◷", note: "Visits" },
] as const;

export function CategoryStrip({
  counts,
  compact = false,
}: {
  counts: Record<string, number | string>;
  compact?: boolean;
}) {
  const { basePath } = useLabTheme();
  const location = useLocation();

  return (
    <nav className={compact ? "category-tabs compact-tabs" : "category-tabs"} aria-label="Library type">
      {ITEMS.map((item) => {
        const to = `${basePath}/${item.key}`;
        const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
        return (
          <NavLink key={item.key} to={to} className={active ? "is-on" : ""}>
            <span className="category-icon">{item.icon}</span>
            <span>
              <b>{item.label}</b>
              <small>
                {counts[item.key] ?? 0} · {item.note}
              </small>
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

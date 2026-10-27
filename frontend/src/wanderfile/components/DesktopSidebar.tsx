import { Link, useLocation } from "react-router-dom";
import { useUser } from "@clerk/react";
import { clerkEnabled } from "../../authMode";
import { useSavePipeline } from "../state/SavePipelineContext";

interface DesktopSidebarProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}

export function DesktopSidebar({ isAdmin }: DesktopSidebarProps) {
  const location = useLocation();
  const { user } = clerkEnabled ? useUser() : { user: null };
  const { openSaveSheet } = useSavePipeline();

  const isCurrent = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      to: "/",
      label: "Home",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      ),
    },
    {
      to: "/library",
      label: "Library",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      to: "/map",
      label: "Map",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      ),
    },
    {
      to: "/collections",
      label: "Collections",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
  ];

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ""}`.toUpperCase()
    : "V";

  return (
    <aside
      className="wf-desktop-sidebar"
      style={{
        width: "240px",
        minWidth: "240px",
        maxWidth: "240px",
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        padding: "24px 16px 20px",
        zIndex: 60,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "var(--ink)",
            padding: "0 8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "var(--accent, #FF5A4E)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: "16px",
            }}
          >
            ✦
          </div>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Wanderfile
          </span>
        </Link>

        {/* Quick Action Save Button */}
        <button
          type="button"
          onClick={() => openSaveSheet()}
          style={{
            height: "40px",
            width: "100%",
            borderRadius: "var(--radius-pill)",
            border: 0,
            background: "var(--accent, #FF5A4E)",
            color: "var(--accent-ink, #FFFFFF)",
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "var(--shadow-sm)",
            transition: "opacity 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Save Reel</span>
        </button>

        {/* 4 Main Nav Sections */}
        <nav aria-label="Desktop primary" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const active = isCurrent(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  height: "40px",
                  padding: "0 12px",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--ink)" : "var(--ink-2)",
                  background: active ? "var(--surface-2)" : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ color: active ? "var(--accent)" : "currentColor", display: "flex" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Collections Subsection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
          <div
            style={{
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--ink-2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Collections
          </div>
          <Link
            to="/map"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "34px",
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "13px",
              color: "var(--ink-2)",
            }}
          >
            <span style={{ fontSize: "14px" }}>📍</span>
            <span>Saved Places</span>
          </Link>
          <Link
            to="/library"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "34px",
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "13px",
              color: "var(--ink-2)",
            }}
          >
            <span style={{ fontSize: "14px" }}>🎬</span>
            <span>All Reels</span>
          </Link>
          <Link
            to="/collections"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "34px",
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "13px",
              color: "var(--accent, #FF5A4E)",
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: "14px" }}>+</span>
            <span>Start a collection</span>
          </Link>
        </div>
      </div>

      {/* Bottom Profile / Settings */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
        {isAdmin && (
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "36px",
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: isCurrent("/admin") ? 600 : 500,
              color: isCurrent("/admin") ? "var(--ink)" : "var(--ink-2)",
              background: isCurrent("/admin") ? "var(--surface-2)" : "transparent",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Admin Tools</span>
          </Link>
        )}

        <Link
          to="/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "44px",
            padding: "0 10px",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            color: "var(--ink)",
            background: isCurrent("/settings") ? "var(--surface-2)" : "transparent",
            transition: "background 0.15s ease",
          }}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.fullName || "My Account"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-2)" }}>
              Settings & Themes
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--ink-2)">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/react";
import { useSavePipeline } from "../state/SavePipelineContext";
import { ViewAsSwitcher } from "../../components/ViewAsSwitcher";
import { getViewAsUserId } from "../../api";
import { clerkEnabled } from "../../authMode";

export interface HeaderProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

interface AccountMenuDropdownProps {
  name: string;
  email: string;
  imageUrl?: string | null;
  initials: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onViewAsChange?: (userId: string | null) => void;
  onSignOut: () => void;
}

function AccountMenuDropdown({
  name,
  email,
  imageUrl,
  initials,
  isAdmin,
  isSuperAdmin,
  onViewAsChange,
  onSignOut,
}: AccountMenuDropdownProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(() => getViewAsUserId());

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync acting user state with external changes
  useEffect(() => {
    const handleSync = () => {
      setActingUserId(getViewAsUserId());
    };
    window.addEventListener("wf-view-as-changed", handleSync);
    return () => window.removeEventListener("wf-view-as-changed", handleSync);
  }, []);

  const isViewingAs = Boolean(actingUserId);

  return (
    <div style={{ position: "relative" }} ref={accountRef}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: isViewingAs ? "2px solid #F59E0B" : "1px solid #E6E3DC",
          background: "#F6F5F1",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "visible",
          outline: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: "14px",
                color: "#1B1D1F",
              }}
            >
              {initials}
            </span>
          )}
        </div>
        {isViewingAs ? (
          <span
            title="Viewing as another account"
            style={{
              position: "absolute",
              bottom: "-2px",
              right: "-2px",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#F59E0B",
              border: "2px solid #FFFFFF",
            }}
          />
        ) : null}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "48px",
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "18px",
            padding: "8px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
            minWidth: "240px",
            maxWidth: "320px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {/* Identity header */}
          <div
            style={{
              padding: "8px 12px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#1B1D1F",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
              {isSuperAdmin ? (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "999px",
                    background: "#ECE8F7",
                    color: "#4B3C8C",
                    flexShrink: 0,
                  }}
                >
                  Super Admin
                </span>
              ) : isAdmin ? (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "999px",
                    background: "#E4F2E7",
                    color: "#25623A",
                    flexShrink: 0,
                  }}
                >
                  Admin
                </span>
              ) : null}
            </div>
            {email ? (
              <span
                style={{
                  fontSize: "12px",
                  color: "#6B6F73",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {email}
              </span>
            ) : null}
          </div>

          <div style={{ height: "1px", background: "#EFEDE7", margin: "2px 0 6px" }} />

          {/* Switch account section for Super Admin */}
          {isSuperAdmin ? (
            <div
              style={{
                padding: "4px 10px 8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#6B6F73",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Switch account
              </span>
              <ViewAsSwitcher enabled={isSuperAdmin} onChange={onViewAsChange} />
            </div>
          ) : null}
          {isSuperAdmin ? (
            <div style={{ height: "1px", background: "#EFEDE7", margin: "4px 0" }} />
          ) : null}

          {/* Actions */}
          <button
            type="button"
            className="wf-menu-item"
            onClick={() => {
              setIsOpen(false);
              navigate("/settings");
            }}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              className="wf-menu-item"
              onClick={() => {
                setIsOpen(false);
                navigate("/admin");
              }}
            >
              <AdminIcon />
              <span>Admin tools</span>
            </button>
          ) : null}

          <button
            type="button"
            className="wf-menu-item"
            onClick={() => {
              setIsOpen(false);
              navigate("/welcome");
            }}
          >
            <SparklesIcon />
            <span>Replay the intro</span>
          </button>

          <button
            type="button"
            className="wf-menu-item"
            onClick={() => {
              setIsOpen(false);
              navigate("/kits");
            }}
          >
            <GridIcon />
            <span>Kits overview</span>
          </button>

          <div style={{ height: "1px", background: "#EFEDE7", margin: "4px 0" }} />

          <button
            type="button"
            className="wf-menu-item wf-menu-item-danger"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
          >
            <SignOutIcon />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ClerkAccountMenu({
  isAdmin,
  isSuperAdmin,
  onViewAsChange,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onViewAsChange?: (userId: string | null) => void;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const name =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed in";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const imageUrl = user?.imageUrl;
  const initials = initialsFromName(name);

  return (
    <AccountMenuDropdown
      name={name}
      email={email}
      imageUrl={imageUrl}
      initials={initials}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      onViewAsChange={onViewAsChange}
      onSignOut={() => {
        void signOut(() => navigate("/"));
      }}
    />
  );
}

function LocalAccountMenu({
  isAdmin,
  isSuperAdmin,
  onViewAsChange,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onViewAsChange?: (userId: string | null) => void;
}) {
  return (
    <AccountMenuDropdown
      name="Local user"
      email="Development mode"
      initials="LO"
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      onViewAsChange={onViewAsChange}
      onSignOut={() => {
        window.location.reload();
      }}
    />
  );
}

function AccountMenu(props: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onViewAsChange?: (userId: string | null) => void;
}) {
  return clerkEnabled ? (
    <ClerkAccountMenu {...props} />
  ) : (
    <LocalAccountMenu {...props} />
  );
}

export function Header({
  isAdmin = false,
  isSuperAdmin = false,
  onViewAsChange,
}: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { savingCount, openSaveSheet, saveUrl, inboxFailures } = useSavePipeline();
  const [inputValue, setInputValue] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;

    if (val.startsWith("http://") || val.startsWith("https://")) {
      await saveUrl(val);
      openSaveSheet();
      setInputValue("");
    } else {
      navigate(`/library?q=${encodeURIComponent(val)}`);
    }
  };

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Library", path: "/library" },
    { label: "Map", path: "/map" },
    { label: "Collections", path: "/collections" },
  ];

  const isCurrent = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className="wf-header"
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        gap: mobileSearchOpen ? "8px" : "0px",
        padding: mobileSearchOpen ? "8px 12px 10px" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: "20px",
            letterSpacing: "-0.03em",
            color: "#1B1D1F",
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "10px",
              background: "#1B1D1F",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="wf-logo-text">Wanderfile</span>
        </Link>

        <nav aria-label="Main" className="wf-header-nav wf-desktop-only">
          {navItems.map((item) => {
            const active = isCurrent(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: "9px 16px",
                  borderRadius: "999px",
                  fontSize: "15px",
                  fontWeight: 600,
                  textDecoration: "none",
                  background: active ? "#1B1D1F" : "transparent",
                  color: active ? "#FFFFFF" : "#4A4E52",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Omnibox / Search & Paste bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          className="wf-header-search-form wf-desktop-only"
          style={{
            marginLeft: "auto",
            flex: "1 1 0%",
            minWidth: 0,
            maxWidth: "540px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            style={{
              width: "100%",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "40px",
              padding: "0 8px 0 12px",
              borderRadius: "999px",
              background: "#F6F5F1",
              border: "1px solid #E6E3DC",
              color: "#6B6F73",
              boxSizing: "border-box",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
            <input
              aria-label="Search or paste link"
              placeholder="Search or paste link"
              value={inputValue}
              size={1}
              onChange={(e) => setInputValue(e.target.value)}
              style={{
                flex: "1 1 0%",
                width: "100%",
                minWidth: 0,
                border: 0,
                background: "transparent",
                fontFamily: "inherit",
                fontSize: "14px",
                color: "#1B1D1F",
                outline: "none",
              }}
            />
            <button
              type="button"
              className="wf-desktop-only"
              onClick={async () => {
                try {
                  const clip = await navigator.clipboard.readText();
                  if (clip) {
                    setInputValue(clip);
                    if (clip.startsWith("http://") || clip.startsWith("https://")) {
                      await saveUrl(clip);
                      openSaveSheet();
                      setInputValue("");
                    }
                  }
                } catch {
                  // Clipboard permissions might be denied
                }
              }}
              title="Paste from clipboard"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "5px 9px",
                borderRadius: "999px",
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                color: "#1B1D1F",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ⌘V
            </button>
          </label>
        </form>

        {/* Switch Account in Header (Super Admin - Desktop) */}
        {isSuperAdmin ? (
          <div className="wf-desktop-only">
            <ViewAsSwitcher enabled={isSuperAdmin} onChange={onViewAsChange} />
          </div>
        ) : null}

        {/* Mobile search toggle button */}
        <button
          type="button"
          className="wf-mobile-only"
          onClick={() => setMobileSearchOpen((prev) => !prev)}
          aria-label="Toggle search"
          style={{
            marginLeft: "auto",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid #E6E3DC",
            background: mobileSearchOpen ? "#1B1D1F" : "#F6F5F1",
            color: mobileSearchOpen ? "#FFFFFF" : "#1B1D1F",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Saving status indicator */}
        {savingCount > 0 ? (
          <button
            type="button"
            onClick={() => openSaveSheet()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              color: "#4A4E52",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#2F9E6B",
                animation: "wf-skeleton-pulse 1.2s infinite",
              }}
            />
            Saving {savingCount}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openSaveSheet()}
              className="wf-desktop-only"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                height: "38px",
                padding: "0 14px",
                borderRadius: "999px",
                border: "1px solid #D9D5CB",
                background: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 700,
                color: "#1B1D1F",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Save
            </button>
            <button
              type="button"
              onClick={() => openSaveSheet()}
              className="wf-mobile-save-btn"
              aria-label="Save a link"
              title="Save a link"
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid #1B1D1F",
                background: "#1B1D1F",
                color: "#FFFFFF",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </>
        )}

        {inboxFailures && inboxFailures.length > 0 ? (
          <Link
            to="/inbox"
            aria-label={`${inboxFailures.length} links need attention`}
            title={`${inboxFailures.length} links need attention`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              minHeight: "44px",
              padding: "0 12px",
              borderRadius: "999px",
              background: "#FEE2E2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#DC2626",
                display: "inline-block",
              }}
            />
            <span className="wf-desktop-only">Attention ({inboxFailures.length})</span>
            <span className="wf-mobile-only">{inboxFailures.length}</span>
          </Link>
        ) : null}

        {/* Account menu */}
        <div style={{ flexShrink: 0 }}>
          <AccountMenu
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onViewAsChange={onViewAsChange}
          />
        </div>
      </div>

      {/* Expandable Mobile Search Drawer */}
      {mobileSearchOpen && (
        <div
          className="wf-mobile-only"
          style={{
            width: "100%",
            paddingTop: "4px",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <form
            onSubmit={(e) => {
              handleSearchSubmit(e);
              setMobileSearchOpen(false);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <label
              style={{
                width: "100%",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "38px",
                padding: "0 10px",
                borderRadius: "999px",
                background: "#F6F5F1",
                border: "1px solid #E6E3DC",
                color: "#6B6F73",
                boxSizing: "border-box",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                aria-label="Search or paste link"
                placeholder="Search or paste link..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{
                  flex: "1 1 0%",
                  width: "100%",
                  minWidth: 0,
                  border: 0,
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  color: "#1B1D1F",
                  outline: "none",
                }}
              />
              {inputValue ? (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#8C9094",
                    fontSize: "14px",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ✕
                </button>
              ) : null}
            </label>
          </form>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            style={{
              border: 0,
              background: "transparent",
              color: "#4A4E52",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 8px",
              flexShrink: 0,
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
}

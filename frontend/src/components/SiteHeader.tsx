import { UserButton, useUser } from "@clerk/react";
import { Link, NavLink } from "react-router-dom";

import { useBrandVersion } from "../hooks/useBrandVersion";
import { readBrandMode } from "../themeColor";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export interface SiteHeaderProps {
  isAdmin?: boolean;
  onOpenSearch?: () => void;
}

function BrandMark() {
  return (
    <svg
      className="wf-brand-mark"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="14" fill="currentColor" />
      <path
        className="wf-brand-mark-pin"
        d="M14 7.5 16.8 16.8 14 14 11.2 16.8 14 7.5Z"
      />
      <circle className="wf-brand-mark-pin" cx="14" cy="14" r="1.1" />
    </svg>
  );
}

function ClerkUserChip() {
  const { user } = useUser();
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";

  return (
    <div className="wf-user">
      <UserButton />
      <span className="wf-user-name">{displayName}</span>
    </div>
  );
}

function LocalUserChip() {
  return (
    <div className="wf-user">
      <span className="wf-user-avatar" aria-hidden="true">
        LO
      </span>
      <span className="wf-user-name">Local user</span>
    </div>
  );
}

function UserChip() {
  return clerkEnabled ? <ClerkUserChip /> : <LocalUserChip />;
}

function navClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? "wf-nav-link active" : "wf-nav-link";
}

export function SiteHeader({
  isAdmin = false,
  onOpenSearch,
}: SiteHeaderProps) {
  useBrandVersion();
  const tone = readBrandMode();
  return (
    <header className="wf-header" data-tone={tone}>
      <div className="wf-header-inner">
        <Link to="/" className="wf-header-brand">
          <BrandMark />
          <span className="wf-brand-name">Wanderfile</span>
        </Link>

        <nav className="wf-nav" aria-label="Main">
          <NavLink to="/" end className={navClassName}>
            Home
          </NavLink>
          <NavLink to="/posts" className={navClassName}>
            Saves
          </NavLink>
          <NavLink to="/places" className={navClassName}>
            Atlas
          </NavLink>
          <NavLink to="/history" className={navClassName}>
            History
          </NavLink>
          {isAdmin ? (
            <NavLink to="/admin" className={navClassName}>
              Admin
            </NavLink>
          ) : null}
        </nav>

        <div className="wf-header-actions">
          <button
            type="button"
            className="wf-search-btn"
            onClick={onOpenSearch}
            aria-label="Search"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
              <circle
                cx="6.5"
                cy="6.5"
                r="4.75"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M10.2 10.2 13 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span className="wf-search-label">Search</span>
            <kbd className="wf-kbd" aria-hidden="true">
              ⌘K
            </kbd>
          </button>

          <Link to="/add" className="wf-cta">
            Add links
          </Link>

          <UserChip />
        </div>
      </div>
    </header>
  );
}

import { useClerk, useUser } from "@clerk/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import { clerkEnabled } from "../authMode";
import { wanderfileClerkAppearance } from "../clerkAppearance";
import { useBrandVersion } from "../hooks/useBrandVersion";
import { readBrandMode } from "../themeColor";
import "./profile-menu.css";

export interface ProfileMenuProps {
  isAdmin?: boolean;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.2v1.4M10 15.4v1.4M16.8 10h-1.4M4.6 10H3.2M14.8 5.2l-1 1M6.2 13.8l-1 1M14.8 14.8l-1-1M6.2 6.2l-1-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.4V10l2.4 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.2 14.6 10 4.4l5.8 10.2H4.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="12.4" r="1" fill="currentColor" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.2 4.4H5.6A1.6 1.6 0 0 0 4 6v8a1.6 1.6 0 0 0 1.6 1.6h2.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.8 10H16m0 0-2.4-2.4M16 10l-2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="wf-profile-chevron" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3.2 4.4 6 7.2l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Avatar({
  imageUrl,
  initials,
  size = "md",
}: {
  imageUrl?: string | null;
  initials: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`wf-profile-avatar wf-profile-avatar--${size}`} aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="wf-profile-avatar-img" />
      ) : (
        <span className="wf-profile-avatar-initials">{initials}</span>
      )}
    </span>
  );
}

function MenuAction({
  icon,
  label,
  hint,
  onClick,
  to,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  to?: string;
  tone?: "default" | "danger";
}) {
  const className = `wf-profile-action${tone === "danger" ? " is-danger" : ""}`;
  const body = (
    <>
      <span className="wf-profile-action-icon">{icon}</span>
      <span className="wf-profile-action-copy">
        <span className="wf-profile-action-label">{label}</span>
        {hint ? <span className="wf-profile-action-hint">{hint}</span> : null}
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} role="menuitem" onClick={onClick}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} role="menuitem" onClick={onClick}>
      {body}
    </button>
  );
}

interface ProfileIdentity {
  name: string;
  email: string;
  imageUrl?: string | null;
  initials: string;
}

function ProfileMenuShell({
  isAdmin,
  identity,
  onManageAccount,
  onSignOut,
  canManageAccount,
  canSignOut,
}: {
  isAdmin: boolean;
  identity: ProfileIdentity;
  onManageAccount?: () => void;
  onSignOut?: () => void;
  canManageAccount: boolean;
  canSignOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="wf-profile" ref={rootRef}>
      <button
        type="button"
        className={`wf-profile-trigger${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar imageUrl={identity.imageUrl} initials={identity.initials} size="sm" />
        <span className="wf-profile-trigger-name">{identity.name}</span>
        <ChevronIcon />
      </button>

      {open ? (
        <div className="wf-profile-panel" id={menuId} role="menu">
          <div className="wf-profile-glow" aria-hidden="true" />
          <div className="wf-profile-hero">
            <Avatar imageUrl={identity.imageUrl} initials={identity.initials} size="lg" />
            <div className="wf-profile-identity">
              <p className="wf-profile-name">{identity.name}</p>
              <p className="wf-profile-email">{identity.email}</p>
            </div>
          </div>

          <div className="wf-profile-section">
            <p className="wf-profile-section-label">Account</p>
            {canManageAccount ? (
              <MenuAction
                icon={<SettingsIcon />}
                label="Manage account"
                hint="Profile, email, and security"
                onClick={() => {
                  close();
                  onManageAccount?.();
                }}
              />
            ) : null}
            <MenuAction
              icon={<HistoryIcon />}
              label="History"
              hint="Timeline visits you’ve uploaded"
              to="/history"
              onClick={close}
            />
            {isAdmin ? (
              <MenuAction
                icon={<AdminIcon />}
                label="Admin"
                hint="Tools and data maintenance"
                to="/admin"
                onClick={close}
              />
            ) : null}
          </div>

          {canSignOut ? (
            <div className="wf-profile-footer">
              <MenuAction
                icon={<SignOutIcon />}
                label="Sign out"
                tone="danger"
                onClick={() => {
                  close();
                  onSignOut?.();
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ClerkProfileMenu({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const navigate = useNavigate();
  useBrandVersion();
  const tone = readBrandMode();

  const name =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed in";
  const email = user?.primaryEmailAddress?.emailAddress || "Wanderfile account";
  const identity: ProfileIdentity = {
    name,
    email,
    imageUrl: user?.imageUrl,
    initials: initialsFromName(name),
  };

  return (
    <ProfileMenuShell
      isAdmin={isAdmin}
      identity={identity}
      canManageAccount
      canSignOut
      onManageAccount={() => {
        openUserProfile({
          appearance: wanderfileClerkAppearance(tone),
        });
      }}
      onSignOut={() => {
        void signOut(() => navigate("/"));
      }}
    />
  );
}

function LocalProfileMenu({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ProfileMenuShell
      isAdmin={isAdmin}
      identity={{
        name: "Local user",
        email: "Development mode",
        initials: "LO",
      }}
      canManageAccount={false}
      canSignOut={false}
    />
  );
}

export function ProfileMenu({ isAdmin = false }: ProfileMenuProps) {
  return clerkEnabled ? (
    <ClerkProfileMenu isAdmin={isAdmin} />
  ) : (
    <LocalProfileMenu isAdmin={isAdmin} />
  );
}

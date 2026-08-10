import { Link } from "react-router-dom";

import { useBrandVersion } from "../hooks/useBrandVersion";
import { readBrandMode } from "../themeColor";
import { ProfileMenu } from "./ProfileMenu";

export interface SiteHeaderProps {
  isAdmin?: boolean;
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

export function SiteHeader({ isAdmin = false }: SiteHeaderProps) {
  useBrandVersion();
  const tone = readBrandMode();
  return (
    <header className="wf-header" data-tone={tone}>
      <div className="wf-header-inner">
        <Link to="/" className="wf-header-brand">
          <BrandMark />
          <span className="wf-brand-name">Wanderfile</span>
        </Link>

        <div className="wf-header-actions">
          <Link to="/add" className="wf-cta">
            Add links
          </Link>

          <ProfileMenu isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}

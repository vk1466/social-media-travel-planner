import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { PlatformMenu } from "./library";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PageHeading({
  kicker,
  title,
  lede,
  action,
  aside,
  count,
  platformFilter = true,
  backLink,
}: {
  kicker: string;
  title: string;
  lede: ReactNode;
  action?: { label: string; onClick: () => void };
  aside?: ReactNode;
  count?: { value: number | string; label: string };
  /** Source-aware pages inherit the shared app switcher; opt out for unrelated workflows. */
  platformFilter?: boolean;
  backLink?: { to: string; label: string };
}) {
  const hasActions = platformFilter || aside || action || count;

  return (
    <header className="page-heading action-rail">
      <div className="page-heading-copy">
        {backLink ? (
          <nav className="page-heading-back" aria-label="Back navigation">
            <Link to={backLink.to} className="page-heading-back-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>{backLink.label}</span>
            </Link>
          </nav>
        ) : null}
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="page-heading-lede">{lede}</p>
      </div>
      {hasActions ? (
        <div className="page-heading-actions">
          {platformFilter ? <PlatformMenu variant="header" /> : null}
          {aside}
          {action ? (
            <button type="button" className="primary" onClick={action.onClick}>
              <PlusIcon /> {action.label}
            </button>
          ) : null}
          {count ? (
            <div className="page-heading-count">
              <span className="page-heading-count-value">{count.value}</span>
              <span className="page-heading-count-label">{count.label}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

import type { ReactNode } from "react";

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
}: {
  kicker: string;
  title: string;
  lede: ReactNode;
  action?: { label: string; onClick: () => void };
  aside?: ReactNode;
  count?: { value: number | string; label: string };
  /** Source-aware pages inherit the shared app switcher; opt out for unrelated workflows. */
  platformFilter?: boolean;
}) {
  const hasActions = platformFilter || aside || action || count;

  return (
    <header className="page-heading action-rail">
      <div className="page-heading-copy">
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

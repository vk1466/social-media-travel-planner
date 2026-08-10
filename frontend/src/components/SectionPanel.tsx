import type { ReactNode } from "react";

import "../page-chrome.css";

export interface SectionPanelProps {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Trailing slot in the panel head, e.g. a disclosure or secondary button. */
  actions?: ReactNode;
  tone?: "surface" | "notice";
  /** "bare" drops the card frame when the host already supplies one. */
  frame?: "card" | "bare";
  className?: string;
  children: ReactNode;
}

/** Titled card used for every form/tool block on light-ground pages. */
export function SectionPanel({
  icon,
  title,
  subtitle,
  actions,
  tone = "surface",
  frame = "card",
  className,
  children,
}: SectionPanelProps) {
  const classes = [
    "wf-panel",
    tone === "notice" ? "wf-panel--notice" : null,
    frame === "bare" ? "wf-panel--bare" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <div className="wf-panel-head">
        {icon ? (
          <span className="wf-panel-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="wf-panel-head-copy">
          <h2 className="wf-panel-title">{title}</h2>
          {subtitle ? <p className="wf-panel-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="wf-panel-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

import type { ReactNode } from "react";

import "../page-chrome.css";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  /** Right-aligned slot — usually one or more <PageMetric /> or an action button. */
  aside?: ReactNode;
}

/** Masthead for light-ground pages (/add, /search, /history, /admin). */
export function PageHeader({ eyebrow, title, lede, aside }: PageHeaderProps) {
  return (
    <header className="wf-page-header">
      <div className="wf-page-header-copy">
        {eyebrow ? <p className="wf-page-eyebrow">{eyebrow}</p> : null}
        <h1 className="wf-page-title">{title}</h1>
        {lede ? <p className="wf-page-lede">{lede}</p> : null}
      </div>
      {aside ? <div className="wf-page-header-aside">{aside}</div> : null}
    </header>
  );
}

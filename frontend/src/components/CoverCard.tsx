import type { KeyboardEvent, ReactNode } from "react";

import { coverTone } from "../coverArt";

export function CoverCard({
  title,
  category,
  kicker,
  location,
  meta,
  action = "View ↗",
  imageUrl,
  badge,
  className,
  onOpen,
  ariaLabel,
}: {
  title: string;
  category?: string;
  kicker?: string;
  location?: string;
  meta?: string;
  action?: string;
  imageUrl?: string | null;
  badge?: ReactNode;
  className?: string;
  onOpen: () => void;
  ariaLabel?: string;
}) {
  const openOnKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className={["cover-card", `cover-card--${coverTone(title)}`, className].filter(Boolean).join(" ")}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel ?? `Open ${title}`}
      onClick={onOpen}
      onKeyDown={openOnKey}
    >
      <span className="cover-card-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
        {category ? <span className="cover-card-category">{category}</span> : null}
        <span className="cover-card-mark" aria-hidden={badge ? undefined : true}>
          {badge ?? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 3h12v18l-6-4-6 4V3Z" />
            </svg>
          )}
        </span>
        {kicker ? <span className="cover-card-kicker">{kicker}</span> : null}
      </span>
      <span className="cover-card-copy">
        {location ? <span className="cover-card-location">{location}</span> : null}
        <strong>{title}</strong>
        <span className="cover-card-foot">
          <span>{meta}</span>
          <span>{action}</span>
        </span>
      </span>
    </article>
  );
}

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { coverArt, coverTone } from "../coverArt";

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
  aspectRatio,
  forceTouchMode = false,
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
  aspectRatio?: string | number;
  forceTouchMode?: boolean;
}) {
  const [touchRevealed, setTouchRevealed] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // Reset touch revealed state if forceTouchMode is disabled
  useEffect(() => {
    if (!forceTouchMode) {
      setTouchRevealed(false);
    }
  }, [forceTouchMode]);

  // Dismiss touch-revealed state when clicking outside
  useEffect(() => {
    if (!touchRevealed) return;
    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setTouchRevealed(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [touchRevealed]);

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    // If clicking on bookmark badge or interactive child inside mark
    if ((event.target as HTMLElement).closest(".cover-card-mark button")) {
      return;
    }
    // In touch mode: first tap reveals metadata, second tap opens
    if (forceTouchMode && !touchRevealed) {
      event.stopPropagation();
      setTouchRevealed(true);
      return;
    }
    onOpen();
  };

  const openOnKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (forceTouchMode && !touchRevealed) {
        setTouchRevealed(true);
        return;
      }
      onOpen();
    }
  };

  const articleClasses = [
    "cover-card",
    `cover-card--${coverTone(title)}`,
    forceTouchMode ? "is-touch-simulated" : "",
    touchRevealed ? "is-touch-revealed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cardStyle = aspectRatio
    ? { aspectRatio: typeof aspectRatio === "number" ? `${aspectRatio}` : aspectRatio }
    : undefined;

  return (
    <article
      ref={cardRef}
      className={articleClasses}
      style={cardStyle}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel ?? `Open ${title}`}
      onClick={handleCardClick}
      onKeyDown={openOnKey}
    >
      <span className="cover-card-media" style={!imageUrl ? { background: coverArt(title) } : undefined}>
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : null}
        {category ? <span className="cover-card-category">{category}</span> : null}
        <span className="cover-card-mark" aria-hidden={badge ? undefined : true}>
          {badge ?? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 3h12v18l-6-4-6 4V3Z" />
            </svg>
          )}
        </span>
      </span>
      <span className="cover-card-copy">
        {location || kicker ? (
          <span className="cover-card-location">
            {kicker && location && kicker !== location ? `${kicker} · ${location}` : (location || kicker)}
          </span>
        ) : null}
        <strong>{title}</strong>
        <span className="cover-card-foot">
          <span>{meta}</span>
          <span>{action}</span>
        </span>
      </span>
    </article>
  );
}

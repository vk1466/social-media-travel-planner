import { useEffect, useRef, useState } from "react";

import {
  LIBRARY_PLATFORM_COLOR,
  LIBRARY_PLATFORMS,
  PlatformIcon,
  libraryPlatformLabel,
  orderedLibraryPlatforms,
  useLibraryPlatform,
} from "../../libraryPlatform";

export function PlatformMenu({ variant = "utility" }: { variant?: "utility" | "header" }) {
  const { platforms, togglePlatform, setPlatforms } = useLibraryPlatform();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allActive = platforms.length === 0;
  const shown = allActive
    ? [...LIBRARY_PLATFORMS]
    : orderedLibraryPlatforms(platforms);
  const stacked = [...shown].reverse();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary = allActive
    ? "All sources"
    : shown.map(libraryPlatformLabel).join(", ");
  const appSummary = allActive
    ? "All sources"
    : shown.length === 1
      ? libraryPlatformLabel(shown[0])
      : `${shown.length} sources`;

  return (
    <div
      className={`lab-platform-menu${variant === "header" ? " lab-platform-menu-header" : ""}${open ? " is-open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`lab-platform-trigger${allActive ? "" : " is-on"}`}
        aria-label={`Filter by source: ${summary}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={summary}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={`lab-platform-stack${stacked.length > 1 ? " is-overlap" : ""}`}
          aria-hidden="true"
        >
          {stacked.map((platform) => (
            <span
              key={platform}
              className={`lab-platform-logo-${platform}`}
              style={{
                color: LIBRARY_PLATFORM_COLOR[platform] ?? "currentColor",
              }}
            >
              <PlatformIcon platform={platform} size={20} />
            </span>
          ))}
        </span>
        {variant === "header" ? (
          <span className="lab-platform-app-count">
            <strong>{appSummary}</strong>
          </span>
        ) : null}
        {variant === "header" ? (
          <svg className="lab-platform-chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path d="m2.5 4.5 3.5 3 3.5-3" />
          </svg>
        ) : null}
      </button>
      {open ? (
        <div className="lab-platform-panel" role="group" aria-label="Show saves from">
          {variant === "header" ? (
            <div className="lab-platform-panel-head">
              <span>Sources</span>
              <small>Select one or more</small>
            </div>
          ) : null}
          <label className={`lab-platform-all${allActive ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={allActive}
              onChange={() => setPlatforms([])}
            />
            {variant === "header" ? <span className="lab-platform-checkbox" aria-hidden="true">✓</span> : null}
            <span className="lab-platform-option-copy">
              <b>All sources</b>
              {variant === "header" ? <small>Every saved source</small> : null}
            </span>
          </label>
          {LIBRARY_PLATFORMS.map((platform) => {
            const checked = platforms.includes(platform);
            return (
              <label key={platform} className={checked ? "is-on" : ""}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePlatform(platform)}
                />
                <span
                  className="lab-platform-mark"
                  style={{ color: LIBRARY_PLATFORM_COLOR[platform] }}
                >
                  <PlatformIcon platform={platform} size={18} />
                </span>
                <span className="lab-platform-option-copy">
                  <b>{libraryPlatformLabel(platform)}</b>
                </span>
                {variant === "header" ? <span className="lab-platform-checkbox" aria-hidden="true">✓</span> : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

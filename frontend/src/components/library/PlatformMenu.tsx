import { useEffect, useRef, useState } from "react";

import {
  LIBRARY_PLATFORM_COLOR,
  LIBRARY_PLATFORMS,
  PlatformIcon,
  libraryPlatformLabel,
  orderedLibraryPlatforms,
  useLibraryPlatform,
} from "../../libraryPlatform";

export function PlatformMenu() {
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

  return (
    <div className={`lab-platform-menu${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`lab-platform-trigger${allActive ? "" : " is-on"}`}
        aria-label={`Filter by platform: ${summary}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={summary}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="lab-platform-stack">
          {stacked.map((platform) => (
            <span
              key={platform}
              style={{
                color: LIBRARY_PLATFORM_COLOR[platform] ?? "currentColor",
              }}
            >
              <PlatformIcon platform={platform} size={20} />
            </span>
          ))}
        </span>
      </button>
      {open ? (
        <div className="lab-platform-panel" role="listbox" aria-multiselectable>
          <label className={allActive ? "is-on" : ""}>
            <input
              type="checkbox"
              checked={allActive}
              onChange={() => setPlatforms([])}
            />
            <span>All sources</span>
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
                <span>{libraryPlatformLabel(platform)}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

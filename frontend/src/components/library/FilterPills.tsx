import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { ALL_FILTER_ICON, visualForFilterKey } from "../../placeCategoryVisuals";

export interface FilterPill {
  key: string;
  label: string;
  count?: number;
  color?: string;
  icon?: string | null;
}

/** Chip row until this many values; then a checkbox dropdown. */
export const PILL_CHIP_LIMIT = 8;

export const PILL_PREVIEW_COUNT = PILL_CHIP_LIMIT;

function ChipMark({ icon, letter }: { icon: string | null; letter: string }) {
  if (icon) {
    return <i dangerouslySetInnerHTML={{ __html: icon }} />;
  }
  return <i>{letter}</i>;
}

function pillVisual(pill: FilterPill) {
  const visual = visualForFilterKey(pill.key);
  return {
    color: pill.color ?? visual.color,
    icon: pill.icon === undefined ? visual.icon : pill.icon,
    letter: pill.label.slice(0, 1).toUpperCase(),
  };
}

export function FilterPills({
  pills,
  selectedKeys,
  onSelect,
  allLabel,
  allCount,
  multi = false,
  ariaLabel,
}: {
  pills: FilterPill[];
  selectedKeys: string[];
  onSelect: (key: string) => void;
  allLabel?: string;
  allCount?: number;
  multi?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const allActive = selectedKeys.length === 0 || selectedKeys.includes("all");
  const useMenu = pills.length > PILL_CHIP_LIMIT;

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

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pills]);

  const selectedPills = pills.filter((pill) => selectedKeys.includes(pill.key));
  const summary = allActive
    ? (allLabel ?? "All")
    : selectedPills.length === 1
      ? selectedPills[0]!.label
      : `${selectedPills.length} selected`;

  const filteredMenuPills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pills;
    return pills.filter((pill) => pill.label.toLowerCase().includes(needle));
  }, [pills, query]);

  if (pills.length === 0 && !allLabel) return null;

  return (
    <div className="lib-filters-cats" role="group" aria-label={ariaLabel ?? "More filters"} ref={rootRef}>
      {allLabel ? (
        <button
          type="button"
          className={allActive ? "is-on" : ""}
          style={{ "--category-color": "var(--dark)" } as CSSProperties}
          onClick={() => {
            onSelect("all");
            setOpen(false);
          }}
        >
          <i>{ALL_FILTER_ICON}</i>
          <span>{allLabel}</span>
          {allCount != null ? <b>{allCount}</b> : null}
        </button>
      ) : null}

      {useMenu ? (
        <div className={`lib-filters-menu${open ? " is-open" : ""}`}>
          <button
            type="button"
            className={!allActive ? "is-on" : ""}
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((value) => !value)}
          >
            <span>{summary}</span>
            <b>{pills.length}</b>
          </button>
          {open ? (
            <div className="lib-filters-menu-panel" role="listbox" aria-multiselectable={multi || useMenu}>
              {pills.length > 10 ? (
                <input
                  type="search"
                  value={query}
                  placeholder="Find a filter…"
                  aria-label="Search filters"
                  onChange={(event) => setQuery(event.target.value)}
                />
              ) : null}
              {filteredMenuPills.map((pill) => {
                const visual = pillVisual(pill);
                const checked = selectedKeys.includes(pill.key);
                return (
                  <label key={pill.key} className={checked ? "is-on" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onSelect(pill.key)}
                    />
                    <span
                      className="lib-filters-menu-mark"
                      style={{ "--category-color": visual.color } as CSSProperties}
                    >
                      <ChipMark icon={visual.icon} letter={visual.letter} />
                    </span>
                    <span>{pill.label}</span>
                    {pill.count != null ? <b>{pill.count}</b> : null}
                  </label>
                );
              })}
              {filteredMenuPills.length === 0 ? <p>No matches.</p> : null}
            </div>
          ) : null}
        </div>
      ) : (
        pills.map((pill) => {
          const visual = pillVisual(pill);
          const active = selectedKeys.includes(pill.key);
          return (
            <button
              key={pill.key}
              type="button"
              className={active ? "is-on" : ""}
              style={{ "--category-color": visual.color } as CSSProperties}
              onClick={() => onSelect(pill.key)}
            >
              <ChipMark icon={visual.icon} letter={visual.letter} />
              <span>{pill.label}</span>
              {pill.count != null ? <b>{pill.count}</b> : null}
              {multi && active ? <em>×</em> : null}
            </button>
          );
        })
      )}
    </div>
  );
}

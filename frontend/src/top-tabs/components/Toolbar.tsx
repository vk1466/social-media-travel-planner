import type { ReactNode } from "react";

export interface ChipGroup {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  ariaLabel?: string;
}

export interface FilterPill {
  key: string;
  label: string;
  count?: number;
}

export function Toolbar({
  placeholder,
  query,
  onQuery,
  options,
  selected,
  onSelect,
  groups,
}: {
  placeholder: string;
  query: string;
  onQuery: (value: string) => void;
  options?: string[];
  selected?: string;
  onSelect?: (value: string) => void;
  groups?: ChipGroup[];
}) {
  const chipGroups: ChipGroup[] =
    groups ??
    (options && selected != null && onSelect
      ? [
          {
            options: options.map((option) => ({ value: option, label: option })),
            selected,
            onSelect,
          },
        ]
      : []);

  return (
    <div className="toolbar">
      <label>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      {chipGroups.map((group, index) => (
        <div key={group.ariaLabel ?? index} role="group" aria-label={group.ariaLabel}>
          {group.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === group.selected ? "is-on" : ""}
              onClick={() => group.onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FilterPills({
  pills,
  selectedKeys,
  onSelect,
  allLabel,
  multi = false,
  ariaLabel,
  moreLabel,
  onMore,
}: {
  pills: FilterPill[];
  selectedKeys: string[];
  onSelect: (key: string) => void;
  allLabel?: string;
  multi?: boolean;
  ariaLabel?: string;
  moreLabel?: string;
  onMore?: () => void;
}) {
  if (pills.length === 0 && !allLabel) return null;
  const allActive = selectedKeys.length === 0 || selectedKeys.includes("all");

  return (
    <div className="filter-pills" role="group" aria-label={ariaLabel ?? "More filters"}>
      {allLabel ? (
        <button
          type="button"
          className={allActive ? "is-on is-soft" : "is-soft"}
          onClick={() => onSelect("all")}
        >
          {allLabel}
        </button>
      ) : null}
      {pills.map((pill) => {
        const active = selectedKeys.includes(pill.key);
        return (
          <button
            key={pill.key}
            type="button"
            className={active ? "is-on" : ""}
            onClick={() => onSelect(pill.key)}
          >
            {pill.label}
            {pill.count != null ? <span>{pill.count}</span> : null}
            {multi && active ? " ×" : null}
          </button>
        );
      })}
      {moreLabel && onMore ? (
        <button type="button" className="is-soft" onClick={onMore}>
          {moreLabel}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-copy">{children}</p>;
}

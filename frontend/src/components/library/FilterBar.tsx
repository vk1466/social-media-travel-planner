import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { PlatformMenu } from "./PlatformMenu";
import "./library-filters.css";

export interface FilterOption {
  value: string;
  label: string;
}

export interface SegmentGroupProps {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  ariaLabel?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus,
  onKeyDown,
  list,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  list?: string;
}) {
  return (
    <label className="lib-filters-search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        list={list}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

export function SegmentGroup({ options, selected, onSelect, ariaLabel }: SegmentGroupProps) {
  return (
    <div className="lib-filters-seg" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === selected ? "is-on" : ""}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterChrome({ children }: { children: ReactNode }) {
  return <div className="lib-filters">{children}</div>;
}

export function FilterBar({
  placeholder,
  query,
  onQuery,
  groups = [],
  trailing,
  autoFocus,
  onSearchKeyDown,
  platformFilter = true,
}: {
  placeholder: string;
  query: string;
  onQuery: (value: string) => void;
  groups?: SegmentGroupProps[];
  trailing?: ReactNode;
  autoFocus?: boolean;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  platformFilter?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelId = useId();
  const activeCount = groups.filter((group) => group.selected !== group.options[0]?.value).length;
  const showTools = platformFilter || groups.length > 0;
  return (
    <div className="lib-filters-toolbar">
      <SearchField
        value={query}
        onChange={onQuery}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onSearchKeyDown}
      />
      {showTools ? (
        <div className="lib-filters-tools">
          {platformFilter ? <PlatformMenu /> : null}
          {groups.length > 0 ? (
            <button
              type="button"
              className="lib-filters-toggle"
              aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
              aria-expanded={filtersOpen}
              aria-controls={panelId}
              onClick={() => setFiltersOpen((value) => !value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5h16M7 12h10M10 19h4" />
              </svg>
              {activeCount > 0 ? <b>{activeCount}</b> : null}
            </button>
          ) : null}
        </div>
      ) : null}
      <div id={panelId} className={`lib-filters-secondary${filtersOpen ? " is-open" : ""}`}>
        {groups.map((group, index) => (
          <SegmentGroup key={group.ariaLabel ?? index} {...group} />
        ))}
        {trailing}
      </div>
    </div>
  );
}

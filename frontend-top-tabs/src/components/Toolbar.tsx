import type { ReactNode } from "react";

export function Toolbar({
  placeholder,
  query,
  onQuery,
  options,
  selected,
  onSelect,
}: {
  placeholder: string;
  query: string;
  onQuery: (value: string) => void;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
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
      <div>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === selected ? "is-on" : ""}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-copy">{children}</p>;
}

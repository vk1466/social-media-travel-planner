import "../page-chrome.css";

export interface FilterChipOption {
  key: string;
  label: string;
  count?: number;
}

export interface FilterChipRowProps {
  options: FilterChipOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  label?: string;
  ariaLabel: string;
}

/** Single-select filter pills for light-ground pages. */
export function FilterChipRow({
  options,
  activeKey,
  onSelect,
  label,
  ariaLabel,
}: FilterChipRowProps) {
  return (
    <div className="wf-chipbar" role="group" aria-label={ariaLabel}>
      {label ? <span className="wf-chipbar-label">{label}</span> : null}
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`wf-chip-btn${option.key === activeKey ? " is-active" : ""}`}
          aria-pressed={option.key === activeKey}
          onClick={() => onSelect(option.key)}
        >
          {option.label}
          {option.count === undefined ? null : (
            <span className="wf-chip-count">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

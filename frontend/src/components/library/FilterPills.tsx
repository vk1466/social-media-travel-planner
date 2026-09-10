export interface FilterPill {
  key: string;
  label: string;
  count?: number;
}

export const PILL_PREVIEW_COUNT = 5;

export function previewPills<T extends { key: string }>(
  pills: T[],
  selectedKeys: string[],
  expanded: boolean,
  limit = PILL_PREVIEW_COUNT,
): T[] {
  if (expanded || pills.length <= limit) return pills;
  const top = pills.slice(0, limit);
  const topKeys = new Set(top.map((pill) => pill.key));
  const extra = pills.filter((pill) => selectedKeys.includes(pill.key) && !topKeys.has(pill.key));
  return [...top, ...extra];
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
    <div className="lib-filters-pills" role="group" aria-label={ariaLabel ?? "More filters"}>
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

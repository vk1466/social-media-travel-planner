import type { CSSProperties } from "react";

import { ALL_FILTER_ICON, visualForFilterKey } from "../../placeCategoryVisuals";

export interface FilterPill {
  key: string;
  label: string;
  count?: number;
  color?: string;
  icon?: string | null;
}

export const PILL_PREVIEW_COUNT = 12;

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

function ChipMark({ icon, letter }: { icon: string | null; letter: string }) {
  if (icon) {
    return <i dangerouslySetInnerHTML={{ __html: icon }} />;
  }
  return <i>{letter}</i>;
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
  if (pills.length === 0 && !allLabel) return null;
  const allActive = selectedKeys.length === 0 || selectedKeys.includes("all");

  return (
    <div className="lib-filters-cats" role="group" aria-label={ariaLabel ?? "More filters"}>
      {allLabel ? (
        <button
          type="button"
          className={allActive ? "is-on" : ""}
          style={{ "--category-color": "#173e32" } as CSSProperties}
          onClick={() => onSelect("all")}
        >
          <i>{ALL_FILTER_ICON}</i>
          <span>{allLabel}</span>
          {allCount != null ? <b>{allCount}</b> : null}
        </button>
      ) : null}
      {pills.map((pill) => {
        const visual = visualForFilterKey(pill.key);
        const color = pill.color ?? visual.color;
        const icon = pill.icon === undefined ? visual.icon : pill.icon;
        const active = selectedKeys.includes(pill.key);
        return (
          <button
            key={pill.key}
            type="button"
            className={active ? "is-on" : ""}
            style={{ "--category-color": color } as CSSProperties}
            onClick={() => onSelect(pill.key)}
          >
            <ChipMark icon={icon} letter={pill.label.slice(0, 1).toUpperCase()} />
            <span>{pill.label}</span>
            {pill.count != null ? <b>{pill.count}</b> : null}
            {multi && active ? <em>×</em> : null}
          </button>
        );
      })}
    </div>
  );
}

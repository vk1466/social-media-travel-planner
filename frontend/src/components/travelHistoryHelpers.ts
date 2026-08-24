import type { VisitDetail } from "../api";

export const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const UNDATED_GROUP_KEY = "undated";

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

export interface VisitYearGroup {
  key: string;
  label: string;
  entries: VisitDetail[];
}

export function parseCalendarDay(value: string | null | undefined): CalendarDay | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function monthDayLabel(day: CalendarDay): string {
  return `${MONTH_ABBREVIATIONS[day.month - 1] ?? ""} ${day.day}`.trim();
}

/** Compact rail label: "Mar 3", "Mar 3–9", or "Mar 28 – Apr 2". */
export function visitDateLabel(
  visitedFrom?: string | null,
  visitedTo?: string | null,
): string {
  const from = parseCalendarDay(visitedFrom);
  if (!from) return "Undated";
  const to = parseCalendarDay(visitedTo);
  if (!to || (to.year === from.year && to.month === from.month && to.day === from.day)) {
    return monthDayLabel(from);
  }
  if (to.year === from.year && to.month === from.month) {
    return `${monthDayLabel(from)}–${to.day}`;
  }
  return `${monthDayLabel(from)} – ${monthDayLabel(to)}`;
}

export function visitYearLabel(visitedFrom?: string | null): string {
  const from = parseCalendarDay(visitedFrom);
  return from ? String(from.year) : "Undated";
}

export function sourceLabel(source: string | null | undefined): string | null {
  if (source === "timeline") return "Timeline";
  if (source === "instagram") return "Instagram";
  if (source === "manual") return "Manual";
  return null;
}

/** Newest first; undated visits sink to the bottom. */
export function compareVisitsNewestFirst(
  left: VisitDetail,
  right: VisitDetail,
): number {
  const leftFrom = left.visit.visited_from ?? "";
  const rightFrom = right.visit.visited_from ?? "";
  if (leftFrom && rightFrom) return rightFrom.localeCompare(leftFrom);
  if (leftFrom) return -1;
  if (rightFrom) return 1;
  return left.visit.place_name.localeCompare(right.visit.place_name);
}

export function groupVisitsByYear(visits: VisitDetail[]): VisitYearGroup[] {
  const groups: VisitYearGroup[] = [];
  for (const entry of visits) {
    const label = visitYearLabel(entry.visit.visited_from);
    const key = label === "Undated" ? UNDATED_GROUP_KEY : label;
    const current = groups[groups.length - 1];
    if (current && current.key === key) {
      current.entries.push(entry);
    } else {
      groups.push({ key, label, entries: [entry] });
    }
  }
  return groups;
}

import type { ReactNode } from "react";

export {
  FilterBar as Toolbar,
  FilterChrome,
  FilterPills,
  SearchField,
  SegmentGroup,
  type FilterOption as ChipGroupOption,
  type SegmentGroupProps as ChipGroup,
} from "../../components/library";

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-copy">{children}</div>;
}

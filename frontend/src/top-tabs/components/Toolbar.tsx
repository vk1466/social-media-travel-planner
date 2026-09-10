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
  return <p className="empty-copy">{children}</p>;
}

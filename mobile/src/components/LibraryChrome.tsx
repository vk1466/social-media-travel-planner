import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PlatformMenu } from "./PlatformFilter";
import { colors, radius, spacing } from "../theme";

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
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={15} color={colors.muted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
      />
    </View>
  );
}

export function SegmentGroup({ options, selected, onSelect, ariaLabel }: SegmentGroupProps) {
  return (
    <View style={styles.seg} accessibilityLabel={ariaLabel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segInner}>
        {options.map((option) => {
          const on = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.segBtn, on && styles.segBtnOn]}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FilterBar({
  placeholder,
  query,
  onQuery,
  groups = [],
  trailing,
  autoFocus,
  platformFilter = true,
}: {
  placeholder: string;
  query: string;
  onQuery: (value: string) => void;
  groups?: SegmentGroupProps[];
  trailing?: ReactNode;
  autoFocus?: boolean;
  platformFilter?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = groups.filter((group) => group.selected !== group.options[0]?.value).length;
  const showTools = platformFilter || groups.length > 0;

  return (
    <View style={styles.bar}>
      <View style={styles.toolbar}>
        <SearchField value={query} onChange={onQuery} placeholder={placeholder} autoFocus={autoFocus} />
        {showTools ? (
          <View style={styles.tools}>
            {platformFilter ? <PlatformMenu /> : null}
            {groups.length > 0 ? (
              <Pressable
                onPress={() => setFiltersOpen((value) => !value)}
                style={[styles.toggle, filtersOpen && styles.toggleOn]}
                accessibilityRole="button"
                accessibilityLabel={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
              >
                <Ionicons name="filter" size={16} color={colors.ink} />
                {activeCount > 0 ? <Text style={styles.toggleBadge}>{activeCount}</Text> : null}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {filtersOpen ? (
        <View style={styles.secondary}>
          {groups.map((group, index) => (
            <SegmentGroup key={group.ariaLabel ?? String(index)} {...group} />
          ))}
          {trailing}
        </View>
      ) : null}
    </View>
  );
}

export function FilterChips({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <SegmentGroup options={options} selected={selected} onSelect={onSelect} />
  );
}

export function MultiFilterChips({
  options,
  selected,
  onToggle,
  allLabel,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  allLabel: string;
}) {
  const allOn = selected.length === 0;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
      <Pressable onPress={() => onToggle("all")} style={[styles.pill, allOn && styles.pillOn]}>
        <Text style={[styles.pillText, allOn && styles.pillTextOn]}>{allLabel}</Text>
      </Pressable>
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[styles.pillText, on && styles.pillTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function PageHeading({
  kicker,
  title,
  lede: _lede,
  count,
}: {
  kicker: string;
  title: string;
  lede?: string;
  count?: { value: number; label: string };
}) {
  return (
    <View style={styles.heading}>
      <View style={styles.headingCopy}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {count ? (
        <View style={styles.count}>
          <Text style={styles.countValue}>{count.value}</Text>
          <Text style={styles.countLabel}>{count.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flex: 1,
    minWidth: 0,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: colors.ink,
    fontSize: 13,
  },
  bar: {
    gap: 8,
    marginBottom: 8,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  toggle: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: {
    borderColor: colors.ink,
  },
  toggleBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.brand,
    color: colors.onFill,
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },
  secondary: {
    gap: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  seg: {
    alignSelf: "stretch",
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  segInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  segBtn: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderRadius: 8,
    justifyContent: "center",
  },
  segBtnOn: {
    backgroundColor: colors.brand,
  },
  segText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  segTextOn: {
    color: colors.onFill,
    fontWeight: "700",
  },
  pillRow: {
    gap: 6,
    paddingVertical: 2,
  },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillOn: {
    borderColor: colors.brand,
  },
  pillText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "600",
  },
  pillTextOn: {
    fontWeight: "700",
  },
  heading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headingCopy: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  count: {
    minWidth: 52,
    alignItems: "flex-end",
  },
  countValue: {
    fontSize: 28,
    fontWeight: "500",
    color: colors.brand,
    lineHeight: 30,
  },
  countLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
});

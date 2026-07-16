/**
 * Filter facet/toggle types — the shared shape every list page uses to declare
 * its filters. Lived in `FilterBar/` originally; relocated here when the
 * standalone `<FilterBar>` component was retired in favour of `<ListToolbar>`.
 * `ListToolbar` owns the filter UI now, so the contract lives next to it.
 */

export type FilterOption<V extends string = string> = {
  value: V;
  label: string;
};

/** A multi-select filter dimension (e.g. Status, Owner, Agent). */
export type FilterFacet<V extends string = string> = {
  /** Stable key — React key only, not shown. */
  key: string;
  /** Display label, e.g. "Role". */
  label: string;
  options: ReadonlyArray<FilterOption<V>>;
  selected: ReadonlyArray<V>;
  onChange: (next: ReadonlyArray<V>) => void;
};

/** A single boolean filter (e.g. "Has scope"). */
export type FilterToggle = {
  key: string;
  label: string;
  on: boolean;
  onToggle: () => void;
};

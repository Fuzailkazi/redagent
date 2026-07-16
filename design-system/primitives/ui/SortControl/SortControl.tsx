/**
 * SortControl — a compact "Sort: {key}" dropdown plus an ascending/descending
 * toggle, for list pages. Presentational and controlled: the route owns the
 * sort state and does the actual comparison.
 *
 * Visual language matches FilterBar's "+ Filter" trigger (same caption button
 * chrome) so the two sit together in a <ListToolbar> as one control group.
 * The dropdown reuses <MenuItem> inside a <Popover>; the direction toggle is a
 * small icon button whose chevron rotates to point up (asc) or down (desc).
 */
import { useRef, useState, type ReactElement } from 'react';
import { Popover } from '../Popover';
import { MenuItem } from '../Menu';
import { IconCheck, IconChevronDown, IconSort } from '@shared/icons';

export type SortDirection = 'asc' | 'desc';

export type SortOption<K extends string = string> = {
  value: K;
  label: string;
};

export type SortControlProps<K extends string = string> = {
  options: ReadonlyArray<SortOption<K>>;
  value: K;
  direction: SortDirection;
  /** Called with the next key (direction unchanged) or the next direction. */
  onChange: (value: K, direction: SortDirection) => void;
  ariaLabel?: string;
};

export function SortControl<K extends string = string>({
  options,
  value,
  direction,
  onChange,
  ariaLabel = 'Sort',
}: SortControlProps<K>): ReactElement {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const active = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="inline-flex items-center gap-1">
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-aq-caption tracking-aq-wider border-aq-border bg-aq-surface text-aq-ink-soft hover:bg-aq-zebra inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold uppercase"
      >
        <IconSort size={12} stroke={1.8} />
        Sort
        {active ? <span className="text-aq-ink normal-case">: {active.label}</span> : null}
        <IconChevronDown size={12} stroke={1.8} className="text-aq-ink-muted" />
      </button>

      <button
        type="button"
        onClick={() => onChange(value, direction === 'asc' ? 'desc' : 'asc')}
        aria-label={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
        title={direction === 'asc' ? 'Ascending' : 'Descending'}
        className="border-aq-border bg-aq-surface text-aq-ink-soft hover:bg-aq-zebra flex h-7 w-7 items-center justify-center rounded-md border"
      >
        <IconChevronDown size={14} stroke={2} className={direction === 'asc' ? 'rotate-180' : ''} />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchor}
        placement="bottom-start"
        ariaLabel={ariaLabel}
      >
        <div role="menu" aria-label={ariaLabel} className="flex flex-col gap-0.5 p-1">
          {options.map((o) => (
            <MenuItem
              key={o.value}
              icon={o.value === value ? IconCheck : undefined}
              onClick={() => {
                onChange(o.value, direction);
                setOpen(false);
              }}
            >
              {o.label}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </div>
  );
}

export default SortControl;

/**
 * SearchField — a search-styled text input with leading magnifier and
 * trailing clear (x), revealed when there's a value.
 *
 * Mirrors the Figma SearchField component (Show clear boolean + value text).
 * Used by FilterBar's popover, the Roles capability search, the Members
 * search, and anywhere else a user is filtering a list.
 *
 * `value` and `onChange` are controlled — owning route keeps the state.
 */
import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { IconSearch, IconX } from '@shared/icons';

export type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'size'
> & {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, placeholder = 'Search…', className, ...rest },
  ref
) {
  return (
    <div
      className={[
        'border-aq-border bg-aq-surface flex h-9 items-center gap-2 rounded-md border px-3',
        'focus-within:border-aq-accent transition-colors',
        className ?? '',
      ].join(' ')}
    >
      <IconSearch size={14} stroke={1.8} className="text-aq-ink-muted shrink-0" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-aq-sm placeholder:text-aq-ink-muted flex-1 bg-transparent outline-none"
        {...rest}
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="text-aq-ink-muted hover:text-aq-ink shrink-0"
        >
          <IconX size={12} stroke={2} />
        </button>
      ) : null}
    </div>
  );
});

export default SearchField;

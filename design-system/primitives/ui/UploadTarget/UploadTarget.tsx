/**
 * UploadTarget — a clickable avatar that triggers a file picker.
 *
 * The Profile card needs a way for a user to swap their portrait. Wrapping
 * <Avatar> directly in a button would tie too much chrome onto the avatar
 * primitive itself (alt text, src, fallback), so this component inlines the
 * minimal rendering it needs and adds a hover overlay + hidden file input.
 *
 * Behaviour:
 *   - Click anywhere on the avatar opens the file picker.
 *   - `accept` is fixed to image/*.
 *   - When the user picks a file, `onUpload(file)` fires. The component does
 *     NOT do anything with the file beyond forwarding it — the parent decides
 *     where to store / preview it.
 *
 * The optional `helperText` renders to the right of the avatar as a small
 * caption (e.g. "JPG/PNG up to 2 MB").
 */
import { useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { IconUpload } from '@shared/icons';

export type UploadTargetProps = {
  /** Current image URL. If absent, the initials-disc fallback is shown. */
  src?: string;
  /** Display name (used for initials + alt text). */
  name: string;
  /** Edge length in px. Defaults to 64. */
  size?: number;
  /** Fires when the user picks a file. */
  onUpload?: (file: File) => void;
  /** Optional caption shown next to the avatar. */
  helperText?: string;
};

const FALLBACK_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: 'bg-aq-accent-soft', fg: 'text-aq-accent-strong' },
  { bg: 'bg-aq-good-soft', fg: 'text-aq-good' },
  { bg: 'bg-aq-warn-soft', fg: 'text-aq-warn' },
  { bg: 'bg-aq-bad-soft', fg: 'text-aq-bad' },
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function deriveInitials(name: string): string {
  const trimmed = name.trim() || '?';
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function UploadTarget({
  src,
  name,
  size = 64,
  onUpload,
  helperText,
}: UploadTargetProps): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errored, setErrored] = useState(false);

  const palette = useMemo(() => {
    const hash = hashString(name || 'unknown');
    return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]!;
  }, [name]);
  const initials = useMemo(() => deriveInitials(name), [name]);

  const handleClick = (): void => {
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    // Clear so re-selecting the same file fires onChange again.
    e.target.value = '';
  };

  const showImage = Boolean(src) && !errored;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Upload profile picture for ${name}`}
        title="Upload"
        className="group focus-visible:outline-aq-accent relative inline-flex shrink-0 cursor-pointer overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ width: size, height: size }}
      >
        {showImage ? (
          <img
            src={src}
            alt={name}
            width={size}
            height={size}
            onError={() => setErrored(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={[
              'flex h-full w-full items-center justify-center font-bold uppercase',
              palette.bg,
              palette.fg,
            ].join(' ')}
            style={{ fontSize: Math.max(12, Math.round(size * 0.36)) }}
          >
            {initials}
          </span>
        )}
        <span
          aria-hidden="true"
          className="bg-aq-ink-panel/40 text-aq-ink-on absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity motion-safe:duration-150"
        >
          <IconUpload size={Math.max(14, Math.round(size * 0.28))} />
        </span>
      </button>

      {helperText ? <p className="text-aq-xs text-aq-ink-muted">{helperText}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

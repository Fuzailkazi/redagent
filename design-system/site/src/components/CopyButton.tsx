import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Small copy affordance used on code, tokens, hex values, import lines. */
export function CopyButton({
  text,
  label,
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
      className={`border-aq-border bg-aq-surface text-aq-caption text-aq-ink-muted hover:border-aq-border-strong hover:text-aq-ink-soft inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-medium transition motion-safe:active:scale-[0.97] ${className}`}
      aria-label={`Copy ${label ?? text}`}
    >
      {done ? (
        <Check size={12} className="text-aq-good" strokeWidth={2.2} />
      ) : (
        <Copy size={12} strokeWidth={1.8} />
      )}
      {done ? 'Copied' : (label ?? 'Copy')}
    </button>
  );
}

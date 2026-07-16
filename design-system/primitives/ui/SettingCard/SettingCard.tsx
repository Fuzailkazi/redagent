/**
 * SettingCard — the Vercel-style account-settings card.
 *
 * Every individual setting on /account is rendered as one of these. The card
 * has three regions:
 *   1. Header: title (text-aq-md font-semibold) + optional one-line
 *      description (text-aq-sm text-aq-ink-muted).
 *   2. Body: the actual control (`children`).
 *   3. Footer-bar: edge-to-edge tinted strip with helper text on the left and
 *      a Save button on the right. The footer-bar is omitted entirely when
 *      `immediate` is true (used for controls that take effect on change,
 *      e.g. Avatar upload, Theme picker, Density picker).
 *
 * Tones:
 *   - default: standard card.
 *   - danger: adds a 2px aq-bad top border and tints the title in aq-bad.
 *   - ssomanaged: dims the body (aq-zebra) and surfaces a lock icon in the
 *     header — the control inside is read-only and explains who manages it.
 *
 * The Save button is driven by `saveState` (idle / dirty / saving / success /
 * error). Pair this with the `useCardSave` hook to get the state machine and
 * dirty-tracking for free.
 */
import type { ReactElement, ReactNode } from 'react';
import { IconCheckCircle, IconLock, IconRefresh } from '@shared/icons';

export type SettingCardTone = 'default' | 'danger' | 'ssomanaged';
export type SettingCardSaveState = 'idle' | 'dirty' | 'saving' | 'success' | 'error';

export type SettingCardProps = {
  /** Card title — always rendered in the header. */
  title: string;
  /** Optional one-line description under the title. */
  description?: string;
  /** Body of the card (the control). */
  children: ReactNode;
  /** Helper text shown in the footer-bar's left slot. */
  helperText?: ReactNode;
  /** Visual tone. Defaults to `default`. */
  tone?: SettingCardTone;
  /** Drives the Save button. Ignored when `immediate` is true. */
  saveState?: SettingCardSaveState;
  /** Called when the Save button is clicked. */
  onSave?: () => void;
  /** Label for the Save button. Defaults to "Save". */
  saveLabel?: string;
  /** When true, the footer-bar is omitted (no Save button). */
  immediate?: boolean;
  /**
   * Optional inline error displayed below the body. The Save button is left
   * in its `dirty` state so the user can retry after fixing the issue.
   */
  error?: string;
};

export function SettingCard({
  title,
  description,
  children,
  helperText,
  tone = 'default',
  saveState = 'idle',
  onSave,
  saveLabel = 'Save',
  immediate = false,
  error,
}: SettingCardProps): ReactElement {
  const isDanger = tone === 'danger';
  const isSso = tone === 'ssomanaged';

  return (
    <section
      className={['bg-aq-surface border-aq-border relative overflow-hidden rounded-lg border'].join(
        ' '
      )}
    >
      {isDanger ? (
        <span aria-hidden="true" className="bg-aq-bad absolute inset-x-0 top-0 h-0.5" />
      ) : null}

      <div className={['p-5', isSso ? 'bg-aq-zebra' : ''].join(' ')}>
        <header className="flex items-start gap-2">
          {isSso ? <IconLock size={14} className="text-aq-ink-muted mt-0.5 shrink-0" /> : null}
          <div className="min-w-0 flex-1">
            <h3
              className={[
                'text-aq-md font-semibold',
                isDanger ? 'text-aq-bad' : 'text-aq-ink',
              ].join(' ')}
            >
              {title}
            </h3>
            {description ? (
              <p className="text-aq-sm text-aq-ink-muted mt-1.5">{description}</p>
            ) : null}
          </div>
        </header>

        <div className="mt-4">{children}</div>

        {error ? (
          <div
            role="alert"
            className="bg-aq-bad-soft border-aq-bad text-aq-xs text-aq-bad mt-2 rounded-md border px-3 py-2"
          >
            {error}
          </div>
        ) : null}
      </div>

      {immediate ? null : (
        <SettingCardFooter
          helperText={helperText}
          saveState={saveState}
          onSave={onSave}
          saveLabel={saveLabel}
          danger={isDanger}
        />
      )}
    </section>
  );
}

type FooterProps = {
  helperText?: ReactNode;
  saveState: SettingCardSaveState;
  onSave?: () => void;
  saveLabel: string;
  danger: boolean;
};

function SettingCardFooter({
  helperText,
  saveState,
  onSave,
  saveLabel,
  danger,
}: FooterProps): ReactElement {
  const isIdle = saveState === 'idle';
  const isSaving = saveState === 'saving';
  const isSuccess = saveState === 'success';
  const disabled = isIdle || isSaving;

  const buttonBase =
    'text-aq-sm inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold focus-visible:outline-aq-accent focus-visible:outline-2 focus-visible:outline-offset-2';
  const buttonColor = danger ? 'bg-aq-bad text-aq-ink-on' : 'bg-aq-accent text-aq-ink-on';
  const buttonDisabled = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';

  return (
    <div className="border-aq-border bg-aq-zebra flex items-center justify-between gap-3 border-t px-5 py-3">
      <div className="text-aq-xs text-aq-ink-muted min-w-0 flex-1">{helperText ?? null}</div>
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <span className="text-aq-xs text-aq-good inline-flex items-center gap-1 font-semibold">
            <IconCheckCircle size={12} stroke={2.2} />
            Saved
          </span>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={onSave}
          className={[buttonBase, buttonColor, buttonDisabled].join(' ')}
        >
          {isSaving ? (
            <>
              <IconRefresh size={12} className="motion-safe:animate-spin" />
              Saving…
            </>
          ) : (
            saveLabel
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Banner — inline informational strip with tone-tinted background, leading
 * icon, message, and optional dismiss button.
 *
 * Mirrors the Figma Banner component set (4 tones: info / good / warn / bad).
 * Replaces ReadOnlyBanner, ErrorBanner, DraftRestoredBanner, and every
 * ad-hoc "tinted strip with icon and text" copy in the codebase.
 */
import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { IconCheckCircle, IconErrorCircle, IconShield, IconX, type IconProps } from '@shared/icons';

export type BannerTone = 'info' | 'good' | 'warn' | 'bad';

export type BannerProps = {
  tone?: BannerTone;
  /** Override the default tone icon. */
  icon?: ComponentType<IconProps>;
  /** Fires when the user clicks x. When omitted, no dismiss is rendered. */
  onDismiss?: () => void;
  /** Optional action button rendered on the trailing edge. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const TONE_CLS: Record<BannerTone, string> = {
  info: 'bg-aq-info-soft text-aq-info border-aq-info/30',
  good: 'bg-aq-good-soft text-aq-good border-aq-good/30',
  warn: 'bg-aq-warn-soft text-aq-warn border-aq-warn/30',
  bad: 'bg-aq-bad-soft text-aq-bad border-aq-bad/30',
};

const DEFAULT_ICON: Record<BannerTone, ComponentType<IconProps>> = {
  info: IconShield,
  good: IconCheckCircle,
  warn: IconErrorCircle,
  bad: IconErrorCircle,
};

export function Banner({
  tone = 'info',
  icon,
  onDismiss,
  action,
  children,
  className,
}: BannerProps): ReactElement {
  const Icon = icon ?? DEFAULT_ICON[tone];
  return (
    <div
      role="status"
      className={[
        'flex items-center gap-2.5 rounded-md border px-3.5 py-2.5',
        TONE_CLS[tone],
        className ?? '',
      ].join(' ')}
    >
      <Icon size={15} stroke={1.8} className="shrink-0" />
      <span className="text-aq-sm min-w-0 flex-1 font-medium">{children}</span>
      {action ? <span className="shrink-0">{action}</span> : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 hover:bg-current/10"
        >
          <IconX size={12} stroke={2} />
        </button>
      ) : null}
    </div>
  );
}

export default Banner;

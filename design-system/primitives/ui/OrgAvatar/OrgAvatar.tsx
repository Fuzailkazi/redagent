/**
 * OrgAvatar — coloured square with the org's initials.
 *
 * Promoted from the inline `OrgAvatar` previously living in
 * `src/shell/dashboard-shell/header/OrgSwitcher.tsx`. Now usable in the
 * org-picker, join-request screens, invite acceptance, and anywhere else an
 * org needs a tiny brand mark.
 *
 * Color is a token-bound family (accent / info / good / warn) → bg-aq-<color>
 * with text-aq-ink-on contents. Border-radius defaults to size * 0.3 px.
 *
 * Spec ref: docs/prototype-context/auth-onboarding.md §10.1 (4).
 */
import type { ReactElement } from 'react';

export type OrgAvatarColor = 'accent' | 'info' | 'good' | 'warn';

export type OrgAvatarOrg = {
  initials: string;
  color: OrgAvatarColor;
};

export type OrgAvatarProps = {
  org: OrgAvatarOrg;
  /** Edge length in px. Defaults to 24. */
  size?: number;
  /** Override the corner radius in px. Defaults to size * 0.3. */
  radius?: number;
  /** Optional extra classes. */
  className?: string;
};

const COLOR_TO_BG: Record<OrgAvatarColor, string> = {
  accent: 'bg-aq-accent',
  info: 'bg-aq-info',
  good: 'bg-aq-good',
  warn: 'bg-aq-warn',
};

export function OrgAvatar({ org, size = 24, radius, className }: OrgAvatarProps): ReactElement {
  const bg = COLOR_TO_BG[org.color];
  const r = radius ?? Math.round(size * 0.3);

  return (
    <span
      aria-hidden="true"
      className={[
        'font-geist text-aq-ink-on inline-flex shrink-0 items-center justify-center font-bold',
        bg,
        className ?? '',
      ].join(' ')}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        fontSize: Math.round(size * 0.4),
        letterSpacing: '0.01em',
      }}
    >
      {org.initials}
    </span>
  );
}

export default OrgAvatar;

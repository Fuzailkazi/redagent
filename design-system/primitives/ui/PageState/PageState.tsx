/**
 * PageState — empty / loading / error / denied state card.
 *
 * Mirrors the Figma PageState variant set. Replaces ~20 hand-rolled
 * "state card" copies (MembersEmpty, MembersError, MembersDenied,
 * RolesEmpty, RolesError, FilterEmpty, account StateViews, mcp
 * PageStates, settings PageStates, onboarding PageStates …).
 *
 *   <PageState state="empty" icon={IconUsers} headline="No teammates yet"
 *     body="..." cta={<Button>Invite</Button>} />
 *
 *   <PageState state="error" headline="Couldn’t load this page"
 *     body="..." cta={<Button variant="secondary">Retry</Button>} />
 */
import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { textsRevealContainer, textsRevealLine } from '@shared/motion';
import { IconAlert, IconErrorCircle, IconLock, IconRefresh, type IconProps } from '@shared/icons';

export type PageStateKind = 'empty' | 'loading' | 'error' | 'denied';

export type PageStateProps = {
  state: PageStateKind;
  /** Override the default icon for this state. */
  icon?: ComponentType<IconProps>;
  headline: string;
  body?: ReactNode;
  /** Trailing action element (typically a <Button>). */
  cta?: ReactNode;
  className?: string;
};

const STATE_CHIP: Record<PageStateKind, string> = {
  empty: 'bg-aq-accent-soft text-aq-accent',
  loading: 'bg-aq-zebra text-aq-ink-muted',
  error: 'bg-aq-bad-soft text-aq-bad',
  denied: 'bg-aq-warn-soft text-aq-warn',
};

const DEFAULT_ICON: Record<PageStateKind, ComponentType<IconProps>> = {
  empty: IconAlert,
  loading: IconRefresh,
  error: IconErrorCircle,
  denied: IconLock,
};

export function PageState({
  state,
  icon,
  headline,
  body,
  cta,
  className,
}: PageStateProps): ReactElement {
  const Icon = icon ?? DEFAULT_ICON[state];
  const reduce = useReducedMotion();
  // The icon, headline, body, and CTA rise in with a gentle stagger. Loading
  // keeps its spinner; reduced-motion users get the content with no transform.
  const line = reduce ? undefined : textsRevealLine;

  return (
    <motion.div
      role="status"
      aria-live={state === 'loading' ? 'polite' : 'off'}
      className={[
        'border-aq-border bg-aq-surface flex flex-col items-center rounded-xl border px-6 py-12 text-center',
        className ?? '',
      ].join(' ')}
      variants={reduce ? undefined : textsRevealContainer}
      initial={reduce ? false : 'hidden'}
      animate="visible"
    >
      <motion.div
        variants={line}
        className={`flex h-12 w-12 items-center justify-center rounded-lg ${STATE_CHIP[state]}`}
      >
        <Icon
          size={22}
          stroke={1.6}
          className={state === 'loading' ? 'motion-safe:animate-spin' : ''}
        />
      </motion.div>
      <motion.div variants={line} className="text-aq-ink text-aq-md mt-3 font-semibold">
        {headline}
      </motion.div>
      {body ? (
        <motion.div
          variants={line}
          className="text-aq-ink-muted text-aq-sm mt-1 max-w-md leading-snug"
        >
          {body}
        </motion.div>
      ) : null}
      {cta ? (
        <motion.div variants={line} className="mt-4">
          {cta}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export default PageState;

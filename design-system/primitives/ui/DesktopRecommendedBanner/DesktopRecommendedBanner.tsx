/**
 * DesktopRecommendedBanner: honest, dismissible "this works best on desktop"
 * nudge for the authoring-heavy screens (policy builder, financial template
 * builder, YAML editor).
 *
 * Tiered-responsive policy: we never BLOCK a screen on mobile. Read paths stay
 * usable everywhere; the few wide multi-pane authoring surfaces render and let
 * the user review, with this inline info strip setting an honest expectation
 * that editing is easier on a larger screen.
 *
 * Behaviour:
 *   - Renders ONLY below the `lg` (1024px) desktop boundary (`lg:hidden`).
 *   - Dismissible, and the dismissal is remembered in localStorage per `id` so
 *     the strip doesn't nag on every visit.
 *
 * Composes the shared <Banner> (tone=info); no new visual style is introduced.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { IconLayout } from '@shared/icons';
import { Banner } from '../Banner/Banner';

export type DesktopRecommendedBannerProps = {
  /**
   * Stable key for remembering dismissal, e.g. `policy-editor`. Stored under
   * `aq.desktop-nudge.<id>`.
   */
  id: string;
  /** Override the default message. */
  children?: React.ReactNode;
};

const STORAGE_PREFIX = 'aq.desktop-nudge.';

function readDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function DesktopRecommendedBanner({
  id,
  children,
}: DesktopRecommendedBannerProps): ReactElement | null {
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(storageKey));

  useEffect(() => {
    if (!dismissed) return;
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* private-mode / quota: non-fatal */
    }
  }, [dismissed, storageKey]);

  if (dismissed) return null;

  return (
    <div className="lg:hidden">
      <Banner tone="info" icon={IconLayout} onDismiss={() => setDismissed(true)}>
        {children ??
          'This builder is optimized for a larger screen. You can review here, but editing is easier on desktop.'}
      </Banner>
    </div>
  );
}

export default DesktopRecommendedBanner;

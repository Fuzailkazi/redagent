/**
 * Breadcrumb — horizontal chain of route crumbs.
 *
 * Mirrors the Figma Breadcrumb Item variant set (State: default / active /
 * dropdown). Each crumb is either a static label, a button that navigates,
 * or a button that opens a dropdown of sibling routes (the pattern in
 * DashboardShell's crumb dropdowns).
 *
 * Active crumb is rendered medium-weight ink; inactive crumbs are
 * ink-muted regular. Dropdown crumbs render a small ▾ glyph.
 */
import { Fragment, type ReactElement, type ReactNode } from 'react';

export type BreadcrumbItem = {
  key: string;
  label: ReactNode;
  /** Click handler. When omitted on a non-active crumb, renders as static
   *  text (no affordance). */
  onClick?: () => void;
  /** Render with a trailing ▾ to signal a dropdown is available. */
  hasDropdown?: boolean;
  /** Mark this crumb as the current route (final segment). */
  active?: boolean;
};

export type BreadcrumbProps = {
  items: ReadonlyArray<BreadcrumbItem>;
  /** Custom separator between crumbs. Default: '/'. */
  separator?: ReactNode;
  className?: string;
};

export function Breadcrumb({ items, separator = '/', className }: BreadcrumbProps): ReactElement {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={item.key}>
              <li className="inline-flex items-center gap-1">
                {item.onClick && !item.active ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-aq-ink-muted hover:text-aq-ink text-aq-xs font-medium transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span
                    className={[
                      'text-aq-xs',
                      item.active ? 'text-aq-ink font-medium' : 'text-aq-ink-muted',
                    ].join(' ')}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
                {item.hasDropdown ? (
                  <span aria-hidden className="text-aq-ink-muted text-aq-caption">
                    ▾
                  </span>
                ) : null}
              </li>
              {!isLast ? (
                <li aria-hidden className="text-aq-ink-muted text-aq-caption">
                  {separator}
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;

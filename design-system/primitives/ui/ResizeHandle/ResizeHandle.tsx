/**
 * ResizeHandle: the thin grabber strip that sits on the LEFT edge of a
 * right-docked panel (studio rail, SideModal). Spread the `handleProps` from
 * `useResizablePanel` onto it. It is a 10px hit area with a 1px hairline that
 * brightens to the accent on hover/drag, plus a small centred grip glyph.
 *
 * Visual only: all the pointer math lives in `useResizablePanel`.
 */
import type { ReactElement } from 'react';

export type ResizeHandleProps = {
  dragging: boolean;
  /** The spread from `useResizablePanel().handleProps`. */
  handleProps: Record<string, unknown>;
};

export function ResizeHandle({ dragging, handleProps }: ResizeHandleProps): ReactElement {
  return (
    <div
      {...handleProps}
      className={[
        'group absolute inset-y-0 left-0 z-30 flex w-2.5 -translate-x-1/2 cursor-col-resize items-center justify-center',
        'focus:outline-none',
      ].join(' ')}
    >
      {/* Hairline that brightens on hover / while dragging. */}
      <span
        className={[
          'h-full w-px transition-colors',
          dragging
            ? 'bg-aq-accent'
            : 'group-hover:bg-aq-accent/60 group-focus-visible:bg-aq-accent bg-transparent',
        ].join(' ')}
        aria-hidden
      />
      {/* Grip pill, only on hover / drag so it stays quiet at rest. */}
      <span
        className={[
          'bg-aq-accent absolute h-7 w-1 rounded-full transition-opacity',
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-80',
        ].join(' ')}
        aria-hidden
      />
    </div>
  );
}

export default ResizeHandle;

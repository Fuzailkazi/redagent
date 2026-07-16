/**
 * useCommandPaletteShortcut — global ⌘K / Ctrl+K opener.
 *
 * Installs a window keydown listener that calls `open()` when the user
 * presses ⌘K (macOS) or Ctrl+K (other platforms), unless the focus is
 * currently inside a text input — i.e. an `<input>`, `<textarea>`, or any
 * element with `contenteditable="true"`. That carve-out matches what people
 * expect from VS Code, Linear, and friends: typing in a search box should
 * not be hijacked.
 *
 * The hook cleans up its listener on unmount.
 */
import { useEffect } from 'react';

function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

export function useCommandPaletteShortcut(open: (() => void) | undefined): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      const isK = e.key === 'k' || e.key === 'K';
      if (!isK) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (isEditableTarget(document.activeElement)) return;
      e.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

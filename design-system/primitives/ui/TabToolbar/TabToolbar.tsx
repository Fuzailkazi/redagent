/**
 * TabToolbar — the standard "tab strip + ghost control trio" header used across
 * collection pages (Plans, Agents, MCP, Policies, …).
 *
 * It is a thin preset over <ListToolbar>: same filter / sort / search / view /
 * chips engine, locked to the ghost presentation at the dialled-in `lg` scale
 * (size 38 / icon 19 / stroke 1.7). There is deliberately only ONE toolbar
 * engine — this just fixes the two knobs (`variant`, `ghostScale`) so every page
 * gets the identical tab+trio shape without re-deciding them.
 *
 * Pass `tabs` for the left-hand strip; omit it and the trio simply sits alone.
 * Every other prop forwards straight to <ListToolbar>.
 */
import type { ReactElement } from 'react';
import { ListToolbar, type ListToolbarProps } from '../ListToolbar';

export type TabToolbarProps = Omit<ListToolbarProps, 'variant' | 'ghostScale'>;

export function TabToolbar(props: TabToolbarProps): ReactElement {
  return <ListToolbar variant="ghost" ghostScale="lg" {...props} />;
}

export default TabToolbar;

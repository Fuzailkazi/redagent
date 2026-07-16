/**
 * 28 inline-SVG icons used across the V5 design.
 *
 * Each icon is a thin wrapper over <Icon> that renders the path/shapes
 * defined in docs/design-source/lib-icons.jsx. Color is `currentColor` so
 * callers control it via Tailwind text classes (e.g. `text-aq-accent`,
 * `text-aq-ink-muted`).
 *
 * Default size 16, stroke width 1.6 — overridable per call site.
 */
import type { ReactElement } from 'react';
import { Icon, type IconProps } from './Icon';

export function IconSearch(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function IconBell(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function IconBellDot(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function IconPlus(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconTag(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.41l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42Z" />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconHexagon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z" />
    </Icon>
  );
}

export function IconRocket(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </Icon>
  );
}

export function IconGlobe(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Icon>
  );
}

export function IconBuilding(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" />
    </Icon>
  );
}

export function IconClock(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function IconShield(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />
    </Icon>
  );
}

export function IconShieldCheck(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function IconScroll(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </Icon>
  );
}

export function IconAlert(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </Icon>
  );
}

export function IconBot(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 3v5M8 13v2M16 13v2M2 14h2M20 14h2" />
    </Icon>
  );
}

export function IconServer(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="7" rx="1" />
      <rect x="3" y="13" width="18" height="7" rx="1" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </Icon>
  );
}

export function IconGauge(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 14 4 6" />
      <circle cx="12" cy="14" r="8" />
    </Icon>
  );
}

export function IconChart(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 3v18h18M7 14l4-4 3 3 5-7" />
    </Icon>
  );
}

export function IconRefresh(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </Icon>
  );
}

export function IconInfo(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </Icon>
  );
}

export function IconX(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

export function IconErrorCircle(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m4.93 4.93 14.14 14.14" />
    </Icon>
  );
}

export function IconMenu(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Icon>
  );
}

export function IconSettings(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Icon>
  );
}

export function IconEye(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function IconFile(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </Icon>
  );
}

export function IconTrash(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </Icon>
  );
}

export function IconDownload(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
    </Icon>
  );
}

export function IconKey(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.5 12.5 10-10M18 4l2 2M16 6l2 2" />
    </Icon>
  );
}

export function IconBook(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
    </Icon>
  );
}

export function IconNetwork(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 11l-5 6M12 11l5 6" />
    </Icon>
  );
}

export function IconClaw(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 20c2-8 4-12 8-12s6 4 8 12M8 20c1-5 2-8 4-8s3 3 4 8" />
    </Icon>
  );
}

export function IconDatabase(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </Icon>
  );
}

export function IconCheckCircle(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function IconArrowUpRight(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Icon>
  );
}

export function IconArrowRight(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function IconSpark(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6 4 4M5 19l4-4m6-6 4-4" />
    </Icon>
  );
}

export function IconFilter(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />
    </Icon>
  );
}

export function IconUsers(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

/* ─── MCP-feature icons (added in MCP slice rollout) ─────────────────────── */

export function IconRadar(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 12 19 5" />
    </Icon>
  );
}

export function IconTerminal(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h5" />
    </Icon>
  );
}

export function IconPackage(props: IconProps): ReactElement {
  // lucide `package` — single 3D box with tape seam. Cleaner at small/rail
  // sizes than the 3-box `IconBoxes` cluster.
  return (
    <Icon {...props}>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <path d="m3.29 7 8.71 5 8.71-5" />
      <path d="m7.5 4.27 9 5.15" />
    </Icon>
  );
}

export function IconCpu(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </Icon>
  );
}

export function IconActivity(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </Icon>
  );
}

export function IconLock(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  );
}

export function IconUpload(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14" />
    </Icon>
  );
}

export function IconCode(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />
    </Icon>
  );
}

export function IconExternal(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M15 3h6v6M21 3l-9 9M19 14v6H5V5h6" />
    </Icon>
  );
}

export function IconLink(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </Icon>
  );
}

export function IconClipboard(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    </Icon>
  );
}

export function IconClipboardCheck(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </Icon>
  );
}

export function IconZap(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </Icon>
  );
}

export function IconPause(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </Icon>
  );
}

export function IconPlay(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 4v16l14-8L6 4Z" />
    </Icon>
  );
}

export function IconArrowLeft(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </Icon>
  );
}

export function IconMore(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconCheck(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m5 12 5 5L20 7" />
    </Icon>
  );
}

export function IconCert(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 11h.01M13 9h5M13 13h3" />
      <path d="m7 17-1 4 3-1 3 1-1-4" />
    </Icon>
  );
}

export function IconScan(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M3 17v2a2 2 0 0 0 2 2h2M21 7V5a2 2 0 0 0-2-2h-2M21 17v2a2 2 0 0 1-2 2h-2M7 12h10" />
    </Icon>
  );
}

export function IconHistory(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 8v4l3 2" />
    </Icon>
  );
}

/* ─── Pin / Favorites (added for sidebar pinning) ───────────────────────── */

export function IconPin(props: IconProps): ReactElement {
  // lucide `pin`
  return (
    <Icon {...props}>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </Icon>
  );
}

export function IconPinOff(props: IconProps): ReactElement {
  // lucide `pin-off`
  return (
    <Icon {...props}>
      <path d="M12 17v5" />
      <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
      <path d="m2 2 20 20" />
      <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
    </Icon>
  );
}

/* ─── Nav rail icons (added in Phase 2: V2.1 shell rewrite) ─────────────── */

export function IconLayout(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </Icon>
  );
}

export function IconPanelLeft(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </Icon>
  );
}

export function IconBoxes(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 1.03 1.71l3 1.71a2 2 0 0 0 1.94 0L11 19.58a2 2 0 0 0 1-1.71v-3.24a2 2 0 0 0-1.03-1.71l-3-1.71a2 2 0 0 0-1.94 0Z" />
      <path d="M7 16.5 2.97 14.42M7 16.5l4.03-2.08M7 16.5v5" />
      <path d="M13 12.92A2 2 0 0 1 14 11.21l3-1.71a2 2 0 0 1 1.94 0l3 1.71a2 2 0 0 1 1.03 1.71v3.24a2 2 0 0 1-1.03 1.71l-3 1.71a2 2 0 0 1-1.94 0L14 17.87" />
      <path d="M10 5.21A2 2 0 0 1 11 3.5l3-1.71a2 2 0 0 1 1.94 0l3 1.71A2 2 0 0 1 20 5.21v3.24a2 2 0 0 1-1.03 1.71L15 12.5l-4.03-2.08A2 2 0 0 1 10 8.45Z" />
    </Icon>
  );
}

export function IconMailPlus(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="m2 7 10 6 10-6" />
      <path d="M19 16v6M16 19h6" />
    </Icon>
  );
}

export function IconShieldUser(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8.5 16c0-2 1.6-3.2 3.5-3.2s3.5 1.2 3.5 3.2" />
    </Icon>
  );
}

export function IconGraph(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="19" cy="19" r="2" />
      <line x1="7" y1="11.5" x2="17" y2="6.5" />
      <line x1="7" y1="12.5" x2="17" y2="17.5" />
    </Icon>
  );
}

/* ─── Workspace glyphs + Workspaces toolbar (Your workspaces card grid) ───── */

export function IconDiamond(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 2.6 21.4 12 12 21.4 2.6 12 12 2.6Z" />
    </Icon>
  );
}

export function IconCube(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </Icon>
  );
}

export function IconOrbit(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M18.9 5.1a9.6 9.6 0 0 1 0 13.8M5.1 18.9a9.6 9.6 0 0 1 0-13.8" />
    </Icon>
  );
}

export function IconTriangle(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 4.2 20.5 19H3.5L12 4.2Z" />
    </Icon>
  );
}

export function IconSort(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l3 3M17 20l-3-3" />
    </Icon>
  );
}

export function IconSliders(props: IconProps): ReactElement {
  // lucide `sliders-horizontal` — three tracks each with a knob. The modern
  // filter / adjust affordance; far clearer at toolbar size than a funnel.
  return (
    <Icon {...props}>
      <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
    </Icon>
  );
}

export function IconSortDesc(props: IconProps): ReactElement {
  // lucide `arrow-down-wide-narrow` — a down arrow beside bars of decreasing
  // width. Unambiguous "sort" glyph (the old IconSort read as two bars).
  return (
    <Icon {...props}>
      <path d="m3 16 4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4" />
    </Icon>
  );
}

export function IconSortAsc(props: IconProps): ReactElement {
  // lucide `arrow-up-narrow-wide` — the ascending counterpart to IconSortDesc:
  // an up arrow beside bars of increasing width.
  return (
    <Icon {...props}>
      <path d="m3 8 4-4 4 4M7 4v16M11 12h4M11 16h7M11 20h10" />
    </Icon>
  );
}

export function IconGrid2(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </Icon>
  );
}

export function IconRows(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="5" rx="1.6" />
      <rect x="3.5" y="14.5" width="17" height="5" rx="1.6" />
    </Icon>
  );
}

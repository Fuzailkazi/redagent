# Pages

Full-screen layouts are owned by shells under `src/shell/`. A page composes a shell + primitives; it does not lay out chrome by hand. Shells cannot run standalone in the static site, so this page documents their structure and the repo ships screenshots the site references for fidelity.

## DashboardShell

`@shell/dashboard-shell` - the primary application frame. Composition (left to right):

- **IconRail** - the slim icon-only left rail (top-level sections). Collapsible.
- **SecondRail** - the contextual second column listing the items within the active section. Hidden in compact mode and flown out on hover.
- **TopBar** - the header carrying the breadcrumb and the mobile menu trigger.
- **main** - the routed page content.

```tsx
import { DashboardShell } from '@shell/dashboard-shell';

<DashboardShell crumbs={[{ label: 'Agents' }, { label: 'Acme Bot' }]}>
  <AgentDetail />
</DashboardShell>;
```

**Props.** The current API is `crumbs` (an array of `Crumb`, each a string or `{ label, onClick?, dropdown? }`) plus `children`. Active nav state (`section`, `navActive`, `secondaryActive`) is **derived from the route** via `useLocation().pathname`; those props still exist but are deprecated and ignored, so older route files keep compiling. Do not pass them in new code; set the route and let the shell resolve the active rail item.

The shell also owns the open/collapsed nav preference (persisted to `localStorage` under `armoriq:nav-pref:v2`) and the responsive behavior: below the `lg` (1024px) boundary the rails collapse into an off-canvas drawer opened from the TopBar menu.

## AuthSplitLayout

`@shell/auth-shell` - the signed-out split layout.

- **Left** - a light form column (flex 1) on `aq-bg` carrying the small Armoriq lockup and the form.
- **Right** - a fixed-width (560px) dark `aq-ink-panel` column with the lockup top-left and a decorative policy visual. Hidden below `lg`, where the left column goes full-width.

```tsx
import { AuthSplitLayout } from '@shell/auth-shell';

<AuthSplitLayout left={<SignInForm />} right={<PolicyVisual />} liveRegion={statusMessage} />;
```

Props: `left`, `right` (both `ReactNode`), and optional `liveRegion` for screen-reader status announcements.

## Other shells

- **account-shell** - the account / personal-settings frame.
- **minimal-shell** - a stripped frame for standalone flows (onboarding, full-screen tasks).

## Reference screenshots

The repo carries captured screens the site uses as faithful page previews (shells cannot render in the zero-build static site). Examples at the repo root: `dark-01-members.png` (members list, dark theme), `api-dashboard-final.png` (API dashboard), `mcp-peek-final.png` (MCP server peek). These are honestly labeled as static captures, not live previews; the structure notes above are the authoritative description of composition.

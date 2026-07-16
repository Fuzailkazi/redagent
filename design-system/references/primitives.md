# Primitives

~52 hand-built primitives under `src/shared/ui/`, all exported from the `@shared/ui` barrel, plus 12 composed product sections (see the Sections block at the bottom). This page is a prose index grouped by category. For the structured detail (props, token bindings, usage, `whenToReachFor`), read `components.json` - that is the source an agent should query first.

```tsx
import { Button, StatusBadge, FormField } from '@shared/ui';
```

## Tiering

`components.json` tags each primitive with a `tier`:

- **Tier 1** (~24 workhorses): full treatment in the catalog (live preview, props table, token bindings, usage, snippet). These cover most screens.
- **Tier 2**: manifest entry, props, and source link; preview where cheap.
- **Tier 3**: complex or motion primitives (graph nodes, command palette, animated number, tours); manifest entry plus source link, demoed in the Motion section.

Every primitive appears in the manifest; the tier only controls catalog fidelity.

## Actions

- **Button** - the canonical action; variants primary/secondary/tertiary/ghost/danger, sizes xs/sm/md, icon-only and loading states. Replaces every raw `<button>`.
- **GradientButton** - the AI-accent CTA (the `aq-ai-*` gradient).

## Inputs and forms

- **FormField** - label + control + help/error wrapper; the standard form row.
- **SearchField** - search input with the search glyph and clear affordance.
- **OTPInput** - segmented one-time-code entry.
- **PasswordStrengthMeter** - strength bar + score (`scorePassword`).
- **Toggle** - on/off switch.
- **UploadTarget** - drag-and-drop / click file dropzone.

## Status and feedback

- **StatusBadge** - small status pill, toned good/warn/bad/info/neutral.
- **StatusChip** - interactive status chip with an optional action (`useStatusChip`).
- **Chip** - generic tag/filter chip; tones and sizes.
- **Banner** - inline page-level message, toned.
- **DesktopRecommendedBanner** - the "best on desktop" notice for authoring screens.

## Navigation and structure

- **Tabs** / **TabRail** - horizontal tabs and the vertical rail variant.
- **SegmentedControl** - compact 2-3 option switch (view mode).
- **ViewToggle** - list/grid view switch.
- **Breadcrumb** - top-bar path, supports dropdown crumbs.
- **Stepper** - multi-step flow progress.
- **SectionHeader** - titled section divider with optional tone and actions.
- **Collapsible** - disclosure / expand-collapse region.

## Lists and toolbars

- **ListRow** - a dense list item, comfortable/compact density.
- **ListToolbar** - the full list header: tabs, filters, search, view toggle, count.
- **TabToolbar** - a lighter tab-only toolbar.
- **SortControl** - sort field + direction.

## Overlays

- **Modal** - centered dialog (`ModalPrimaryButton`, `ModalSecondaryButton`), toned.
- **SideModal** - right-side drawer for detail/edit.
- **Popover** - anchored floating panel, placement-aware.
- **Menu** / **MenuItem** - dropdown menu and its items (toned items).
- **Tooltip** - hover/focus hint.
- **CommandPalette** - Cmd-K palette (`fuzzyMatch`, `useCommandPaletteShortcut`).
- **WelcomeDialog** - first-run welcome.
- **ProductTour** - guided step-through overlay.
- **BottomSheet** - mobile bottom sheet (grab handle, sticky thumb-zone footer); the small-screen counterpart to Modal/SideModal. Ships `SheetSection` / `SheetOption`.

## Page-level

- **PageState** - the four canonical states: loading, empty, error, content.

## Identity

- **Avatar** - user avatar, sizes xs-xl.
- **OrgAvatar** - organization avatar with deterministic color.
- **BrandIcon** - provider/tool logos via iconify simple-icons, with a 2-letter fallback mark.

## Cards

- **SettingCard** - a settings panel card with tone and save state.
- **CanvasDetailCard** / **CanvasModal** - graph-canvas detail surfaces.
- **IapCard** - the IAP verdict/argument card.
- **DataCard** - mobile data card (icon / title / status / 2-up fields / action row); the small-screen counterpart to a table row. Ships `DataCardList`.

## Graph (Tier 3)

- **GraphNodeShape** (subpath `@shared/ui/GraphNode`) - the circular node shared by the AIQ graph and Plans flow, with its `NODE_TYPES` / `STATUS` taxonomy.

## Motion primitives (Tier 3)

- **AnimatedNumber** - tweened number rollup.
- **TextSwap** - animated text-state swap.
- **IconSwap** - animated icon crossfade.
- **Shimmer** - shimmer/skeleton loading fill.
- **MatrixLoader** - patterned loader.

## Utility

- **PinKebab** - pin + kebab-menu affordance (`PinKebabHandle`).
- **SandboxPill** - sandbox/environment indicator.
- **Loader** - base spinner.

## Sections (from product)

Real composed pieces, pulled verbatim from feature code (not `@shared/ui`). They
appear in the manifest under `category: "sections"` and import from
`@features/<slice>/...`. Reuse or mirror these when building a screen region
instead of re-assembling primitives - they already encode the product's layout,
spacing, and data shape. The catalog renders each one live with real fixtures.

- **AgentCard** - registry signal card (glyph tile, name, status pill, 2x2 stat grid). `@features/agents/components/registry/AgentCard`.
- **McpServerCard** - MCP registry server card. `@features/mcp/components/McpServerCard`.
- **MemberCard** - team member grid card. `@features/team/components/MemberCard`.
- **EventRow** - activity/audit feed row. `@features/activity/components/EventRow`.
- **ComplianceCard** - dashboard compliance posture card (gauge + framework rows). `@features/dashboard/components/ComplianceCard`.
- **HeldActionsCard** - dashboard held-actions queue. `@features/dashboard/components/HeldActionsCard`.
- **AgentsServersCard** - dashboard inventory summary. `@features/dashboard/components/AgentsServersCard`.
- **StatStrip** - horizontal KPI strip of labelled cells. `@features/mcp/components/StatStrip`.
- **CrossPageHeader** - detail-page header (title/subtitle/actions). `@features/mcp/components/CrossPageHeader`.
- **MetricCard** - API-portal KPI card with signed delta. `@features/api-portal/components/MetricCard`.
- **SessionRow** - account session row with Revoke. `@features/account/components/SessionRow`.
- **AIQGraph** - the AIQ Graph canvas (force-directed estate topology, custom typed nodes + relationship edges on React Flow). `@features/graph/components/GraphCanvas`.

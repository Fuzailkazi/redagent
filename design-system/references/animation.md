# Animation

Motion in ArmorIQ is subtle, tokenized, and reduced-motion-safe. Pick the lowest rung of the ladder that does the job; do not reach for a heavier tool than the interaction needs.

## The ladder

1. **Motion tokens** - the vocabulary. Durations `--duration-aq-fast` (120ms), `--duration-aq-base` (200ms), `--duration-aq-slow` (320ms). Eases `--ease-aq-out` (`cubic-bezier(0.16, 1, 0.3, 1)`, the standard enter ease) and `--ease-aq-inout` (`cubic-bezier(0.45, 0, 0.55, 1)`). Every animation, at every rung, uses these. Never a raw `300ms` or an ad-hoc bezier.
2. **CSS transitions** - the default rung for UI micro-interactions: dropdowns, modals, badges, swaps, reveals. Use the `transitions-dev` skill, which ships 18 production-ready recipes (below). This covers the large majority of motion in the app.
3. **GSAP** - for timelines, scroll-driven sequences, pinning, and complex multi-step choreography. Use the `gsap-*` skills: `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react` (useGSAP + cleanup), `gsap-plugins`.
4. **framer-motion / motion** - already a dependency (`framer-motion`, `motion`). For React component-level enter/exit, shared-layout, and gesture animation that wants a declarative API tied to component state.

## Principles

- **Subtle.** Motion confirms a change; it does not perform. Short durations, gentle eases.
- **Tokenized.** Durations and eases come from the motion tokens, always.
- **Reduced-motion gated.** Honor `prefers-reduced-motion`. The app expresses this with Tailwind `motion-safe:` variants and a `@media (prefers-reduced-motion: reduce)` guard in `globals.css`; every non-trivial animation must degrade to no-motion.

## The 18 transitions-dev recipes

From the `transitions-dev` skill (`.claude/skills/transitions-dev/`). Invoke the skill for the full CSS:

1. **card-resize** - smooth content-driven card height/width change.
2. **number-pop-in** - a value popping into place (pair with `AnimatedNumber`).
3. **notification-badge** - badge appear/count change.
4. **text-swap** - crossfade between two text states (pair with `TextSwap`).
5. **menu-dropdown** - dropdown open/close.
6. **modal** - modal/dialog enter and exit.
7. **panel-reveal** - side panel / drawer reveal (pair with `SideModal`).
8. **page-side-by-side** - page-to-page slide transition.
9. **icon-swap** - icon crossfade (pair with `IconSwap`).
10. **success-check** - animated success checkmark.
11. **avatar-group-hover** - avatar stack fan/hover.
12. **error-shake** - invalid-input shake.
13. **input-clear** - search/input clear dissolve.
14. **skeleton-reveal** - skeleton to content reveal (pair with `Shimmer`).
15. **shimmer-text** - shimmering loading text.
16. **sliding-tabs** - sliding active indicator under tabs (pair with `Tabs` / `SegmentedControl`).
17. **tooltip** - tooltip appear (pair with `Tooltip`).
18. **text-reveal** - staggered text reveal.

## When to use each rung

| Interaction                                             | Rung                                         |
| ------------------------------------------------------- | -------------------------------------------- |
| Dropdown, modal, drawer, badge, swap, tooltip, skeleton | CSS transitions (`transitions-dev`)          |
| Number rollups, icon/text state crossfade               | the matching motion primitive + its recipe   |
| Scroll-pinned section, parallax, multi-element timeline | GSAP (`gsap-scrolltrigger`, `gsap-timeline`) |
| React enter/exit, shared-layout, drag gestures          | framer-motion / motion                       |

Default to the CSS rung. Escalate to GSAP or framer-motion only when the interaction is genuinely a timeline, scroll-linked, or gesture-driven.

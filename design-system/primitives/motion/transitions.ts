/**
 * Shared motion vocabulary.
 *
 * Single source of truth for every Framer Motion timing/spring/variant used
 * across the app, so animation values are never scattered inline. The numbers
 * mirror the CSS motion tokens in `src/styles/tokens.css`
 * (`--duration-aq-*`, `--ease-aq-*`) so JS-driven motion and CSS transitions
 * stay in lockstep.
 *
 * Everything here is framework-agnostic data (no JSX). Components import the
 * variants/transitions and decide how to apply them, and each is responsible
 * for honouring `prefers-reduced-motion` (see `reducedMotion()` helpers).
 */
import type { Transition, Variants } from 'framer-motion';

/* Durations, in seconds (Framer's unit). Mirrors the CSS ms tokens. */
export const aqDuration = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

/* Easing curves as cubic-bezier arrays. Mirror --ease-aq-out / --ease-aq-inout. */
export const aqEaseOut = [0.16, 1, 0.3, 1] as const;
export const aqEaseInOut = [0.45, 0, 0.55, 1] as const;

/**
 * Lively spring for layout/position moves (tour spotlight, sliding pills,
 * avatar lift). Tuned to ~0.84 damping ratio — snappy with a barely-there
 * settle, so motion reads as alive rather than mechanically critically-damped.
 */
export const aqSpring: Transition = {
  type: 'spring',
  stiffness: 460,
  damping: 34,
  mass: 0.9,
};

/**
 * Entrance spring for surfaces that pop in (modal card, dropdown, toast,
 * badge). A touch livelier than aqSpring; opacity and blur ride quick tweens
 * alongside so the fade stays crisp while scale/offset spring.
 */
export const aqSpringEnter: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 30,
  mass: 0.85,
  opacity: { duration: 0.14, ease: aqEaseOut },
  filter: { duration: 0.18, ease: aqEaseOut },
};

/** Standard eased tween for opacity/transform reveals. */
export const aqTween: Transition = {
  duration: aqDuration.base,
  ease: aqEaseOut,
};

/* ── wizard step transitions ─────────────────────────────────────────────── */
/**
 * Direction-aware enter/exit for the create-org wizard steps. `direction` is
 * +1 when advancing (Next) and -1 when going Back, so the new step always
 * slides in from the side travel is heading toward.
 */
export const stepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 24 : -24,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: aqDuration.slow, ease: aqEaseOut },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -24 : 24,
    transition: { duration: aqDuration.base, ease: aqEaseOut },
  }),
};

/* ── welcome dialog ──────────────────────────────────────────────────────── */
/** Scrim fade. */
export const welcomeScrimVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: aqDuration.base, ease: aqEaseOut } },
  exit: { opacity: 0, transition: { duration: aqDuration.fast, ease: aqEaseOut } },
};

/** Card rise + scale, and a container that staggers its children in. */
export const welcomeCardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: aqDuration.slow,
      ease: aqEaseOut,
      when: 'beforeChildren',
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: aqDuration.base, ease: aqEaseOut },
  },
};

/** Individual welcome-card children (glyph, title, line, CTAs). */
export const welcomeChildVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: aqDuration.base, ease: aqEaseOut } },
};

/* ── reduced-motion fallbacks ─────────────────────────────────────────────── */
/**
 * Opacity-only variants used when the user prefers reduced motion: no
 * transforms, no spring, just a quick crossfade. Shared by every surface so the
 * fallback reads consistently.
 */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: aqDuration.fast } },
  visible: { opacity: 1, transition: { duration: aqDuration.fast } },
  exit: { opacity: 0, transition: { duration: aqDuration.fast } },
};

/** Snap transition (instant) for reduced-motion layout moves. */
export const reducedSnap: Transition = { duration: 0 };

/* ── page mount ──────────────────────────────────────────────────────────── */
/** Fade-up used when a route's content first settles in (Plans landing). */
export const pageRiseVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: aqDuration.slow, ease: aqEaseOut } },
};

/* ── overlays (modal / drawer / dropdown / toast) ──────────────────────────
 * Choreography mirrors transitions.dev's modal / panel-reveal / dropdown
 * recipes (scale-up entrance + softer close, edge slide, origin-aware grow),
 * but every value is expressed through our own aq duration/ease tokens so the
 * app keeps a single motion vocabulary instead of a parallel one.
 */

/** Scrim fade shared by every overlay (modal, drawer, dialog, peek). */
export const scrimVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: aqDuration.base, ease: aqEaseOut } },
  exit: { opacity: 0, transition: { duration: aqDuration.fast, ease: aqEaseOut } },
};

/** Centered modal card: blurred scale-up entrance, softer scale-down on close. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: aqSpringEnter,
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.98,
    filter: 'blur(2px)',
    transition: { duration: aqDuration.fast, ease: aqEaseOut },
  },
};

/** Right-hand drawer / peek: springs in from the trailing edge. */
export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } },
  exit: { x: '100%', transition: { duration: aqDuration.base, ease: aqEaseOut } },
};

/**
 * Bottom sheet (mobile): springs up from the bottom edge, settles with a quiet
 * close. The thumb-zone surface that replaces popovers/menus on touch.
 */
export const sheetVariants: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', stiffness: 460, damping: 40, mass: 0.9 } },
  exit: { y: '100%', transition: { duration: aqDuration.base, ease: aqEaseOut } },
};

/**
 * Anchored dropdown / popover: origin-aware grow with a soft blur-in. The
 * consumer sets `transform-origin` from the resolved placement (top edge for
 * below-anchor, bottom edge for above-anchor) so the panel appears to unfold
 * from its trigger rather than its own centre.
 */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: aqSpringEnter,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -2,
    filter: 'blur(2px)',
    transition: { duration: aqDuration.fast, ease: aqEaseOut },
  },
};

/** Toast / status chip: springs up into place, quiet fade out. */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: aqSpringEnter,
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    filter: 'blur(2px)',
    transition: { duration: aqDuration.base, ease: aqEaseOut },
  },
};

/* ── text reveal ───────────────────────────────────────────────────────────
 * Staggered blurred rise for stacked lines (empty-state copy, section intros).
 * Mirrors transitions.dev "texts reveal". Pair the container with the child.
 */
export const textsRevealContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

export const textsRevealLine: Variants = {
  hidden: { opacity: 0, y: 6, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: aqDuration.slow, ease: aqEaseOut },
  },
};

/* ── feedback ──────────────────────────────────────────────────────────────
 * One-shot animation targets driven imperatively via useAnimationControls
 * (controls.start(shakeAnimation)) — used for "this is wrong" field feedback.
 */

/** Subtle horizontal shake for an invalid field. */
export const shakeAnimation = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.36, ease: aqEaseInOut },
};

/** Success "pop": a glyph settles in from slightly small. Pair with aqSpring. */
export const successPop: Variants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 320, damping: 18 },
  },
};

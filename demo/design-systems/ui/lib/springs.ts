/*
 * Vendored from Fluid Functionalism — `registry/default/lib/springs.ts` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - `goo`: the morph engine's own tier (lib/use-morph.ts) for the goo effect,
 *   slower than `slow` so the liquid neck stays on screen long enough to read.
 *   It lands in about 200ms with a little bounce and closes on a spring, not
 *   a tween, so the neck reforms on the way back.
 * - `exitFallbackMs` also reads a spring exit's `visualDuration`.
 */

// Motion tokens. Each tier's value is the ENTER transition — a critically
// damped spring, except the largest tier which keeps a little bounce. Its
// `.exit` is the matching EXIT transition — a plain tween, no bounce, one tier
// quicker — so a dismissal reads as crisp and final rather than replaying the
// entrance in reverse.
//
//   transition={spring.fast}                              // enter
//   exit={{ opacity: 0, transition: spring.fast.exit }}   // leave
//
// The bigger the thing that moves, the slower the spring. Never hand-write a
// duration — always reach for a tier.
export const spring = {
  fast: {
    type: 'spring' as const,
    duration: 0.08,
    bounce: 0,
    exit: { duration: 0.06 },
  },
  // Critically damped: same perceived speed as a bouncier tier, but lands
  // exactly with no overshoot — for short travel and panels/sheets that must
  // settle precisely (dropdowns, tabs, drawers, merged selection backgrounds).
  moderate: {
    type: 'spring' as const,
    duration: 0.16,
    bounce: 0,
    exit: { duration: 0.12 },
  },
  slow: {
    type: 'spring' as const,
    duration: 0.24,
    bounce: 0.12,
    exit: { duration: 0.16 },
  },
  goo: {
    type: 'spring' as const,
    visualDuration: 0.25,
    bounce: 0.15,
    exit: { type: 'spring' as const, visualDuration: 0.2, bounce: 0 },
  },
} as const

// Fallback delay (ms) for deferred-unmount timers that guard an exit tween:
// popups keep their portal mounted until onAnimationComplete fires, but a
// throttled/background tab can stall the animation, so a timer force-unmounts
// after the tier's exit duration plus a safety buffer. Deriving it here keeps
// the timers in step with the tokens above.
export const exitFallbackMs = (tier: { exit: { duration: number } | { visualDuration: number } }) =>
  Math.round(('duration' in tier.exit ? tier.exit.duration : tier.exit.visualDuration) * 1000) + 100

/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/springs.ts` + docs `app/docs/motion/page.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The spring tokens stay in `_fluid/lib/springs.ts` (vendored, shared by every
 *   animated component) and are re-exported here as `spring` / `exitFallbackMs`.
 * - `Motion` is new, local code: a small docs demo component (FF has none) that
 *   plays one tier's enter spring and exit tween on its children, so the docs
 *   page's demos (spring tracks, modal exit comparison, token reference) can be
 *   written as static TSDoc examples. It adds `sameExit` (the comparison's
 *   "same exit" side) and `reducedMotion` (a preview of the reduced-motion rule).
 * - The ball-on-track and fake-modal visuals are replaced by the demo's
 *   show/hide of arbitrary children; the component-chip links are plain text.
 * - framer-motion → motion/react.
 */

import type { ReactNode } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { cn } from '../../_fluid/lib/utils'
import { spring } from '../../_fluid/lib/springs'
import { useControllableState } from '../../_fluid/hooks/use-controllable-state'

type SpringTier = keyof typeof spring

interface MotionProps {
  /** Spring tier the children enter on (`spring.<tier>`); they leave on its `.exit` tween. `fast` for hover, fades and small toggles, `moderate` for dropdowns and tabs, `slow` for dialogs and large surfaces. Defaults to `'moderate'`. */
  tier?: 'fast' | 'moderate' | 'slow'
  /** Controlled visibility — `true` animates the children in, `false` animates them out. Pair with `onShowChange`. */
  show?: boolean
  /** Uncontrolled initial visibility, toggled by the built-in trigger. Defaults to `true`. */
  defaultShow?: boolean
  /** Called with the next visibility when the built-in trigger is pressed. */
  onShowChange?: (show: boolean) => void
  /** Leave on the tier's enter spring instead of its faster `.exit` tween — the drag FF's motion rules avoid; only for side-by-side comparisons. Defaults to `false`. */
  sameExit?: boolean
  /** Forwarded to motion's `<MotionConfig reducedMotion>`: `'user'` follows the OS setting, `'always'` previews it (transforms drop out, opacity fades stay), `'never'` ignores it. Defaults to `'user'`. */
  reducedMotion?: 'user' | 'always' | 'never'
  /** Extra classes for the wrapper (stage + trigger column). */
  className?: string
  /** The content that animates in and out. */
  children: ReactNode
}

/**
 * Three spring speeds, exits a little faster than entrances, and one fluid
 * hover shared by every list. Pick a speed, wire it in — every component
 * follows the same pattern.
 *
 * {@include ./motion.md}
 *
 * @example
 * # Three speeds
 *
 * All animations come from one of three springs. Hover states and small
 * toggles use `fast`, dropdowns and tabs use `moderate`, dialogs and drawers
 * use `slow`. Toggle each to feel the pace grow with the size of the thing
 * that moves.
 *
 * {@includeCode ./examples/three-speeds.tsx}
 *
 * @example
 * # Slow in, faster out
 *
 * Both panels open on `spring.slow`. The only difference is the close: the
 * left leaves on the same `spring.slow`, the right on `spring.slow.exit` — one
 * tier faster. Hide the left one first. That slight drag on the way out is
 * exactly what you're trying to avoid.
 *
 * {@includeCode ./examples/slow-in-faster-out.tsx}
 *
 * @example
 * # All tokens
 *
 * Each tier enters on its spring and leaves on its exit tween. Everything
 * lives in `springs` — duration values belong there, not scattered through
 * component code. Under each tier, the components that animate with it.
 *
 * {@includeCode ./examples/all-tokens.tsx}
 *
 * @example
 * # Reduced motion
 *
 * All springs respect the OS setting. Wrap the app tree in
 * `<MotionConfig reducedMotion="user">`, and when the user turns on reduced
 * motion the position changes drop out and only the opacity fades remain. The
 * right side forces that setting on to preview it.
 *
 * {@includeCode ./examples/reduced-motion.tsx}
 */
export default function Motion({
  tier = 'moderate',
  show,
  defaultShow = true,
  onShowChange,
  sameExit = false,
  reducedMotion = 'user',
  className,
  children,
}: MotionProps) {
  const [shown, setShown] = useControllableState(show, defaultShow, onShowChange)
  const enter = spring[tier] ?? spring.moderate
  const leave = sameExit ? enter : enter.exit

  return (
    <MotionConfig reducedMotion={reducedMotion}>
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <motion.div
          initial={false}
          aria-hidden={shown ? undefined : true}
          animate={
            shown
              ? { opacity: 1, scale: 1, y: 0, visibility: 'visible', transition: enter }
              : { opacity: 0, scale: 0.95, y: 6, visibility: 'visible', transition: leave, transitionEnd: { visibility: 'hidden' } }
          }
        >
          {children}
        </motion.div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <button
            type="button"
            aria-pressed={shown}
            aria-label={`${shown ? 'Hide' : 'Show'} (spring.${tier})`}
            onClick={() => setShown((v) => !v)}
            className="inline-flex h-7 cursor-pointer items-center rounded-lg px-3 text-[12px] text-foreground shadow-[0_0_0_1px_var(--border)] outline-none transition-colors duration-80 hover:bg-hover active:bg-active focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
          >
            {shown ? 'Hide' : 'Show'}
          </button>
          <span className="font-mono text-[11px] text-muted-foreground">
            spring.{tier} {enter.duration}s{enter.bounce ? ` bounce ${enter.bounce}` : ''} · exit {leave.duration}s
          </span>
        </div>
      </div>
    </MotionConfig>
  )
}

export { Motion }
export { spring, exitFallbackMs } from '../../_fluid/lib/springs'
export type { MotionProps, SpringTier }

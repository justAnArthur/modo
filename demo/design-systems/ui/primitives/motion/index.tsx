/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/springs.ts` + docs `app/docs/motion/page.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The spring tokens stay in `lib/springs.ts` (vendored, shared by every
 *   animated component) and are re-exported here as `spring` / `exitFallbackMs`.
 * - `Motion` is new, local code: a small docs demo component (FF has none) that
 *   plays one tier's enter spring and exit tween on its children, so the docs
 *   page's demos (spring tracks, modal exit comparison, token reference) can be
 *   written as static examples (examples.mdx). It adds `sameExit` (the comparison's
 *   "same exit" side) and `reducedMotion` (a preview of the reduced-motion rule).
 * - The ball-on-track and fake-modal visuals are replaced by the demo's
 *   show/hide of arbitrary children; the component-chip links are plain text.
 * - framer-motion → motion/react.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; literal colors → color tokens;
 *   `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 *   `spring.*`.
 */

import type { ReactNode } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/springs'
import { useControllableState } from '../../lib/use-controllable-state'

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
 * All animation comes from one of three springs in `lib/springs`
 * (re-exported here as `spring`). Hover states and small toggles use `fast`,
 * dropdowns and tabs use `moderate`, dialogs and drawers use `slow`. No
 * component invents its own timing, so things you've never thought about
 * together move at the same pace.
 *
 * Each tier's value is the **enter** transition; its `.exit` is the matching
 * **exit** — a plain tween, no bounce, one tier quicker — so a dismissal reads
 * as crisp and final rather than replaying the entrance in reverse. The bigger
 * the thing that moves, the slower the tier. `moderate` is critically damped: it
 * lands exactly with no overshoot, so it also carries panels that must settle
 * precisely.
 *
 * ## Tiers
 *
 * | Tier | Enter | Exit | Used by |
 * | --- | --- | --- | --- |
 * | `spring.fast` | 0.08s, bounce 0 | 0.06s | fluid hover, focus rings, checkbox, radio, tooltip, table rows, card grid, input copy, slider, select, combobox, color picker, accordion |
 * | `spring.moderate` | 0.16s, bounce 0 | 0.12s | dropdown, tabs indicator, switch thumb, selection merge / split |
 * | `spring.slow` | 0.24s, bounce 0.12 | 0.16s | dialog and other large surfaces |
 *
 * ## Usage
 *
 * Enter with `transition={spring.fast}` and leave with `exit={{ opacity: 0,
 * transition: spring.fast.exit }}`. Never hand-write a duration: the values
 * belong in `springs`, not in component code.
 *
 * - `exitFallbackMs(tier)` (also exported) is the tier's exit in ms plus a 100ms
 *   buffer, for deferred-unmount timers that guard an exit tween.
 * - CSS consumers get the same tiers from `tokens/motion.css`: `--duration-fast`
 *   80ms / `--duration-fast-exit` 60ms, moderate 160 / 120, slow 240 / 160.
 *
 * ## Reduced motion
 *
 * Every spring respects the OS setting once the app tree is wrapped in
 * `<MotionConfig reducedMotion="user">`. With reduced motion on, position and
 * scale changes drop out and only the opacity fades remain.
 *
 * ## The `Motion` demo
 *
 * `Motion` itself is a docs demo, not a building block: it shows or hides its
 * children with one tier's enter spring and exit tween (fade + scale + a short
 * rise), with a built-in Show/Hide trigger and a readout of the token it plays.
 * Hidden children keep their space and leave the accessibility tree.
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
            className="inline-flex h-7 cursor-pointer items-center rounded-lg px-3 text-caption text-foreground shadow-[0_0_0_1px_var(--border)] outline-none transition-colors duration-fast hover:bg-hover active:bg-active focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            {shown ? 'Hide' : 'Show'}
          </button>
          <span className="font-mono text-caption-compact text-muted-foreground">
            spring.{tier} {enter.duration}s{enter.bounce ? ` bounce ${enter.bounce}` : ''} · exit {leave.duration}s
          </span>
        </div>
      </div>
    </MotionConfig>
  )
}

export { Motion }
export { spring, exitFallbackMs } from '../../lib/springs'
export type { MotionProps, SpringTier }

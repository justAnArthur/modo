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
 * All animation comes from one of three springs in `_fluid/lib/springs`
 * (re-exported here as `spring`). Hover states and small toggles use `fast`,
 * dropdowns and tabs use `moderate`, dialogs and drawers use `slow`. No
 * component invents its own timing, so things you've never thought about
 * together move at the same pace. `moderate` is critically damped — it lands
 * exactly with no overshoot, so it also carries panels that must settle
 * precisely. Each tier's value is the ENTER transition; its `.exit` is the
 * matching EXIT — a plain tween, no bounce, one tier quicker — so a dismissal
 * reads as crisp and final rather than replaying the entrance in reverse. The
 * bigger the thing that moves, the slower the tier.
 *
 * Tiers — `spring.fast`: 0.08s, bounce 0, exit 0.06s — fluid hover, focus
 * rings, checkbox, radio, tooltip, table rows, card grid, input copy, slider,
 * select, combobox, color picker, accordion. `spring.moderate`: 0.16s, bounce 0
 * (critically damped), exit 0.12s — dropdown, tabs indicator, switch thumb,
 * selection merge / split. `spring.slow`: 0.24s, bounce 0.12, exit 0.16s —
 * dialog and other large surfaces.
 *
 * Usage: enter with `transition={spring.fast}` and leave with
 * `exit={{ opacity: 0, transition: spring.fast.exit }}` — never hand-write a
 * duration; the values belong in `springs`, not in component code.
 * `exitFallbackMs(tier)` (also exported) is the tier's exit in ms plus a 100ms
 * buffer, for deferred-unmount timers that guard an exit tween. CSS consumers
 * get the same tiers from tokens/motion.css (`--duration-fast` 80ms /
 * `--duration-fast-exit` 60ms, moderate 160 / 120, slow 240 / 160).
 *
 * Reduced motion: every spring respects the OS setting once the app tree is
 * wrapped in `<MotionConfig reducedMotion="user">` — with reduced motion on,
 * position and scale changes drop out and only the opacity fades remain.
 *
 * `Motion` itself is a docs demo, not a building block: it shows or hides its
 * children with one tier's enter spring and exit tween (fade + scale + a short
 * rise), with a built-in Show/Hide trigger and a readout of the token it plays.
 * Hidden children keep their space and leave the accessibility tree.
 *
 * @example
 * # Three speeds
 *
 * All animations come from one of three springs. Hover states and small
 * toggles use fast, dropdowns and tabs use moderate, dialogs and drawers use
 * slow. Toggle each to feel the pace grow with the size of the thing that
 * moves.
 *
 * ```tsx
 * <div className="flex w-full flex-wrap items-start justify-center gap-8">
 *   <Motion tier="fast">
 *     <div className="flex h-9 items-center gap-2 rounded-lg bg-hover px-3 text-body text-foreground">
 *       <Check size={16} /> Hover, fades
 *     </div>
 *   </Motion>
 *   <Motion tier="moderate">
 *     <div className="flex w-40 flex-col gap-1 rounded-xl bg-surface-3 p-1 text-body text-foreground shadow-surface-3">
 *       <span className="rounded-lg bg-active px-2 py-1.5">Last updated</span>
 *       <span className="px-2 py-1.5 text-muted-foreground">Created</span>
 *       <span className="px-2 py-1.5 text-muted-foreground">Name</span>
 *     </div>
 *   </Motion>
 *   <Motion tier="slow">
 *     <div className="flex w-48 flex-col gap-2 rounded-2xl bg-surface-5 p-4 shadow-surface-5">
 *       <span className="text-subtitle font-semibold text-foreground">Create teamspace</span>
 *       <span className="text-caption text-muted-foreground">Dialogs and drawers land on the slow spring.</span>
 *     </div>
 *   </Motion>
 * </div>
 * ```
 *
 * @example
 * # Slow in, faster out
 *
 * Both panels open on spring.slow. The only difference is the close: the left
 * leaves on the same spring.slow, the right on spring.slow.exit — one tier
 * faster. Hide the left one first. That slight drag on the way out is exactly
 * what you're trying to avoid.
 *
 * ```tsx
 * <div className="flex w-full flex-wrap items-start justify-center gap-8">
 *   <div className="flex flex-col items-center gap-3">
 *     <Motion tier="slow" sameExit>
 *       <div className="flex w-56 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xl">
 *         <div className="h-3 w-1/2 rounded-full bg-foreground/10" />
 *         <div className="mt-1 h-2 w-full rounded-full bg-foreground/6" />
 *         <div className="h-2 w-2/5 rounded-full bg-foreground/6" />
 *         <div className="mt-3 flex justify-end gap-2">
 *           <div className="h-6 w-16 rounded-md bg-foreground/10" />
 *           <div className="h-6 w-16 rounded-md bg-foreground/10" />
 *         </div>
 *       </div>
 *     </Motion>
 *     <span className="text-caption text-muted-foreground">Same exit time — drags on the way out</span>
 *   </div>
 *   <div className="flex flex-col items-center gap-3">
 *     <Motion tier="slow">
 *       <div className="flex w-56 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xl">
 *         <div className="h-3 w-1/2 rounded-full bg-foreground/10" />
 *         <div className="mt-1 h-2 w-full rounded-full bg-foreground/6" />
 *         <div className="h-2 w-2/5 rounded-full bg-foreground/6" />
 *         <div className="mt-3 flex justify-end gap-2">
 *           <div className="h-6 w-16 rounded-md bg-foreground/10" />
 *           <div className="h-6 w-16 rounded-md bg-foreground/10" />
 *         </div>
 *       </div>
 *     </Motion>
 *     <span className="text-caption text-muted-foreground">Faster exit — gone a tier quicker</span>
 *   </div>
 * </div>
 * ```
 *
 * @example
 * # All tokens
 *
 * Each tier enters on its spring and leaves on its exit tween. Everything
 * lives in springs — duration values belong there, not scattered through
 * component code. Under each tier, the components that animate with it.
 *
 * ```tsx
 * <div className="flex w-full flex-col divide-y divide-border">
 *   {[
 *     ['fast', 'Fluid hover · Focus rings · Checkbox · Radio · Tooltip · Table rows · Card grid · Input copy · Slider · Select · Combobox · Color picker · Accordion'],
 *     ['moderate', 'Dropdown · Tabs indicator · Switch thumb · Selection merge / split'],
 *     ['slow', 'Dialog'],
 *   ].map(([tier, uses]) => (
 *     <div key={tier} className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:gap-6">
 *       <Motion tier={tier} className="shrink-0 sm:w-56">
 *         <div className="h-8 w-40 rounded-full bg-foreground" />
 *       </Motion>
 *       <span className="text-body text-muted-foreground">{uses}</span>
 *     </div>
 *   ))}
 * </div>
 * ```
 *
 * @example
 * # Reduced motion
 *
 * All springs respect the OS setting. Wrap the app tree in a MotionConfig with
 * reducedMotion set to user, and when the user turns on reduced motion the
 * position changes drop out and only the opacity fades remain. The right side
 * forces that setting on to preview it.
 *
 * ```tsx
 * <div className="flex w-full flex-wrap items-start justify-center gap-8">
 *   <div className="flex flex-col items-center gap-3">
 *     <Motion tier="slow" reducedMotion="never">
 *       <div className="h-20 w-40 rounded-xl bg-surface-5 shadow-surface-5" />
 *     </Motion>
 *     <span className="text-caption text-muted-foreground">Full motion</span>
 *   </div>
 *   <div className="flex flex-col items-center gap-3">
 *     <Motion tier="slow" reducedMotion="always">
 *       <div className="h-20 w-40 rounded-xl bg-surface-5 shadow-surface-5" />
 *     </Motion>
 *     <span className="text-caption text-muted-foreground">Reduced motion — opacity only</span>
 *   </div>
 * </div>
 * ```
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

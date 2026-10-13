/*
 * Local addition (not part of Fluid Functionalism): progress on Base UI's
 * Progress (the `progressbar` role and its values). The determinate fill is a
 * full-width bar slid in with `translateX` on `spring.moderate`, after
 * upstream FF's CarouselDots fill (never scaled, so its rounded end keeps its
 * shape); the indeterminate bar sweeps a segment across the track and the
 * spinner draws Button's figure-eight loading glyph, both on `--duration-loop`
 * (`progress.css`).
 */

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { motion } from 'motion/react'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from 'react'
import { useReduceMotion } from '../../lib/reduced-motion'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'

// Literal tables: UnoCSS only generates the classes it can read whole.
const SPINNER_BOX = { default: 'size-9', compact: 'size-7' }
const CAPTION = { default: 'text-caption', compact: 'text-caption-compact' }

interface SpinnerProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** Pins the spinner to one step of the size ladder: one control tall (36px default, 28px compact), like a loading Button's. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** What is loading, read to assistive tech. Defaults to `"Loading"`. */
  label?: string
  /** Classes for the box: a size off the ladder (`size-5` inline in text), a color. */
  className?: string
}

/** An indeterminate wait in a small space: Button's loading glyph on its own. */
const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size: sizeProp, label = 'Loading', className, ...props }, ref) => {
    const size = useSize(sizeProp)
    const reduced = useReduceMotion()
    return (
      <ProgressPrimitive.Root
        // The root renders a span (render below); Base UI types its ref as a div's.
        ref={ref as unknown as Ref<HTMLDivElement>}
        value={null}
        aria-label={label}
        render={<span />}
        {...props}
        className={cn('inline-flex shrink-0 text-current', SPINNER_BOX[size.variant], className)}
      >
        <svg className="size-full" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
            stroke="currentColor"
            strokeWidth="1.125"
            strokeLinecap="round"
            pathLength="100"
            className={reduced ? 'progress-breathe' : 'progress-spin'}
          />
        </svg>
      </ProgressPrimitive.Root>
    )
  },
)

Spinner.displayName = 'Spinner'

interface ProgressProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** How far along the task is, between `min` and `max`. `null` is an indeterminate bar: a segment sweeping the track while the amount is unknown. Defaults to `null`. */
  value?: number | null
  /** The value of an empty bar. Defaults to `0`. */
  min?: number
  /** The value of a full bar. Defaults to `100`. */
  max?: number
  /** A label above the bar, also its accessible name. Without one, give the bar an `aria-label`. */
  label?: ReactNode
  /** Shows the value, formatted as a percentage, at the end of the label row. Defaults to `false`. */
  showValue?: boolean
  /** Number format for the shown value and for assistive tech, as `Intl.NumberFormat` options. Defaults to a percentage. */
  format?: Intl.NumberFormatOptions
  /** Pins the label row to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root: a width, or `absolute inset-x-0 top-0` for a loading line along a region's top edge. */
  className?: string
}

type ProgressComponent = ForwardRefExoticComponent<ProgressProps & RefAttributes<HTMLDivElement>> & {
  Spinner: typeof Spinner
}

/**
 * Shows how far along a task is, or that something is still working when
 * nobody knows how far.
 *
 * A determinate bar (`value`) slides its fill to the new amount on the
 * indicator spring, never stretching it, so the rounded end keeps its shape;
 * an indeterminate one (`value={null}`) sweeps an ink segment along a recessed
 * track. The fill is ink, not the brand blue: progress is information, not a
 * selection. Base UI's Progress gives the bar its `progressbar` role, its
 * values and their text for assistive tech; `label` names it and `showValue`
 * prints the formatted value beside the label. Under reduced motion the fill
 * jumps to its amount and the indeterminate bar breathes in place instead of
 * travelling.
 *
 * Statics:
 * - `Progress.Spinner` — the same wait in a small space: Button's loading
 *   glyph on its own, one control tall (`size`), `label` for assistive tech.
 *   Also exported as `Spinner`.
 *
 * @example {@include ./examples.mdx}
 */
const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    { value = null, min = 0, max = 100, label, showValue = false, format, size: sizeProp, className, ...props },
    ref,
  ) => {
    const size = useSize(sizeProp)
    const reduced = useReduceMotion()
    const share = value === null ? null : Math.min(Math.max((value - min) / (max - min), 0), 1)
    const { exit: _exit, ...enter } = spring.moderate

    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        min={min}
        max={max}
        format={format}
        {...props}
        className={cn('flex w-full flex-col gap-2', className)}
      >
        {(label || showValue) && (
          <div className={cn('flex items-baseline justify-between gap-3', CAPTION[size.variant])}>
            {label && (
              <ProgressPrimitive.Label className="min-w-0 truncate text-foreground">{label}</ProgressPrimitive.Label>
            )}
            {showValue && value !== null && (
              <ProgressPrimitive.Value className="ml-auto shrink-0 tabular-nums text-muted-foreground" />
            )}
          </div>
        )}
        <ProgressPrimitive.Track className="relative h-1 w-full overflow-hidden rounded-full bg-progress-track">
          {share === null ? (
            <span
              className={cn(
                'absolute inset-y-0 left-0 rounded-full bg-foreground',
                reduced ? 'w-full progress-breathe' : 'w-2/5 progress-sweep',
              )}
            />
          ) : (
            <motion.span
              className="absolute inset-0 rounded-full bg-foreground"
              initial={false}
              animate={{ x: `${(share - 1) * 100}%` }}
              transition={reduced ? { duration: 0 } : enter}
            />
          )}
        </ProgressPrimitive.Track>
      </ProgressPrimitive.Root>
    )
  },
) as ProgressComponent

Progress.displayName = 'Progress'

Object.assign(Progress, { Spinner })

export type { ProgressProps, SpinnerProps }
export { Progress, Spinner }

export default Progress

/*!
 * Local addition (not part of Fluid Functionalism): a read-only gauge for a
 * share of a budget (usage, a rate limit, a context window), as a bar or a
 * ring. The fill springs to its value on the moderate tier and turns to the
 * warning and error status hues as the budget runs out.
 */

'use client'

import { motion } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { useReduceMotion } from '../../lib/reduced-motion'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'

type MeterTone = 'default' | 'warning' | 'error'

// Literal tables: UnoCSS only generates the classes it can read whole.
const BAR_FILL: Record<MeterTone, string> = {
  default: 'bg-muted-foreground',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
}
const RING_FILL: Record<MeterTone, string> = {
  default: 'text-muted-foreground',
  warning: 'text-status-warning',
  error: 'text-status-error',
}
const RING_SIZE: Record<SizeVariant, number> = { default: 20, compact: 16 }

function toneOf(share: number, warnAt: number, errorAt: number): MeterTone {
  if (share >= errorAt) return 'error'
  if (share >= warnAt) return 'warning'
  return 'default'
}

interface MeterProps {
  /** The used amount, between 0 and `max`. */
  value: number
  /** The whole budget. Defaults to `1`. */
  max?: number
  /** What is measured, shown above the bar and read by screen readers. */
  label: string
  /** A line on the right of the label: the value, a reset time. Defaults to the share in percent. */
  detail?: ReactNode
  /** A bar under its label; a bare line for tight rows; or a ring glyph that sits inline. The line and the ring keep the label as the accessible name only. Defaults to `'bar'`. */
  variant?: 'bar' | 'line' | 'ring'
  /** The share from which the fill turns to the warning hue. Defaults to `0.75`. */
  warnAt?: number
  /** The share from which the fill turns to the error hue. Defaults to `0.9`. */
  errorAt?: number
  /** Pins the meter to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root. */
  className?: string
}

/**
 * A read-only gauge for how much of a budget is used: a plan's usage, a
 * rate limit, a context window.
 *
 * The bar sits under its label with the share (or any `detail`) on the
 * right; the line is the bare bar for tight rows, and the ring a small
 * glyph for toolbars, both with their label as the accessible name. Either fill springs to a new value instead of jumping, and
 * turns to the warning hue from `warnAt` and to the error hue from `errorAt`,
 * so a budget running out reads at a glance without a third grey.
 *
 * @example {@include ./examples.mdx}
 */
const Meter = forwardRef<HTMLDivElement, MeterProps>(
  (
    { value, max = 1, label, detail, variant = 'bar', warnAt = 0.75, errorAt = 0.9, size: sizeProp, className },
    ref,
  ) => {
    const size = useSize(sizeProp)
    const reduceMotion = useReduceMotion()
    const share = Math.min(Math.max(value / max, 0), 1)
    const tone = toneOf(share, warnAt, errorAt)
    const transition = reduceMotion ? { duration: 0 } : spring.moderate
    const aria = {
      role: 'meter',
      'aria-label': label,
      'aria-valuemin': 0,
      'aria-valuemax': max,
      'aria-valuenow': value,
    }

    if (variant === 'ring') {
      const px = RING_SIZE[size.variant]
      return (
        <div ref={ref} {...aria} className={cn('inline-flex shrink-0', className)}>
          <svg width={px} height={px} viewBox="0 0 20 20" aria-hidden="true" className="-rotate-90">
            <circle cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" className="stroke-current text-border" />
            <motion.circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={cn('stroke-current transition-[color] duration-fast', RING_FILL[tone])}
              initial={false}
              animate={{ pathLength: share }}
              transition={transition}
            />
          </svg>
        </div>
      )
    }

    const track = (
      <div className="h-1 overflow-hidden rounded-full bg-active">
        <motion.div
          className={cn('h-full origin-left rounded-full transition-[background-color] duration-fast', BAR_FILL[tone])}
          initial={false}
          animate={{ scaleX: share }}
          transition={transition}
        />
      </div>
    )

    if (variant === 'line') {
      return (
        <div ref={ref} {...aria} className={cn('min-w-0', className)}>
          {track}
        </div>
      )
    }

    return (
      <div ref={ref} {...aria} className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <div
          className={cn(
            'flex items-baseline justify-between gap-2',
            size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
          )}
        >
          <span className="truncate text-foreground">{label}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{detail ?? `${Math.round(share * 100)}%`}</span>
        </div>
        {track}
      </div>
    )
  },
)

export type { MeterProps, MeterTone }
export { Meter }

export default Meter

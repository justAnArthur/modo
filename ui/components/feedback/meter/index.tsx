/*
 * Local addition (not part of Fluid Functionalism): a read-only gauge for a
 * share of a budget (usage, a rate limit, a context window), as a bar or a
 * ring, on Base UI's Meter (the `meter` role and its values). The bar's fill
 * slides in with `translateX` on `spring.moderate`, like Progress's, and turns
 * to the warning and error status hues as the budget runs out.
 */

'use client'

import { Meter as MeterPrimitive } from '@base-ui/react/meter'
import { motion } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring, springEnter } from '../../../lib/springs'
import { cn } from '../../../lib/utils'

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
const RING_SIZE: Record<SizeVariant, number> = { default: 16, compact: 14 }
const CAPTION: Record<SizeVariant, string> = { default: 'text-caption', compact: 'text-caption-compact' }

const enter = springEnter(spring.moderate)

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
  /** Overrides the tone `warnAt` and `errorAt` derive, for a caller that judges the budget itself (whether it lasts until its reset). */
  tone?: MeterTone
  /** A share between 0 and 1 where a thin tick crosses the bar or the line: where an even spend would be by now, a soft limit. The ring ignores it. */
  marker?: number
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
 * glyph for toolbars, both with their label as the accessible name. Either
 * fill springs to a new value instead of jumping (the bar's slides, never
 * stretching, so its rounded end keeps its shape), and turns to the warning hue from `warnAt` and to the error hue from `errorAt`,
 * so a budget running out reads at a glance without a third grey. A caller
 * that judges the budget itself passes `tone` instead.
 *
 * A `marker` draws a tick across the bar or the line at a share, such as
 * where an even spend would be by now, so the fill reads against time.
 *
 * @example {@include ./examples.mdx}
 */
const Meter = forwardRef<HTMLDivElement, MeterProps>(
  (
    {
      value,
      max = 1,
      label,
      detail,
      variant = 'bar',
      warnAt = 0.75,
      errorAt = 0.9,
      tone: toneProp,
      marker,
      size: sizeProp,
      className,
    },
    ref,
  ) => {
    const size = useSize(sizeProp)
    const reduceMotion = useReduceMotion()
    const share = Math.min(Math.max(value / max, 0), 1)
    const tone = toneProp ?? toneOf(share, warnAt, errorAt)
    const transition = reduceMotion ? { duration: 0 } : enter
    const root = { ref, value, max, 'aria-label': label }

    if (variant === 'ring') {
      const px = RING_SIZE[size.variant]
      return (
        <MeterPrimitive.Root {...root} className={cn('inline-flex shrink-0', className)}>
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
        </MeterPrimitive.Root>
      )
    }

    const track = (
      <div className="relative h-1 overflow-x-clip">
        <MeterPrimitive.Track className="relative block h-full overflow-hidden rounded-full bg-active">
          <motion.span
            className={cn('absolute inset-0 rounded-full transition-[background-color] duration-fast', BAR_FILL[tone])}
            initial={false}
            animate={{ x: `${(share - 1) * 100}%` }}
            transition={transition}
          />
        </MeterPrimitive.Track>
        {marker !== undefined && (
          // A full-width layer slid by the share, so the tick moves on a transform.
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            initial={false}
            animate={{ x: `${Math.min(Math.max(marker, 0), 1) * 100}%` }}
            transition={transition}
          >
            <span className="absolute -inset-y-0.5 left-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground" />
          </motion.div>
        )}
      </div>
    )

    if (variant === 'line') {
      return (
        <MeterPrimitive.Root {...root} className={cn('min-w-0', className)}>
          {track}
        </MeterPrimitive.Root>
      )
    }

    return (
      <MeterPrimitive.Root {...root} className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <div className={cn('flex items-baseline justify-between gap-2', CAPTION[size.variant])}>
          <span className="truncate text-foreground">{label}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{detail ?? `${Math.round(share * 100)}%`}</span>
        </div>
        {track}
      </MeterPrimitive.Root>
    )
  },
)

Meter.displayName = 'Meter'

export type { MeterProps, MeterTone }
export { Meter }

export default Meter

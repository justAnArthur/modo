/*!
 * Local addition: a battery that fills to its level, for a notch app's power
 * alerts. Rebuilt from Just Notch's power plugin (`Battery`).
 */

'use client'

import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { motion } from 'motion/react'

type BatteryTone = 'default' | 'success' | 'warning' | 'error'

// Literal table: UnoCSS only generates the classes it can read whole.
const FILL: Record<BatteryTone, string> = {
  default: 'bg-foreground',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
}

interface BatteryGlyphProps {
  /** The charge, in percent (0 to 100). */
  level: number
  /** A charger is connected: the bolt shows and the tone turns to success. Defaults to `false`. */
  charging?: boolean
  /** The fill's hue. Defaults to success while charging, error at 10% and below, warning at 20% and below, else the text color. */
  tone?: BatteryTone
  /** Fill up from empty when it first shows, as a flash opens. Defaults to `true`. */
  fillIn?: boolean
  /** What screen readers hear. Defaults to the level, and "charging" while it charges. */
  label?: string
  /** Classes for the glyph. */
  className?: string
}

/** The tone a battery at `level` takes on its own. */
function batteryTone(level: number, charging: boolean): BatteryTone {
  if (charging) return 'success'
  if (level <= 10) return 'error'
  if (level <= 20) return 'warning'
  return 'default'
}

/**
 * A battery at a glance: a case that fills to the charge, a bolt while it
 * charges.
 *
 * The fill turns to the success hue while charging and to the warning and
 * error hues as the charge runs low, unless `tone` pins one. It fills up from
 * empty when it first shows, on the slow spring, the way a power alert opens;
 * a later change of level springs from where it was. A sliver always shows,
 * so an empty battery still reads as one.
 *
 * @example {@include ./examples.mdx}
 */
export default function BatteryGlyph({
  level,
  charging = false,
  tone,
  fillIn = true,
  label,
  className,
}: BatteryGlyphProps) {
  const reduced = useReduceMotion()
  const share = Math.max(0.06, Math.min(1, level / 100))
  const name = label ?? `${Math.round(level)}%${charging ? ', charging' : ''}`

  return (
    <span role="img" aria-label={name} className={cn('inline-flex shrink-0 items-center gap-px', className)}>
      <span className="relative h-3.5 w-7 overflow-hidden rounded-box bg-active p-0.5">
        <motion.span
          className={cn('block h-full w-full origin-left rounded-glyph', FILL[tone ?? batteryTone(level, charging)])}
          initial={fillIn && !reduced ? { scaleX: 0 } : false}
          animate={{ scaleX: share }}
          transition={reduced ? { duration: 0 } : spring.slow}
        />
        {charging && (
          <svg aria-hidden viewBox="0 0 24 24" className="absolute inset-0 m-auto size-3 fill-foreground">
            <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
          </svg>
        )}
      </span>
      <span className="h-1.5 w-0.5 rounded-r-full bg-active" />
    </span>
  )
}

export type { BatteryGlyphProps, BatteryTone }
export { BatteryGlyph, batteryTone }

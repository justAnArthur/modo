/*!
 * Local addition: the level HUD of a notch app (volume, brightness, keyboard
 * backlight), shown in the island in place of the system's overlay.
 */

'use client'

import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { type SizeVariant, useSize } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { motionScale } from '../../../lib/motion'

// Literal tables: UnoCSS only generates the classes it can read whole.
const VALUE: Record<SizeVariant, string> = { default: 'text-body', compact: 'text-caption' }
const GLYPH: Record<SizeVariant, number> = { default: 16, compact: 14 }
const TRACK: Record<SizeVariant, string> = { default: 'h-1.5', compact: 'h-1' }

interface LevelProps {
  /** The glyph before the bar: a speaker, a sun, a keyboard; the host picks it for the level (muted, low, high). */
  icon: IconComponent
  /** The level, from 0 to 1. */
  value: number
  /** What is measured: the bar's accessible name (`Volume`). */
  label: string
  /** Shows the level after the bar: `true` for the percent, or a node of the host's own (`Muted`, `12 / 16`). Defaults to `false`. */
  showValue?: boolean | ReactNode
  /** Step on the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the row, which spans its container's width. */
  className?: string
}

/**
 * A level as the island shows it: a glyph, a horizontal bar that springs to
 * the new value, and the value after it if asked for. Built for the volume,
 * brightness and keyboard backlight HUD that replaces the system's overlay,
 * in a flash or the compact wings.
 *
 * The fill is the text color on an `active` track, springing on the kit's
 * `small` tier (a jump with reduced motion): a level is not a budget, so it
 * never turns to a warning hue. The glyph is the host's, so it can follow the
 * level (a muted speaker at 0). Screen readers hear a `meter` named `label`.
 *
 * @example {@include ./examples.mdx}
 */
export default function Level({ icon: Icon, value, label, showValue = false, size: sizeProp, className }: LevelProps) {
  const size = useSize(sizeProp)
  const reduced = useReduceMotion()
  const share = Math.min(1, Math.max(0, value))
  const shown = typeof showValue === 'boolean' ? showValue && `${Math.round(share * 100)}%` : showValue
  return (
    <div className={cn('flex w-full min-w-0 items-center gap-2.5 text-foreground', className)}>
      <Icon size={GLYPH[size.variant]} strokeWidth={1.75} className="shrink-0" />
      {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> paints its own bar, which can't spring */}
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
        className={cn('relative min-w-0 flex-1 overflow-hidden rounded-full bg-active', TRACK[size.variant])}
      >
        <motion.span
          className="absolute inset-0 origin-left rounded-full bg-foreground"
          initial={false}
          animate={{ scaleX: share }}
          transition={reduced ? { duration: 0 } : motionScale.small}
        />
      </div>
      {shown && (
        <span className={cn('w-9 shrink-0 text-right tabular-nums text-muted-foreground', VALUE[size.variant])}>
          {shown}
        </span>
      )}
    </div>
  )
}

export type { LevelProps }
export { Level }

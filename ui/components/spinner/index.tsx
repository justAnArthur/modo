/*!
 * Local addition (not part of Fluid Functionalism): an arc turning on a quiet
 * track, for work in progress. Shaped as an icon component (size,
 * strokeWidth, className), so it drops into any icon slot. Generalised from
 * the AI app's running glyph.
 */

'use client'

import { motion } from 'motion/react'
import { useReduceMotion } from '../../lib/reduced-motion'
import { useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'

interface SpinnerProps {
  /** Width and height in px. Defaults to the surrounding size ladder's icon size (16px default, 14px compact). */
  size?: number | string
  /** Stroke width of the track and the arc, in the 16-unit viewBox. Defaults to `1.5`. */
  strokeWidth?: number | string
  /** Accessible name. With one the spinner is a `status` region; without, it is hidden from screen readers. */
  label?: string
  /** Classes for the svg; the arc takes the text color. */
  className?: string
}

/**
 * A spinner: an arc turning on a quiet track while something runs.
 *
 * The arc makes one turn every four slow-tier lengths, in the text color, over
 * a track in the border color. Under reduced motion it holds still. It takes
 * the same props as an icon, so it fits a Sidebar row's `icon`, a button or a
 * tab as is. Give it a `label` when nothing next to it says what is running.
 *
 * @example {@include ./examples.mdx}
 */
function Spinner({ size, strokeWidth = 1.5, label, className }: SpinnerProps) {
  const still = useReduceMotion()
  const ladder = useSize()
  const px = size ?? ladder.icon

  return (
    <motion.svg
      width={px}
      height={px}
      viewBox="0 0 16 16"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0 text-foreground', className)}
      animate={{ rotate: still ? 0 : 360 }}
      transition={still ? { duration: 0 } : { duration: spring.slow.duration * 4, ease: 'linear', repeat: Infinity }}
    >
      <circle cx="8" cy="8" r="5" fill="none" strokeWidth={strokeWidth} className="stroke-current text-border" />
      <path
        d="M8 3 A5 5 0 0 1 13 8"
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="stroke-current"
      />
    </motion.svg>
  )
}

export type { SpinnerProps }
export { Spinner }

export default Spinner

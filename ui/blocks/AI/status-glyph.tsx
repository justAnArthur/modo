/*!
 * Local addition: the AI app's run-state glyphs, shaped as icon
 * components (size, strokeWidth, className) so they drop into any icon slot:
 * a Sidebar row's leading icon, a task row, a tab. Running is an arc turning
 * on a loop of four slow-tier lengths (held still under reduced motion);
 * waiting is a filled dot in the warning hue.
 */

'use client'

import { motion } from 'motion/react'
import type { IconComponent, IconComponentProps } from '../../lib/icon-context'
import { useReduceMotion } from '../../lib/reduced-motion'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'
import type { SessionStatus } from './mock'

export function RunningGlyph({ size = 16, className }: IconComponentProps) {
  const still = useReduceMotion()
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn('shrink-0 text-foreground', className)}
      animate={still ? { rotate: 0 } : { rotate: 360 }}
      transition={still ? { duration: 0 } : { duration: spring.slow.duration * 4, ease: 'linear', repeat: Infinity }}
    >
      <circle cx="8" cy="8" r="5" fill="none" strokeWidth="1.5" className="stroke-current text-border" />
      <path d="M8 3 A5 5 0 0 1 13 8" fill="none" strokeWidth="1.5" strokeLinecap="round" className="stroke-current" />
    </motion.svg>
  )
}

export function WaitingGlyph({ size = 16, className }: IconComponentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={cn('shrink-0', className)}>
      <circle cx="8" cy="8" r="3.5" className="fill-current text-status-warning" />
    </svg>
  )
}

/** The glyph for a session state; unread and idle use the Sidebar's own dots instead. */
export const STATUS_GLYPH: Partial<Record<SessionStatus, IconComponent>> = {
  running: RunningGlyph,
  waiting: WaitingGlyph,
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  running: 'Running',
  waiting: 'Needs your input',
  unread: 'Unread',
  idle: 'Idle',
}

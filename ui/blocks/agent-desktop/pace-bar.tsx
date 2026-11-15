/*!
 * Local addition: a usage limit read against time — the used share colored
 * by whether the limit lasts until its reset (see pace.ts), with a tick where
 * an even spend would be by now.
 */

'use client'

import { motion } from 'motion/react'
import { useReduceMotion } from '../../lib/reduced-motion'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'
import { type LimitPace, percent, VERDICT_FILL } from './pace'

function Fill({ share, className }: { share: number; className: string }) {
  const reduceMotion = useReduceMotion()
  return (
    <motion.span
      className={cn('absolute inset-0 origin-left rounded-full transition-[background-color] duration-fast', className)}
      initial={false}
      animate={{ scaleX: Math.min(Math.max(share, 0), 1) }}
      transition={reduceMotion ? { duration: 0 } : spring.moderate}
    />
  )
}

/** The used share, colored by verdict, with a tick at the even-pace share. */
export function PaceBar({ pace, className }: { pace: LimitPace; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative block h-1', className)}>
      <span className="absolute inset-0 overflow-hidden rounded-full bg-active">
        <Fill share={pace.limit.value} className={VERDICT_FILL[pace.verdict]} />
      </span>
      <span
        className="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
        style={{ left: percent(pace.elapsed) }}
      />
    </span>
  )
}

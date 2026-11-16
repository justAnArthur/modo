/*!
 * Local addition: the time left on a notch app's timer, as text that ticks
 * only on second edges. Rebuilt from Just Notch's timer plugin (`Countdown`,
 * `useRemaining`).
 */

'use client'

import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatClock, formatShort, MINUTE, SECOND, useEdgeClock } from '../../lib/clock'

type CountdownFormat = 'clock' | 'short'

interface CountdownProps {
  /** When it ends, in epoch ms. */
  endsAt?: number
  /** How long it runs from when it mounts, in ms, when there is no `endsAt`. Defaults to `0`. */
  duration?: number
  /** Stop the clock: it holds the time left when it paused, or `remaining`. Defaults to `false`. */
  paused?: boolean
  /** The time left to show while paused, in ms. */
  remaining?: number
  /** `clock` is `4:05`; `short` is the largest unit, rounded up: `4m`, then `45s` in the last minute. Defaults to `'clock'`. */
  format?: CountdownFormat
  /** Called once when it reaches zero. */
  onEnd?: () => void
  /** Classes for the text, such as its role and weight. */
  className?: string
}

/**
 * The time left, as text: `4:05`, or `4m` where room is short (a compact
 * wing).
 *
 * It re-renders once per shown unit, on the unit's edge counted from the end,
 * never in between: a second for the clock, a minute for the short form until
 * its last minute. So a running timer costs one render a second at most, and
 * the digits change exactly when a second has passed. Digits are tabular, so
 * the text holds its width as it ticks. Paused, it holds the time left.
 *
 * @example {@include ./examples.mdx}
 */
export default function Countdown({
  endsAt,
  duration = 0,
  paused = false,
  remaining,
  format = 'clock',
  onEnd,
  className,
}: CountdownProps) {
  const [mounted] = useState(Date.now)
  const end = endsAt ?? mounted + duration
  const [coarse, setCoarse] = useState(format === 'short' && end - Date.now() > MINUTE)
  // Past the end there is nothing left to tick.
  const now = useEdgeClock(end, !paused && Date.now() < end + SECOND, coarse ? MINUTE : SECOND)
  const pausedLeft = useMemo(() => end - Date.now(), [paused, end])
  const left = Math.max(0, paused ? (remaining ?? pausedLeft) : end - now)

  useEffect(() => setCoarse(format === 'short' && left > MINUTE), [format, left])

  const ended = useRef(false)
  useEffect(() => {
    if (left > 0 || paused) {
      ended.current = false
      return
    }
    if (ended.current) return
    ended.current = true
    onEnd?.()
  }, [left, paused, onEnd])

  const seconds = left / SECOND
  return (
    <span role="timer" className={cn('tabular-nums', className)}>
      {format === 'short' ? formatShort(seconds) : formatClock(Math.ceil(seconds))}
    </span>
  )
}

export type { CountdownFormat, CountdownProps }
export { Countdown }

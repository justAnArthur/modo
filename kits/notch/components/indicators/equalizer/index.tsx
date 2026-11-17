/*!
 * Local addition: the now-playing level bars of a notch app's compact wing.
 * Rebuilt from Just Notch's now-playing plugin (`Bars`).
 */

'use client'

import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

// Each bar loops its own levels at its own pace, so together they read as random.
const LOOPS = [
  { levels: [0.35, 1, 0.5, 0.8, 0.35], beats: 5 },
  { levels: [0.7, 0.4, 0.95, 0.55, 0.7], beats: 4 },
  { levels: [0.5, 0.9, 0.3, 1, 0.5], beats: 6 },
  { levels: [0.4, 0.75, 0.6, 0.3, 0.4], beats: 4.5 },
  { levels: [0.6, 0.3, 0.85, 0.45, 0.6], beats: 5.5 },
]
const REST = 0.2
const STILL = [0.5, 0.85, 0.65, 0.4, 0.7]

interface EqualizerProps {
  /** Music is playing: the bars move. Paused, they settle low. Defaults to `true`. */
  playing?: boolean
  /** How many bars, from 1 to 5. Defaults to `4`. */
  bars?: number
  /** What screen readers hear. Without one the bars are hidden from them. */
  label?: string
  /** Classes for the bars' fill. Defaults to `'bg-foreground'`. */
  barClassName?: string
  /** Classes for the row, such as its height. Defaults to `'h-3.5'`. */
  className?: string
}

interface BarProps {
  loop: (typeof LOOPS)[number]
  live: boolean
  level: number
  className: string
}

/** Playing, the bar loops on the Web Animations API: a `transform` keyframe loop the compositor runs, no JS per frame. */
function Bar({ loop, live, level, className }: BarProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const bar = ref.current
    if (!live || !bar) return
    const animation = bar.animate(
      loop.levels.map(l => ({ transform: `scaleY(${l})` })),
      {
        duration: spring.slow.duration * loop.beats * 1000,
        easing: 'ease-in-out',
        iterations: Number.POSITIVE_INFINITY,
      },
    )
    return () => animation.cancel()
  }, [live, loop])

  return (
    <motion.span
      ref={ref}
      className={cn('h-full w-0.75 rounded-full', className)}
      initial={false}
      animate={{ scaleY: level }}
      transition={spring.moderate}
    />
  )
}

/**
 * Level bars for what's playing: they dance while music plays and settle low
 * when it pauses.
 *
 * Each bar loops its own levels at its own pace on the Web Animations API, a
 * `transform` loop the compositor runs, so playing music costs no JavaScript
 * per frame. Pausing springs the bars down to rest; under reduced motion they
 * hold still at a level instead of dancing. They take the text color, or any
 * fill through `barClassName` (an artwork's tint).
 *
 * @example {@include ./examples.mdx}
 */
export default function Equalizer({
  playing = true,
  bars = 4,
  label,
  barClassName = 'bg-foreground',
  className,
}: EqualizerProps) {
  const reduced = useReduceMotion()
  const live = playing && !reduced
  const count = Math.min(Math.max(1, Math.round(bars)), LOOPS.length)

  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn('inline-flex h-3.5 shrink-0 items-center gap-0.5', className)}
    >
      {LOOPS.slice(0, count).map((loop, i) => (
        <Bar
          key={loop.beats}
          loop={loop}
          live={live}
          level={playing ? (STILL[i] ?? REST) : REST}
          className={barClassName}
        />
      ))}
    </span>
  )
}

export type { EqualizerProps }
export { Equalizer }

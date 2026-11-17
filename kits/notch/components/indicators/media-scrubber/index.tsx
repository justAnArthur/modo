/*!
 * Local addition: the playback position of a notch app's now-playing view,
 * on modo-ui's Slider. Rebuilt from Just Notch's now-playing plugin
 * (`Scrubber`).
 */

'use client'

import Slider from '@justanarthur/modo-ui/components/inputs/slider'
import type { SizeVariant } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useEffect, useState } from 'react'
import { formatClock, SECOND, useEdgeClock } from '../../../lib/clock'

interface MediaScrubberProps {
  /** Where playback is, in seconds. */
  position: number
  /** The track's length, in seconds. */
  duration: number
  /** It plays: the position runs on from `position`, a second at a time. Defaults to `false`. */
  playing?: boolean
  /** Called with the position to seek to, once, when a drag or a key press ends. */
  onSeek?: (seconds: number) => void
  /** Step on the size ladder. Defaults to `'compact'`. */
  size?: SizeVariant
  /** The slider's accessible name. Defaults to `'Position'`. */
  label?: string
  /** No seeking. Defaults to `false`. */
  disabled?: boolean
  /** At rest a thin line of progress; the scrubber fades in on hover and focus, and always shows on touch. Defaults to `false`. */
  quiet?: boolean
  /** Classes for the row. */
  className?: string
}

/**
 * Where a track is: elapsed time, a scrubber, and the time remaining.
 *
 * The scrubber is modo-ui's Slider at the compact step. While playing, the
 * position runs on by itself a second at a time, on the second's edge, from
 * the last `position` it got. Dragging shows the dragged value, and the
 * remaining time follows it; `onSeek` fires once, when the drag or the key
 * press ends, and playback runs on from the seek until the player reports
 * its next `position`, so the thumb never jumps back to the stale one.
 *
 * `quiet` is the player's form: at rest a thin line of progress, so the
 * track reads before the control; the scrubber fades in on hover or focus,
 * and always shows on touch.
 *
 * @example {@include ./examples.mdx}
 */
export default function MediaScrubber({
  position,
  duration,
  playing = false,
  onSeek,
  size = 'compact',
  label = 'Position',
  disabled = false,
  quiet = false,
  className,
}: MediaScrubberProps) {
  // Where it runs on from: the last position the player reported, or the last seek.
  const [base, setBase] = useState(() => ({ seconds: position, since: Date.now() }))
  const [dragged, setDragged] = useState<number>()

  useEffect(() => setBase({ seconds: position, since: Date.now() }), [position])

  const now = useEdgeClock(base.since, playing && dragged === undefined)
  const live = Math.min(duration, base.seconds + (playing ? Math.max(0, now - base.since) / SECOND : 0))
  const value = dragged ?? live

  const commit = () => {
    if (dragged === undefined) return
    setBase({ seconds: dragged, since: Date.now() })
    setDragged(undefined)
    onSeek?.(dragged)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: commits the Slider's drag or key press when it ends
    <div className={cn('flex items-center gap-3', className)} onPointerUp={commit} onKeyUp={commit}>
      <span className="w-9 shrink-0 text-micro tabular-nums text-muted-foreground">{formatClock(value)}</span>
      <span className="group/scrub relative flex min-w-0 flex-1 items-center">
        <Slider
          className={cn(
            'mb-0 min-w-0 flex-1',
            quiet &&
              'opacity-0 transition-[opacity] duration-fast group-hover/scrub:opacity-100 group-focus-within/scrub:opacity-100 pointer-coarse:opacity-100',
          )}
          size={size}
          label={label}
          showValue={false}
          formatValue={formatClock}
          min={0}
          max={Math.max(1, duration)}
          step={1}
          value={value}
          disabled={disabled}
          onValueChange={v => setDragged(v as number)}
        />
        {quiet && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-active transition-[opacity] duration-fast group-hover/scrub:opacity-0 group-focus-within/scrub:opacity-0 pointer-coarse:opacity-0"
          >
            <span
              className="block size-full rounded-full bg-foreground"
              style={{ transform: `translateX(${(value / Math.max(1, duration) - 1) * 100}%)` }}
            />
          </span>
        )}
      </span>
      <span className="w-9 shrink-0 text-right text-micro tabular-nums text-muted-foreground">
        -{formatClock(Math.max(0, duration - value))}
      </span>
    </div>
  )
}

export type { MediaScrubberProps }
export { MediaScrubber }

/*
 * Time as a notch app shows it: a clock ("4:05"), a short span ("4m") and a
 * re-render that lands only on the edges of what is shown.
 */

'use client'

import { useEffect, useState } from 'react'

const SECOND = 1000
const MINUTE = 60 * SECOND

/** Seconds as `m:ss`, or `h:mm:ss` from an hour. */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const ss = String(s % 60).padStart(2, '0')
  if (s < 3600) return `${Math.floor(s / 60)}:${ss}`
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${ss}`
}

/** Seconds as the one largest unit, rounded up: `"45s"`, `"4m"`, `"2h"`. */
export function formatShort(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.ceil(s / 60)}m`
  return `${Math.ceil(s / 3600)}h`
}

/**
 * The time now, re-read once per `unit` ms on the unit's edge counted from
 * `anchor` (a countdown's end, a track's start), never in between. Stops
 * while `running` is false.
 */
export function useEdgeClock(anchor: number, running: boolean, unit: number = SECOND) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!running) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const offset = (((anchor - t) % unit) + unit) % unit
      timer = setTimeout(tick, offset || unit)
    }
    tick()
    return () => clearTimeout(timer)
  }, [anchor, running, unit])

  return running ? now : Date.now()
}

export { MINUTE, SECOND }

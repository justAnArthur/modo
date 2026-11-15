/*!
 * Local addition: the profile usage's model of a limit over time. A
 * limit's share alone says little (78% used is fine when it resets in a few
 * hours), so each limit is read against its window: the burn rate so far,
 * where that rate lands at the reset, and whether it runs out first.
 */

import type { Profile, UsageLimit } from './mock'
import { type LimitWindow, WINDOWS } from './windows'

/** `free`: lasts past the reset at this pace; `watch`: only just; `tight`: runs out before it. */
export type Verdict = 'free' | 'watch' | 'tight'

export interface LimitPace {
  limit: UsageLimit
  window: LimitWindow
  /** Share of the window already gone, 0–1: where an even spend would be now. */
  elapsed: number
  /** Share used at the reset if spending goes on at the pace so far (may exceed 1). */
  projected: number
  /** Hours until the limit is hit at that pace; Infinity when it lasts past the reset. */
  runsOutInHours: number
  verdict: Verdict
}

export interface ProfilePace {
  profile: Profile
  limits: LimitPace[]
  /** The limit that runs out first, or lands highest at its reset. */
  binding: LimitPace
}

/** Projected share from which a limit counts as only just lasting. */
const WATCH_AT = 0.95
// The first minutes of a window say nothing about its pace: read at least a tenth of it.
const MIN_ELAPSED = 0.1

function paceOfLimit(profileId: string, limit: UsageLimit): LimitPace {
  const window = WINDOWS[`${profileId}:${limit.label}`] ?? { windowHours: 5, resetsInHours: 5 }
  const elapsedHours = window.windowHours - window.resetsInHours
  const rate = limit.value / Math.max(elapsedHours, window.windowHours * MIN_ELAPSED)
  const projected = limit.value + rate * window.resetsInHours
  const runsOut = rate > 0 ? (1 - limit.value) / rate : Number.POSITIVE_INFINITY
  const runsOutInHours = runsOut < window.resetsInHours ? runsOut : Number.POSITIVE_INFINITY
  const verdict: Verdict =
    runsOutInHours < Number.POSITIVE_INFINITY ? 'tight' : projected >= WATCH_AT ? 'watch' : 'free'
  return { limit, window, elapsed: elapsedHours / window.windowHours, projected, runsOutInHours, verdict }
}

export function paceOf(profile: Profile): ProfilePace {
  const limits = profile.limits.map(limit => paceOfLimit(profile.id, limit))
  const binding =
    [...limits].sort((a, b) => b.projected - a.projected)[0] ?? paceOfLimit(profile.id, profile.limits[0]!)
  return { profile, limits, binding }
}

/** A short duration: `17m`, `2h 20m`, `20h`, `4d`. */
export function duration(hours: number) {
  if (hours < 1) return `${Math.max(Math.round(hours * 60), 1)}m`
  if (hours < 10) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }
  if (hours < 48) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

export function percent(share: number) {
  return `${Math.round(share * 100)}%`
}

// Literal tables: UnoCSS only generates the classes it can read whole.
export const VERDICT_TEXT: Record<Verdict, string> = {
  free: 'text-muted-foreground',
  watch: 'text-status-warning',
  tight: 'text-status-error',
}

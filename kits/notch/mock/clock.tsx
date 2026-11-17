/*!
 * Mock: world clocks and Pomodoro runs for the clock's docs, and the island
 * scenes around them. Runs are made once, on mount, so they keep counting
 * down across renders. Nothing here ships in the barrel.
 */

'use client'

import { Clock3 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import Clock, { type ClockZone, type PomodoroRun } from '../blocks/activities/clock'
import NowPlaying from '../blocks/activities/now-playing'
import { FlashIsland, PLAYING, WingsIsland } from './island-content'
import { TabIsland } from './tab-island'

const MINUTE = 60_000

/** The moment the clock shows: today, 16:42. */
export const CLOCK_NOW = new Date().setHours(16, 42, 0, 0)

export const ZONES: ClockZone[] = [
  { city: 'New York', timeZone: 'America/New_York' },
  { city: 'San Francisco', timeZone: 'America/Los_Angeles' },
  { city: 'Tokyo', timeZone: 'Asia/Tokyo' },
]

/** A run of `phase` with `left` of its length to go, running unless `paused`. */
export function pomodoroRun(
  phase: PomodoroRun['phase'] = 'focus',
  { round = 2, minutes = 25, left = 0.62, paused = false } = {},
): PomodoroRun {
  const total = minutes * MINUTE
  return paused
    ? { phase, round, total, remaining: left * total }
    : { phase, round, total, endsAt: Date.now() + left * total }
}

/** A run made once, when the component mounts. */
export function useRun(...args: Parameters<typeof pomodoroRun>) {
  return useState(() => pomodoroRun(...args))[0]
}

const TAB = { value: 'clock', label: 'Clock', icon: Clock3 }

/** The open island on a Clock tab, in the timer's place. */
export function ClockIsland({ children }: { children: ReactNode }) {
  return (
    <TabIsland tab={TAB} replace="timer">
      {children}
    </TabIsland>
  )
}

/** The clock in focus, round 2 of 4, 62% to go. */
export function FocusClock() {
  return <Clock zones={ZONES} defaultValue={useRun()} />
}

/** A short break, paused with half of it left. */
export function PausedBreak() {
  return <Clock zones={ZONES} defaultValue={useRun('short-break', { minutes: 5, left: 0.5, paused: true })} />
}

/** The Pomodoro in the compact island's wings. */
export function ClockWings() {
  const run = useRun()
  return <WingsIsland leading={<Clock.Leading run={run} />} trailing={<Clock.Trailing run={run} />} />
}

/** Music in the wings, the Pomodoro's ring on the bubble. */
export function ClockSplit() {
  const run = useRun('short-break', { minutes: 5, left: 0.7 })
  return (
    <WingsIsland
      leading={<NowPlaying.Leading track={PLAYING} />}
      trailing={<NowPlaying.Trailing track={PLAYING} />}
      minimal={<Clock.Minimal run={run} />}
    />
  )
}

/** The flash at the end of a phase. */
export function PhaseDoneFlash({ ended }: { ended: Pick<PomodoroRun, 'phase' | 'round'> }) {
  return (
    <FlashIsland activity={`${ended.phase}-${ended.round}`}>
      <Clock.PhaseDone ended={ended} onStart={() => {}} />
    </FlashIsland>
  )
}

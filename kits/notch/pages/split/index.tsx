/*!
 * Local addition: two activities at once, the notch app's split island, on a
 * Mac's screen.
 */

'use client'

import { type ReactNode, useState } from 'react'
import Agenda from '../../blocks/activities/agenda'
import Clock from '../../blocks/activities/clock'
import NowPlaying from '../../blocks/activities/now-playing'
import Weather from '../../blocks/activities/weather'
import RecentFiles from '../../blocks/system/recent-files'
import SystemStats from '../../blocks/system/system-stats'
import Island from '../../components/island/island'
import type { IslandState } from '../../lib/geometry'
import { useSoon } from '../../mock/activities'
import { useRun } from '../../mock/clock'
import { DOWNLOAD } from '../../mock/files'
import { ExpandedPanel, PLAYING, ScreenEdge } from '../../mock/island-content'
import { type Scene, SceneDesk } from '../../mock/scene'
import { READINGS } from '../../mock/system'
import { CURRENT } from '../../mock/weather'

interface Pair {
  leading: ReactNode
  trailing: ReactNode
  minimal: ReactNode
}

const PAIRS: Scene[] = [
  { value: 'media-pomodoro', label: 'Music + Pomodoro' },
  { value: 'pomodoro-media', label: 'Pomodoro + music' },
  { value: 'calendar-weather', label: 'Meeting + weather' },
  { value: 'media-calendar', label: 'Music + meeting' },
  { value: 'download-media', label: 'Download + music' },
  { value: 'media-download', label: 'Music + download' },
  { value: 'system-media', label: 'CPU + music' },
]

/** The wings and the bubble for a pair, the first activity in the wings. */
export function usePair(pair: string): Pair {
  const run = useRun('focus', { left: 0.4 })
  const event = useSoon(6)
  const media = { leading: <NowPlaying.Leading track={PLAYING} />, trailing: <NowPlaying.Trailing track={PLAYING} /> }
  const disc = <NowPlaying.Minimal track={PLAYING} />
  if (pair === 'pomodoro-media')
    return { leading: <Clock.Leading run={run} />, trailing: <Clock.Trailing run={run} />, minimal: disc }
  if (pair === 'calendar-weather')
    return {
      leading: <Agenda.Leading event={event} />,
      trailing: <Agenda.Trailing event={event} />,
      minimal: <Weather.Minimal current={CURRENT} />,
    }
  if (pair === 'media-calendar') return { ...media, minimal: <Agenda.Minimal event={event} /> }
  if (pair === 'download-media')
    return { leading: <RecentFiles.Leading />, trailing: <RecentFiles.Trailing download={DOWNLOAD} />, minimal: disc }
  if (pair === 'media-download') return { ...media, minimal: <RecentFiles.Minimal download={DOWNLOAD} /> }
  if (pair === 'system-media')
    return {
      leading: <SystemStats.Leading />,
      trailing: <SystemStats.Trailing sample={READINGS.at(-1)} />,
      minimal: disc,
    }
  return { ...media, minimal: <Clock.Minimal run={run} /> }
}

interface SplitProps {
  /** The pair shown at first. Defaults to `'media-pomodoro'`. */
  pair?: string
  /** Show the pairs under the screen. Defaults to `true`. */
  picker?: boolean
}

/**
 * Two activities at once: the first keeps the wings, the second melts off the
 * island's right end into a bubble through modo-ui's goo.
 *
 * Music with a Pomodoro round, the round with music, a meeting a few
 * minutes out with the weather, music with the meeting, a download under way
 * with music and the other way round, the CPU load with music. Pick
 * a pair under the screen: the wings swap with the blur, keyed by the pair,
 * and the bubble's content swaps in place. Each part is a block's compact or
 * minimal form (`Clock.Minimal`, `Agenda.Minimal`, `Weather.Minimal`,
 * `RecentFiles.Minimal`, `NowPlaying.Minimal` in the bubble). A press opens the island; Escape, or leaving it, brings the
 * split back.
 *
 * @example {@include ./examples.mdx}
 */
export default function Split({ pair: initial = 'media-pomodoro', picker = true }: SplitProps) {
  const [pair, setPair] = useState(initial)
  const [state, setState] = useState<IslandState>('split')
  const parts = usePair(pair)

  return (
    <SceneDesk
      picker={picker}
      scenes={PAIRS}
      value={pair}
      onValueChange={next => {
        setPair(next)
        setState('split')
      }}
      island={
        <Island
          state={state}
          onStateChange={setState}
          collapsedState="split"
          expandOnHover
          activity={pair}
          {...parts}
          expanded={<ExpandedPanel />}
        />
      }
    />
  )
}

/** One pair on a strip of screen. */
export function PairStrip({ pair }: { pair: string }) {
  const parts = usePair(pair)
  return (
    <ScreenEdge height={64}>
      <Island defaultState="split" activity={pair} {...parts} />
    </ScreenEdge>
  )
}

export { PAIRS }

/*!
 * Local addition: two activities at once, the notch app's split island, on a
 * Mac's screen.
 */

'use client'

import { type ReactNode, useState } from 'react'
import Agenda from '../../blocks/activities/agenda'
import NowPlaying from '../../blocks/activities/now-playing'
import Shelf from '../../blocks/activities/shelf'
import Timer from '../../blocks/activities/timer'
import SystemStats from '../../blocks/system/system-stats'
import Island from '../../components/island/island'
import type { IslandState } from '../../lib/geometry'
import { useSoon } from '../../mock/activities'
import { SAMPLES } from '../../mock/data'
import { ExpandedPanel, PLAYING, ScreenEdge, useRun } from '../../mock/island-content'
import { type Scene, SceneDesk } from '../../mock/scene'

interface Pair {
  leading: ReactNode
  trailing: ReactNode
  minimal: ReactNode
}

const PAIRS: Scene[] = [
  { value: 'media-timer', label: 'Music + timer' },
  { value: 'timer-calendar', label: 'Timer + meeting' },
  { value: 'media-calendar', label: 'Music + meeting' },
  { value: 'calendar-media', label: 'Meeting + music' },
  { value: 'shelf-timer', label: 'Shelf + timer' },
  { value: 'stats-media', label: 'CPU + music' },
]

/** The wings and the bubble for a pair, the first activity in the wings. */
export function usePair(pair: string): Pair {
  const run = useRun(0.4)
  const event = useSoon(6)
  const media = { leading: <NowPlaying.Leading track={PLAYING} />, trailing: <NowPlaying.Trailing /> }
  const timer = { leading: <Timer.Leading />, trailing: <Timer.Trailing run={run} /> }
  const calendar = { leading: <Agenda.Leading event={event} />, trailing: <Agenda.Trailing event={event} /> }
  if (pair === 'timer-calendar') return { ...timer, minimal: <Agenda.Minimal event={event} /> }
  if (pair === 'media-calendar') return { ...media, minimal: <Agenda.Minimal event={event} /> }
  if (pair === 'calendar-media') return { ...calendar, minimal: <NowPlaying.Minimal track={PLAYING} /> }
  if (pair === 'shelf-timer')
    return { leading: <Shelf.Leading />, trailing: <Shelf.Trailing count={6} />, minimal: <Timer.Minimal run={run} /> }
  if (pair === 'stats-media')
    return {
      leading: <SystemStats.Leading />,
      trailing: <SystemStats.Trailing sample={SAMPLES.at(-1)} />,
      minimal: <NowPlaying.Minimal track={PLAYING} />,
    }
  return { ...media, minimal: <Timer.Minimal run={run} /> }
}

interface SplitProps {
  /** The pair shown at first. Defaults to `'media-timer'`. */
  pair?: string
  /** Show the pairs under the screen. Defaults to `true`. */
  picker?: boolean
}

/**
 * Two activities at once: the first keeps the wings, the second melts off the
 * island's right end into a bubble through modo-ui's goo.
 *
 * Music with a focus timer, a timer with a meeting a few minutes out, a
 * meeting with music, the shelf with a timer, the CPU load with music. Pick
 * a pair under the screen: the wings swap with the blur, keyed by the pair,
 * and the bubble's content swaps in place. Each part is a block's compact or
 * minimal form (`Timer.Minimal`, `Agenda.Minimal`, `NowPlaying.Minimal` in
 * the bubble). A press opens the island; Escape, or leaving it, brings the
 * split back.
 *
 * @example {@include ./examples.mdx}
 */
export default function Split({ pair: initial = 'media-timer', picker = true }: SplitProps) {
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

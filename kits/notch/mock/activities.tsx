/*!
 * Mock: activities that count down for real in the docs, a running timer and
 * an event a few minutes out, made once on mount so a re-render never resets
 * them. Nothing here ships in the barrel.
 */

'use client'

import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import Agenda from '../blocks/activities/agenda'
import NowPlaying from '../blocks/activities/now-playing'
import Timer from '../blocks/activities/timer'
import ExpandedIsland from '../blocks/app/expanded-island'
import Island from '../components/island/island'
import { soonEvent } from './data'
import { FlashIsland, PLAYING, ScreenEdge, useRun, WingsIsland } from './island-content'

/** The timer, running from a focus run with 62% to go. */
export function RunningTimer() {
  return <Timer defaultValue={useRun()} pomodoro />
}

/** The timer in the compact island's wings. */
export function TimerWings() {
  const run = useRun()
  return <WingsIsland leading={<Timer.Leading />} trailing={<Timer.Trailing run={run} />} />
}

/** Music in the wings, the timer's ring in the bubble. */
export function TimerSplit() {
  const run = useRun()
  return (
    <WingsIsland
      leading={<NowPlaying.Leading track={PLAYING} />}
      trailing={<NowPlaying.Trailing />}
      minimal={<Timer.Minimal run={run} />}
    />
  )
}

/** An event `minutes` out, made once. */
export function useSoon(minutes = 4) {
  return useState(() => soonEvent(minutes))[0]
}

/** The next event counting down in the compact island's wings. */
export function AgendaWings() {
  const event = useSoon()
  return <WingsIsland leading={<Agenda.Leading event={event} />} trailing={<Agenda.Trailing event={event} />} />
}

/** The timer in the wings, the next event's ring in the bubble. */
export function AgendaSplit() {
  const run = useRun()
  const event = useSoon()
  return (
    <WingsIsland
      leading={<Timer.Leading />}
      trailing={<Timer.Trailing run={run} />}
      minimal={<Agenda.Minimal event={event} />}
    />
  )
}

/** The open island on the "Up next" view. */
export function UpNextIsland() {
  const event = useSoon()
  return (
    <ScreenEdge height={260}>
      <Island
        defaultState="expanded"
        collapsedState="idle"
        panelHeight={200}
        expanded={
          <ExpandedIsland
            tabs={[
              {
                value: 'up-next',
                label: 'Up next',
                icon: CalendarDays,
                content: <Agenda.UpNext event={event} />,
              },
            ]}
          />
        }
      />
    </ScreenEdge>
  )
}

/** The flash a minute before an event. */
export function AgendaFlash() {
  const event = useSoon(0.9)
  return (
    <FlashIsland>
      <Agenda.Starting event={event} />
    </FlashIsland>
  )
}

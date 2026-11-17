/*!
 * Mock: activities that count down for real in the docs, an event a few
 * minutes out, made once on mount so a re-render never resets it. Nothing
 * here ships in the barrel.
 */

'use client'

import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import Agenda from '../blocks/activities/agenda'
import Clock from '../blocks/activities/clock'
import ExpandedIsland from '../blocks/app/expanded-island'
import Island from '../components/island/island'
import { useRun } from './clock'
import { soonEvent } from './data'
import { FlashIsland, ScreenEdge, WingsIsland } from './screen'

/** An event `minutes` out, made once. */
export function useSoon(minutes = 4) {
  return useState(() => soonEvent(minutes))[0]
}

/** The next event counting down in the compact island's wings. */
export function AgendaWings() {
  const event = useSoon()
  return <WingsIsland leading={<Agenda.Leading event={event} />} trailing={<Agenda.Trailing event={event} />} />
}

/** A focus round in the wings, the next event's ring in the bubble. */
export function AgendaSplit() {
  const run = useRun()
  const event = useSoon()
  return (
    <WingsIsland
      leading={<Clock.Leading run={run} />}
      trailing={<Clock.Trailing run={run} />}
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

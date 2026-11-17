/*!
 * Local addition: every flash a notch app shows, on a Mac's screen.
 */

'use client'

import { type ReactNode, useState } from 'react'
import Agenda from '../../blocks/activities/agenda'
import Clock from '../../blocks/activities/clock'
import NowPlaying from '../../blocks/activities/now-playing'
import Weather from '../../blocks/activities/weather'
import ClipboardHistory from '../../blocks/system/clipboard'
import RecentFiles from '../../blocks/system/recent-files'
import Island from '../../components/island/island'
import type { IslandState } from '../../lib/geometry'
import { useSoon } from '../../mock/activities'
import { ARTWORK_TINT, MockArtwork } from '../../mock/artwork'
import { CLIPS } from '../../mock/clipboard'
import { TRACKS } from '../../mock/data'
import { DOWNLOADS, SCREENSHOTS } from '../../mock/files'
import { ArtworkTile, FlashIsland, PLAYING } from '../../mock/island-content'
import { type Scene, SceneDesk } from '../../mock/scene'

const ALERTS: Scene[] = [
  { value: 'track', label: 'Track change' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'rain', label: 'Rain soon' },
  { value: 'focus-done', label: 'Focus done' },
  { value: 'break-over', label: 'Break over' },
  { value: 'copied', label: 'Copied' },
  { value: 'downloaded', label: 'Downloaded' },
  { value: 'screenshot', label: 'Screenshot' },
]

const NEXT_TRACK = { ...TRACKS[1]!, artwork: <MockArtwork variant="night" />, tint: ARTWORK_TINT.night }
const noop = () => {}

/** The flash for each alert, on the blocks and the mock data. */
export function useAlert(alert: string): ReactNode {
  const event = useSoon(0.9)
  const rainAt = useState(() => Date.now() + 15 * 60_000)[0]
  if (alert === 'track') return <NowPlaying.Flash track={NEXT_TRACK} />
  if (alert === 'meeting') return <Agenda.Starting event={event} onJoin={noop} />
  if (alert === 'rain')
    return (
      <Weather.Alert condition="rain" startsAt={rainAt} caption="Light rain for about an hour · 70%" onAction={noop} />
    )
  if (alert === 'focus-done') return <Clock.PhaseDone ended={{ phase: 'focus', round: 2 }} onStart={noop} />
  if (alert === 'break-over') return <Clock.PhaseDone ended={{ phase: 'short-break', round: 2 }} onStart={noop} />
  if (alert === 'copied') return <ClipboardHistory.Copied clip={CLIPS[0]!} onPin={noop} />
  if (alert === 'downloaded') return <RecentFiles.Saved file={DOWNLOADS[0]!} onOpen={noop} />
  if (alert === 'screenshot') return <RecentFiles.Saved file={SCREENSHOTS[0]!} onOpen={noop} />
  return null
}

interface AlertsProps {
  /** The alert shown at first. Defaults to `'track'`. */
  alert?: string
  /** Show the alerts under the screen. Defaults to `true`. */
  picker?: boolean
}

/**
 * Every alert a notch app flashes below the notch, over whatever the island
 * showed before.
 *
 * The next track, a meeting a minute out, rain a quarter of an hour away, a
 * Pomodoro round's end (focus done, break over), a clip copied, a download
 * landing and a screenshot saved. Pick one under the screen: the
 * island drops into the flash, and one alert replacing another swaps with
 * the blur because each is keyed by its kind (the Island's `activity`).
 * Press the island, or let it be, to go back to the music in the wings.
 *
 * @example {@include ./examples.mdx}
 */
export default function Alerts({ alert: initial = 'track', picker = true }: AlertsProps) {
  const [alert, setAlert] = useState(initial)
  const [state, setState] = useState<IslandState>('flash')
  const flash = useAlert(alert)

  return (
    <SceneDesk
      picker={picker}
      scenes={ALERTS}
      value={alert}
      onValueChange={next => {
        setAlert(next)
        setState('flash')
      }}
      island={
        <Island
          state={state}
          onStateChange={next => setState(next === 'expanded' ? 'compact' : next)}
          activity={alert}
          leading={<ArtworkTile />}
          trailing={<NowPlaying.Trailing track={PLAYING} />}
          flash={flash}
        />
      }
    />
  )
}

/** One alert's flash on a strip of screen. */
export function AlertStrip({ alert }: { alert: string }) {
  return <FlashIsland activity={alert}>{useAlert(alert)}</FlashIsland>
}

export { ALERTS }

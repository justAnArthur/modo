/*!
 * Local addition: every flash a notch app shows, on a Mac's screen.
 */

'use client'

import { type ReactNode, useState } from 'react'
import Agenda from '../../blocks/agenda'
import Controls from '../../blocks/controls'
import Devices from '../../blocks/devices'
import NowPlaying from '../../blocks/now-playing'
import PowerAlert from '../../blocks/power-alert'
import Shelf from '../../blocks/shelf'
import Timer from '../../blocks/timer'
import Island from '../../components/island'
import type { IslandState } from '../../lib/geometry'
import { useSoon } from '../../mock/activities'
import { DEVICES, POWER } from '../../mock/data'
import { ArtworkTile, FlashIsland } from '../../mock/island-content'
import { type Scene, SceneDesk } from '../../mock/scene'

const ALERTS: Scene[] = [
  { value: 'charging', label: 'Charging' },
  { value: 'unplugged', label: 'On battery' },
  { value: 'low', label: 'Low battery' },
  { value: 'critical', label: 'Critical' },
  { value: 'volume', label: 'Volume' },
  { value: 'brightness', label: 'Brightness' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'device', label: 'Device' },
  { value: 'timer', label: "Time's up" },
  { value: 'meeting', label: 'Meeting' },
  { value: 'drop', label: 'Shelf drop' },
]

/** The flash for each alert, on the blocks and the mock data. */
export function useAlert(alert: string): ReactNode {
  const event = useSoon(0.9)
  if (alert === 'charging') return <PowerAlert kind="charging" level={POWER.level} minutes={POWER.untilFull} />
  if (alert === 'unplugged') return <PowerAlert kind="unplugged" level={POWER.level} minutes={POWER.remaining} />
  if (alert === 'low') return <PowerAlert kind="low" level={19} />
  if (alert === 'critical') return <PowerAlert kind="critical" level={8} />
  if (alert === 'volume') return <Controls.Level kind="volume" defaultValue={0.62} />
  if (alert === 'brightness') return <Controls.Level kind="brightness" defaultValue={0.3} />
  if (alert === 'keyboard') return <Controls.Level kind="keyboard" defaultValue={0.8} />
  if (alert === 'device') return <Devices.Connected device={DEVICES[0]!} />
  if (alert === 'timer') return <Timer.Done kind="focus" next="break" minutes={5} />
  if (alert === 'meeting') return <Agenda.Starting event={event} />
  if (alert === 'drop') return <Shelf.Drop phase="dragging" count={3} />
  return null
}

interface AlertsProps {
  /** The alert shown at first. Defaults to `'charging'`. */
  alert?: string
  /** Show the alerts under the screen. Defaults to `true`. */
  picker?: boolean
}

/**
 * Every alert a notch app flashes below the notch, over whatever the island
 * showed before.
 *
 * Power (a charger in or out, the battery at 20% and at 10%), the HUD that
 * replaces the system's volume, brightness and keyboard backlight overlay, a
 * Bluetooth device connecting, a timer reaching zero, a meeting a minute
 * out and files dragged onto the notch. Pick one under the screen: the
 * island drops into the flash, and one alert replacing another swaps with
 * the blur because each is keyed by its kind (the Island's `activity`).
 * Press the island, or let it be, to go back to the music in the wings.
 *
 * @example {@include ./examples.mdx}
 */
export default function Alerts({ alert: initial = 'charging', picker = true }: AlertsProps) {
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
          trailing={<NowPlaying.Trailing />}
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

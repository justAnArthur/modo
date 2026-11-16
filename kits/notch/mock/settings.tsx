/*!
 * Mock: the settings window's data for the docs, the plugins with their own
 * settings, the permissions and the about rows, and a window frame made of
 * tokens that scales down to the column it gets. Nothing here ships in the
 * barrel.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Radio from '@justanarthur/modo-ui/components/inputs/radio'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  Activity,
  BatteryCharging,
  CalendarDays,
  Files,
  Headphones,
  Music,
  SlidersHorizontal,
  Timer,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { AboutRow, SettingsPermission, SettingsPlugin } from '../blocks/settings-window'
import { useFitScale } from './fit'

function AlertSwitches() {
  return (
    <Switch.Group>
      <Switch label="Charging" description="When you plug in a charger." defaultChecked />
      <Switch label="On battery" description="When you unplug the charger." defaultChecked />
      <Switch label="Low battery" description="Once when the battery drops to 20%." defaultChecked />
      <Switch label="Critically low battery" description="Once when the battery drops to 10%." defaultChecked />
    </Switch.Group>
  )
}

function CalendarSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-body text-muted-foreground">Show the countdown</span>
        <Radio.Group defaultValue="10">
          {[5, 10, 15].map(m => (
            <Radio key={m} value={String(m)} label={`${m} minutes before`} />
          ))}
        </Radio.Group>
      </div>
      <Switch.Group>
        <Switch
          label="Alert a minute before"
          description="Expands the island when an event is about to start."
          defaultChecked
        />
      </Switch.Group>
    </div>
  )
}

function HudSettings() {
  const [on, setOn] = useState(true)
  return (
    <div className="flex flex-col gap-4">
      <Switch.Group>
        <Switch
          label="Replace system volume & brightness HUD"
          description="Volume, brightness and keyboard backlight keys show their level in the island."
          checked={on}
          onCheckedChange={setOn}
        />
      </Switch.Group>
      {on && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-status-warning/16 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-body weight-medium text-foreground">Needs Accessibility</span>
            <span className="text-caption text-muted-foreground">
              Allow the app under Privacy & Security › Accessibility so it can take over the keys.
            </span>
          </div>
          <Button className="shrink-0" variant="secondary" size="compact">
            Open Settings
          </Button>
        </div>
      )}
    </div>
  )
}

function one(label: string, description: string, defaultChecked = false): ReactNode {
  return (
    <Switch.Group>
      <Switch label={label} description={description} defaultChecked={defaultChecked} />
    </Switch.Group>
  )
}

export const PLUGINS: SettingsPlugin[] = [
  {
    id: 'now-playing',
    name: 'Now Playing',
    description: 'What plays in Music, Spotify or a browser.',
    icon: Music,
    settings: one('Announce track changes', 'Shows the new track for a moment while the island is collapsed.'),
  },
  {
    id: 'power',
    name: 'Power',
    description: 'Charging and low battery alerts.',
    icon: BatteryCharging,
    settings: <AlertSwitches />,
  },
  {
    id: 'timer',
    name: 'Timer',
    description: 'Countdowns and Pomodoro focus runs.',
    icon: Timer,
    settings: one('Pomodoro cycles', 'After a 25 min focus a 5 min break starts on its own, then focus again.', true),
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Today and tomorrow, and a countdown to the next event.',
    icon: CalendarDays,
    settings: <CalendarSettings />,
  },
  { id: 'shelf', name: 'Shelf', description: 'Files dropped on the notch, kept for later.', icon: Files },
  {
    id: 'controls',
    name: 'Controls',
    description: 'Volume and brightness, and their HUD.',
    icon: SlidersHorizontal,
    settings: <HudSettings />,
  },
  { id: 'devices', name: 'Devices', description: 'Bluetooth devices and their batteries.', icon: Headphones },
  {
    id: 'stats',
    name: 'System',
    description: 'CPU, memory and network load.',
    icon: Activity,
    settings: one(
      'Show CPU load beside the notch',
      'Keeps sampling while it shows; otherwise only while the widget is open.',
    ),
  },
]

export const PERMISSIONS: SettingsPermission[] = [
  {
    id: 'accessibility',
    label: 'Accessibility',
    description: 'Replaces the volume and brightness HUD with the island.',
    granted: false,
  },
  { id: 'calendar', label: 'Calendar', description: 'Shows upcoming events.', granted: true },
  { id: 'bluetooth', label: 'Bluetooth', description: 'Announces connected devices and their battery.', granted: true },
  { id: 'automation', label: 'Automation', description: 'Controls the apps that play media.' },
]

export const ABOUT: AboutRow[] = [
  { label: 'Version', value: '1.4.0' },
  { label: 'Mode', value: 'Release' },
  { label: 'Screen', value: '1512 × 982 panel, hardware notch' },
]

const LIGHTS = ['bg-status-error', 'bg-status-warning', 'bg-status-success']

/**
 * A desktop window's frame for the docs: traffic lights and a title over the
 * content, laid out at a fixed size and scaled down whole to the width it
 * gets, so the window keeps its proportions in a narrow column.
 */
export function MockWindow({
  title,
  width = 760,
  height = 520,
  children,
}: {
  title?: string
  width?: number
  height?: number
  children: ReactNode
}) {
  const shape = useShape()
  const { outer, scale } = useFitScale(width)
  return (
    <div ref={outer} className="w-full" style={{ height: height * scale }}>
      <div
        className={cn(
          'mx-auto flex flex-col overflow-hidden border border-border bg-background shadow-surface-5',
          shape.container,
        )}
        style={{ width, height, zoom: scale }}
      >
        <div className="relative flex h-9 shrink-0 items-center gap-2 border-b border-border px-3.5">
          {LIGHTS.map(light => (
            <span key={light} aria-hidden className={cn('size-3 rounded-full', light)} />
          ))}
          {title && (
            <span className="pointer-events-none absolute inset-x-0 text-center text-body weight-medium text-foreground">
              {title}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

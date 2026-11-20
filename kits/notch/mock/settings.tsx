/*!
 * Mock: the settings window's data for the docs, the plugins with their own
 * settings, the permissions and the about rows, and a window frame made of
 * tokens that scales down to the column it gets. Nothing here ships in the
 * barrel.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import List, { LIST_SWITCH } from '@justanarthur/modo-ui/components/data-display/list'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Activity, CalendarDays, ClipboardList, Clock3, CloudSun, FolderDown, MapPin, Music, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { AboutHeader, AboutRow, SettingsPermission, SettingsPlugin } from '../blocks/app/settings-window'
import { ZONES } from './clock'
import { useFitScale } from './fit'

interface Option {
  value: string
  label: string
}

/** A switch row: the label, what it does, the switch at the end. */
function SwitchRow({
  label,
  description,
  defaultChecked = false,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: ReactNode
  defaultChecked?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <List.Row label={label} description={description}>
      <Switch
        aria-label={label}
        className={LIST_SWITCH}
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </List.Row>
  )
}

/** A choice row: the label, what it does, a borderless Select at the end. */
function SelectRow({
  label,
  description,
  options,
  defaultValue,
  value,
  onValueChange,
}: {
  label: string
  description?: ReactNode
  options: Option[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <List.Row label={label} description={description}>
      <Select defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
        <Select.Trigger variant="borderless" className="min-w-0" aria-label={label} />
        <Select.Content>
          {options.map(option => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </List.Row>
  )
}

/** A row of a list the user edits: the item, a muted detail, and Remove. */
function RemovableRow({ label, detail, onRemove }: { label: string; detail?: ReactNode; onRemove: () => void }) {
  return (
    <List.Row label={label}>
      {detail && <span className="min-w-0 truncate text-caption text-muted-foreground">{detail}</span>}
      <Button variant="ghost" size="icon" aria-label={`Remove ${label}`} onClick={onRemove}>
        <X />
      </Button>
    </List.Row>
  )
}

/** What a setting needs from macOS and isn't granted: a line and the way to System Settings. */
function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-status-warning/16 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-body weight-medium text-foreground">{title}</span>
        <span className="text-caption text-muted-foreground">{children}</span>
      </div>
      <Button className="shrink-0" variant="secondary" size="compact">
        Open Settings
      </Button>
    </div>
  )
}

const minutes = (values: number[]): Option[] => values.map(m => ({ value: String(m), label: `${m} min` }))

function NowPlayingSettings() {
  return (
    <List>
      <List.Section title="Announcements">
        <SwitchRow
          label="Announce track changes"
          description="Shows the new track below the notch for a moment while the island is collapsed."
          defaultChecked
        />
        <SwitchRow
          label="Only while a player is in the background"
          description="Stays quiet while Music, Spotify or the browser playing is the app in front."
        />
      </List.Section>
    </List>
  )
}

function CalendarSettings() {
  return (
    <List>
      <List.Section title="Up next">
        <SelectRow
          label="Show the countdown"
          description="The next event takes the wings this long before it starts."
          options={[5, 10, 15, 30].map(m => ({ value: String(m), label: `${m} min before` }))}
          defaultValue="10"
        />
      </List.Section>
      <List.Section title="Alerts">
        <SwitchRow
          label="Alert a minute before"
          description="Drops the island open with the event and Join when it has a call link."
          defaultChecked
        />
        <SwitchRow
          label="Include all-day events"
          description="Off, they show as chips on the date line and never alert."
        />
      </List.Section>
    </List>
  )
}

function WeatherSettings() {
  const [location, setLocation] = useState('automatic')
  return (
    <div className="flex flex-col gap-6">
      {location === 'automatic' && (
        <Notice title="Needs Location">
          Allow the app under Privacy & Security › Location Services, or pick a city.
        </Notice>
      )}
      <List>
        <List.Section title="Location">
          <SelectRow
            label="Forecast for"
            description="Your Mac's location follows you; a city stays put."
            options={[
              { value: 'automatic', label: 'Current location' },
              { value: 'city', label: 'A city' },
            ]}
            value={location}
            onValueChange={setLocation}
          />
          {location === 'city' && (
            <List.Row label="City">
              <Input
                aria-label="City"
                icon={MapPin}
                defaultValue="Bratislava"
                placeholder="Search for a city"
                className="w-48"
              />
            </List.Row>
          )}
        </List.Section>
        <List.Section title="Units">
          <SelectRow
            label="Temperature"
            description="Wind speed follows: km/h with Celsius, mph with Fahrenheit."
            options={[
              { value: 'celsius', label: 'Celsius (°C)' },
              { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
            ]}
            defaultValue="celsius"
          />
        </List.Section>
        <List.Section title="Alerts">
          <SwitchRow
            label="Rain soon"
            description="Flashes about a quarter of an hour before rain starts, with how long it lasts."
            defaultChecked
          />
        </List.Section>
      </List>
    </div>
  )
}

function ClockSettings() {
  const [zones, setZones] = useState(ZONES)
  return (
    <List>
      <List.Section title="Clock">
        <SelectRow
          label="Time format"
          options={[
            { value: 'auto', label: 'As the system' },
            { value: '12', label: '12-hour (4:42 PM)' },
            { value: '24', label: '24-hour (16:42)' },
          ]}
          defaultValue="auto"
        />
        <SwitchRow label="Show seconds" description="The seconds tick, muted, after the minutes." />
      </List.Section>
      <List.Section title="World clocks" aside={`${zones.length} of 3`}>
        {zones.map(zone => (
          <RemovableRow
            key={zone.timeZone}
            label={zone.city}
            detail={zone.timeZone}
            onRemove={() => setZones(zones.filter(z => z !== zone))}
          />
        ))}
        <List.Row label={<span className="text-muted-foreground">Up to three beside the time</span>}>
          <Button variant="ghost" size="compact" disabled={zones.length >= 3}>
            Add city
          </Button>
        </List.Row>
      </List.Section>
      <List.Section title="Pomodoro">
        <SelectRow label="Focus" options={minutes([15, 20, 25, 30, 45, 50, 60])} defaultValue="25" />
        <SelectRow label="Short break" options={minutes([3, 5, 10])} defaultValue="5" />
        <SelectRow label="Long break" options={minutes([10, 15, 20, 30])} defaultValue="15" />
        <SelectRow
          label="Rounds before a long break"
          options={[2, 3, 4, 5, 6].map(n => ({ value: String(n), label: String(n) }))}
          defaultValue="4"
        />
        <SwitchRow
          label="Start breaks on their own"
          description="Off, a finished round waits for you to start the break."
          defaultChecked
        />
      </List.Section>
    </List>
  )
}

function SystemSettings() {
  return (
    <List>
      <List.Section title="Widget">
        <SelectRow
          label="Hero"
          description="The figure set large; the other shows among the facts under it."
          options={[
            { value: 'cpu', label: 'CPU load' },
            { value: 'memory', label: 'Memory pressure' },
          ]}
          defaultValue="cpu"
        />
      </List.Section>
      <List.Section title="Wings">
        <SwitchRow
          label="Show CPU load beside the notch"
          description="Keeps sampling while it shows; otherwise only while the widget is open."
        />
      </List.Section>
    </List>
  )
}

const IGNORED = ['1Password', 'Keychain Access']

function ClipboardSettings() {
  const [ignored, setIgnored] = useState(IGNORED)
  return (
    <List>
      <List.Section title="History">
        <SelectRow
          label="Keep"
          description="The oldest clips go first; pinned ones stay."
          options={[25, 50, 100, 250].map(n => ({ value: String(n), label: `${n} clips` }))}
          defaultValue="100"
        />
        <SwitchRow label="Pause recording" description="Nothing new is kept until you resume." />
        <SwitchRow label="Clear when quitting" description="Pinned clips are kept." />
      </List.Section>
      <List.Section title="Never record from" aside={`${ignored.length} ${ignored.length === 1 ? 'app' : 'apps'}`}>
        <SwitchRow
          label="Passwords and concealed text"
          description="Skips what password managers mark as concealed, whatever the app."
          defaultChecked
        />
        {ignored.map(app => (
          <RemovableRow key={app} label={app} onRemove={() => setIgnored(ignored.filter(a => a !== app))} />
        ))}
        <List.Row label={<span className="text-muted-foreground">Copies from these apps are never kept</span>}>
          <Button variant="ghost" size="compact">
            Add app
          </Button>
        </List.Row>
      </List.Section>
    </List>
  )
}

function FolderRow({ label, path }: { label: string; path: string }) {
  return (
    <List.Row label={label}>
      <span className="min-w-0 truncate text-caption text-muted-foreground">{path}</span>
      <Button variant="ghost" size="compact">
        Change
      </Button>
    </List.Row>
  )
}

function RecentFilesSettings() {
  return (
    <List>
      <List.Section title="Sources">
        <SwitchRow
          label="Downloads"
          description="Files as they finish downloading, and a download under way."
          defaultChecked
        />
        <SwitchRow label="Screenshots" description="Each screenshot as it is saved." defaultChecked />
      </List.Section>
      <List.Section title="Folders">
        <FolderRow label="Downloads" path="~/Downloads" />
        <FolderRow label="Screenshots" path="~/Desktop" />
      </List.Section>
      <List.Section title="List">
        <SelectRow
          label="Show"
          description="How many files each list keeps, the newest first."
          options={[6, 12, 24].map(n => ({ value: String(n), label: `${n} files` }))}
          defaultValue="12"
        />
        <SwitchRow
          label="Flash when a file lands"
          description="Shows the file below the notch for a moment, with Open."
          defaultChecked
        />
      </List.Section>
    </List>
  )
}

export const PLUGINS: SettingsPlugin[] = [
  {
    id: 'now-playing',
    name: 'Now Playing',
    description: 'What plays in Music, Spotify or a browser.',
    icon: Music,
    settings: <NowPlayingSettings />,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Today and tomorrow, and a countdown to the next event.',
    icon: CalendarDays,
    settings: <CalendarSettings />,
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'The temperature now, the next hours and rain on its way.',
    icon: CloudSun,
    settings: <WeatherSettings />,
  },
  {
    id: 'clock',
    name: 'Clock',
    description: 'The time, world clocks and a Pomodoro cycle.',
    icon: Clock3,
    settings: <ClockSettings />,
  },
  {
    id: 'system',
    name: 'System',
    description: 'CPU, memory, battery and the busiest processes.',
    icon: Activity,
    settings: <SystemSettings />,
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    description: 'What you copied, kept and searchable.',
    icon: ClipboardList,
    settings: <ClipboardSettings />,
  },
  {
    id: 'files',
    name: 'Recent files',
    description: 'The newest downloads and screenshots, ready to drag out.',
    icon: FolderDown,
    settings: <RecentFilesSettings />,
  },
]

export const PERMISSIONS: SettingsPermission[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Shows your events and counts down to the next one.',
    state: 'allowed',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    description: 'Window management, clipboard paste, the volume and brightness overlay.',
    state: 'stale',
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Finds the weather where you are; a city in Weather needs none.',
    state: 'off',
  },
  {
    id: 'bluetooth',
    label: 'Bluetooth',
    description: 'Shows your headphones’ battery when they connect.',
    state: 'notAsked',
  },
  {
    id: 'automation',
    label: 'Automation',
    description: "Reads and controls a player when macOS doesn't report what plays.",
  },
]

/** The app's icon, made of tokens: the island hanging from a dark tile's top edge. */
function AppIcon() {
  return (
    <span className="dark flex size-16 justify-center rounded-2xl bg-ink ring-1 ring-border ring-inset">
      <span className="h-3 w-8 rounded-b-lg bg-foreground" />
    </span>
  )
}

export const ABOUT_HEADER: AboutHeader = {
  icon: <AppIcon />,
  name: 'Just Notch',
  version: 'Version 1.7.0 (214)',
  copyright: '© 2026 justAnArthur',
}

export const ABOUT: AboutRow[] = [
  { label: 'Version', value: '1.4.0' },
  { label: 'Mode', value: 'Release' },
  { label: 'Screen', value: '1512 × 982 panel, hardware notch' },
]

/** The rows under `ABOUT_HEADER`, which already says the version. */
export const ABOUT_DETAILS = ABOUT.filter(row => row.label !== 'Version')

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

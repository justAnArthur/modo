/*!
 * Local addition: a notch app's Bluetooth devices and their batteries.
 * Rebuilt from Just Notch's devices plugin (`Devices`, `Device`, `Connected`)
 * as presentational parts: the devices come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  Bluetooth,
  Gamepad2,
  Headphones,
  Keyboard,
  type LucideIcon,
  Mouse,
  Smartphone,
  Speaker,
  Watch,
} from 'lucide-react'
import BatteryGlyph from '../../../components/indicators/battery-glyph'
import IslandFlash from '../../../components/island/island-flash'

type DeviceKind = 'headphones' | 'keyboard' | 'mouse' | 'speaker' | 'gamepad' | 'phone' | 'watch' | 'other'

interface DeviceInfo {
  id: string
  name: string
  /** What it is, for its glyph. */
  kind: DeviceKind
  connected: boolean
  /** Its charge in percent, when it reports one. */
  battery?: number
  charging?: boolean
}

interface DevicesProps {
  /** The paired devices; connected ones list first, then by name. */
  devices: DeviceInfo[]
  /** Called by the empty state's Open Bluetooth Settings; without it the button hides. */
  onOpenSettings?: () => void
  /** Classes for the root, which fills its container. */
  className?: string
}

const KIND: Record<DeviceKind, LucideIcon> = {
  headphones: Headphones,
  keyboard: Keyboard,
  mouse: Mouse,
  speaker: Speaker,
  gamepad: Gamepad2,
  phone: Smartphone,
  watch: Watch,
  other: Bluetooth,
}

function Charge({ device }: { device: DeviceInfo }) {
  if (device.battery === undefined) return null
  return (
    <span className="flex shrink-0 items-center gap-2 text-caption tabular-nums text-muted-foreground">
      {device.battery}%
      <BatteryGlyph level={device.battery} charging={device.charging} fillIn={false} />
    </span>
  )
}

function Glyph({ device }: { device: DeviceInfo }) {
  const Icon = KIND[device.kind]
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full',
        device.connected ? 'bg-surface-3 text-foreground' : 'bg-surface-2 text-muted-foreground',
      )}
    >
      <Icon size={16} strokeWidth={1.5} />
    </span>
  )
}

function Device({ device }: { device: DeviceInfo }) {
  return (
    <li className="flex h-11 min-w-0 items-center gap-3">
      <Glyph device={device} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-body', device.connected ? 'text-foreground' : 'text-muted-foreground')}>
          {device.name}
        </span>
        <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <StatusDot status={device.connected ? 'success' : 'idle'} size="compact" />
          {device.connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      {device.connected && <Charge device={device} />}
    </li>
  )
}

/** The island's flash when a device connects: its glyph, name and battery. */
function DevicesConnected({ device }: { device: DeviceInfo }) {
  const Icon = KIND[device.kind]
  return (
    <IslandFlash
      icon={
        <span className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-foreground">
          <Icon size={16} strokeWidth={1.5} />
        </span>
      }
      title={device.name}
      caption="Connected"
      value={device.battery === undefined ? undefined : `${device.battery}%`}
      trailing={
        device.battery === undefined ? undefined : <BatteryGlyph level={device.battery} charging={device.charging} />
      }
    />
  )
}

/**
 * A notch app's Bluetooth devices: what's paired, what's connected and how
 * much charge each has left.
 *
 * Devices list in two columns, connected first: a glyph for the kind of
 * device (raised while connected), the name, a StatusDot with Connected or
 * Not connected, and for a connected device that reports one, its charge as
 * a figure and a BatteryGlyph, which turns to the warning and error hues as
 * it runs low. Without devices it says how to pair one, with a button to the
 * system's Bluetooth settings when `onOpenSettings` is given.
 *
 * `Devices.Connected` is the island's flash when a device connects.
 *
 * @example {@include ./examples.mdx}
 */
function Devices({ devices, onOpenSettings, className }: DevicesProps) {
  if (devices.length === 0)
    return (
      <div className={cn('flex size-full items-center justify-center', className)}>
        <EmptyState
          size="compact"
          icon={Bluetooth}
          title="No Bluetooth devices"
          description="Pair headphones, a keyboard or a mouse to see them here."
          actions={
            onOpenSettings && (
              <Button variant="secondary" size="compact" onClick={onOpenSettings}>
                Open Bluetooth Settings
              </Button>
            )
          }
        />
      </div>
    )

  const sorted = [...devices].sort((a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name))
  return (
    <ul className={cn('m-0 grid list-none grid-cols-2 content-start gap-x-8 p-0', className)}>
      {sorted.map(device => (
        <Device key={device.id} device={device} />
      ))}
    </ul>
  )
}

Devices.Connected = DevicesConnected

export default Devices

export type { DeviceInfo, DeviceKind, DevicesProps }
export { Devices, DevicesConnected }

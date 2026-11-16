/*!
 * Local addition: a notch app's power alerts. Rebuilt from Just Notch's
 * power plugin (`Charging`, `Unplugged`, `Low`, `Critical`) as one
 * presentational flash: the battery comes in as props.
 */

'use client'

import { BatteryLow, BatteryWarning, Unplug, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import BatteryGlyph, { type BatteryTone } from '../../components/battery-glyph'
import IslandFlash, { type IslandFlashTone } from '../../components/island-flash'

type PowerAlertKind = 'charging' | 'unplugged' | 'low' | 'critical'

interface PowerAlertProps {
  /** What happened: a charger plugged in or out, or the battery crossing 20% or 10%. */
  kind: PowerAlertKind
  /** The charge, in percent (0 to 100). */
  level: number
  /** Minutes until full while charging, or of battery left on battery: the caption says it. */
  minutes?: number
  /** Replaces the caption the kind and `minutes` give. */
  caption?: ReactNode
  /** Classes for the row. */
  className?: string
}

const ALERT: Record<
  PowerAlertKind,
  { title: string; tone: IslandFlashTone & BatteryTone; icon: ReactNode; verb?: string; caption?: string }
> = {
  charging: {
    title: 'Charging',
    tone: 'success',
    icon: <Zap size={18} strokeWidth={1.5} fill="currentColor" />,
    verb: 'until full',
  },
  unplugged: { title: 'On battery', tone: 'default', icon: <Unplug size={18} strokeWidth={1.5} />, verb: 'remaining' },
  low: {
    title: 'Low battery',
    tone: 'warning',
    icon: <BatteryLow size={18} strokeWidth={1.5} />,
    caption: 'Plug in soon',
  },
  critical: {
    title: 'Battery critically low',
    tone: 'error',
    icon: <BatteryWarning size={18} strokeWidth={1.5} />,
    caption: 'Plug in now',
  },
}

/** Minutes as `38 min` or `4 h 12 min`. */
const span = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min` : `${Math.round(minutes)} min`

/**
 * A notch app's power alert: a charger plugged in or out, or the battery
 * running low, as the island's flash.
 *
 * Each kind brings its icon, title and status hue: charging in success,
 * unplugged in the text color, low in warning (at 20%), critical in error
 * (at 10%). The level shows as a figure in that hue and as a BatteryGlyph
 * that fills up from empty as the flash opens. With `minutes`, the caption
 * says how long until full or how much is left; low and critical say to plug
 * in. Pass it as the Island's `flash`, keyed by kind, so one alert replacing
 * another swaps instead of updating in place.
 *
 * @example {@include ./examples.mdx}
 */
export default function PowerAlert({ kind, level, minutes, caption, className }: PowerAlertProps) {
  const alert = ALERT[kind]
  const detail = minutes !== undefined && alert.verb ? `${span(minutes)} ${alert.verb}` : alert.caption
  return (
    <IslandFlash
      className={className}
      icon={alert.icon}
      tone={alert.tone}
      title={alert.title}
      caption={caption ?? detail}
      value={`${Math.round(level)}%`}
      trailing={<BatteryGlyph level={level} charging={kind === 'charging'} tone={alert.tone} />}
    />
  )
}

export type { PowerAlertKind, PowerAlertProps }
export { PowerAlert }

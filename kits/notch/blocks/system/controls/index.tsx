/*!
 * Local addition: a notch app's system controls and their HUD, the level the
 * island shows in place of the system's volume and brightness overlay.
 * Rebuilt from Just Notch's HUD plugin (`Level`, `Controls`, `Flash`) as
 * presentational parts: the levels come in as values.
 */

'use client'

import Slider from '@justanarthur/modo-ui/components/inputs/slider'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  Keyboard,
  KeyboardOff,
  type LucideIcon,
  Speaker,
  Sun,
  SunDim,
  SunMedium,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'

type ControlKind = 'volume' | 'brightness' | 'keyboard'

/** The levels, from 0 to 1. A missing brightness or keyboard level hides its row (no built-in display, no backlight). */
interface ControlLevels {
  volume: number
  muted?: boolean
  brightness?: number
  keyboard?: number
}

interface ControlsProps {
  /** The levels (controlled). */
  value?: ControlLevels
  /** The levels at first (uncontrolled). Defaults to the volume at half. */
  defaultValue?: ControlLevels
  /** Called with every level when a slider moves one; moving volume unmutes it. */
  onValueChange?: (levels: ControlLevels) => void
  /** The audio output's name, on a muted row under the sliders. */
  output?: string
  /** Classes for the root, which fills its container. */
  className?: string
}

const LABEL: Record<ControlKind, string> = {
  volume: 'Volume',
  brightness: 'Brightness',
  keyboard: 'Keyboard brightness',
}

/** The glyph for a level: the speaker's waves, the sun's rays, the backlight on or off. */
function glyph(kind: ControlKind, value: number, muted?: boolean): LucideIcon {
  if (kind === 'volume') {
    if (muted || value === 0) return VolumeX
    return value < 0.34 ? Volume : value < 0.67 ? Volume1 : Volume2
  }
  if (kind === 'brightness') return value < 0.34 ? SunDim : value < 0.67 ? SunMedium : Sun
  return value === 0 ? KeyboardOff : Keyboard
}

interface ControlsLevelProps {
  /** What it sets. */
  kind: ControlKind
  /** The level, from 0 to 1 (controlled). */
  value?: number
  /** The level at first (uncontrolled). Defaults to `0`. */
  defaultValue?: number
  /** Called with the level, from 0 to 1, as the slider moves. */
  onValueChange?: (value: number) => void
  /** Volume only: it is muted, so it reads 0 and shows the crossed speaker until moved. */
  muted?: boolean
  /** Classes for the row. */
  className?: string
}

/** One level as a row: a glyph that follows it, a compact slider and the percent. Pass it as the HUD's flash, keyed by kind. */
function ControlsLevel({
  kind,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  muted,
  className,
}: ControlsLevelProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const shown = muted ? 0 : value
  const Icon = glyph(kind, shown, muted)
  const percent = Math.round(shown * 100)
  return (
    <div className={cn('flex h-7 items-center gap-3', className)}>
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-foreground" />
      <Slider
        className="mb-0 min-w-0 flex-1"
        size="compact"
        label={LABEL[kind]}
        showValue={false}
        value={percent}
        onValueChange={v => setValue((v as number) / 100)}
      />
      <span className="w-7 shrink-0 text-right text-caption tabular-nums text-muted-foreground">{percent}</span>
    </div>
  )
}

/**
 * A notch app's system controls: volume, display brightness and keyboard
 * backlight as sliders, and the audio output.
 *
 * Each row is a glyph that follows its level (the speaker's waves, a muted
 * cross, the sun's rays, the backlight off), modo-ui's compact Slider and the
 * level in percent. A display without a brightness reading, or a keyboard
 * without a backlight, leaves its level out and so its row. The levels are
 * one value from 0 to 1 each (`value` / `onValueChange`, or kept here from
 * `defaultValue`); moving the volume unmutes it.
 *
 * `Controls.Level` is one row on its own: the HUD flash that replaces the
 * system's overlay when a volume or brightness key is pressed. Key it by
 * kind, so pressing a brightness key while the volume shows swaps the flash
 * instead of repainting it.
 *
 * @example {@include ./examples.mdx}
 */
function Controls({ value, defaultValue = { volume: 0.5 }, onValueChange, output, className }: ControlsProps) {
  const [levels, setLevels] = useControllableState(value, defaultValue, onValueChange)
  return (
    <div className={cn('flex size-full flex-col justify-center gap-1', className)}>
      <ControlsLevel
        kind="volume"
        value={levels.volume}
        muted={levels.muted}
        onValueChange={volume => setLevels({ ...levels, volume, muted: false })}
      />
      {levels.brightness !== undefined && (
        <ControlsLevel
          kind="brightness"
          value={levels.brightness}
          onValueChange={brightness => setLevels({ ...levels, brightness })}
        />
      )}
      {levels.keyboard !== undefined && (
        <ControlsLevel
          kind="keyboard"
          value={levels.keyboard}
          onValueChange={keyboard => setLevels({ ...levels, keyboard })}
        />
      )}
      {output && (
        <div className="flex h-7 items-center gap-3">
          <Speaker size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-caption text-muted-foreground">{output}</span>
        </div>
      )}
    </div>
  )
}

Controls.Level = ControlsLevel

export default Controls

export type { ControlKind, ControlLevels, ControlsLevelProps, ControlsProps }
export { Controls, ControlsLevel }

// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

import { AlphaInput, ChannelTooltip, ColorInput } from './color-input'
import { type ColorFormat, type ParsedColor, rgbToHsl, rgbToOklch } from './variants'

export type ChannelKey = 'hex' | 'r' | 'g' | 'b' | 'hSL' | 'sSL' | 'lSL' | 'L' | 'C' | 'H' | 'alphaPercent'

export function ColorInputsRow({
  parsed,
  format,
  oklchHue,
  onChannelChange,
}: {
  parsed: ParsedColor
  format: ColorFormat
  /** The OKLCH hue last typed, shown instead of the one the sRGB round-trip drifts to. */
  oklchHue?: number | null
  onChannelChange: (key: ChannelKey, value: string) => void
}) {
  const alphaPct = Math.round(parsed.a * 100)

  if (format === 'hex') {
    const hexNoHash = parsed.hex.replace(/^#/, '').toUpperCase()
    return (
      <div className="grid grid-cols-2 gap-2">
        <ChannelTooltip label="Hex">
          <ColorInput
            value={hexNoHash}
            onCommit={next => onChannelChange('hex', next.startsWith('#') ? next : `#${next}`)}
            ariaLabel="Hex value"
            prefix="#"
          />
        </ChannelTooltip>
        <AlphaInput value={alphaPct} onCommit={n => onChannelChange('alphaPercent', String(n))} />
      </div>
    )
  }

  if (format === 'rgb') {
    return (
      <div className="grid grid-cols-4 gap-1">
        <ChannelTooltip label="Red">
          <ColorInput
            value={String(parsed.r)}
            onCommit={n => onChannelChange('r', n)}
            ariaLabel="Red"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={255}
          />
        </ChannelTooltip>
        <ChannelTooltip label="Green">
          <ColorInput
            value={String(parsed.g)}
            onCommit={n => onChannelChange('g', n)}
            ariaLabel="Green"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={255}
          />
        </ChannelTooltip>
        <ChannelTooltip label="Blue">
          <ColorInput
            value={String(parsed.b)}
            onCommit={n => onChannelChange('b', n)}
            ariaLabel="Blue"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={255}
          />
        </ChannelTooltip>
        <AlphaInput value={alphaPct} onCommit={n => onChannelChange('alphaPercent', String(n))} />
      </div>
    )
  }

  if (format === 'hsl') {
    const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
    return (
      <div className="grid grid-cols-4 gap-1">
        <ChannelTooltip label="Hue">
          <ColorInput
            value={String(Math.round(hsl.h))}
            onCommit={n => onChannelChange('hSL', n)}
            ariaLabel="Hue"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={360}
            wrap
          />
        </ChannelTooltip>
        <ChannelTooltip label="Saturation">
          <ColorInput
            value={String(Math.round(hsl.s * 100))}
            onCommit={n => onChannelChange('sSL', n)}
            ariaLabel="Saturation"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={100}
          />
        </ChannelTooltip>
        <ChannelTooltip label="Lightness">
          <ColorInput
            value={String(Math.round(hsl.l * 100))}
            onCommit={n => onChannelChange('lSL', n)}
            ariaLabel="Lightness"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={100}
          />
        </ChannelTooltip>
        <AlphaInput value={alphaPct} onCommit={n => onChannelChange('alphaPercent', String(n))} />
      </div>
    )
  }

  const oklch = rgbToOklch(parsed.r, parsed.g, parsed.b)
  const displayH = oklchHue ?? oklch.H
  return (
    <div className="grid grid-cols-4 gap-1">
      <ChannelTooltip label="Lightness">
        <ColorInput
          value={(oklch.L * 100).toFixed(0)}
          onCommit={n => onChannelChange('L', n)}
          ariaLabel="Lightness"
          align="center"
          inputMode="decimal"
          nudgeStep={1}
          nudgeShiftStep={10}
          scrubbable
          min={0}
          max={100}
        />
      </ChannelTooltip>
      <ChannelTooltip label="Chroma">
        <ColorInput
          value={oklch.C.toFixed(2)}
          onCommit={n => onChannelChange('C', n)}
          ariaLabel="Chroma"
          align="center"
          inputMode="decimal"
          nudgeStep={0.01}
          nudgeShiftStep={0.1}
          decimals={2}
          scrubbable
          min={0}
          max={0.4}
        />
      </ChannelTooltip>
      <ChannelTooltip label="Hue">
        <ColorInput
          value={displayH.toFixed(0)}
          onCommit={n => onChannelChange('H', n)}
          ariaLabel="Hue"
          align="center"
          inputMode="numeric"
          nudgeStep={1}
          nudgeShiftStep={10}
          scrubbable
          min={0}
          max={360}
          wrap
        />
      </ChannelTooltip>
      <AlphaInput value={alphaPct} onCommit={n => onChannelChange('alphaPercent', String(n))} />
    </div>
  )
}

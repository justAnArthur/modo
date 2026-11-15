// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useShape } from '../../../lib/shape-context'
import type { SizeVariant } from '../../../lib/size-context'
import { surfaceClasses } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import type { MorphProps } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import { AlphaSlider, HueSlider } from './channel-sliders'
import {
  buildParsed,
  type ColorFormat,
  clamp01,
  formatValueByFormat,
  hslToRgb,
  hsvToRgb,
  oklchToRgb,
  type ParsedColor,
  parseColor,
  resolveCssColor,
  rgbToHsl,
  rgbToHsv,
  rgbToOklch,
} from './color-math'
import { PanelSurfaceContext } from './context'
import { FormatMenu } from './format-menu'
import { ColorInputsRow } from './inputs-row'
import { ColorPickerPopover } from './popover'
import { SaturationSquare } from './saturation-square'
import { ColorSwatch, type ColorSwatchProps, ColorTile, EyeDropperButton, SwatchStrip } from './swatches'

const PANEL_WIDTH = 280

interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled color value, in any of the supported formats. Omit it to let the picker keep its own state, seeded from `defaultValue`. */
  value?: string
  /** Initial color when uncontrolled — any CSS color string, named colors included. Defaults to `"#6B97FF"`. */
  defaultValue?: string
  /** Fired on every change. Receives the formatted string and a parsed color object carrying every format. */
  onValueChange?: (value: string, parsed: ParsedColor) => void
  /** Controlled format selection. */
  format?: ColorFormat
  /** Initial format when uncontrolled. Defaults to `"hex"`. */
  defaultFormat?: ColorFormat
  /** Fired when the user switches format. */
  onFormatChange?: (format: ColorFormat) => void
  /** Optional preset swatches. When omitted, the strip is hidden. */
  swatches?: string[]
  /** Force-hide the eyedropper button — it is hidden automatically in browsers that do not support it. Defaults to `false`. */
  hideEyedropper?: boolean
  /** Controlled open state of the format menu. Pair with `onFormatOpenChange`. */
  formatOpen?: boolean
  /** Initial open state of the format menu when uncontrolled. Defaults to `false`. */
  defaultFormatOpen?: boolean
  /** Called when the format menu opens or closes. */
  onFormatOpenChange?: (open: boolean) => void
  /** Pins trigger and popover to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
  /** Merged after the panel's surface, radius and padding classes. */
  className?: string
}

interface ColorPickerPopoverProps extends ColorPickerProps, MorphProps {
  /** Optional label rendered alongside the color tile. */
  triggerLabel?: string
  /** Position of the label relative to the color tile. Defaults to `"left"`. */
  triggerLabelPosition?: 'left' | 'right'
  /** Show the hex value (without alpha) next to the tile. Defaults to `true`. */
  triggerShowValue?: boolean
  /** Render an X button beside the trigger; pairs with `onTriggerRemove`. Defaults to `false`. */
  triggerShowRemove?: boolean
  /** Fired when the X button is clicked. */
  onTriggerRemove?: () => void
  /** Classes for the trigger's frame. */
  triggerClassName?: string
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state when uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void
}

type ColorPickerComponent = ForwardRefExoticComponent<ColorPickerProps & RefAttributes<HTMLDivElement>> & {
  /** `ColorPickerPopover` — the same panel behind a trigger button. */
  Popover: typeof ColorPickerPopover
}

/**
 * Color picker with HEX, RGB, HSL, and OKLCH formats, an alpha channel,
 * optional swatches, and an eyedropper. Available as an inline panel or a
 * popover.
 *
 * The value is kept internally as HSV, so hue survives a pass through pure
 * black, pure white or full grey instead of collapsing to red. Every edit —
 * the saturation square, the hue and alpha sliders, the per-channel inputs,
 * a swatch, the eyedropper — writes to that one canonical color, which is
 * re-emitted in the active format together with a parsed object carrying all
 * four. Numeric channels scrub: drag sideways to sweep a value, click to type
 * it. Alpha reads against a checkerboard, swatches accept any CSS color string
 * (named colors included), and OKLCH edits keep the hue you typed across the
 * lossy trip back through sRGB. The panel paints itself on the surface ladder
 * and re-provides its level, so the format menu elevates above it however
 * deeply the picker is nested.
 *
 * Statics:
 * - `ColorPicker.Popover` — `ColorPickerPopover`: the same panel behind a
 *   trigger button showing a color tile, an optional label and the hex value.
 *   The panel oozes out of the trigger and back through the shared morph (see
 *   Morph), with the morph options `from`, `effect`, `hideSource`, `tier`; the
 *   trigger sits on a bordered field box, with `triggerShowRemove`'s X beside
 *   it; `open` / `defaultOpen` / `onOpenChange` drive it both ways.
 *
 * Also exported: `ColorSwatch` and `ColorTile` (the swatch button and the
 * checkerboard tile), and the `parseColor` / `buildParsed` color helpers.
 * Wrap the picker in the shared `PortalContainer` to portal its format menu
 * into a given element (inside a CSS-scaled ancestor).
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/color-picker.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
  (
    {
      value,
      defaultValue = '#6B97FF',
      onValueChange,
      format,
      defaultFormat = 'hex',
      onFormatChange,
      swatches,
      hideEyedropper,
      formatOpen,
      defaultFormatOpen,
      onFormatOpenChange,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [currentRawValue, setRawValue] = useControllableState(value, defaultValue)
    const [currentFormat, setFormat] = useControllableState(format, defaultFormat, onFormatChange)

    // The canonical color, in HSV so the hue survives S=0 / V=0. Seeded once;
    // later outside values arrive through the sync effect below.
    const initialParsed = useMemo(() => {
      const p = parseColor(currentRawValue)
      if (!p) return { h: 0, s: 1, v: 1, a: 1 }
      const hsv = rgbToHsv(p.r, p.g, p.b)
      return { h: hsv.s === 0 ? 0 : hsv.h, s: hsv.s, v: hsv.v, a: p.a }
    }, [])

    const [hsv, setHsv] = useState(initialParsed)

    // The OKLCH hue last typed survives the lossy sRGB round-trip and
    // achromatic colors; any edit through another channel clears it.
    const oklchHueRef = useRef<number | null>(null)

    // A value from outside (not the one just emitted) re-seeds the HSV.
    const lastEmittedRef = useRef(currentRawValue)
    useEffect(() => {
      if (currentRawValue === lastEmittedRef.current) return
      lastEmittedRef.current = currentRawValue
      const p = parseColor(currentRawValue)
      if (!p) return
      oklchHueRef.current = null
      const newHsv = rgbToHsv(p.r, p.g, p.b)
      setHsv(prev => ({
        h: newHsv.s === 0 ? prev.h : newHsv.h,
        s: newHsv.s,
        v: newHsv.v,
        a: p.a,
      }))
    }, [currentRawValue])

    const parsed = useMemo(() => buildParsed(hsv.h, hsv.s, hsv.v, hsv.a), [hsv])

    const emit = useCallback(
      (p: ParsedColor, fmt: ColorFormat) => {
        const formatted = formatValueByFormat(p, fmt)
        lastEmittedRef.current = formatted
        setRawValue(formatted)
        onValueChange?.(formatted, p)
      },
      [setRawValue, onValueChange],
    )

    const updateHsv = useCallback(
      (next: { h?: number; s?: number; v?: number; a?: number }) => {
        const merged = { ...hsv, ...next }
        setHsv(merged)
        emit(buildParsed(merged.h, merged.s, merged.v, merged.a), currentFormat)
      },
      [hsv, currentFormat, emit],
    )

    const handleFormatChange = useCallback(
      (f: ColorFormat) => {
        setFormat(f)
        emit(parsed, f)
      },
      [setFormat, emit, parsed],
    )

    const handleHexCommit = useCallback(
      (input: string) => {
        // Named colors resolve through the DOM: fine in a handler.
        const p = resolveCssColor(input)
        if (!p) return
        oklchHueRef.current = null
        const newHsv = rgbToHsv(p.r, p.g, p.b)
        const merged = {
          h: newHsv.s === 0 ? hsv.h : newHsv.h,
          s: newHsv.s,
          v: newHsv.v,
          a: p.a,
        }
        setHsv(merged)
        emit(buildParsed(merged.h, merged.s, merged.v, merged.a), currentFormat)
      },
      [hsv.h, currentFormat, emit],
    )

    const solidHueRgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv.h, hsv.s, hsv.v])
    const solidR = Math.round(solidHueRgb.r)
    const solidG = Math.round(solidHueRgb.g)
    const solidB = Math.round(solidHueRgb.b)
    const solidColorString = `rgb(${solidR}, ${solidG}, ${solidB})`
    const shape = useShape()
    const substrate = useSurface()
    // At least the card level; re-provided so the format menu lifts above it.
    const pickerLevel = Math.max(substrate, 3)
    const paintsSurface = useContext(PanelSurfaceContext)

    return (
      <SizeScope size={size}>
        <SurfaceProvider value={pickerLevel}>
          <div
            ref={ref}
            className={cn(
              'flex flex-col gap-2 p-3',
              paintsSurface && surfaceClasses(pickerLevel, 1),
              shape.container,
              className,
            )}
            style={{ width: PANEL_WIDTH }}
            {...props}
          >
            <SaturationSquare h={hsv.h} s={hsv.s} v={hsv.v} onChange={(s, v) => updateHsv({ s, v })} />

            <div className="flex flex-col [&>*]:mb-0 [&>*+*]:-mt-px">
              <HueSlider
                h={hsv.h}
                onChange={h => {
                  oklchHueRef.current = null
                  updateHsv({ h })
                }}
              />
              <AlphaSlider
                a={hsv.a}
                solidColor={solidColorString}
                solidR={solidR}
                solidG={solidG}
                solidB={solidB}
                onChange={a => updateHsv({ a })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormatMenu
                value={currentFormat}
                onValueChange={handleFormatChange}
                open={formatOpen}
                defaultOpen={defaultFormatOpen}
                onOpenChange={onFormatOpenChange}
              />
              {!hideEyedropper && <EyeDropperButton onPick={handleHexCommit} />}
            </div>

            <ColorInputsRow
              parsed={parsed}
              format={currentFormat}
              oklchHue={oklchHueRef.current}
              onChannelChange={(channel, value) => {
                const p = { ...parsed }
                switch (channel) {
                  case 'hex':
                    handleHexCommit(value as string)
                    return
                  case 'r':
                  case 'g':
                  case 'b': {
                    oklchHueRef.current = null
                    const r = channel === 'r' ? Number(value) : p.r
                    const g = channel === 'g' ? Number(value) : p.g
                    const b = channel === 'b' ? Number(value) : p.b
                    const hsvVal = rgbToHsv(r, g, b)
                    updateHsv({
                      h: hsvVal.s === 0 ? hsv.h : hsvVal.h,
                      s: hsvVal.s,
                      v: hsvVal.v,
                    })
                    return
                  }
                  case 'hSL':
                  case 'sSL':
                  case 'lSL': {
                    if (channel === 'hSL') oklchHueRef.current = null
                    const hsl = rgbToHsl(p.r, p.g, p.b)
                    const h2 = channel === 'hSL' ? Number(value) : hsl.h
                    const s2 = channel === 'sSL' ? Number(value) / 100 : hsl.s
                    const l2 = channel === 'lSL' ? Number(value) / 100 : hsl.l
                    const rgb = hslToRgb(h2, clamp01(s2), clamp01(l2))
                    const hsvVal = rgbToHsv(rgb.r, rgb.g, rgb.b)
                    updateHsv({
                      h: hsvVal.s === 0 ? h2 : hsvVal.h,
                      s: hsvVal.s,
                      v: hsvVal.v,
                    })
                    return
                  }
                  case 'L':
                  case 'C':
                  case 'H': {
                    const cur = rgbToOklch(p.r, p.g, p.b)
                    // L and C edits keep the hue last typed, so it doesn't drift with chroma.
                    const baseH = oklchHueRef.current ?? cur.H
                    const L = channel === 'L' ? Number(value) / 100 : cur.L
                    const C = channel === 'C' ? Number(value) : cur.C
                    const H = channel === 'H' ? Number(value) : baseH
                    oklchHueRef.current = H
                    const rgb = oklchToRgb(clamp01(L), Math.max(0, C), H)
                    const hsvVal = rgbToHsv(rgb.r, rgb.g, rgb.b)
                    updateHsv({
                      h: hsvVal.s === 0 ? hsv.h : hsvVal.h,
                      s: hsvVal.s,
                      v: hsvVal.v,
                    })
                    return
                  }
                  case 'alphaPercent': {
                    const a = clamp01(Number(value) / 100)
                    updateHsv({ a })
                    return
                  }
                }
              }}
            />

            {swatches && swatches.length > 0 && (
              <SwatchStrip swatches={swatches} current={parsed.hex} onPick={handleHexCommit} />
            )}
          </div>
        </SurfaceProvider>
      </SizeScope>
    )
  },
) as ColorPickerComponent

ColorPicker.displayName = 'ColorPicker'

Object.assign(ColorPicker, { Popover: ColorPickerPopover })

export type { ColorFormat, ColorPickerPopoverProps, ColorPickerProps, ColorSwatchProps, ParsedColor }
export { buildParsed, ColorPicker, ColorPickerPopover, ColorSwatch, ColorTile, parseColor }

export default ColorPicker

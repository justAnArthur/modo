// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { Slider } from '../slider'

export function HueSlider({ h, onChange }: { h: number; onChange: (h: number) => void }) {
  const hueColor = `hsl(${h}, 100%, 50%)`
  return (
    <Slider
      value={h}
      onValueChange={v => onChange(typeof v === 'number' ? v : (v[0] ?? 0))}
      min={0}
      max={360}
      step={1}
      showValue={false}
      hideFill
      thumbColor={hueColor}
      thumbBorderColor="var(--picker-thumb-border)"
      trackStyle={{
        background:
          'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
        borderColor: 'transparent',
      }}
      aria-label="Hue"
    />
  )
}

export function AlphaSlider({
  a,
  solidColor,
  solidR,
  solidG,
  solidB,
  onChange,
}: {
  a: number
  solidColor: string
  solidR: number
  solidG: number
  solidB: number
  onChange: (a: number) => void
}) {
  // The transparent stop keeps the color's channels, so the gradient doesn't grey out on its way to opaque.
  const transparentColor = `rgba(${solidR}, ${solidG}, ${solidB}, 0)`
  return (
    <Slider
      value={Math.round(a * 100)}
      onValueChange={v => onChange((typeof v === 'number' ? v : (v[0] ?? 0)) / 100)}
      min={0}
      max={100}
      step={1}
      showValue={false}
      hideFill
      thumbColor={solidColor}
      thumbBorderColor="var(--picker-thumb-border)"
      trackStyle={{
        backgroundImage: `linear-gradient(to right, ${transparentColor} 0%, ${solidColor} 98%), conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)`,
        backgroundSize: '100% 100%, 8px 8px',
        borderWidth: 0,
      }}
      aria-label="Alpha"
    />
  )
}

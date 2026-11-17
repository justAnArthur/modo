// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the Slider port (Fluid Functionalism `registry/base/slider.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { useEffect, useState } from 'react'

export type SliderValue = number | [number, number]
export type ValuePosition = 'left' | 'right' | 'top' | 'bottom' | 'tooltip'

export const THUMB_SIZE = 20
export const THUMB_SIZE_REST = 16
export const TRACK_BG_HEIGHT = 18
export const DOT_SIZE = 4
export const PIP_SIZE = 5
// The track background is inset so its rounded ends centre on the thumb at min and max.
export const TRACK_INSET = (THUMB_SIZE - TRACK_BG_HEIGHT) / 2

export function valueToPixel(v: number, min: number, max: number, trackWidth: number): number {
  if (max === min) return 0
  const usable = trackWidth - THUMB_SIZE
  return ((v - min) / (max - min)) * usable
}

export function nearestStepIndex(v: number, steps: number[]): number {
  let idx = 0
  for (let i = 1; i < steps.length; i++) {
    if (Math.abs(steps[i]! - v) < Math.abs(steps[idx]! - v)) idx = i
  }
  return idx
}

/** `raw` snapped to the step grid (or the nearest of `stepValues`) and clamped to `min`…`max`. */
export function snapValue(
  raw: number,
  min: number,
  max: number,
  step: number,
  stepValues: number[] | null = null,
): number {
  if (stepValues) return stepValues[nearestStepIndex(raw, stepValues)]!
  return Math.max(min, Math.min(max, Math.round((raw - min) / step) * step + min))
}

export function pixelToValue(
  px: number,
  min: number,
  max: number,
  step: number,
  trackWidth: number,
  stepValues: number[] | null = null,
): number {
  const usable = trackWidth - THUMB_SIZE
  if (usable <= 0) return min
  return snapValue((px / usable) * (max - min) + min, min, max, step, stepValues)
}

export function toRadixValue(value: SliderValue): number[] {
  return Array.isArray(value) ? value : [value]
}

/** The element's length along the slider's axis, in layout pixels. */
export function axisLength(el: HTMLElement, vertical = false): number {
  return vertical ? el.offsetHeight : el.offsetWidth
}

/**
 * The pointer's distance from the min end of `el` (its left edge, or its
 * bottom edge when `vertical`) in layout pixels (offsetWidth / offsetHeight
 * space), so the geometry holds under an ancestor's CSS scale (the canvas).
 * `null` while `el` has no length.
 */
export function layoutPos(
  { clientX, clientY }: { clientX: number; clientY: number },
  el: HTMLElement,
  vertical = false,
): number | null {
  const rect = el.getBoundingClientRect()
  const length = axisLength(el, vertical)
  const visual = vertical ? rect.height : rect.width
  if (length <= 0 || visual <= 0) return null
  return (vertical ? rect.bottom - clientY : clientX - rect.left) * (length / visual)
}

/** `flag`, turning on only after it has held for `delay` ms (off at once). */
export function useDelayedFlag(flag: boolean, delay: number) {
  const [delayed, setDelayed] = useState(false)
  useEffect(() => {
    if (!flag) {
      setDelayed(false)
      return
    }
    const id = setTimeout(() => setDelayed(true), delay)
    return () => clearTimeout(id)
  }, [flag, delay])
  return delayed
}

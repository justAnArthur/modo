// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/slider.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef } from 'react'
import { type SizeVariant, useSizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { ComfortableSlider } from './comfortable'
import { CompactSlider, type SliderEngineProps } from './compact'
import type { SliderValue, ValuePosition } from './geometry'

// Only the compact engine implements these, so any of them selects it.
const COMPACT_ONLY = [
  'steps',
  'showSteps',
  'showValue',
  'valuePosition',
  'trackClassName',
  'trackStyle',
  'fillClassName',
  'fillStyle',
  'hideFill',
  'thumbColor',
  'thumbBorderColor',
] as const satisfies readonly (keyof SliderEngineProps)[]

interface SliderProps extends Omit<SliderEngineProps, 'value' | 'onValueChange'> {
  /** Step on the size ladder (see Sizes). Default renders the pip/scrubber design; compact renders the dense design. Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: SizeVariant
  /** Default-step layout. "pips" shows discrete dot indicators; "scrubber" drags anywhere in the row for a continuous value. Ignored when the compact design renders. Defaults to `"pips"`. */
  variant?: 'pips' | 'scrubber'
  /** Current value (controlled). Pass an array to enable range mode with two thumbs. Omit it to let the slider keep its own state, seeded from `defaultValue`. */
  value?: SliderValue
  /** Initial value when uncontrolled. An array starts the slider in range mode. Defaults to the lowest of `steps`, else `min`, else `0`. */
  defaultValue?: SliderValue
  /** Called when the value changes via drag, click, or keyboard. */
  onValueChange?: (value: SliderValue) => void
  /** Minimum value. Defaults to `0`. */
  min?: number
  /** Maximum value. Defaults to `100`. */
  max?: number
  /** Step increment. Thumb snaps to the nearest step during drag. Defaults to `1`. */
  step?: number
  /** Discrete list of allowed values, e.g. 0.1, 0.5, 0.7, 1.1, 1.3. The thumb snaps only to these values and arrow keys walk the list; min/max derive from the list's extremes and step is ignored. */
  steps?: number[]
  /** Render dot indicators at each step position on the track. Defaults to `false`. */
  showSteps?: boolean
  /** Whether to display the current value label. Defaults to `true`. */
  showValue?: boolean
  /** Position of the value label. "tooltip" shows above the thumb during interaction. Defaults to `"left"`. */
  valuePosition?: ValuePosition
  /** Custom formatter for the value label. Defaults to `String`. */
  formatValue?: (v: number) => string
  /** Accessible label for the slider, also shown as prefix in the value display. */
  label?: string
  /** Disables all interaction. Defaults to `false`. */
  disabled?: boolean
  /** Submits the value under this name in a form. */
  name?: string
}

/**
 * One slider, two ladder steps: the default step's pip/scrubber design, and
 * the compact step's dense design with track fill, range mode, and value
 * display.
 *
 * Compact-only props (an array value, steps, showSteps, showValue,
 * valuePosition, track styling) always render the compact design so no
 * capability is lost. Either design snaps to the step grid while dragging,
 * previews the value you are about to pick as a filled bar plus a tooltip,
 * and carries an invisible Base UI slider underneath for the ARIA roles,
 * arrow-key navigation and form submission (`name`). In the dense design the
 * value label is click-to-edit.
 *
 * Works controlled (`value` + `onValueChange`) or uncontrolled
 * (`defaultValue`, with `onValueChange` reporting each change). Track
 * styling props come from the compact engine: `trackClassName`,
 * `trackStyle`, `fillClassName`, `fillStyle`, `hideFill`, `thumbColor` and
 * `thumbBorderColor` — each one also forces the dense design.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/slider.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Slider = forwardRef<HTMLDivElement, SliderProps>(
  ({ size, variant = 'pips', value: valueProp, defaultValue, onValueChange, ...rest }, ref) => {
    const [value, setValue] = useControllableState<SliderValue>(
      valueProp,
      defaultValue ?? (rest.steps && rest.steps.length > 0 ? Math.min(...rest.steps) : (rest.min ?? 0)),
      onValueChange,
    )
    const resolved = useSizeVariant(size)

    if (resolved === 'compact' || Array.isArray(value) || COMPACT_ONLY.some(key => rest[key] !== undefined)) {
      return <CompactSlider ref={ref} {...rest} value={value} onValueChange={setValue} />
    }

    const {
      steps,
      showSteps,
      showValue,
      valuePosition,
      trackClassName,
      trackStyle,
      fillClassName,
      fillStyle,
      hideFill,
      thumbColor,
      thumbBorderColor,
      ...comfortable
    } = rest

    return (
      <ComfortableSlider
        ref={ref}
        {...comfortable}
        value={value as number}
        onValueChange={setValue}
        variant={variant}
      />
    )
  },
)

Slider.displayName = 'Slider'

export type { SliderProps, SliderValue, ValuePosition }
export { Slider }

export default Slider

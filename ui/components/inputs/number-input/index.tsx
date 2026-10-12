/*
 * Local addition (not part of Fluid Functionalism): a number field on Base
 * UI's NumberField, drawn on the shared field box (`useFieldBox` in
 * `lib/field-classes.ts`) like Input, with its steppers as field actions
 * (`FIELD_ACTION_BOX` / `FIELD_ACTION_END` in `lib/field-variants.ts`).
 * `inputProps` reaches the `<input>` (last, so `aria-*`, `autoFocus`, handlers and `id`
 * win), and `onValueChange` hears Base UI's change details as a second argument.
 */

import { NumberField, type NumberFieldRootChangeEventDetails } from '@base-ui/react/number-field'
import { forwardRef, type InputHTMLAttributes, type ReactNode, useRef } from 'react'
import {
  FIELD_ACTION_BOX,
  FIELD_ACTION_END,
  FIELD_ACTION_RADIUS,
  type FieldVariant,
  fieldActionClasses,
  focusControlOnPress,
  useFieldBox,
} from '../../../lib/field-classes'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import type { SizeVariant } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { InputAdornment } from '../input'

interface NumberInputProps {
  /** Controlled value; `null` while the field is empty. Pair with `onValueChange`. */
  value?: number | null
  /** Initial value when uncontrolled. Empty when unset. */
  defaultValue?: number
  /** Called with the new value as it changes (typing, steppers, arrow keys, scrubbing); `null` when cleared. The second argument is Base UI's change details: `reason` names the cause (`"input-change"`, `"keyboard"`, `"increment-press"`, `"scrub"`, …) and `event` the DOM event. */
  onValueChange?: (value: number | null, details: NumberFieldRootChangeEventDetails) => void
  /** Called once a change is done: on blur after typing, on release after a stepper press or a scrub. */
  onValueCommitted?: (value: number | null) => void
  /** Lowest value the steppers, arrow keys and blur clamp to. */
  min?: number
  /** Highest value the steppers, arrow keys and blur clamp to. */
  max?: number
  /** Amount a stepper press or an arrow key adds. Defaults to `1`. */
  step?: number
  /** Amount with Alt held. Defaults to `0.1`. */
  smallStep?: number
  /** Amount with Shift held. Defaults to `10`. */
  largeStep?: number
  /** How the value is shown and read back: `Intl.NumberFormat` options, e.g. `{ style: 'currency', currency: 'EUR' }` or `{ style: 'percent' }`. */
  format?: Intl.NumberFormatOptions
  /** Locale for formatting and parsing (`"sk-SK"` writes `1 234,5`). Defaults to the browser's. */
  locale?: Intl.LocalesArgument
  /** Placeholder text while empty. */
  placeholder?: string
  /** Shows the minus and plus buttons. Defaults to `true`. */
  stepper?: boolean
  /** Turns `startAdornment` into a scrub handle: drag it sideways to change the value. Defaults to `false`. */
  scrub?: boolean
  /** Lets the mouse wheel change the value while the field is focused and hovered. Defaults to `false`. */
  wheel?: boolean
  /** Content before the number: a label such as `"W"` (a scrub handle with `scrub`), a currency sign, an icon. */
  startAdornment?: ReactNode
  /** Content after the number, before the steppers: a unit such as `"kg"`. */
  endAdornment?: ReactNode
  /** Accessible name of the minus button. Defaults to `"Decrease"`. */
  decrementLabel?: string
  /** Accessible name of the plus button. Defaults to `"Increase"`. */
  incrementLabel?: string
  /** Names the value when the form is submitted. */
  name?: string
  /** Id of the input, for a `Label`'s `htmlFor`. Inside a Field it is wired for you. */
  id?: string
  /** Marks the value required. Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** Framed at rest, or invisible until hovered or focused. Defaults to `"borderless"`. */
  variant?: FieldVariant
  /** Marks the value invalid: the field turns destructive and sets `aria-invalid`. Defaults to `false`. */
  invalid?: boolean
  /** Disables the field and its steppers. Defaults to `false`. */
  disabled?: boolean
  /** Shows the value without letting it change; the steppers hide. Defaults to `false`. */
  readOnly?: boolean
  /** Pins the field to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the ringed box. */
  className?: string
  /** Props for the `<input>` itself, applied last so they win: `aria-label`, `aria-describedby`, `autoFocus`, `onKeyDown`, `id`, `autoComplete`, `inputMode`. Use the root `name`; a `name` here posts the formatted text. `disabled`, `required`, `readOnly` and `type` stay with the root props and the surrounding Field; a `className` joins the input's own. */
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size'>
}

/**
 * Number field with steppers, formatting and an optional scrub handle.
 *
 * It sits on the same ground as Input: bare at rest (or framed with
 * `variant="bordered"`), a muted wash on hover, the card on focus, a
 * destructive ring when `invalid`. Minus and plus sit inside the ring at the
 * end; holding one repeats, the arrow keys step (Shift for `largeStep`, Alt
 * for `smallStep`), and both stop at `min` / `max`. `format` takes
 * `Intl.NumberFormat` options and `locale` the locale, so a value reads
 * `€1,234.50` or `1 234,5 %` and typing in that form parses back. With
 * `scrub`, the start adornment becomes a handle: drag it sideways to change
 * the value, as in a design tool. The value is a number, or `null` while
 * empty: uncontrolled with `defaultValue`, controlled with `value` +
 * `onValueChange`. Behavior comes from Base UI's NumberField; inside a Field
 * it is labelled and takes the field's state.
 *
 * @example {@include ./examples.mdx}
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      onValueCommitted,
      format,
      locale,
      placeholder,
      stepper = true,
      scrub = false,
      wheel = false,
      startAdornment,
      endAdornment,
      decrementLabel = 'Decrease',
      incrementLabel = 'Increase',
      id,
      variant = 'borderless',
      invalid,
      disabled,
      readOnly,
      required,
      size,
      className,
      inputProps,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const box = useFieldBox({ variant, invalid, disabled, readOnly, required, size })
    const shape = useShape()
    const Minus = useIcon('minus')
    const Plus = useIcon('plus')
    const Arrows = useIcon('chevrons-up-down')
    const stepClasses = cn(fieldActionClasses, FIELD_ACTION_BOX[box.size.variant], FIELD_ACTION_RADIUS[shape.variant])

    const start = startAdornment != null && (
      <InputAdornment size={size}>
        {scrub ? (
          <NumberField.ScrubArea className="cursor-ew-resize select-none">
            {startAdornment}
            {/* The pointer is locked while scrubbing; this stands in for it. */}
            <NumberField.ScrubAreaCursor className="text-foreground">
              <Arrows size={box.size.icon} strokeWidth={2} className="rotate-90" />
            </NumberField.ScrubAreaCursor>
          </NumberField.ScrubArea>
        ) : (
          startAdornment
        )}
      </InputAdornment>
    )

    return (
      <NumberField.Root
        id={id}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next, details) => onValueChange?.(next, details)}
        onValueCommitted={next => onValueCommitted?.(next)}
        format={format}
        locale={locale}
        allowWheelScrub={wheel}
        disabled={box.disabled}
        readOnly={box.readOnly}
        required={box.required}
        {...props}
      >
        <NumberField.Group
          onMouseDown={focusControlOnPress(inputRef)}
          {...box.props}
          className={cn(box.props.className, 'flex items-center', box.size.gap, box.size.control, className)}
        >
          {start}
          <NumberField.Input
            ref={node => {
              inputRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            placeholder={placeholder}
            aria-invalid={box.invalid || undefined}
            {...inputProps}
            className={cn(
              'w-full min-w-0 rounded-none bg-transparent text-foreground tabular-nums placeholder:text-muted-foreground outline-none font-[inherit] weight-normal',
              box.size.text,
              inputProps?.className,
            )}
          />
          <InputAdornment size={size}>{endAdornment}</InputAdornment>
          {stepper && !box.readOnly && (
            // The steppers sit side by side, the last 4px inside the ring.
            <span className="flex shrink-0 items-center">
              <NumberField.Decrement aria-label={decrementLabel} className={stepClasses}>
                <Minus size={box.size.icon} strokeWidth={1.5} />
              </NumberField.Decrement>
              <NumberField.Increment
                aria-label={incrementLabel}
                className={cn(stepClasses, FIELD_ACTION_END[box.size.variant])}
              >
                <Plus size={box.size.icon} strokeWidth={1.5} />
              </NumberField.Increment>
            </span>
          )}
        </NumberField.Group>
      </NumberField.Root>
    )
  },
)

NumberInput.displayName = 'NumberInput'

export type { NumberInputProps }
export { NumberInput }
export default NumberInput

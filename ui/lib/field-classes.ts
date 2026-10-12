/*
 * Local addition (not part of Fluid Functionalism): the field ladder FF
 * repeats across InputGroup, Combobox and Sidebar's input, as one recipe,
 * and `useFieldBox`, the box every text field (Input, Textarea, Combobox,
 * the date and time pickers) builds on.
 */

import { createContext, type MouseEvent, type RefObject, useContext } from 'react'
import { FIELD_PX, type FieldVariant, fieldVariants } from './field-variants'
import { useShape } from './shape-context'
import { type SizeVariant, useSize } from './size-context'
import { cn } from './utils'

// The pure tables live in `field-variants.ts` (callable from a server
// component); every name stays importable from here.
export {
  FIELD_ACTION,
  FIELD_ACTION_BOX,
  FIELD_ACTION_END,
  FIELD_ACTION_RADIUS,
  FIELD_ADORNMENT_ICON,
  FIELD_PX,
  FIELD_TEXT_INSET,
  type FieldVariant,
  fieldActionClasses,
  fieldAdornmentClasses,
  fieldIconClasses,
  fieldVariants,
} from './field-variants'

/**
 * What every text field's box takes. Items re-declare these members in their
 * own props interface (the docs read only same-file members), with this prose.
 */
export interface FieldBoxOptions {
  /** Framed at rest, or invisible until hovered or focused. */
  variant: FieldVariant
  /** Turns the field destructive. */
  invalid?: boolean
  /** Frames and dims the field. */
  disabled?: boolean
  /** Lit from outside, e.g. a group's fluid hover. */
  active?: boolean
  /** Shows the value without letting it change: the ring answers, the fill never lifts. */
  readOnly?: boolean
  /** Marks the control required (`required` on the control). */
  required?: boolean
  /** Pins the field to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

/** What a field wrapper hands to the control it holds. */
export interface FieldState {
  /** Lit by a group's fluid hover. */
  active: boolean
  invalid: boolean
  disabled: boolean
  readOnly?: boolean
  required?: boolean
}

/**
 * State a field wrapper (Field, InputGroup.Field) hands to whatever control
 * it holds: lit by the group's fluid hover, its error, its disabled,
 * read-only and required state. `useFieldBox` reads it, so any field built on
 * the box joins in; the control's own props win.
 */
export const FieldStateContext = createContext<FieldState | null>(null)

/** The surrounding field's state, or `null` outside one. */
export function useFieldState() {
  return useContext(FieldStateContext)
}

/**
 * The box around a text field's control: the field ladder in the chosen
 * variant, the state attributes it reads, the shape's input radius and the
 * horizontal inset. Spread `props` on the element around the control (or the
 * control itself, for a button field); the height stays with the item, from
 * the returned `size`. Inside a Field or InputGroup.Field, unset `active` / `invalid` /
 * `disabled` / `readOnly` / `required` come from the field (`FieldStateContext`).
 */
export function useFieldBox({ variant, invalid, disabled, active, readOnly, required, size }: FieldBoxOptions) {
  const field = useContext(FieldStateContext)
  const shape = useShape()
  const sizeClasses = useSize(size)
  const isInvalid = invalid ?? field?.invalid ?? false
  const isDisabled = disabled ?? field?.disabled ?? false
  const isReadOnly = readOnly ?? field?.readOnly ?? false

  return {
    size: sizeClasses,
    /** Resolved with the field's state, for the control's `aria-invalid` / `disabled` / `readOnly` / `required`. */
    invalid: isInvalid,
    disabled: isDisabled,
    readOnly: isReadOnly,
    required: required ?? field?.required,
    props: {
      'data-active': (active ?? field?.active) || undefined,
      'data-invalid': isInvalid || undefined,
      'data-disabled': isDisabled || undefined,
      'data-readonly': isReadOnly || undefined,
      className: cn(fieldVariants({ variant }), shape.input, FIELD_PX[sizeClasses.variant]),
    },
  }
}

/**
 * A press anywhere in the box (icon, padding) focuses the control, without
 * disturbing the control's own caret placement. A press that only reaches the
 * box through the React tree (a popup portalled out of an adornment, e.g. a
 * searchable Dropdown) is left alone, so that popup can take focus itself.
 */
export function focusControlOnPress(control: RefObject<HTMLElement | null>) {
  return (e: MouseEvent) => {
    if (e.target === control.current) return
    if (!e.currentTarget.contains(e.target as Node)) return
    e.preventDefault()
    control.current?.focus()
  }
}

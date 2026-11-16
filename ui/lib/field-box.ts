/*
 * Local addition (not part of Fluid Functionalism): `useFieldBox`, the box
 * every text field (Input, Textarea, Combobox, the date and time pickers)
 * builds on the field ladder of `field-classes.ts`.
 */

'use client'

import { createContext, type MouseEvent, type RefObject, useContext } from 'react'
import { type FieldVariant, fieldVariants } from './field-classes'
import { useShape } from './shape-context'
import { useSize } from './size-context'
import type { SizeVariant } from './size-scale'
import { cn } from './utils'

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
  /** Marks the value required. */
  required?: boolean
  /** Pins the field to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

/**
 * State a field wrapper (Field, InputGroup.Field) hands to whatever control
 * it holds: lit by a group's fluid hover, its error, disabled, read-only and
 * required, and the id of its label for a control Base UI doesn't label (a
 * picker's button). `useFieldState` reads it, so any control that resolves
 * its state through it joins in; the control's own props win.
 */
export interface FieldState {
  active: boolean
  invalid: boolean
  disabled: boolean
  readOnly: boolean
  required: boolean
  labelId?: string
}

export const FieldStateContext = createContext<FieldState | null>(null)

type OwnFieldState = Partial<Pick<FieldState, 'active' | 'invalid' | 'disabled' | 'readOnly' | 'required'>>

/** A control's own state props, each unset one taken from the enclosing field (else off). */
export function useFieldState(own: OwnFieldState): FieldState {
  const field = useContext(FieldStateContext)
  return {
    active: own.active ?? field?.active ?? false,
    invalid: own.invalid ?? field?.invalid ?? false,
    disabled: own.disabled ?? field?.disabled ?? false,
    readOnly: own.readOnly ?? field?.readOnly ?? false,
    required: own.required ?? field?.required ?? false,
    labelId: field?.labelId,
  }
}

// Literal table: one notch tighter than the ladder's `px`, since the ring is
// invisible at rest and the roomier inset would read as a gap.
const FIELD_PX: Record<SizeVariant, string> = {
  default: 'px-2.5',
  compact: 'px-2',
}

/**
 * The box around a text field's control: the field ladder in the chosen
 * variant, the state attributes it reads, the shape's input radius and the
 * horizontal inset. Spread `props` on the element around the control (or the
 * control itself, for a button field); the height stays with the item, from
 * the returned `size`. Inside a Field or InputGroup.Field, unset state props
 * come from the field (`useFieldState`); the resolved ones come back for the
 * control's `aria-invalid` / `disabled` / `readOnly` / `required`.
 */
export function useFieldBox({ variant, size, ...own }: FieldBoxOptions) {
  const state = useFieldState(own)
  const shape = useShape()
  const sizeClasses = useSize(size)

  return {
    ...state,
    size: sizeClasses,
    props: {
      'data-active': state.active || undefined,
      'data-invalid': state.invalid || undefined,
      'data-disabled': state.disabled || undefined,
      'data-readonly': state.readOnly || undefined,
      className: cn(fieldVariants({ variant }), shape.input, FIELD_PX[sizeClasses.variant]),
    },
  }
}

/**
 * A press anywhere in the box (icon, padding) focuses the control, without
 * disturbing the control's own caret placement. A press that reaches the box
 * only through the React tree (a popup portalled out of an adornment) is left
 * alone, so that popup can take focus itself.
 */
export function focusControlOnPress(control: RefObject<HTMLElement | null>) {
  return (e: MouseEvent) => {
    if (e.target === control.current) return
    if (!e.currentTarget.contains(e.target as Node)) return
    e.preventDefault()
    control.current?.focus()
  }
}

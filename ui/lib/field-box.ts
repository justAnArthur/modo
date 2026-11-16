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
  /** Pins the field to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

/**
 * State a field wrapper (InputGroup.Field) hands to whatever control it
 * holds: lit by the group's fluid hover, its error, its disabled state.
 * `useFieldBox` reads it, so any field built on the box joins in; the
 * control's own props win.
 */
export const FieldStateContext = createContext<{ active: boolean; invalid: boolean; disabled: boolean } | null>(null)

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
 * the returned `size`. Inside InputGroup.Field, unset `active` / `invalid` /
 * `disabled` come from the field (`FieldStateContext`).
 */
export function useFieldBox({ variant, invalid, disabled, active, size }: FieldBoxOptions) {
  const field = useContext(FieldStateContext)
  const shape = useShape()
  const sizeClasses = useSize(size)
  const isInvalid = invalid ?? field?.invalid ?? false
  const isDisabled = disabled ?? field?.disabled ?? false

  return {
    size: sizeClasses,
    /** Resolved with the field's state, for the control's `aria-invalid` / `disabled`. */
    invalid: isInvalid,
    disabled: isDisabled,
    props: {
      'data-active': (active ?? field?.active) || undefined,
      'data-invalid': isInvalid || undefined,
      'data-disabled': isDisabled || undefined,
      className: cn(fieldVariants({ variant }), shape.input, FIELD_PX[sizeClasses.variant]),
    },
  }
}

/** A press anywhere in the box (icon, padding) focuses the control, without disturbing the control's own caret placement. */
export function focusControlOnPress(control: RefObject<HTMLElement | null>) {
  return (e: MouseEvent) => {
    if (e.target === control.current) return
    e.preventDefault()
    control.current?.focus()
  }
}

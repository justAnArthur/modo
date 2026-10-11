/*
 * Local addition (not part of Fluid Functionalism): the field ladder FF
 * repeats across InputGroup, Combobox and Sidebar's input, as one recipe,
 * and `useFieldBox`, the box every text field (Input, Textarea, Combobox,
 * the date and time pickers) builds on.
 */

import { cva } from 'class-variance-authority'
import type { MouseEvent, RefObject } from 'react'
import { useShape } from './shape-context'
import { type SizeVariant, useSize } from './size-context'
import { cn } from './utils'

/**
 * The ringed box of a text field. It steps from rest to a muted fill when lit
 * (hovered, or `data-active` from a group's fluid hover) to the card fill
 * when focused. `data-invalid` keeps a destructive ring in every state and
 * tints the lit fill; `data-disabled` frames and dims it. Put it on the
 * element around the control and stamp the data attributes; Base UI parts
 * stamp `data-invalid` / `data-disabled` themselves.
 */
export const fieldVariants = cva(
  [
    'group/field ring-1 cursor-text transition-[background-color,box-shadow,opacity] duration-fast',
    'hover:bg-muted/50 hover:ring-border data-[active]:bg-muted/50 data-[active]:ring-border',
    // `!`: Uno doesn't emit the state variants in a fixed order, so the
    // states that must win (focus fill, invalid ring) win on importance.
    'focus-within:!bg-card focus-within:ring-border',
    'data-[invalid]:!ring-destructive/50 data-[invalid]:hover:bg-destructive-light/60 data-[invalid]:data-[active]:bg-destructive-light/60',
    'data-[disabled]:ring-border data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        // Invisible until lit or focused.
        borderless: 'bg-transparent ring-transparent',
        // Framed at rest.
        bordered: 'bg-transparent ring-border',
      },
    },
    defaultVariants: {
      variant: 'borderless',
    },
  },
)

/** A leading icon inside a `fieldVariants` box: muted at rest, it darkens and thickens with the field. Pass `strokeWidth={1.5}`. */
export const fieldIconClasses =
  'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-fast group-hover/field:text-foreground group-hover/field:stroke-[2] group-data-[active]/field:text-foreground group-data-[active]/field:stroke-[2] group-focus-within/field:text-foreground group-focus-within/field:stroke-[2]'

/** Framed at rest (`bordered`), or invisible until hovered or focused (`borderless`). */
export type FieldVariant = 'bordered' | 'borderless'

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
 * the returned `size`.
 */
export function useFieldBox({ variant, invalid, disabled, active, size }: FieldBoxOptions) {
  const shape = useShape()
  const sizeClasses = useSize(size)

  return {
    size: sizeClasses,
    props: {
      'data-active': active || undefined,
      'data-invalid': invalid || undefined,
      'data-disabled': disabled || undefined,
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

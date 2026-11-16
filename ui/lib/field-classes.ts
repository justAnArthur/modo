/*
 * Local addition (not part of Fluid Functionalism): the field ladder FF
 * repeats across InputGroup, Combobox and Sidebar's input, as one recipe.
 * Plain class tables, callable from a React Server Component; the hook that
 * builds a field's box on them is `field-box.ts`.
 */

import { cva } from 'class-variance-authority'
import type { SizeVariant } from './size-scale'

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

/**
 * Framed at rest (`bordered`), or invisible until hovered or focused
 * (`borderless`). Free text (Input, Textarea) defaults to `borderless`; a
 * field that opens a panel (the pickers, Combobox, Select) defaults to
 * `bordered`, so it reads as a control before it is touched.
 */
export type FieldVariant = 'bordered' | 'borderless'

/** The field's text inset as a left padding, for a label or message that lines up with the text inside the box. */
export const fieldTextInset: Record<SizeVariant, string> = {
  default: 'pl-2.5',
  compact: 'pl-2',
}

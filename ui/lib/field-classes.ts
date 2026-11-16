/*
 * Local addition (not part of Fluid Functionalism): the field ladder FF
 * repeats across InputGroup, Combobox and Sidebar's input, as one recipe.
 * Plain class tables, callable from a React Server Component; the hook that
 * builds a field's box on them is `field-box.ts`.
 */

import { cva } from 'class-variance-authority'
import type { ShapeVariant } from './shape-classes'
import type { SizeVariant } from './size-scale'

/**
 * The ringed box of a text field. It steps from rest to a muted fill when lit
 * (hovered, or `data-active` from a group's fluid hover) to the card fill
 * when focused. `data-invalid` keeps a destructive ring in every state and
 * tints the lit fill; `data-disabled` frames and dims it; `data-readonly`
 * shows the ring when lit or focused but never lifts the fill. Put it on the
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
    // The attribute selector outranks the focus fill's at equal importance.
    'data-[readonly]:cursor-default data-[readonly]:hover:!bg-transparent data-[readonly]:data-[active]:!bg-transparent data-[readonly]:focus-within:!bg-transparent',
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

/** Content beside a field's text (an adornment): muted, and lit with the field like a leading icon. */
export const fieldAdornmentClasses =
  'flex shrink-0 items-center whitespace-nowrap text-muted-foreground transition-[color] duration-fast group-hover/field:text-foreground group-data-[active]/field:text-foreground group-focus-within/field:text-foreground'

/** Glyph size for an adornment's icons, per ladder step. */
export const FIELD_ADORNMENT_ICON: Record<SizeVariant, string> = {
  default: '[&_svg]:size-4',
  compact: '[&_svg]:size-3.5',
}

/**
 * A small icon button inside a field box: 4px inside the ring on every side
 * (28px in a 36px field, 20px in a 28px one); the negative margin takes back
 * the box's inset so the gap to the edge matches the gap above and below.
 */
export const FIELD_ACTION: Record<SizeVariant, string> = {
  default: 'size-7 -mx-1.5 [&_svg]:size-4',
  compact: 'size-5 -mx-1 [&_svg]:size-3.5',
}

/** A field action's corners: concentric with the box's 8px (4px inside it), or round in pill mode. */
export const FIELD_ACTION_RADIUS: Record<ShapeVariant, string> = {
  rounded: 'rounded-sm',
  pill: 'rounded-full',
}

/** What every field action shares, beside its `FIELD_ACTION` size and radius. */
export const fieldActionClasses =
  'relative inline-flex shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-[color,background-color,opacity] duration-fast hover:bg-hover hover:text-foreground active:bg-active focus-visible:ring-1 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-50'

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

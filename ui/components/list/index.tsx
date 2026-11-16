/*
 * Local addition (not part of Fluid Functionalism): a settings list, so
 * settings panels and popovers read alike: a caption per section and rows on
 * one rhythm, the label on the left in body text and its control on the
 * right, no frames around either.
 */

'use client'

import { type ForwardRefExoticComponent, forwardRef, type ReactNode, type RefAttributes } from 'react'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { SizeScope } from '../../primitives/sizes'

interface ListSectionProps {
  /** The caption over the rows, and the section's accessible name. */
  title: string
  /** A value on the caption's right, such as the current setting or a share. */
  aside?: ReactNode
  /** The section's rows. */
  children: ReactNode
  /** Classes for the section. */
  className?: string
}

function ListSection({ title, aside, children, className }: ListSectionProps) {
  const size = useSize()

  return (
    <section aria-label={title} className={cn('flex flex-col gap-1', className)}>
      <div
        className={cn(
          'flex items-baseline justify-between gap-2 pl-2 pr-3 text-muted-foreground',
          size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
        )}
      >
        <span>{title}</span>
        {aside && <span className="min-w-0 truncate text-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

interface ListRowProps {
  /** What the row sets, on its left. */
  label: ReactNode
  /** A muted line under the label: what the setting does. */
  description?: ReactNode
  /** The control or controls on the right. Their content ends on the caption's right edge when they carry their own inset (a borderless Select, a ghost Button); a bare Switch takes `LIST_SWITCH`. */
  children?: ReactNode
  /** Classes for the row. */
  className?: string
}

function ListRow({ label, description, children, className }: ListRowProps) {
  const size = useSize()

  // The label column takes its full width first, so the control is what
  // gives way (a Select's value truncates) and the label is never cut.
  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 pl-2', size.text, className)}>
      <span className="text-foreground">{label}</span>
      <div className={cn('flex min-w-0 items-center justify-end justify-self-end gap-1', size.control)}>{children}</div>
      {description && (
        <span
          className={cn(
            'col-span-2 pb-2 pr-3 text-muted-foreground',
            size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
          )}
        >
          {description}
        </span>
      )}
    </div>
  )
}

interface ListProps {
  /** `List.Section`s, or `List.Row`s on their own. */
  children: ReactNode
  /** Pins the rows to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root. */
  className?: string
}

/**
 * A list of settings: sections under a caption, each row a label on the left
 * and its control on the right.
 *
 * Rows stand on one control height from the size ladder, so a Switch, a
 * borderless Select and a ghost Button line up row after row, and the
 * controls end on the same edge as the section captions. The label always
 * shows in full: when a row runs out of room, the control gives way. Nothing
 * is framed, so the list sits in a card, a popover or a page as it is; in a
 * Popover, give `Popover.Content` the `LIST_POPOVER` classes.
 *
 * Statics:
 * - `List.Section` — a caption over its rows: `title`, `aside`.
 * - `List.Row` — one setting: `label`, `description`, its control as children.
 *
 * @example {@include ./examples.mdx}
 */
const List = forwardRef<HTMLDivElement, ListProps>(({ children, size: sizeProp, className }, ref) => {
  const list = (
    <div ref={ref} className={cn('flex flex-col gap-3', className)}>
      {children}
    </div>
  )

  return <SizeScope size={sizeProp}>{list}</SizeScope>
}) as ForwardRefExoticComponent<ListProps & RefAttributes<HTMLDivElement>> & {
  Section: typeof ListSection
  Row: typeof ListRow
}

List.Section = ListSection
List.Row = ListRow

/** Frame classes for a `Popover.Content` that holds a List. */
const LIST_POPOVER = 'w-80 gap-3 p-2 pt-3'

/** Classes for a bare Switch (no `label`, named by `aria-label`) in a row: its track ends on the caption's edge. */
const LIST_SWITCH = 'mr-3'

export type { ListProps, ListRowProps, ListSectionProps }
export { LIST_POPOVER, LIST_SWITCH, List, ListRow, ListSection }

export default List

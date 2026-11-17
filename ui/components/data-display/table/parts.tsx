/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/table.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef, type HTMLAttributes, type ReactNode, type TdHTMLAttributes, useContext, useRef } from 'react'
import { mergeRefs } from '../../../lib/merge-refs'
import { IndexedRows, useRowPosition } from '../../../lib/row-index'
import { useSize } from '../../../lib/size-context'
import { useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { TableSectionContext, useCellPadding, useTable } from './context'

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const stacked = useTable()?.stacked
    return (
      <TableSectionContext.Provider value="header">
        <thead ref={ref} className={cn(stacked && 'hidden @lg:table-header-group', className)} {...props} />
      </TableSectionContext.Provider>
    )
  },
)

TableHeader.displayName = 'TableHeader'

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ children, className, ...props }, ref) => {
    const stacked = useTable()?.stacked
    return (
      <tbody ref={ref} className={cn(stacked && 'block @lg:table-row-group', className)} {...props}>
        <IndexedRows>{children}</IndexedRows>
      </tbody>
    )
  },
)

TableBody.displayName = 'TableBody'

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const stacked = useTable()?.stacked
    return (
      <TableSectionContext.Provider value="footer">
        <tfoot ref={ref} className={cn(stacked && 'block @lg:table-footer-group', className)} {...props} />
      </TableSectionContext.Provider>
    )
  },
)

TableFooter.displayName = 'TableFooter'

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => {
    const compact = useSize().variant === 'compact'
    const stacked = useTable()?.stacked
    return (
      <caption
        ref={ref}
        className={cn(
          'caption-bottom text-left text-muted-foreground',
          compact ? 'px-2.5 pt-2 text-caption-compact' : 'px-3 pt-3 text-caption',
          // A stacked table is a flex column: the caption keeps its place below.
          stacked && 'order-last block @lg:table-caption',
          className,
        )}
        {...props}
      />
    )
  },
)

TableCaption.displayName = 'TableCaption'

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** The row's place in the hover order. Defaults to its position in `Table.Body`; header and footer rows have none. */
  index?: number
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(({ index: indexProp, className, ...props }, ref) => {
  const internalRef = useRef<HTMLTableRowElement>(null)
  const ctx = useTable()
  const section = useContext(TableSectionContext)
  const position = useRowPosition()
  const index = indexProp ?? position

  useRegisterFluidHoverItem(ctx?.registerItem, index, internalRef)

  const isBodyRow = index !== undefined
  const activeIdx = ctx?.activeIndex ?? null
  // The header's border runs along row 0, so it melts into the lit band; a footer row keeps its own.
  const hideBorder =
    activeIdx !== null &&
    ((isBodyRow && (index === activeIdx || index === activeIdx - 1)) || (section === 'header' && activeIdx === 0))

  return (
    <tr
      ref={mergeRefs(internalRef, ref)}
      data-fluid-hover-index={index}
      className={cn(
        'group/row relative z-10 border-b transition-[border-color] duration-fast',
        hideBorder ? 'border-transparent' : 'border-accent/40',
        isBodyRow && activeIdx === index && 'is-active',
        section === 'body' ? 'weight-normal' : 'weight-semibold',
        ctx?.stacked && 'grid grid-cols-2 py-1 @lg:table-row @lg:py-0',
        className,
      )}
      {...props}
    />
  )
})

TableRow.displayName = 'TableRow'

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** The column's name, shown above the value while a `stacked` table lays its rows out as cards. */
  label?: ReactNode
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({ label, className, children, ...props }, ref) => {
  const compact = useSize().variant === 'compact'
  const stacked = useTable()?.stacked
  const footer = useContext(TableSectionContext) === 'footer'
  return (
    <td
      ref={ref}
      className={cn(
        'transition-colors duration-fast',
        footer ? 'text-foreground' : 'text-muted-foreground group-[.is-active]/row:text-foreground',
        useCellPadding(),
        // Stacked, the label is the muted line and the value leads.
        stacked && !footer && 'text-foreground @lg:text-muted-foreground',
        stacked && 'flex min-w-0 flex-col items-start @lg:table-cell',
        className,
      )}
      {...props}
    >
      {stacked && label != null && (
        <span
          className={cn(
            'text-muted-foreground weight-normal @lg:hidden',
            compact ? 'text-caption-compact' : 'text-caption',
          )}
        >
          {label}
        </span>
      )}
      {children}
    </td>
  )
})

TableCell.displayName = 'TableCell'

interface TableEmptyProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Columns the row spans: the table's column count. */
  colSpan: number
  /** What to say, or a loading indicator. */
  children?: ReactNode
}

const TableEmpty = forwardRef<HTMLTableRowElement, TableEmptyProps>(
  ({ colSpan, className, children, ...props }, ref) => {
    const stacked = useTable()?.stacked
    return (
      <tr ref={ref} className={cn('relative z-10', stacked && 'block @lg:table-row', className)} {...props}>
        <td
          colSpan={colSpan}
          className={cn(
            'h-24 px-3 text-center align-middle text-muted-foreground',
            stacked && 'flex items-center justify-center @lg:table-cell',
          )}
        >
          {children}
        </td>
      </tr>
    )
  },
)

TableEmpty.displayName = 'TableEmpty'

export type { TableCellProps, TableEmptyProps, TableRowProps }
export { TableBody, TableCaption, TableCell, TableEmpty, TableFooter, TableHeader, TableRow }

/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/table.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
import { mergeRefs } from '../../lib/merge-refs'
import { IndexedRows, useRowPosition } from '../../lib/row-index'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { useFluidHover, useRegisterFluidHoverItem } from '../../lib/use-fluid-hover'
import { cn } from '../../lib/utils'
import { SizeScope } from '../../primitives/sizes'

interface TableContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
}

const TableContext = createContext<TableContextValue | null>(null)

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** `Table.Header` and `Table.Body` children. */
  children: ReactNode
  /** Pins the table's rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: SizeVariant
}

type TableComponent = ForwardRefExoticComponent<TableProps & RefAttributes<HTMLTableElement>> & {
  Header: typeof TableHeader
  Body: typeof TableBody
  Row: typeof TableRow
  Head: typeof TableHead
  Cell: typeof TableCell
}

/**
 * Data table with row hover effects and semantic markup.
 *
 * A plain `<table>` whose body rows share one fluid hover highlight: the
 * background glides from row to row under the pointer, the row borders next
 * to the lit row fade out so it reads as one band, and the lit row's cells
 * brighten from muted to foreground. The highlight is square on purpose: rows
 * run edge to edge. Header cells render semibold, body cells regular. `size`
 * pins every row to one step of the size ladder; otherwise the table follows
 * the surrounding SizeProvider.
 *
 * Statics:
 * - `Table.Header` — `<thead>`.
 * - `Table.Body` — `<tbody>`; numbers its rows for the hover highlight.
 * - `Table.Row` — `<tr>`; a row outside `Table.Body` is a header row.
 * - `Table.Head` — `<th>`.
 * - `Table.Cell` — `<td>`.
 *
 * Each part forwards its ref and native attributes.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/table.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Table = forwardRef<HTMLTableElement, TableProps>(({ children, size, className, ...props }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeClasses = useSize(size)
  const hover = useFluidHover(containerRef)
  const { activeIndex, handlers, registerItem } = hover
  const contextValue = useMemo(() => ({ registerItem, activeIndex }), [registerItem, activeIndex])

  return (
    <SizeScope size={size}>
      <TableContext.Provider value={contextValue}>
        <div ref={containerRef} className="relative" {...handlers}>
          <FluidHoverHighlight hover={hover} />
          <table ref={ref} className={cn('w-full border-collapse', sizeClasses.text, className)} {...props}>
            {children}
          </table>
        </div>
      </TableContext.Provider>
    </SizeScope>
  )
}) as TableComponent

Table.displayName = 'Table'

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
  <thead ref={ref} {...props} />
))

TableHeader.displayName = 'TableHeader'

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ children, ...props }, ref) => (
    <tbody ref={ref} {...props}>
      <IndexedRows>{children}</IndexedRows>
    </tbody>
  ),
)

TableBody.displayName = 'TableBody'

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** The row's place in the hover order. Defaults to its position in `Table.Body`; a header row has none. */
  index?: number
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(({ index: indexProp, className, ...props }, ref) => {
  const internalRef = useRef<HTMLTableRowElement>(null)
  const ctx = useContext(TableContext)
  const position = useRowPosition()
  const index = indexProp ?? position

  useRegisterFluidHoverItem(ctx?.registerItem, index, internalRef)

  const isBodyRow = index !== undefined
  const activeIdx = ctx?.activeIndex ?? null
  const hideBorder =
    activeIdx !== null &&
    ((isBodyRow && (index === activeIdx || index === activeIdx - 1)) || (!isBodyRow && activeIdx === 0))

  return (
    <tr
      ref={mergeRefs(internalRef, ref)}
      data-fluid-hover-index={index}
      className={cn(
        'group/row relative z-10 border-b transition-[border-color] duration-fast',
        hideBorder ? 'border-transparent' : 'border-accent/40',
        isBodyRow && activeIdx === index && 'is-active',
        isBodyRow ? 'weight-normal' : 'weight-semibold',
        className,
      )}
      {...props}
    />
  )
})

TableRow.displayName = 'TableRow'

/** py + the line box land a row on the ladder (36px / 28px). */
function useCellPadding() {
  return useSize().variant === 'compact' ? 'px-2.5 py-[5px]' : 'px-3 py-2'
}

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn('text-left text-foreground', useCellPadding(), className)} {...props} />
  ),
)

TableHead.displayName = 'TableHead'

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'text-muted-foreground transition-colors duration-fast group-[.is-active]/row:text-foreground',
        useCellPadding(),
        className,
      )}
      {...props}
    />
  ),
)

TableCell.displayName = 'TableCell'

Object.assign(Table, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
})

export type { TableProps, TableRowProps }
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }

export default Table

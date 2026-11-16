/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/table.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import { nextSort, TableContext, type TableSort } from './context'
import { TableHead } from './head'
import { TableBody, TableCaption, TableCell, TableEmpty, TableFooter, TableHeader, TableRow } from './parts'

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** `Table.Header`, `Table.Body`, `Table.Footer` and `Table.Caption` children. */
  children: ReactNode
  /** Pins the table's rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: SizeVariant
  /** While the table's container is narrower than 32rem, the header hides and each body row becomes a two-column card of its cells, each led by its `label`. Defaults to `false`. */
  stacked?: boolean
  /** The sorted column (a `Table.Head`'s `value`) and its direction, or `null` for unsorted. Controlled — pair it with `onSortChange`. */
  sort?: TableSort | null
  /** The sort on first render when uncontrolled. Defaults to `null`. */
  defaultSort?: TableSort | null
  /** Called with the next sort when a sortable head is pressed: ascending, then descending, then `null`. */
  onSortChange?: (sort: TableSort | null) => void
}

type TableComponent = ForwardRefExoticComponent<TableProps & RefAttributes<HTMLTableElement>> & {
  Header: typeof TableHeader
  Body: typeof TableBody
  Footer: typeof TableFooter
  Row: typeof TableRow
  Head: typeof TableHead
  Cell: typeof TableCell
  Caption: typeof TableCaption
  Empty: typeof TableEmpty
}

/**
 * Data table with row hover effects and semantic markup.
 *
 * A plain `<table>` whose body rows share one fluid hover highlight: the
 * background glides from row to row under the pointer, the row borders next
 * to the lit row fade out so it reads as one band, and the lit row's cells
 * brighten from muted to foreground. The highlight is square on purpose: rows
 * run edge to edge. Header and footer cells render semibold, body cells
 * regular. `size` pins every row to one step of the size ladder; otherwise
 * the table follows the surrounding SizeProvider.
 *
 * A `Table.Head` with a `value` is a sort button: a press sorts by that
 * column ascending, then descending, then not at all, through `sort` /
 * `defaultSort` / `onSortChange`, and its arrow crossfades into the new
 * direction (`aria-sort` follows). The table reports the sort; ordering the
 * rows is yours. `stacked` turns body rows into two-column cards while the
 * table's container is narrow, each cell led by its `label`.
 *
 * Statics:
 * - `Table.Header` — `<thead>`; hidden while stacked.
 * - `Table.Body` — `<tbody>`; numbers its rows for the hover highlight.
 * - `Table.Footer` — `<tfoot>`, for totals: its rows render semibold in the foreground and stay out of the hover.
 * - `Table.Row` — `<tr>`; rows outside `Table.Body` stay out of the hover.
 * - `Table.Head` — `<th>`; `value` makes it a sort button.
 * - `Table.Cell` — `<td>`; `label` leads the value while stacked.
 * - `Table.Caption` — `<caption>`, a muted line below the table.
 * - `Table.Empty` — one row across `colSpan` columns, for an empty or loading state.
 *
 * Each part forwards its ref and native attributes.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/table.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ children, size, stacked = false, sort: sortProp, defaultSort = null, onSortChange, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const sizeClasses = useSize(size)
    const hover = useFluidHover(containerRef)
    const { activeIndex, handlers, registerItem } = hover
    const [sort, setSort] = useControllableState(sortProp, defaultSort, onSortChange)
    const contextValue = useMemo(
      () => ({
        registerItem,
        activeIndex,
        stacked,
        sort,
        toggleSort: (value: string) => setSort(prev => nextSort(prev, value)),
      }),
      [registerItem, activeIndex, stacked, sort, setSort],
    )

    return (
      <SizeScope size={size}>
        <TableContext.Provider value={contextValue}>
          <div ref={containerRef} className={cn('relative', stacked && '@container')} {...handlers}>
            <FluidHoverHighlight hover={hover} />
            <table
              ref={ref}
              className={cn(
                'w-full border-collapse',
                stacked && 'flex flex-col @lg:table',
                sizeClasses.text,
                className,
              )}
              {...props}
            >
              {children}
            </table>
          </div>
        </TableContext.Provider>
      </SizeScope>
    )
  },
) as TableComponent

Table.displayName = 'Table'

Object.assign(Table, {
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Caption: TableCaption,
  Empty: TableEmpty,
})

export type { SortDirection, TableSort } from './context'
export type { TableHeadProps } from './head'
export type { TableCellProps, TableEmptyProps, TableRowProps } from './parts'
export type { TableProps }
export { Table, TableBody, TableCaption, TableCell, TableEmpty, TableFooter, TableHead, TableHeader, TableRow }

export default Table

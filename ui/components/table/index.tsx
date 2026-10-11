// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/table.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/*`, `@/hooks/*` and `@/components/ui/fluid-hover-highlight`
 *   imports rewritten to relative `../../lib/*` paths, except `SizeProvider`
 *   → `../../primitives/sizes`.
 * - Compound API: the parts hang off the root as statics (`Table.Header`,
 *   `Table.Body`, `Table.Row`, `Table.Head`, `Table.Cell`) via
 *   `Object.assign`; the root is cast to `TableComponent` so TS consumers see
 *   the statics. The upstream named exports are kept.
 * - `TableProps` members carry the FF docs API-table descriptions, so modo's
 *   parser lists them.
 * - `TableProps` / `TableRowProps` type exports added.
 * - TSDoc with the FF docs page's examples added above the root;
 *   `export default Table` added.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-*`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 * - Local additions (additive; existing props unchanged):
 *   - `Table.Footer` (`<tfoot>`, its rows stay out of the hover and keep their
 *     border), `Table.Caption` (`<caption>` below the table) and `Table.Empty`
 *     (one row across every column for an empty or loading state).
 *   - Footer rows keep their border when the first body row is lit (an
 *     unindexed row elsewhere still hides it, as upstream).
 *   - Sortable heads: `Table.Head` `sortDirection` / `defaultSortDirection` /
 *     `onSort` renders a button with `aria-sort` whose arrow crossfades
 *     between up-down, up and down (the icon swap recipe in the skill's
 *     motion.md); the arrows come from the icon context.
 *   - `stacked` on `Table`: below the `md` breakpoint the header hides and
 *     every row becomes a two-column grid of its cells, each led by its
 *     `Table.Cell` `label`; `stacked={false}` on a `Table.Header` or
 *     `Table.Row` keeps that part tabular.
 *   - `containerClassName` for the hover container around the `<table>`
 *     (e.g. `overflow-x-auto`).
 *   - Body rows without an `index` are numbered in document order
 *     (`lib/row-order`, as in Dropdown): the table numbers them across its
 *     bodies, `Table.Header` / `Table.Footer` rows stay out, and an explicit
 *     `index` still wins. So a wrapper rendering rows needs no counter.
 *   - Stacked cells align their content to the start (`items-start`), so a
 *     value keeps its own width instead of stretching across the card.
 */

import { motion } from 'motion/react'
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
import { type IconName, useIcon } from '../../lib/icon-context'
import { useReduceMotion } from '../../lib/reduced-motion'
import { RowOrderContext, useRowOrder, useRowSlot } from '../../lib/row-order'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { useControllableState } from '../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../lib/use-fluid-hover'
import { cn } from '../../lib/utils'
import { SizeProvider } from '../../primitives/sizes'

// ── Context ──────────────────────────────────────────────

interface TableContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  stacked: boolean
}

const TableContext = createContext<TableContextValue | null>(null)

// Local: which section a row sits in, so footer rows stay out of the hover's border logic.
type TableSection = 'header' | 'body' | 'footer'

const TableSectionContext = createContext<TableSection>('body')

// Local: whether the surrounding part stacks on small screens (`stacked={false}` opts a part out).
const StackedContext = createContext<boolean | null>(null)

function useStacked(own?: boolean) {
  const table = useContext(TableContext)?.stacked ?? false
  const part = useContext(StackedContext)
  return table && (own ?? part ?? true)
}

// ── Table ────────────────────────────────────────────────

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** `Table.Header` and `Table.Body` children. */
  children: ReactNode
  /** Pins the table's rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: SizeVariant
  /** Below the `md` breakpoint, hide the header and lay each row out as a two-column grid of its cells, each led by its `label`. `stacked={false}` on a `Table.Header` or `Table.Row` keeps that part tabular. Defaults to `false`. */
  stacked?: boolean
  /** Classes for the hover container around the `<table>`, e.g. `overflow-x-auto` for wide tables. */
  containerClassName?: string
}

/** The root plus its compound parts, typed so `<Table.Row>` type-checks. */
type TableComponent = ForwardRefExoticComponent<TableProps & RefAttributes<HTMLTableElement>> & {
  Header: typeof TableHeader
  Body: typeof TableBody
  Row: typeof TableRow
  Head: typeof TableHead
  Cell: typeof TableCell
  Footer: typeof TableFooter
  Caption: typeof TableCaption
  Empty: typeof TableEmpty
}

/**
 * Data table with row hover effects and semantic markup.
 *
 * A plain `<table>` whose body rows share one fluid hover highlight: the
 * background glides from row to row under the pointer, the row borders next
 * to the lit row fade out so it reads as one pill, and the lit row's cells
 * brighten from muted to foreground. Header cells render semibold, body
 * cells regular, with the weight change width-compensated. `size` pins every
 * row to one step of the size ladder; otherwise the table follows the
 * surrounding SizeProvider.
 *
 * A head with `sortDirection` (or `defaultSortDirection`, or `onSort`)
 * becomes a sort button: a press cycles ascending, descending and unsorted,
 * reporting the next direction through `onSort`, and its arrow crossfades
 * into the new one. `stacked` turns rows into two-column cards on small
 * screens, each cell led by its `label`.
 *
 * Statics:
 * - `Table.Header` — `<thead>`; `stacked={false}` keeps it visible on small
 *   screens.
 * - `Table.Body` — `<tbody>`.
 * - `Table.Footer` — `<tfoot>`, for totals: its rows render semibold and stay
 *   out of the hover.
 * - `Table.Row` — `<tr>`: body rows join the hover highlight, numbered in
 *   document order (an explicit `index`, from 0, still wins); header and
 *   footer rows stay out. `stacked={false}` keeps the row tabular.
 * - `Table.Head` — `<th>`: `sortDirection` (`'asc'`, `'desc'` or `false`),
 *   `defaultSortDirection`, `onSort`.
 * - `Table.Cell` — `<td>`: `label`, shown above the value while stacked.
 * - `Table.Caption` — `<caption>`, a muted line below the table.
 * - `Table.Empty` — one row across `colSpan` columns, for an empty or loading
 *   state.
 *
 * Each forwards its ref and native attributes.
 *
 * @example {@include ./examples.mdx}
 */
const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ children, size, stacked = false, containerClassName, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const sizeClasses = useSize(size)

    const hover = useFluidHover(containerRef)
    const { activeIndex, handlers, registerItem } = hover
    // Local: body rows without an `index` take their place in document order.
    const rowOrder = useRowOrder()

    const contextValue = useMemo(() => ({ registerItem, activeIndex, stacked }), [registerItem, activeIndex, stacked])

    const table = (
      <TableContext.Provider value={contextValue}>
        <div
          ref={containerRef}
          className={cn('relative', containerClassName)}
          onMouseEnter={handlers.onMouseEnter}
          onMouseMove={handlers.onMouseMove}
          onMouseLeave={handlers.onMouseLeave}
          onClick={handlers.onClick}
        >
          {/* Hover background */}
          <FluidHoverHighlight hover={hover} />

          <table ref={ref} className={cn('w-full border-collapse', sizeClasses.text, className)} {...props}>
            <RowOrderContext.Provider value={rowOrder}>{children}</RowOrderContext.Provider>
          </table>
        </div>
      </TableContext.Provider>
    )

    // A size prop pins every cell to one ladder step (cells read the context).
    return size ? <SizeProvider size={size}>{table}</SizeProvider> : table
  },
) as TableComponent

Table.displayName = 'Table'

// ── TableHeader ──────────────────────────────────────────

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  /** `false` keeps the header showing on small screens in a `stacked` table. Defaults to the table's `stacked`. */
  stacked?: boolean
}

const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ stacked: own, className, ...props }, ref) => {
    const stacked = useStacked(own)
    return (
      <TableSectionContext.Provider value="header">
        <RowOrderContext.Provider value={null}>
          <StackedContext.Provider value={own ?? null}>
            <thead ref={ref} className={cn(stacked && 'hidden md:table-header-group', className)} {...props} />
          </StackedContext.Provider>
        </RowOrderContext.Provider>
      </TableSectionContext.Provider>
    )
  },
)

TableHeader.displayName = 'TableHeader'

// ── TableBody ────────────────────────────────────────────

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('', className)} {...props} />,
)

TableBody.displayName = 'TableBody'

// ── TableFooter (local) ──────────────────────────────────

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <TableSectionContext.Provider value="footer">
      <RowOrderContext.Provider value={null}>
        <tfoot ref={ref} className={cn('[&_td]:text-foreground', className)} {...props} />
      </RowOrderContext.Provider>
    </TableSectionContext.Provider>
  ),
)

TableFooter.displayName = 'TableFooter'

// ── TableCaption (local) ─────────────────────────────────

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => {
    const sizeClasses = useSize()
    return (
      <caption
        ref={ref}
        className={cn(
          'caption-bottom pt-3 text-left text-muted-foreground',
          sizeClasses.variant === 'compact' ? 'text-caption-compact px-2.5' : 'text-caption px-3',
          className,
        )}
        {...props}
      />
    )
  },
)

TableCaption.displayName = 'TableCaption'

// ── TableRow ─────────────────────────────────────────────

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Position among the body rows, from 0. Body rows are numbered in document order without it; set it only to pin a row's place. Header and footer rows never join the hover. */
  index?: number
  /** `false` keeps this row tabular on small screens in a `stacked` table. Defaults to the table's `stacked`. */
  stacked?: boolean
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ index: indexProp, stacked: own, className, style, ...props }, ref) => {
    const internalRef = useRef<HTMLTableRowElement>(null)
    const ctx = useContext(TableContext)
    const section = useContext(TableSectionContext)
    const stacked = useStacked(own)
    // Local: an unindexed body row takes its document-order place; header and footer reset the order to none.
    const { index } = useRowSlot(internalRef, indexProp)

    useRegisterFluidHoverItem(ctx?.registerItem, index, internalRef)

    const isBodyRow = index !== undefined
    const activeIdx = ctx?.activeIndex ?? null
    const hideBorder =
      activeIdx !== null &&
      ((isBodyRow && (index === activeIdx || index === activeIdx - 1)) ||
        (!isBodyRow && section !== 'footer' && activeIdx === 0))

    const row = (
      <tr
        ref={node => {
          ;(internalRef as React.MutableRefObject<HTMLTableRowElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLTableRowElement | null>).current = node
        }}
        data-fluid-hover-index={index}
        className={cn(
          'group/row relative z-10 border-b transition-[border-color] duration-fast',
          hideBorder ? 'border-transparent' : 'border-accent/40',
          isBodyRow && activeIdx === index && 'is-active',
          isBodyRow ? 'weight-normal' : 'weight-semibold',
          stacked && 'grid grid-cols-2 md:table-row',
          className,
        )}
        style={style}
        {...props}
      />
    )

    // A row's own `stacked` reaches its cells.
    return own === undefined ? row : <StackedContext.Provider value={own}>{row}</StackedContext.Provider>
  },
)

TableRow.displayName = 'TableRow'

// ── TableHead ────────────────────────────────────────────

// Local: the sortable head's arrow, one glyph per direction crossfading in one icon cell.
type SortDirection = 'asc' | 'desc' | false

const SORT_ICONS: [SortDirection, IconName][] = [
  [false, 'arrow-up-down'],
  ['asc', 'arrow-up'],
  ['desc', 'arrow-down'],
]

const NEXT_SORT: Record<'asc' | 'desc' | 'none', SortDirection> = { none: 'asc', asc: 'desc', desc: false }

const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const

const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const enter = { type: 'tween' as const, duration: spring.fast.duration, ease: 'easeOut' as const }
const leave = { type: 'tween' as const, ...spring.fast.exit, ease: 'easeIn' as const }

function SortGlyph({
  direction,
  glyph,
  current,
  size,
}: {
  direction: SortDirection
  glyph: IconName
  current: SortDirection
  size: number
}) {
  const Icon = useIcon(glyph)
  const reduced = useReduceMotion()
  const shown = direction === current
  return (
    <motion.span
      className="col-start-1 row-start-1 flex"
      initial={false}
      animate={shown ? SHOWN : reduced ? { opacity: 0 } : HIDDEN}
      transition={shown ? enter : leave}
    >
      <Icon
        size={size}
        strokeWidth={1.5}
        className={cn('transition-[stroke-width] duration-fast group-hover/sort:stroke-2', current && 'stroke-2')}
      />
    </motion.span>
  )
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Controlled sort direction of this column: `'asc'`, `'desc'` or `false` (unsorted). Setting it makes the head a sort button. Pair with `onSort`. */
  sortDirection?: SortDirection
  /** Initial sort direction, for a head that keeps its own; setting it makes the head a sort button. */
  defaultSortDirection?: SortDirection
  /** Called with the next direction when the head is pressed: unsorted → `'asc'` → `'desc'` → `false`. Setting it makes the head a sort button. */
  onSort?: (direction: SortDirection) => void
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ sortDirection, defaultSortDirection, onSort, className, children, ...props }, ref) => {
    const sizeClasses = useSize()
    const [direction, setDirection] = useControllableState(sortDirection, defaultSortDirection ?? false, onSort)
    const sortable = sortDirection !== undefined || defaultSortDirection !== undefined || onSort !== undefined

    return (
      <th
        ref={ref}
        aria-sort={sortable ? ARIA_SORT[direction || 'none'] : undefined}
        className={cn(
          'text-left text-foreground',
          // py + line box lands the row on the ladder (36px / 28px).
          sizeClasses.variant === 'compact' ? 'px-2.5 py-[5px]' : 'px-3 py-2',
          className,
        )}
        {...props}
      >
        {sortable ? (
          <button
            type="button"
            onClick={() => setDirection(NEXT_SORT[direction || 'none'])}
            className={cn(
              'group/sort -mx-1 inline-flex cursor-pointer items-center rounded-glyph px-1 text-inherit outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
              sizeClasses.gap,
            )}
          >
            {children}
            <span
              aria-hidden="true"
              className={cn(
                'grid shrink-0 transition-[color] duration-fast group-hover/sort:text-foreground',
                direction ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {SORT_ICONS.map(([glyphDirection, glyph]) => (
                <SortGlyph
                  key={glyph}
                  direction={glyphDirection}
                  glyph={glyph}
                  current={direction}
                  size={sizeClasses.icon}
                />
              ))}
            </span>
          </button>
        ) : (
          children
        )}
      </th>
    )
  },
)

TableHead.displayName = 'TableHead'

// ── TableCell ────────────────────────────────────────────

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** The column's name, shown above the value while a `stacked` table lays its rows out as cards. */
  label?: ReactNode
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({ label, className, children, ...props }, ref) => {
  const sizeClasses = useSize()
  const stacked = useStacked()
  return (
    <td
      ref={ref}
      className={cn(
        'text-muted-foreground transition-colors duration-fast group-[.is-active]/row:text-foreground',
        sizeClasses.variant === 'compact' ? 'px-2.5 py-[5px]' : 'px-3 py-2',
        stacked && 'flex flex-col items-start md:table-cell',
        className,
      )}
      {...props}
    >
      {stacked && label != null && (
        <span
          className={cn(
            'text-muted-foreground weight-normal md:hidden',
            sizeClasses.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
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

// ── TableEmpty (local) ───────────────────────────────────

interface TableEmptyProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Number of columns the row spans: the table's column count. */
  colSpan: number
  /** What to say, or a loading indicator. */
  children?: ReactNode
}

const TableEmpty = forwardRef<HTMLTableRowElement, TableEmptyProps>(
  ({ colSpan, className, children, ...props }, ref) => {
    const sizeClasses = useSize()
    return (
      <tr ref={ref} className={cn('relative z-10', className)} {...props}>
        <td
          colSpan={colSpan}
          className={cn('h-24 px-3 text-center align-middle text-muted-foreground', sizeClasses.text)}
        >
          {children}
        </td>
      </tr>
    )
  },
)

TableEmpty.displayName = 'TableEmpty'

// ── Compound parts ───────────────────────────────────────

Object.assign(Table, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Footer: TableFooter,
  Caption: TableCaption,
  Empty: TableEmpty,
})

// ── Exports ──────────────────────────────────────────────

export type {
  SortDirection,
  TableCellProps,
  TableEmptyProps,
  TableHeaderProps,
  TableHeadProps,
  TableProps,
  TableRowProps,
}
export { Table, TableBody, TableCaption, TableCell, TableEmpty, TableFooter, TableHead, TableHeader, TableRow }

export default Table

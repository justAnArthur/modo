/*
 * Local addition (not part of Fluid Functionalism): the Table's shared
 * state, split out of `index.tsx` so its parts can live in their own modules.
 */

'use client'

import { createContext, useContext } from 'react'
import { useSize } from '../../../lib/size-context'

type SortDirection = 'asc' | 'desc'

/** The column a table is sorted by: a `Table.Head`'s `value` and the direction. */
interface TableSort {
  value: string
  direction: SortDirection
}

interface TableContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  stacked: boolean
  sort: TableSort | null
  toggleSort: (value: string) => void
}

const TableContext = createContext<TableContextValue | null>(null)

type TableSection = 'header' | 'body' | 'footer'

const TableSectionContext = createContext<TableSection>('body')

/** A `Table.Header` or `Table.Row`'s own `stacked`, for the rows and cells below it. */
const StackedContext = createContext<boolean | null>(null)

function useTable() {
  return useContext(TableContext)
}

/** Whether this part lays out as a card: the table stacks and no part above opted out (`stacked={false}`). */
function useStacked(own?: boolean) {
  const table = useContext(TableContext)?.stacked ?? false
  const part = useContext(StackedContext)
  return table && (own ?? part ?? true)
}

/** Unsorted → ascending → descending → unsorted; another column starts at ascending. */
function nextSort(sort: TableSort | null, value: string): TableSort | null {
  if (sort?.value !== value) return { value, direction: 'asc' }
  return sort.direction === 'asc' ? { value, direction: 'desc' } : null
}

/** py + the line box land a row on the ladder (36px / 28px). */
function useCellPadding() {
  return useSize().variant === 'compact' ? 'px-2.5 py-[5px]' : 'px-3 py-2'
}

export type { SortDirection, TableContextValue, TableSection, TableSort }
export { nextSort, StackedContext, TableContext, TableSectionContext, useCellPadding, useStacked, useTable }

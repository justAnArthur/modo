/*
 * Local addition (not part of Fluid Functionalism): numbers a group's rows in
 * order (Checkbox.Group, Radio.Group, Switch.Group, Dropdown), so a row needs no
 * `index` for the fluid hover and the group's index-keyed state.
 */

'use client'

import { Children, createContext, isValidElement, type ReactElement, type ReactNode, useContext } from 'react'

const RowIndexContext = createContext<number | undefined>(undefined)

interface IndexedRowsProps {
  children: ReactNode
  /** Which element children count as rows; the rest (a caption, a rule) take no position. Defaults to every element. */
  isRow?: (child: ReactElement) => boolean
}

/** Gives each element child that is a row its position among them. */
function IndexedRows({ children, isRow }: IndexedRowsProps) {
  let index = 0
  return (
    <>
      {Children.map(children, child =>
        isValidElement(child) && (isRow?.(child) ?? true) ? (
          <RowIndexContext.Provider value={index++}>{child}</RowIndexContext.Provider>
        ) : (
          child
        ),
      )}
    </>
  )
}

/** A row's position among `IndexedRows`, or `undefined` outside them (a table's header row). */
function useRowPosition() {
  return useContext(RowIndexContext)
}

/** A row's index: its own `index`, else its position in the group, else 0. */
function useRowIndex(own?: number) {
  const position = useRowPosition()
  return own ?? position ?? 0
}

export { IndexedRows, useRowIndex, useRowPosition }

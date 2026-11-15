/*
 * Local addition (not part of Fluid Functionalism): numbers a group's rows in
 * order (Checkbox.Group, Radio.Group, Switch.Group), so a row needs no
 * `index` for the fluid hover and the group's index-keyed state.
 */

'use client'

import { Children, createContext, isValidElement, type ReactNode, useContext } from 'react'

const RowIndexContext = createContext<number | undefined>(undefined)

/** Gives each element child its position among them. */
function IndexedRows({ children }: { children: ReactNode }) {
  let index = 0
  return (
    <>
      {Children.map(children, child =>
        isValidElement(child) ? <RowIndexContext.Provider value={index++}>{child}</RowIndexContext.Provider> : child,
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

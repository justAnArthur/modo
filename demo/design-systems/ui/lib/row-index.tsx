/*
 * Local addition (not part of Fluid Functionalism): numbers a group's rows in
 * order (Checkbox.Group, Radio.Group, Switch.Group), so a row needs no
 * `index` for the fluid hover and the group's index-keyed state.
 */

import { Children, createContext, isValidElement, type ReactNode, useContext } from 'react'

const RowIndexContext = createContext(0)

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

/** A row's index: its own `index`, else its position in the group. */
function useRowIndex(own?: number) {
  const position = useContext(RowIndexContext)
  return own ?? position
}

export { IndexedRows, useRowIndex }

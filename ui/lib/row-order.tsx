/*
 * Local addition (not part of Fluid Functionalism): numbers a panel's rows in
 * document order (Dropdown's panels, Table), so a row needs no `index` for the
 * fluid hover and the index-keyed state. Unlike `row-index.tsx` (direct
 * children only) it reaches rows anywhere below the panel: inside a group, a
 * fragment or a condition, out of a `map`. `RowOrderContext.Provider
 * value={null}` takes the rows below it out of the numbering.
 */

'use client'

import { createContext, type RefObject, useCallback, useContext, useId, useMemo, useRef, useState } from 'react'
import { useIsoLayoutEffect } from './use-iso-layout-effect'

interface Slot {
  element: HTMLElement
  /** The row's own `index`; the numbering starts after the highest one. */
  explicit?: number
}

interface Numbering {
  order: ReadonlyMap<string, number>
  /** The first numbered row: the inline panel's roving tab stop. */
  first?: number
}

interface RowOrder extends Numbering {
  register: (id: string, slot: Slot) => () => void
}

const EMPTY: Numbering = { order: new Map() }

const RowOrderContext = createContext<RowOrder | null>(null)

const before = (a: Slot, b: Slot) =>
  a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

function number(slots: Map<string, Slot>): Numbering {
  let next = 0
  const loose: [string, Slot][] = []
  for (const entry of slots) {
    const { explicit } = entry[1]
    if (explicit === undefined) loose.push(entry)
    else next = Math.max(next, explicit + 1)
  }

  const first = loose.length > 0 ? next : undefined
  const order = new Map<string, number>()
  // Only the rows without an `index` need the DOM to find their place.
  for (const [id] of loose.sort(([, a], [, b]) => before(a, b))) order.set(id, next++)
  return { order, first }
}

function same(a: Numbering, b: Numbering) {
  if (a.first !== b.first || a.order.size !== b.order.size) return false
  for (const [id, index] of a.order) if (b.order.get(id) !== index) return false
  return true
}

/** A panel's numbering. Provide it through `RowOrderContext`. */
function useRowOrder(): RowOrder {
  const slots = useRef(new Map<string, Slot>())
  // Rows without an `index`: while there are none, an indexed row changes nothing.
  const loose = useRef(0)
  const [numbering, setNumbering] = useState(EMPTY)
  const [, setVersion] = useState(0)

  const register = useCallback((id: string, slot: Slot) => {
    const own = slot.explicit === undefined
    slots.current.set(id, slot)
    if (own) loose.current++
    if (loose.current > 0) setVersion(v => v + 1)
    return () => {
      slots.current.delete(id)
      if (own) loose.current--
      if (own || loose.current > 0) setVersion(v => v + 1)
    }
  }, [])

  // Every render: a re-ordered list moves no row in or out, so only the DOM
  // knows. Rows register in their own layout effects, which run first.
  useIsoLayoutEffect(() => {
    if (loose.current === 0 && numbering.order.size === 0) return
    const next = number(slots.current)
    setNumbering(prev => (same(prev, next) ? prev : next))
  })

  return useMemo(() => ({ register, ...numbering }), [register, numbering])
}

/**
 * Takes a place in the surrounding panel's order. Returns the row's index
 * (`explicit` when given, else its place; `undefined` until the first layout
 * pass and outside a numbering) and the panel's first numbered row.
 */
function useRowSlot(ref: RefObject<HTMLElement | null>, explicit?: number) {
  const ctx = useContext(RowOrderContext)
  const id = useId()
  const register = ctx?.register

  useIsoLayoutEffect(() => {
    const element = ref.current
    if (!register || !element) return
    return register(id, { element, explicit })
  }, [register, id, explicit, ref])

  return { index: explicit ?? ctx?.order.get(id), firstRow: ctx?.first }
}

export type { RowOrder }
export { RowOrderContext, useRowOrder, useRowSlot }

/*
 * Local addition (not part of Fluid Functionalism): numbers a menu's rows in
 * document order, so a `Dropdown.Item` needs no `index` for the fluid hover,
 * the keyboard ring and the selection backgrounds. Unlike `lib/row-index.tsx`
 * (direct children only) it reaches rows anywhere below the panel: inside a
 * `Dropdown.Group`, behind a condition, out of a `map`. Labels, separators and
 * groups take a number too without registering a rect, so a selection run
 * never melts across them.
 */

import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

interface Slot {
  element: HTMLElement
  /** The row's own `index`; the numbering starts after the highest one. */
  explicit?: number
  /** A label, separator or group: numbered, never a row. */
  gap?: boolean
}

interface RowOrder {
  register: (id: string, slot: Slot) => () => void
  order: ReadonlyMap<string, number>
  /** The first row's number: the inline panel's roving tab stop. */
  first?: number
}

const EMPTY: ReadonlyMap<string, number> = new Map()

const RowOrderContext = createContext<RowOrder | null>(null)

const before = (a: Slot, b: Slot) =>
  a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

function number(slots: Map<string, Slot>) {
  let next = 0
  const loose: [string, Slot][] = []
  for (const entry of slots) {
    const { explicit } = entry[1]
    if (explicit === undefined) loose.push(entry)
    else next = Math.max(next, explicit + 1)
  }
  const order = new Map<string, number>()
  let first: number | undefined
  // Only the rows without an `index` need the DOM to find their place.
  for (const [id, slot] of loose.sort(([, a], [, b]) => before(a, b))) {
    if (!slot.gap) first ??= next
    order.set(id, next++)
  }
  return { order, first }
}

interface Numbering {
  order: ReadonlyMap<string, number>
  first?: number
}

function same({ order: a, first: firstA }: Numbering, { order: b, first: firstB }: Numbering) {
  if (firstA !== firstB || a.size !== b.size) return false
  for (const [id, index] of a) if (b.get(id) !== index) return false
  return true
}

/** A panel's numbering. Provide the result through `RowOrderContext`. */
function useRowOrder(): RowOrder {
  const slots = useRef(new Map<string, Slot>())
  // Slots without an `index`: while there are none, the numbering is empty and an indexed row changes nothing.
  const loose = useRef(0)
  const [numbering, setNumbering] = useState<Numbering>({ order: EMPTY })
  const [, changed] = useReducer((n: number) => n + 1, 0)

  const register = useCallback((id: string, slot: Slot) => {
    const own = slot.explicit === undefined
    slots.current.set(id, slot)
    if (own) loose.current++
    if (own || loose.current > 0) changed()
    return () => {
      slots.current.delete(id)
      if (own) loose.current--
      if (own || loose.current > 0) changed()
    }
  }, [])

  // Every render: a re-ordered list moves no row in or out, so only the DOM
  // knows. Rows register in their own layout effects, which run first.
  useLayoutEffect(() => {
    if (loose.current === 0 && numbering.order.size === 0) return
    const next = number(slots.current)
    setNumbering(prev => (same(prev, next) ? prev : next))
  })

  return useMemo(() => ({ register, ...numbering }), [register, numbering])
}

/**
 * Takes a place in the surrounding panel's order and returns the row's index
 * (`explicit` when given, else its position; undefined until the first layout
 * pass, and outside a panel) and the panel's first row.
 */
function useRowSlot(ref: RefObject<HTMLElement | null>, explicit?: number, gap?: boolean) {
  const ctx = useContext(RowOrderContext)
  const id = useId()
  const register = ctx?.register

  useLayoutEffect(() => {
    const element = ref.current
    if (!register || !element) return
    return register(id, { element, explicit, gap })
  }, [register, id, explicit, gap, ref])

  return { index: explicit ?? ctx?.order.get(id), firstRow: ctx?.first }
}

export type { RowOrder }
export { RowOrderContext, useRowOrder, useRowSlot }

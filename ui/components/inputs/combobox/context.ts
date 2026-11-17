/*!
 * Part of the Fluid Functionalism combobox port (`registry/base/combobox.tsx`
 * @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b, MIT © 2026 Micka Touillaud,
 * notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { createContext, type ReactNode, type RefObject, useContext } from 'react'

/** An object item: `value` and `label`, plus whatever the rows need. */
export interface ComboboxItemObject {
  value: string
  /** What the row and the chip show: text, or any node with a `textValue`. */
  label: ReactNode
  /** The item as text: what the query filters, the field shows and a chip is named by. Defaults to `label` when it is a string, else `value`. */
  textValue?: string
  [key: string]: unknown
}

export type ComboboxItemData = string | ComboboxItemObject

export type ComboboxValue<Multiple extends boolean> = Multiple extends true ? string[] : string

export function itemValue(item: ComboboxItemData): string {
  return typeof item === 'string' ? item : item.value
}

/** The item as text: what filters, fills the field and names a chip. */
export function itemLabel(item: ComboboxItemData): string {
  if (typeof item === 'string') return item
  return item.textValue ?? (typeof item.label === 'string' ? item.label : item.value)
}

/** The item as shown: its label node. */
export function itemNode(item: ComboboxItemData): ReactNode {
  return typeof item === 'string' ? item : item.label
}

/** Every fixed word the fields announce, for translating them. */
export interface ComboboxLabels {
  /** Names the chevron button. Defaults to `"Open"`. */
  open?: string
  /** Names the clear ✕ of a `clearable` field. Defaults to `"Clear"`. */
  clear?: string
  /** Names a chip's remove ✕ from the chip's text. Defaults to ``(label) => `Remove ${label}` ``. */
  remove?: (label: string) => string
  /** The fields' placeholder while nothing is typed or selected, unless a field sets its own. Defaults to `"Search…"`. */
  placeholder?: string
}

// The create row is one more item the primitive filters and highlights, so
// Enter and the arrows reach it; its value can't collide with a consumer's.
export const CREATE_VALUE = '\0create'

export function isCreateItem(item: ComboboxItemData): boolean {
  return itemValue(item) === CREATE_VALUE
}

interface ComboboxContextValue {
  /** One entry in single mode, any number in multiple. */
  values: string[]
  multiple: boolean
  inputValue: string
  /** The field (input group or chips) the popup anchors to and grows from. `RefObject<HTMLDivElement>`, not `| null`, so Base UI's ref props accept it under @types/react 18. */
  anchorRef: RefObject<HTMLDivElement>
  disabled: boolean
  itemsByValue: Map<string, ComboboxItemData>
  /** The create row's label for the current query; null while none is offered. */
  createRow: ReactNode | null
  /** `hideSelected` has emptied the list with nothing typed. */
  allSelected: boolean
  /** Items are on their way: a status row under the list, the empty message held back. */
  loading: boolean
  loadingLabel: ReactNode
  /** Shows the picks but takes no input. */
  readOnly: boolean
  /** Closes the popup (the footer's `close`). */
  close: () => void
  /** The fields' words, from the root's `labels`. */
  labels: ComboboxLabels
}

export const ComboboxContext = createContext<ComboboxContextValue | null>(null)

export function useComboboxContext() {
  const ctx = useContext(ComboboxContext)
  if (!ctx) throw new Error('Combobox compound components must be inside <Combobox>')
  return ctx
}

/**
 * The primitive's highlighted row and whether a keyboard or auto highlight
 * put it there (pointer highlights are the fluid hover's). Its own context,
 * so a highlight re-renders the list, not the field and every row.
 */
export interface Highlight {
  index: number
  keyboard: boolean
}

export const ComboboxHighlightContext = createContext<Highlight | null>(null)

interface ComboboxListContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  /** A checked row reports its index, so the list can place the selected background. */
  setChecked: (index: number, checked: boolean) => void
}

export const ComboboxListContext = createContext<ComboboxListContextValue | null>(null)

/** Each rendered row's index, from the list. */
export const ComboboxItemIndexContext = createContext<number>(0)

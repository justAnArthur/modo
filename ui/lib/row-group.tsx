/*
 * Local addition (not part of Fluid Functionalism): the focus and keyboard
 * wiring FF repeats in every list of fluid-hover rows (Checkbox.Group,
 * Radio.Group, the dropdown and select popups).
 */

'use client'

import { type FocusEvent, type KeyboardEvent, type MouseEvent, type RefObject, useState } from 'react'
import type { UseFluidHoverReturn } from './use-fluid-hover'

const INDEX_ATTR = 'data-fluid-hover-index'
const ROW = `[${INDEX_ATTR}]`
const ENABLED_ROW = `${ROW}:not([aria-disabled="true"])`

/** The fluid-hover index of the row holding `target`, or `null` outside any row. */
export function rowIndexOf(target: EventTarget | null): number | null {
  const index = (target as Element | null)?.closest?.(ROW)?.getAttribute(INDEX_ATTR)
  return index == null ? null : Number(index)
}

/**
 * Tracks which row has focus: the hover highlight follows focus, and
 * `focusRect` is set while that focus is keyboard focus (`:focus-visible`,
 * and `gate` when given: a popup's `useKeyboardNavGate` ref). Spread
 * `handlers` on the rows' container; render `<FocusRing rect={focusRect} />`.
 */
export function useRowFocus(
  { itemRects, setActiveIndex }: Pick<UseFluidHoverReturn, 'itemRects' | 'setActiveIndex'>,
  gate?: RefObject<boolean>,
) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const index = rowIndexOf(e.target)
    if (index === null) return
    setActiveIndex(index)
    const keyboard = (gate?.current ?? true) && e.target.matches(':focus-visible')
    setFocusedIndex(keyboard ? index : null)
  }

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setFocusedIndex(null)
    setActiveIndex(null)
  }

  return {
    focusedIndex,
    setFocusedIndex,
    focusRect: focusedIndex === null ? null : (itemRects[focusedIndex] ?? null),
    handlers: { onFocus, onBlur },
  }
}

interface RowGroupOptions {
  /** `'y'`: Up and Down move. `'xy'`: Left and Right move too, as in a radio group. Defaults to `'y'`. */
  axis?: 'y' | 'xy'
  /** Moving focus also activates (clicks) the row, as in a radio group. Defaults to `false`. */
  activateOnFocus?: boolean
}

const NEXT = { y: ['ArrowDown'], xy: ['ArrowDown', 'ArrowRight'] }
const PREV = { y: ['ArrowUp'], xy: ['ArrowUp', 'ArrowLeft'] }

/**
 * A group of focusable rows that the group itself navigates: `useRowFocus`
 * plus arrow keys (wrapping), Home and End over the rows. Rows are the
 * `data-fluid-hover-index` wrappers, never a hidden primitive inside one
 * that carries the same role; `aria-disabled` rows are skipped.
 */
export function useRowGroup(
  hover: Pick<UseFluidHoverReturn, 'itemRects' | 'setActiveIndex'>,
  { axis = 'y', activateOnFocus = false }: RowGroupOptions = {},
) {
  const focus = useRowFocus(hover)

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(ENABLED_ROW))
    const at = rows.indexOf(e.target as HTMLElement)
    if (at === -1) return

    let next: number
    if (NEXT[axis].includes(e.key)) next = (at + 1) % rows.length
    else if (PREV[axis].includes(e.key)) next = (at - 1 + rows.length) % rows.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = rows.length - 1
    else return

    e.preventDefault()
    // A Base UI composite merged onto the same element (RadioGroup) would
    // rove its own hidden controls.
    ;(e as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.()
    rows[next]?.focus()
    if (activateOnFocus) rows[next]?.click()
  }

  return { ...focus, handlers: { ...focus.handlers, onKeyDown } }
}

/**
 * A row's `onMouseDown`: a press lands focus on the row, not on the hidden
 * control under the pointer (which would strand arrow-key navigation).
 * Interactive children keep their own focus.
 */
export function focusRowOnPress(e: MouseEvent<HTMLElement>) {
  const interactive = (e.target as HTMLElement).closest(
    'button:not([tabindex="-1"]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (interactive && interactive !== e.currentTarget) return
  e.preventDefault()
  e.currentTarget.focus()
}

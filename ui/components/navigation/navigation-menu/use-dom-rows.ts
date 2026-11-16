/*
 * Local addition (not part of Fluid Functionalism): registers a container's
 * rows with its fluid hover in document order, so a link nested anywhere in
 * a panel's layout (a grid, a `li`) needs no `index`.
 */

'use client'

import { useLayoutEffect, useRef } from 'react'
import type { UseFluidHoverReturn } from '../../../lib/use-fluid-hover'

type RowScope = 'strip' | 'panel'

/** Marks a strip item (`"strip"`) or a panel row (`"panel"`). */
const ROW_ATTR = 'data-navigation-menu-row'

/**
 * Numbers the container's rows of `scope` with `data-fluid-hover-index`
 * (which `useRowFocus` reads) and registers them, again whenever its
 * subtree changes: Base UI fills a panel after the panel itself mounts.
 * Returns the registered rows, in order.
 */
function useDomRows(container: HTMLElement | null, registerItem: UseFluidHoverReturn['registerItem'], scope: RowScope) {
  const rows = useRef<HTMLElement[]>([])

  useLayoutEffect(() => {
    if (!container) return

    const sync = () => {
      const next = [...container.querySelectorAll<HTMLElement>(`[${ROW_ATTR}="${scope}"]`)]
      const previous = rows.current
      if (next.length === previous.length && next.every((el, i) => el === previous[i])) return

      for (let i = next.length; i < previous.length; i++) registerItem(i, null)
      next.forEach((el, i) => {
        el.dataset.fluidHoverIndex = String(i)
        if (previous[i] !== el) registerItem(i, el)
      })
      rows.current = next
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(container, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      for (let i = 0; i < rows.current.length; i++) registerItem(i, null)
      rows.current = []
    }
  }, [container, registerItem, scope])

  return rows
}

export type { RowScope }
export { ROW_ATTR, useDomRows }

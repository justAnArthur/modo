/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useShape } from '../../../lib/shape-context'
import { spring } from '../../../lib/springs'
import { type ItemRect, useFluidHover } from '../../../lib/use-fluid-hover'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'
import { cn } from '../../../lib/utils'

// One scope per SidebarMenu tree: one fluid hover and the travelling
// overlays (hover, active backgrounds, focus ring) over every visible row,
// sub-menu rows included, so the hover moves from a parent into its children
// as one piece. The active background stays one per level, so a current
// section and the current page inside it can both be lit.

interface MenuScopeValue {
  registerRow: (el: HTMLElement) => () => void
  setRowButton: (row: HTMLElement, button: HTMLElement | null) => void
  setRowActive: (row: HTMLElement, active: boolean) => void
  hoveredRowEl: HTMLElement | null
  /** Every visible active row, in DOM order. */
  activeRows: HTMLElement[]
  firstRowEl: HTMLElement | null
  hasActive: boolean
  /** A sub-menu toggled: re-read what is visible. */
  refreshVisibility: () => void
}

export const MenuScopeContext = createContext<MenuScopeValue | null>(null)

/** The selection a `Sidebar` holds for buttons that carry a `value`. */
export interface SidebarSelectionValue {
  value: string | undefined
  select: (value: string) => void
}

export const SidebarSelection = createContext<SidebarSelectionValue | null>(null)

export interface MenuItemContextValue {
  rowRef: MutableRefObject<HTMLLIElement | null>
  /** The row's `<li>` ref callback; replays its active flag to the scope. */
  attachRow: (node: HTMLLIElement | null) => void
  isHovered: boolean
  isActiveRow: boolean
  /** Inside `SidebarMenuSubItem`: actions centre on the shorter row. */
  isSubRow: boolean
  setActive: (active: boolean) => void
  setButtonEl: (el: HTMLElement | null) => void
  /** Trailing controls the action and badge parts register; the button reserves their gutter. */
  actionCount: number
  actionsShowOnHover: boolean
  hasBadge: boolean
  setActions: (count: number, showOnHover: boolean) => void
  setHasBadge: (hasBadge: boolean) => void
  /** A collapsible row's sub-menu state; `undefined` for a plain row. */
  subOpen: boolean | undefined
  toggleSub: () => void
}

export const MenuItemContext = createContext<MenuItemContextValue | null>(null)

/** True inside a SidebarMenuActions cluster, where each action flows in the row. */
export const MenuActionsClusterContext = createContext(false)

/** Inside a collapsed sub-tree. Such rows stay registered: unregistering on every toggle would churn the measurements and blink the overlays. */
function rowHidden(el: HTMLElement) {
  return el.closest('[data-sidebar="menu-sub"][data-state="closed"]') !== null
}

const DISABLED_CONTROL = ':disabled, [aria-disabled="true"]'

/** A disabled row stays in the layout but is never lit, clicked into or reached by keys. The hook registers the row's button (else the row), and a sub-row's anchor is `aria-disabled`. */
function rowDisabled(el: HTMLElement) {
  return (
    el.matches(DISABLED_CONTROL) ||
    el.querySelector(
      `:scope > [data-sidebar="menu-button"]:is(${DISABLED_CONTROL}), :scope > [data-sidebar="menu-sub-button"]:is(${DISABLED_CONTROL})`,
    ) !== null
  )
}

function rowSkipped(el: HTMLElement) {
  return rowHidden(el) || rowDisabled(el)
}

// One id per level (the menu root or a sub-menu), so the active background
// glides within its level instead of remounting.
let overlayGroupSeq = 0
const overlayGroupIds = new WeakMap<Element, number>()
function overlayGroupId(el: Element) {
  let id = overlayGroupIds.get(el)
  if (id === undefined) {
    id = ++overlayGroupSeq
    overlayGroupIds.set(el, id)
  }
  return id
}

function byDomOrder(a: HTMLElement, b: HTMLElement) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

function sameElements(a: HTMLElement[], b: HTMLElement[]) {
  return a.length === b.length && a.every((el, i) => el === b[i])
}

const ROW_BUTTON = '[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]'

// The label reserves exactly the trailing run it clears plus one gap, the
// rule the section header follows: the badge's 24px slot (rightmost), the
// action cluster (24px apiece, 4px between), and a gap where both appear.
const ROW_BASE_PAD = 8
const ROW_SLOT = 24
const ROW_GAP = 4
/** The run's rightmost element from the row's right edge: a badge at right-2, an action cluster at right-1.5 (same centre line). */
const ROW_BADGE_INSET = 8
const ROW_ACTION_INSET = 6

export function rowGutter(actionCount: number, hasBadge: boolean) {
  if (!actionCount && !hasBadge) return ROW_BASE_PAD
  const actionsWidth = actionCount ? actionCount * ROW_SLOT + (actionCount - 1) * ROW_GAP : 0
  const runWidth = (hasBadge ? ROW_SLOT : 0) + actionsWidth + (hasBadge && actionCount ? ROW_GAP : 0)
  return (hasBadge ? ROW_BADGE_INSET : ROW_ACTION_INSET) + runWidth + ROW_GAP
}

/** `--row-gutter` at rest and `--row-gutter-hover` once hover-revealed actions show. */
export function gutterVars(item: MenuItemContextValue | null) {
  const hover = rowGutter(item?.actionCount ?? 0, item?.hasBadge ?? false)
  const rest = item?.actionsShowOnHover ? rowGutter(0, item.hasBadge) : hover
  return { '--row-gutter': `${rest}px`, '--row-gutter-hover': `${hover}px` }
}

interface MenuScopeOptions {
  /** Draw the travelling keyboard focus ring. Off, keyboard focus moves the hover only (a settings dialog's section list). Defaults to `true`. */
  focusRing?: boolean
}

export function useMenuScope(containerRef: RefObject<HTMLElement | null>, { focusRing = true }: MenuScopeOptions = {}) {
  const { activeIndex, setActiveIndex, itemRects, isMeasured, sessionRef, handlers, registerItem } = useFluidHover(
    containerRef,
    { isItemDisabled: rowSkipped },
  )

  const rowsRef = useRef<Set<HTMLElement>>(new Set())
  const rowButtonsRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())
  const activeMapRef = useRef<Map<HTMLElement, boolean>>(new Map())
  const [orderedRows, setOrderedRows] = useState<HTMLElement[]>([])
  const orderedRowsRef = useRef(orderedRows)
  orderedRowsRef.current = orderedRows
  const registeredCountRef = useRef(0)
  const [activeRows, setActiveRows] = useState<HTMLElement[]>([])
  const [focusedRowEl, setFocusedRowEl] = useState<HTMLElement | null>(null)

  const recomputeActive = useCallback(() => {
    const next = orderedRowsRef.current.filter(el => activeMapRef.current.get(el) && !rowSkipped(el))
    setActiveRows(prev => (sameElements(prev, next) ? prev : next))
  }, [])

  const rowButton = useCallback(
    (row: HTMLElement) =>
      rowButtonsRef.current.get(row) ??
      row.querySelector<HTMLElement>(
        ':scope > [data-sidebar="menu-button"], :scope > [data-sidebar="menu-sub-button"]',
      ),
    [],
  )

  // Indexes come from DOM order, so rows take no index and conditional rows
  // just work. The hover measures the row's button, not the `<li>`: a row
  // hosting an expanded sub-tree is tall, and its gaps would go to the parent.
  const syncRows = useCallback(() => {
    const sorted = [...rowsRef.current].sort(byDomOrder)
    // Synchronously: callers in the same commit must see the set they changed.
    orderedRowsRef.current = sorted
    setOrderedRows(prev => (sameElements(prev, sorted) ? prev : sorted))
    for (const [i, el] of sorted.entries()) registerItem(i, rowButton(el) ?? el)
    for (let i = sorted.length; i < registeredCountRef.current; i++) registerItem(i, null)
    registeredCountRef.current = sorted.length
    recomputeActive()
  }, [registerItem, recomputeActive, rowButton])

  const registerRow = useCallback(
    (el: HTMLElement) => {
      rowsRef.current.add(el)
      syncRows()
      return () => {
        rowsRef.current.delete(el)
        rowButtonsRef.current.delete(el)
        activeMapRef.current.delete(el)
        syncRows()
      }
    },
    [syncRows],
  )

  const setRowButton = useCallback(
    (row: HTMLElement, button: HTMLElement | null) => {
      if (button) rowButtonsRef.current.set(row, button)
      else rowButtonsRef.current.delete(row)
      syncRows()
    },
    [syncRows],
  )

  const setRowActive = useCallback(
    (row: HTMLElement, active: boolean) => {
      activeMapRef.current.set(row, active)
      recomputeActive()
    },
    [recomputeActive],
  )

  const refreshVisibility = useCallback(() => {
    recomputeActive()
    setActiveIndex(prev => {
      const row = prev !== null ? orderedRowsRef.current[prev] : undefined
      return row && rowSkipped(row) ? null : prev
    })
  }, [recomputeActive, setActiveIndex])

  // A row's rect spans its `<li>`, which grows with an expanded sub-menu: the
  // overlays clamp to the button (32px, the tallest row, if it isn't found).
  const overlayRect = useCallback(
    (row: HTMLElement | null): ItemRect | null => {
      if (!row) return null
      const idx = orderedRowsRef.current.indexOf(row)
      const rect = idx === -1 ? null : itemRects[idx]
      if (!rect) return null
      return { ...rect, height: Math.min(rect.height, rowButton(row)?.offsetHeight ?? 32) }
    },
    [itemRects, rowButton],
  )

  // While a popup anchored in the sidebar is open (a row action's or the
  // header and footer rows' dropdown), hover freezes in every scope: a
  // non-modal popup would let rows underneath keep lighting up. Collapsible
  // rows only set aria-expanded, so they never match.
  const popupOpen = useCallback(() => {
    const container = containerRef.current
    if (!container) return false
    const root = container.closest('[data-slot="sidebar-wrapper"]') ?? container
    return !!root.querySelector(
      '[data-sidebar="menu-button"][data-popup-open], [data-sidebar="menu-action"][data-popup-open]',
    )
  }, [containerRef])

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (popupOpen()) return
      handlers.onMouseMove(e)
    },
    [popupOpen, handlers],
  )

  const onFocus = useCallback(
    (e: FocusEvent) => {
      const target = e.target as HTMLElement
      // Only a row's main button drives the highlight and ring; actions keep their own rings.
      if (!target.closest(ROW_BUTTON)) return
      const row = target.closest<HTMLElement>('[data-sidebar="menu-item"],[data-sidebar="menu-sub-item"]')
      if (!row) return
      const idx = orderedRowsRef.current.indexOf(row)
      if (idx === -1) return
      setActiveIndex(idx)
      setFocusedRowEl(target.matches(':focus-visible') ? row : null)
    },
    [setActiveIndex],
  )

  const onBlur = useCallback(
    (e: FocusEvent) => {
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
      setFocusedRowEl(null)
      setActiveIndex(null)
    },
    [containerRef, setActiveIndex],
  )

  // Arrows, Home and End over every visible button in DOM order, sub rows included.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
      const container = containerRef.current
      if (!container) return
      const items = Array.from(container.querySelectorAll<HTMLElement>(ROW_BUTTON)).filter(el => !rowHidden(el))
      const at = items.indexOf(e.target as HTMLElement)
      if (at === -1) return
      e.preventDefault()
      // Handled arrows stay off window listeners (the docs' ←/→ page navigation).
      e.stopPropagation()
      if (e.key === 'Home') items[0]?.focus()
      else if (e.key === 'End') items[items.length - 1]?.focus()
      else {
        const next = ['ArrowDown', 'ArrowRight'].includes(e.key)
          ? (at + 1) % items.length
          : (at - 1 + items.length) % items.length
        items[next]?.focus()
      }
    },
    [containerRef],
  )

  const hoveredRowEl = activeIndex !== null ? (orderedRows[activeIndex] ?? null) : null

  const value = useMemo<MenuScopeValue>(
    () => ({
      registerRow,
      setRowButton,
      setRowActive,
      hoveredRowEl,
      activeRows,
      firstRowEl: orderedRows[0] ?? null,
      hasActive: activeRows.length > 0,
      refreshVisibility,
    }),
    [registerRow, setRowButton, setRowActive, hoveredRowEl, activeRows, orderedRows, refreshVisibility],
  )

  const shape = useShape()
  const rowLevel = useCallback(
    (row: HTMLElement) => row.closest('[data-sidebar="menu-sub"]') ?? containerRef.current,
    [containerRef],
  )
  // A rect change has two causes. The highlight moving to another row
  // springs (the glide); the same row moving (a sibling sub-tree collapsing
  // above it reflows the rows every frame) snaps, or the overlay chases its
  // own row. Targets compare against the previous commit, so strict mode's
  // double render can't eat a real change.
  const prevTargetsRef = useRef<{
    hover: HTMLElement | null
    focus: HTMLElement | null
    actives: Map<string, HTMLElement>
  }>({ hover: null, focus: null, actives: new Map() })

  // Each active row gets a background keyed by its level and its occurrence
  // in that level, so a moving selection keeps its key and glides.
  const levelOccurrence = new Map<number, number>()
  const levelFirstActive = new Map<number, HTMLElement>()
  const activeRects: { key: string; rect: ItemRect; row: HTMLElement; rowChanged: boolean }[] = []
  for (const row of activeRows) {
    const level = rowLevel(row)
    if (!level) continue
    const levelId = overlayGroupId(level)
    const occurrence = levelOccurrence.get(levelId) ?? 0
    levelOccurrence.set(levelId, occurrence + 1)
    if (!levelFirstActive.has(levelId)) levelFirstActive.set(levelId, row)
    const rect = overlayRect(row)
    const key = `${levelId}:${occurrence}`
    if (rect) activeRects.push({ key, rect, row, rowChanged: prevTargetsRef.current.actives.get(key) !== row })
  }
  const hoverRect = overlayRect(hoveredRowEl)
  const focusRect = focusRing ? overlayRect(focusedRowEl) : null
  const hoverRowChanged = prevTargetsRef.current.hover !== hoveredRowEl
  const focusRowChanged = prevTargetsRef.current.focus !== focusedRowEl

  useIsoLayoutEffect(() => {
    prevTargetsRef.current = {
      hover: hoveredRowEl,
      focus: focusedRowEl,
      actives: new Map(activeRects.map(({ key, row }) => [key, row])),
    }
  })
  // The hover fades in on the active row of its own level, so entering the
  // menu reads as the highlight detaching from where the selection lives.
  const hoveredLevel = hoveredRowEl ? rowLevel(hoveredRowEl) : null
  const hoverAnchorRow =
    (hoveredLevel ? levelFirstActive.get(overlayGroupId(hoveredLevel)) : undefined) ??
    levelFirstActive.values().next().value
  const hoverAnchorRect = hoverAnchorRow ? overlayRect(hoverAnchorRow) : null

  const overlays: ReactNode = isMeasured ? (
    <>
      <AnimatePresence>
        {activeRects.map(({ key, rect, rowChanged }) => (
          <motion.div
            key={key}
            className="pointer-events-none absolute top-0 left-0"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: spring.moderate.exit }}
          >
            <GooIndicator
              rect={rect}
              className={cn('bg-active', shape.bg)}
              transition={rowChanged ? spring.moderate : false}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <FluidHoverHighlight
        rect={hoverRect}
        session={sessionRef.current}
        from={hoverAnchorRect}
        className={shape.bg}
        transition={hoverRowChanged ? undefined : false}
      />
      <FocusRing rect={focusRect} instant={!focusRowChanged} />
    </>
  ) : null

  return {
    value,
    containerProps: {
      onMouseEnter: handlers.onMouseEnter,
      onMouseMove,
      onMouseLeave: handlers.onMouseLeave,
      onClick: handlers.onClick,
      onFocus,
      onBlur,
      // A press switches back to pointer modality: clicking the focused row never re-fires focus.
      onPointerDown: () => setFocusedRowEl(null),
      onKeyDown,
    },
    overlays,
  }
}

/*!
 * Ported from Fluid Functionalism — `registry/default/hooks/use-fluid-hover.ts` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

'use client'

import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export interface ItemRect {
  top: number
  height: number
  left: number
  width: number
}

/** Two rects with the same box (either may be missing). */
export function sameRect(a: ItemRect | null | undefined, b: ItemRect | null | undefined) {
  if (!a || !b) return a === b
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}

export interface UseFluidHoverOptions {
  /**
   * Which direction to resolve the nearest item along.
   *   "y"  — vertical lists (default): closest by top/height
   *   "x"  — horizontal strips: closest by left/width
   *   "xy" — 2-D grids: closest card across both rows AND columns,
   *          measured by Euclidean distance to each item's center
   */
  axis?: 'x' | 'y' | 'xy'
  /**
   * Makes an item invisible to hit-testing without unregistering it — for
   * rows that stay mounted while clipped away (a collapsed sub-tree).
   * Unregistering would invalidate every measurement; a skipped item keeps
   * the set stable. Consulted per mouse move, so keep it cheap.
   */
  isItemDisabled?: (element: HTMLElement) => boolean
  /**
   * Whether a click that lands between items (a gap, the padding, past the
   * last row) is routed to the highlighted item, so what is lit is what a
   * click hits. On by default: in a menu or a list the highlight is a
   * promise about the click. Pass `false` where empty space should stay
   * inert (rows with destructive actions, generous whitespace), or
   * `{ maxDistance }` to route only clicks within that many pixels of the
   * highlighted item's edge.
   */
  gapClick?: boolean | { maxDistance?: number }
}

export interface UseFluidHoverReturn {
  activeIndex: number | null
  setActiveIndex: Dispatch<SetStateAction<number | null>>
  itemRects: ItemRect[]
  /**
   * True once every registered item has been measured and no remeasure is
   * pending, i.e. `itemRects` describes the current item set. Gate absolutely
   * positioned overlays on it: an overlay that mounts against a rect a later
   * pass still corrects animates from the wrong place to the right one, which
   * reads as the highlight sliding in from another row.
   */
  isMeasured: boolean
  sessionRef: MutableRefObject<number>
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
    /**
     * Routes a click that lands between items (a gap, the padding, past the
     * last row) to the highlighted item, so the highlight and the click agree:
     * what is lit is what a click hits. A click inside an item is left to the
     * item. Disabled items (`isItemDisabled`) are never activated.
     */
    onClick: (e: React.MouseEvent) => void
  }
  registerItem: (index: number, element: HTMLElement | null) => void
  /**
   * Invalidates the published rects and runs the hook's coalesced measurement
   * pass again, holding `isMeasured` false until it settles. Reach for it when
   * the rects may be wrong and showing an overlay against them would misplace
   * it: a popup that stays mounted between opens keeps its items registered,
   * so nothing else would notice that its rects were taken while it was
   * hidden. Registration, item resize, and container resize already trigger
   * a pass; do not call this on `children` changes.
   */
  remeasure: () => void
  /**
   * Re-reads the rects synchronously, keeping `isMeasured` as it is. Only for
   * layout that moves the rows under a visible overlay frame by frame (the
   * accordion re-measures inside its height animation). Everything else
   * wants `remeasure`, or nothing.
   */
  measureItems: () => void
}

interface PickNearestInput {
  axis: 'x' | 'y' | 'xy'
  /** The pointer, in viewport coordinates. */
  point: { x: number; y: number }
  /** Item rects in the container's layout space (sparse: unregistered slots
   *  are undefined). */
  rects: readonly (ItemRect | undefined)[]
  /** The container's bounding rect and live scroll / border offsets, which
   *  map layout rects into the pointer's viewport space. */
  containerRect: { left: number; top: number; width: number; height: number }
  scroll: { x: number; y: number }
  border: { x: number; y: number }
  /** Layout size of the container, so a cumulative ancestor `transform:
   *  scale` (a popup mid scale-in) can be factored out per axis. */
  layoutSize: { width: number; height: number }
  /** Skips an item without unregistering it. */
  isDisabled?: (index: number) => boolean
}

/**
 * The rule, as one pure function: an item the pointer is inside wins;
 * otherwise the item whose center is nearest does, so a pointer in a gap, in
 * the padding, or past the last row still lands. `y` and `x` measure one
 * coordinate; `xy` measures the straight line to each center. Ties keep the
 * first item. The hook calls this once per animation frame; the docs page
 * times it.
 */
function pickNearest({
  axis,
  point,
  rects,
  containerRect,
  scroll,
  border,
  layoutSize,
  isDisabled,
}: PickNearestInput): number | null {
  const scaleX = layoutSize.width > 0 ? containerRect.width / layoutSize.width : 1
  const scaleY = layoutSize.height > 0 ? containerRect.height / layoutSize.height : 1
  let closestIndex: number | null = null
  let closestDistance = Infinity
  let containingIndex: number | null = null

  for (let index = 0; index < rects.length; index++) {
    const r = rects[index]
    if (!r) continue
    if (isDisabled?.(index)) continue

    if (axis === 'xy') {
      const left = containerRect.left + (border.x + r.left - scroll.x) * scaleX
      const top = containerRect.top + (border.y + r.top - scroll.y) * scaleY
      const width = r.width * scaleX
      const height = r.height * scaleY
      if (point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height) {
        containingIndex = index
      }
      const distance = Math.hypot(point.x - (left + width / 2), point.y - (top + height / 2))
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
      continue
    }

    const horizontal = axis === 'x'
    const mousePos = horizontal ? point.x : point.y
    const scale = horizontal ? scaleX : scaleY
    const itemStart =
      (horizontal ? containerRect.left : containerRect.top) +
      ((horizontal ? border.x : border.y) + (horizontal ? r.left : r.top) - (horizontal ? scroll.x : scroll.y)) * scale
    const itemSize = (horizontal ? r.width : r.height) * scale
    if (mousePos >= itemStart && mousePos <= itemStart + itemSize) {
      containingIndex = index
    }
    const distance = Math.abs(mousePos - (itemStart + itemSize / 2))
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  }

  return containingIndex ?? closestIndex
}

/** Set on the highlighted item (boolean attribute). */
const ACTIVE_ATTR = 'data-fluid-hover-active'
/** Set on the container: the highlighted index, or absent. */
const ACTIVE_INDEX_ATTR = 'data-fluid-hover-active-index'

const ACTIVATOR_SELECTOR =
  "a[href], button, [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='option'], [role='radio'], [role='checkbox'], [role='tab'], [role='link'], [role='button']"

/**
 * The element a routed click should land on. A registered item is usually
 * the interactive row itself; when it is only a box around one (a sidebar
 * row around its button, a card around its link), the first control inside
 * is what a real click on the row would have reached.
 */
function resolveActivator(element: HTMLElement): HTMLElement {
  if (element.matches(ACTIVATOR_SELECTOR) || element.hasAttribute('tabindex')) {
    return element
  }
  return element.querySelector<HTMLElement>(ACTIVATOR_SELECTOR) ?? element
}

export function useFluidHover<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseFluidHoverOptions = {},
): UseFluidHoverReturn {
  const { axis = 'y', isItemDisabled, gapClick = true } = options
  const gapClickMaxDistance = typeof gapClick === 'object' ? (gapClick.maxDistance ?? Infinity) : Infinity
  const itemsRef = useRef(new Map<number, HTMLElement>())
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  // Mirrored for handlers that read it outside a render (the gap click).
  const activeIndexRef = useRef<number | null>(null)
  activeIndexRef.current = activeIndex

  // The state, in the DOM: `data-fluid-hover-active` on the highlighted item
  // and `data-fluid-hover-active-index` on the container. Devtools shows it
  // and a test asserts on it without waiting for a frame. React does not
  // manage these attributes, so it never clobbers them.
  useEffect(() => {
    const container = containerRef.current
    if (activeIndex === null) container?.removeAttribute(ACTIVE_INDEX_ATTR)
    else container?.setAttribute(ACTIVE_INDEX_ATTR, String(activeIndex))
    const active = activeIndex === null ? undefined : itemsRef.current.get(activeIndex)
    active?.setAttribute(ACTIVE_ATTR, '')
    return () => {
      active?.removeAttribute(ACTIVE_ATTR)
      // A row that re-registered under this index while it was highlighted
      // (a remount under a new key) was marked by registerItem, not by this
      // effect: drop the mark from whatever element holds the index now.
      if (activeIndex !== null) itemsRef.current.get(activeIndex)?.removeAttribute(ACTIVE_ATTR)
    }
  }, [activeIndex, containerRef])
  const [itemRects, setItemRects] = useState<ItemRect[]>([])
  const [isMeasured, setIsMeasured] = useState(false)
  const itemRectsRef = useRef<ItemRect[]>([])
  const sessionRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const remeasureRafIdRef = useRef<number | null>(null)

  /**
   * Publishes a rect for every registered item. Returns false when the
   * measurement could not be completed (no container, or an item without a
   * layout box) — nothing is published in that case, so the last complete
   * measurement stands instead of being overwritten with zeroes.
   */
  const runMeasurement = useCallback(() => {
    const container = containerRef.current
    if (!container) return false
    const rects: ItemRect[] = []
    let everyItemHasLayout = true
    itemsRef.current.forEach((element, index) => {
      // An element inside a display:none / not-yet-laid-out popup has no
      // offsetParent and reports every offset as 0. Publishing that would pin
      // overlays to the top of the list, so treat the whole pass as
      // incomplete. A boxless element is the only case: `position: fixed`
      // items also have no offsetParent but do have a size.
      const hasLayoutBox = element.offsetParent !== null || element.offsetWidth > 0 || element.offsetHeight > 0
      if (!hasLayoutBox) {
        everyItemHasLayout = false
        return
      }
      // Use offset* instead of getBoundingClientRect so measurements are
      // unaffected by CSS transforms (e.g. scaleY animation on the parent
      // motion.div). offsetTop/offsetLeft are layout values relative to the
      // offsetParent (the scroll container), matching the coordinate space
      // used by `position: absolute` children. Items nested inside positioned
      // descendants of the container (a sidebar sub-menu's rows live inside a
      // positioned row) accumulate those ancestors' offsets, so every rect
      // lands in the container's own coordinate space; for a flat list the
      // loop never runs and this is exactly the plain offsetTop/offsetLeft.
      let top = element.offsetTop
      let left = element.offsetLeft
      let ancestor = element.offsetParent as HTMLElement | null
      while (ancestor && ancestor !== container && container.contains(ancestor)) {
        top += ancestor.offsetTop + ancestor.clientTop
        left += ancestor.offsetLeft + ancestor.clientLeft
        ancestor = ancestor.offsetParent as HTMLElement | null
      }
      rects[index] = {
        top,
        height: element.offsetHeight,
        left,
        width: element.offsetWidth,
      }
    })
    if (!everyItemHasLayout) return false
    // Skip the state update when nothing moved (a cheap top/left/width/height
    // compare) so redundant remeasures don't churn re-renders.
    const prev = itemRectsRef.current
    let changed = prev.length !== rects.length
    for (let i = 0; !changed && i < rects.length; i++) changed = !sameRect(prev[i], rects[i])
    if (changed) {
      itemRectsRef.current = rects
      setItemRects(rects)
    }
    return true
  }, [containerRef])

  const measureItems = useCallback(() => {
    runMeasurement()
  }, [runMeasurement])

  /**
   * The hook's single measurement pass, read right after the browser's own
   * layout: every trigger (registration, `remeasure`, an item or the
   * container resizing) lands in one ResizeObserver callback, where reading
   * offsets costs no extra layout. Re-observing the container is the trigger
   * (`observe` reports a laid-out target once), and a container without a box
   * (a popup not laid out yet) reports when it gets one. It is the only place
   * readiness turns true, so `isMeasured` can never be true while a pass is
   * still queued.
   */
  const onObserved = useCallback(() => {
    if (runMeasurement()) setIsMeasured(true)
  }, [runMeasurement])

  const roRef = useRef<ResizeObserver | null>(null)
  const observedContainerRef = useRef<HTMLElement | null>(null)
  const getRo = useCallback(() => {
    if (roRef.current === null && typeof ResizeObserver !== 'undefined') {
      roRef.current = new ResizeObserver(onObserved)
    }
    return roRef.current
  }, [onObserved])

  // Re-observing the container makes the observer report it after the next
  // layout. Deferred to a microtask: registrations run in the commit before
  // the container's own ref attaches. Without ResizeObserver (tests), a frame.
  const queuedRef = useRef(false)
  const scheduleMeasurement = useCallback(() => {
    if (queuedRef.current) return
    queuedRef.current = true
    queueMicrotask(() => {
      queuedRef.current = false
      const ro = getRo()
      const container = containerRef.current
      if (!ro || !container) {
        if (remeasureRafIdRef.current !== null) cancelAnimationFrame(remeasureRafIdRef.current)
        remeasureRafIdRef.current = requestAnimationFrame(() => {
          remeasureRafIdRef.current = null
          onObserved()
        })
        return
      }
      if (observedContainerRef.current && observedContainerRef.current !== container) {
        ro.unobserve(observedContainerRef.current)
      }
      observedContainerRef.current = container
      ro.unobserve(container)
      ro.observe(container, { box: 'border-box' })
    })
  }, [containerRef, getRo, onObserved])

  const remeasure = useCallback(() => {
    // Readiness drops first: until the pass below settles, the published rects
    // may not describe what is on screen, and an overlay positioned from them
    // would be corrected after mounting — which animates as a slide.
    setIsMeasured(false)
    scheduleMeasurement()
  }, [scheduleMeasurement])

  // How many indices hold each element: a row that moves to another index
  // within one batch must stay observed.
  const observedRef = useRef(new Map<HTMLElement, number>())
  const track = useCallback(
    (element: HTMLElement, by: 1 | -1) => {
      const count = (observedRef.current.get(element) ?? 0) + by
      if (count > 0) observedRef.current.set(element, count)
      else observedRef.current.delete(element)
      // Border box: a row whose padding animates (actions revealed on hover)
      // keeps its rect, so it must not remeasure the list every frame.
      if (by === 1 && count === 1) getRo()?.observe(element, { box: 'border-box' })
      if (count === 0) roRef.current?.unobserve(element)
    },
    [getRo],
  )

  const registerItem = useCallback(
    (index: number, element: HTMLElement | null) => {
      const previous = itemsRef.current.get(index)
      // The same element at the same index (a parent re-registering its whole
      // set) changes nothing.
      if (element && previous === element) return
      if (previous) track(previous, -1)
      if (element) {
        itemsRef.current.set(index, element)
        track(element, 1)
        if (index === activeIndexRef.current) element.setAttribute(ACTIVE_ATTR, '')
      } else {
        // The mark leaves with the element: a row that only moved to another
        // index (a filtering list re-ordering) must not carry it there.
        previous?.removeAttribute(ACTIVE_ATTR)
        itemsRef.current.delete(index)
        // The highlighted row is gone: nothing should stay lit or receive a
        // routed click until the pointer picks again. Decided when the
        // update applies, after this commit's registrations, so a row that
        // only moved index hands the highlight to the row now under it.
        if (index === activeIndexRef.current) {
          setActiveIndex(current => (current === index && !itemsRef.current.has(index) ? null : current))
        }
      }
      // Coalesced: a list remounting its rows (an AnimatePresence swap) runs
      // one pass, after layout, so consumers don't call measureItems after
      // the container's children swap.
      remeasure()
    },
    [remeasure, track],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const mouseX = e.clientX
      const mouseY = e.clientY

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        const container = containerRef.current
        if (!container) return
        setActiveIndex(
          pickNearest({
            axis,
            point: { x: mouseX, y: mouseY },
            rects: itemRectsRef.current,
            containerRect: container.getBoundingClientRect(),
            scroll: { x: container.scrollLeft, y: container.scrollTop },
            border: { x: container.clientLeft, y: container.clientTop },
            layoutSize: { width: container.offsetWidth, height: container.offsetHeight },
            isDisabled: isItemDisabled
              ? index => {
                  const el = itemsRef.current.get(index)
                  return !!el && isItemDisabled(el)
                }
              : undefined,
          }),
        )
      })
    },
    [axis, containerRef, isItemDisabled],
  )

  const handleMouseEnter = useCallback(() => {
    sessionRef.current += 1
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    setActiveIndex(null)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      // Inside an item: the item owns the click.
      for (const element of itemsRef.current.values()) {
        if (element.contains(target)) return
      }
      // A row that unmounted while its own click was still bubbling (a pick
      // whose primitive re-renders the list synchronously, like a "create"
      // row that becomes a real item) already landed; it is not a gap.
      if (!target.isConnected) return
      // A control that sits between the rows (a search field at the top of
      // a menu, a footer button) keeps its own click too.
      const control = (target as Element).closest?.(
        "input, textarea, select, button, a, summary, [contenteditable], [role='textbox'], [role='searchbox'], [role='button']",
      )
      if (control) return
      if (gapClick === false) return
      const index = activeIndexRef.current
      if (index === null) return
      const element = itemsRef.current.get(index)
      if (!element || isItemDisabled?.(element)) return
      if (gapClickMaxDistance !== Infinity) {
        const r = element.getBoundingClientRect()
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
        if (Math.hypot(dx, dy) > gapClickMaxDistance) return
      }
      // A real DOM click on the item, so its own handlers (and the primitive
      // wrapping it, if any) run exactly as if the pointer had been inside.
      resolveActivator(element).click()
    },
    [isItemDisabled, gapClick, gapClickMaxDistance],
  )

  // The container resizing reflows the items even though the set is
  // unchanged. Readiness is deliberately not dropped: the published rects
  // stay usable, and hiding overlays on every reflow would flicker them.
  useEffect(() => {
    const container = containerRef.current
    const ro = getRo()
    if (!container || !ro) return
    observedContainerRef.current = container
    ro.observe(container, { box: 'border-box' })
    return () => {
      ro.unobserve(container)
      if (observedContainerRef.current === container) observedContainerRef.current = null
    }
  }, [containerRef, getRo])

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      if (remeasureRafIdRef.current !== null) cancelAnimationFrame(remeasureRafIdRef.current)
      roRef.current?.disconnect()
      roRef.current = null
      observedRef.current.clear()
    }
  }, [])

  return {
    activeIndex,
    setActiveIndex,
    itemRects,
    isMeasured,
    sessionRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
    },
    registerItem,
    remeasure,
    measureItems,
  }
}

/**
 * Registers an item's element with its list for as long as it is mounted.
 * The one way rows join a list: pass the hook's `registerItem` (or the copy
 * a context hands down), the row's index, and its ref. Either may be
 * missing for a row rendered outside a list (a standalone card, an accordion
 * item that is not grouped); then nothing is registered.
 */
export function useRegisterFluidHoverItem(
  registerItem: ((index: number, element: HTMLElement | null) => void) | undefined,
  index: number | undefined,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!registerItem || index === undefined) return
    registerItem(index, ref.current)
    return () => registerItem(index, null)
  }, [index, registerItem, ref])
}

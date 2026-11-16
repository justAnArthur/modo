/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tabs.tsx` + `registry/base/tabs-subtle.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import {
  Children,
  type ComponentPropsWithoutRef,
  forwardRef,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useRowFocus } from '../../../lib/row-group'
import { IndexedRows } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { useLift } from '../../../lib/surface-context'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { TabsListContext, useTabs } from './context'

interface TabsListProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Arrow keys select as they move focus. Defaults to `true` for `segmented`, `false` for `subtle` (Enter or Space selects) and for link tabs (Enter follows the link). */
  activateOnFocus?: boolean
}

// Wider than its container, a list scrolls inside itself. The subtle list's
// -m-1 p-1 leaves the 2px-outset focus ring room; its max-width adds the
// margins back, since a fit-content parent sizes against the margin box.
const segmentedClass =
  'relative inline-flex max-w-full items-center overflow-x-auto scrollbar-hide select-none bg-muted'
const subtleClass =
  'relative flex items-center select-none overflow-x-auto max-w-[calc(100%_+_8px)] scrollbar-hide -mx-1 px-1 -my-1 py-1'

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, activateOnFocus, ...props }, ref) => {
    const { variant, selectedValue, setFallback } = useTabs('Tabs.List')
    const subtle = variant === 'subtle'
    const containerRef = useRef<HTMLDivElement>(null)
    const mergedRef = useMergeRefs(containerRef, ref)
    const mouseInside = useRef(false)
    const shape = useShape()
    const size = useSize()
    const lift = useLift(3)
    const hover = useFluidHover(containerRef, { axis: 'x' })
    const { activeIndex: hoveredIndex, setActiveIndex, itemRects, handlers, registerItem, measureItems } = hover
    const focus = useRowFocus(hover)

    // Positions match IndexedRows: one per element child.
    const items = Children.toArray(children)
      .filter(isValidElement)
      .map(child => child.props as { value?: unknown; href?: string; render?: unknown })
    const values = items.map(item => item.value)
    const links = items.some(item => item.href !== undefined || item.render !== undefined)
    const first = values.find((v): v is string => typeof v === 'string')

    useLayoutEffect(() => {
      setFallback(first)
    }, [first, setFallback])

    useEffect(() => {
      measureItems()
    }, [measureItems, children])

    const selectedIndex = selectedValue === undefined ? -1 : values.indexOf(selectedValue)
    const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null)
    useEffect(() => {
      setOptimisticIndex(selectedIndex >= 0 ? selectedIndex : null)
    }, [selectedIndex])

    const selectedRect = optimisticIndex === null ? null : (itemRects[optimisticIndex] ?? null)
    const hoverRect = hoveredIndex === null ? null : itemRects[hoveredIndex]
    const hovering = hoveredIndex !== null && hoveredIndex !== optimisticIndex
    const listContext = useMemo(
      () => ({ registerTab: registerItem, hoveredIndex, setOptimisticIndex }),
      [registerItem, hoveredIndex],
    )

    return (
      <TabsListContext.Provider value={listContext}>
        <TabsPrimitive.List
          activateOnFocus={activateOnFocus ?? !(subtle || links)}
          ref={mergedRef}
          onMouseMove={e => {
            mouseInside.current = true
            handlers.onMouseMove(e)
          }}
          onMouseLeave={() => {
            mouseInside.current = false
            handlers.onMouseLeave()
          }}
          onFocus={focus.handlers.onFocus}
          onBlur={e => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
            focus.setFocusedIndex(null)
            if (!mouseInside.current) setActiveIndex(null)
          }}
          className={cn(subtle ? subtleClass : [segmentedClass, size.segmentPad, shape.container], className)}
          {...props}
        >
          {selectedRect && (
            <GooIndicator
              rect={selectedRect}
              className={cn(subtle ? 'bg-active' : SURFACE_BG[lift], shape.bg)}
              shadow={subtle ? undefined : SURFACE_SHADOW[lift]}
              opacity={hovering ? (subtle ? 0.8 : 0.85) : 1}
            />
          )}
          {/* The hover pill rests on the selected tab, so it drips back into it as it fades. */}
          {selectedRect && (
            <GooIndicator
              rect={hovering && hoverRect ? hoverRect : selectedRect}
              className={cn(subtle ? 'bg-active' : 'bg-hover', shape.bg)}
              transition={spring.fast}
              opacity={hovering ? 0.4 : 0}
            />
          )}
          <FocusRing rect={focus.focusRect} />
          <IndexedRows>{children}</IndexedRows>
        </TabsPrimitive.List>
      </TabsListContext.Provider>
    )
  },
)

TabsList.displayName = 'TabsList'

export type { TabsListProps }
export { TabsList }

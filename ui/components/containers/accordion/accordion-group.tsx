/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/accordion.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { AnimatePresence, motion } from 'motion/react'
import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { mergeRefs } from '../../../lib/merge-refs'
import { useRowFocus } from '../../../lib/row-group'
import { IndexedRows } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import type { SizeVariant } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { type ItemRect, useFluidHover } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import {
  AccordionGroupContext,
  type AccordionGroupContextValue,
  type AccordionHighlight,
  type AccordionValueProps,
  htmlProps,
  useAccordionValue,
} from './accordion-context'

type AccordionGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> & {
  children: ReactNode
  size?: SizeVariant
  highlight?: AccordionHighlight
} & AccordionValueProps

const sameRects = (a: Map<number, ItemRect>, b: Map<number, ItemRect>) => {
  if (a.size !== b.size) return false
  for (const [index, r] of b) {
    const p = a.get(index)
    if (!p || p.top !== r.top || p.left !== r.left || p.width !== r.width || p.height !== r.height) return false
  }
  return true
}

const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProps>((props, ref) => {
  const { children, highlight = 'item', size, className, ...rest } = props
  const accordion = useAccordionValue(props)

  const containerRef = useRef<HTMLDivElement>(null)
  const fullItems = useRef<Map<number, HTMLElement>>(new Map())
  const [openItemRects, setOpenItemRects] = useState<Map<number, ItemRect>>(new Map())
  const openItemRectsRef = useRef(openItemRects)

  const hover = useFluidHover(containerRef)
  const { activeIndex, setActiveIndex, itemRects, handlers, registerItem, measureItems } = hover
  const focus = useRowFocus(hover)

  const registerFullItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) fullItems.current.set(index, element)
    else fullItems.current.delete(index)
  }, [])

  // Runs every morph frame, so it skips the state update when nothing moved.
  const measureFullItems = useCallback(() => {
    const next = new Map<number, ItemRect>()
    fullItems.current.forEach((el, index) => {
      next.set(index, { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight })
    })
    if (sameRects(openItemRectsRef.current, next)) return
    openItemRectsRef.current = next
    setOpenItemRects(next)
  }, [])

  const openValues = useMemo(() => new Set(accordion.open), [accordion.open])

  // Remeasure when the rows or the open set change.
  useEffect(() => {
    measureItems()
    measureFullItems()
  }, [measureItems, measureFullItems, children, accordion.key])

  // Rows a morphing panel pushes around carry the highlight and the focus
  // ring with them (a snap, not a spring chasing them) until the pointer or
  // the focus moves again.
  const [reflowing, setReflowing] = useState(false)
  const remeasure = useCallback(() => {
    setReflowing(true)
    measureItems()
    measureFullItems()
  }, [measureItems, measureFullItems])

  // "trigger" tints an open row only while it's hovered: the panel already
  // says it's open. The "item" block is drawn by each item's content.
  const expandedRects =
    highlight === 'trigger'
      ? [...openItemRects.keys()].flatMap(index => {
          const rect = index === activeIndex ? itemRects[index] : undefined
          return rect ? [[index, rect] as const] : []
        })
      : []

  const dimOpen = activeIndex !== null && !openItemRects.has(activeIndex)
  const shape = useShape()

  // The pointer over an open panel lights no row.
  const onMouseMove = (e: MouseEvent) => {
    setReflowing(false)
    const container = containerRef.current
    if (container) {
      const box = container.getBoundingClientRect()
      const scale = container.offsetHeight > 0 ? box.height / container.offsetHeight : 1
      const y = (e.clientY - box.top) / scale + container.scrollTop
      for (const [index, full] of openItemRects) {
        const trigger = itemRects[index]
        if (trigger && y >= trigger.top + trigger.height && y <= full.top + full.height) {
          setActiveIndex(null)
          return
        }
      }
    }
    handlers.onMouseMove(e)
  }

  const groupContext = useMemo<AccordionGroupContextValue>(
    () => ({ registerItem, registerFullItem, activeIndex, remeasure, openValues, openItemRects, highlight, dimOpen }),
    [registerItem, registerFullItem, activeIndex, remeasure, openValues, openItemRects, highlight, dimOpen],
  )

  return (
    <SizeScope size={size}>
      <AccordionGroupContext.Provider value={groupContext}>
        <AccordionPrimitive.Root
          value={accordion.open}
          onValueChange={accordion.onValueChange}
          multiple={accordion.multiple}
          render={rootProps => {
            const {
              style: _style,
              onDrag: _onDrag,
              onDragStart: _onDragStart,
              onDragEnd: _onDragEnd,
              onAnimationStart: _onAnimationStart,
              onAnimationEnd: _onAnimationEnd,
              onAnimationIteration: _onAnimationIteration,
              ...root
            } = rootProps as HTMLAttributes<HTMLDivElement>
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: the fluid hover tracks the pointer here; the triggers are the controls.
              <div
                {...root}
                ref={mergeRefs(containerRef, ref)}
                onMouseEnter={handlers.onMouseEnter}
                onMouseMove={onMouseMove}
                onMouseLeave={handlers.onMouseLeave}
                onFocus={e => {
                  setReflowing(false)
                  focus.handlers.onFocus(e)
                }}
                onBlur={focus.handlers.onBlur}
                className={cn('relative flex flex-col', className)}
                {...htmlProps(rest)}
              >
                <AnimatePresence>
                  {expandedRects.map(([index, rect]) => (
                    <motion.div
                      key={`expanded-${index}`}
                      className={cn('absolute bg-accent/20 dark:bg-accent/12 pointer-events-none', shape.bg)}
                      // Fades in at the row's rect; the geometry snaps so the fill hugs a moving row.
                      initial={{ ...rect, opacity: 0 }}
                      animate={{ ...rect, opacity: dimOpen ? 0.7 : 1 }}
                      exit={{ opacity: 0, transition: spring.moderate.exit }}
                      transition={{
                        top: { duration: 0 },
                        left: { duration: 0 },
                        width: { duration: 0 },
                        height: { duration: 0 },
                        opacity: { duration: spring.moderate.exit.duration },
                      }}
                    />
                  ))}
                </AnimatePresence>
                {/* One layer above the items' open tints. */}
                <FluidHoverHighlight
                  hover={hover}
                  className={cn(shape.bg, 'z-1')}
                  transition={reflowing ? false : undefined}
                />
                <FocusRing rect={focus.focusRect} instant={reflowing} />
                <IndexedRows>{children}</IndexedRows>
              </div>
            )
          }}
        />
      </AccordionGroupContext.Provider>
    </SizeScope>
  )
})

AccordionGroup.displayName = 'AccordionGroup'

export type { AccordionGroupProps }
export { AccordionGroup }

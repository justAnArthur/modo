/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/accordion.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { forwardRef, type HTMLAttributes, type ReactNode, useContext, useId, useRef, useState } from 'react'
import { useMergeRefs } from '../../lib/merge-refs'
import { GooFilter } from '../../lib/morph-layers'
import { clampRect, lerpRect, placeRect, type Rect } from '../../lib/rect'
import { useReduceMotion } from '../../lib/reduced-motion'
import { useShape } from '../../lib/shape-context'
import { useSize } from '../../lib/size-context'
import { spring, springEnter } from '../../lib/springs'
import { useIsoLayoutEffect } from '../../lib/use-iso-layout-effect'
import { GOO_BLUR_RATIO } from '../../lib/use-morph'
import { cn } from '../../lib/utils'
import { AccordionGroupContext, useAccordionItem } from './accordion-context'

interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Collapsible content. */
  children: ReactNode
  /** How the panel grows out of its row (see Morph): `goo` melts the open tint out of the row through a liquid neck, `morph` grows it without one. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph'
  /** Spring tier the panel opens on; it closes on the tier's faster exit tween. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
}

// `t` stops at 1: the slow tier's bounce would push the rows below past their place and back.
const grow = (a: Rect, b: Rect, t: number) => clampRect(lerpRect(a, b, Math.min(1, t)))

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, effect = 'goo', tier = 'slow', ...props }, ref) => {
    const group = useContext(AccordionGroupContext)
    const { isOpen, highlight, press } = useAccordionItem()
    const shape = useShape()
    const sizeClasses = useSize()
    const reduceMotion = useReduceMotion()
    const gooId = `accordion-goo-${useId().replace(/:/g, '')}`
    const progress = useMotionValue(isOpen ? 1 : 0)
    // The tint holds for most of the morph and fades only as the shape gets
    // back into the row, so the shape, not a fade, carries the motion.
    const tint = useTransform(progress, [0, 0.3], [0, 1])
    const remeasure = useRef(group?.remeasure)
    remeasure.current = group?.remeasure

    const refs = {
      panel: useRef<HTMLDivElement>(null),
      content: useRef<HTMLDivElement>(null),
      rest: useRef<HTMLDivElement>(null),
      goo: useRef<HTMLDivElement>(null),
      row: useRef<HTMLDivElement>(null),
      shape: useRef<HTMLDivElement>(null),
    }
    const panelRef = useMergeRefs(refs.panel, ref)

    // In the item's coordinates: `x` is the source's left edge, `row` the
    // trigger row's height (the panel's offsetTop), `body` the content's.
    const geometry = useRef({ x: 0, width: 0, row: 0, body: 0 })

    // One frame: the shape grows from a point in the row to the whole item.
    // The panel's height is the shape's reach below the row, so the rows
    // underneath ride its bottom edge, and the content shows only inside it.
    const render = (p: number) => {
      const { x, width, row, body } = geometry.current
      const rect = grow(
        { x, y: row / 2, w: 0, h: 0, r: width },
        { x: 0, y: 0, w: width, h: row + body, r: shape.bgRadius },
        p,
      )
      const reach = rect.y + rect.h - row
      const { panel, content } = refs
      if (panel.current) panel.current.style.height = `${Math.max(0, reach)}px`
      if (content.current) {
        content.current.style.clipPath = `inset(${rect.y - row}px ${width - rect.x - rect.w}px ${body - reach}px ${rect.x}px round ${rect.r}px)`
      }
      placeRect(refs.shape.current, rect)
      remeasure.current?.()
    }

    // Base UI's Panel would apply `hidden` the moment a controlled item
    // closes, cutting the morph off: the attribute is ours, set once the
    // close has finished, and cleared during render so the panel is laid out
    // before the opening morph's first frame.
    const [exitComplete, setExitComplete] = useState(!isOpen)
    if (isOpen && exitComplete) setExitComplete(false)

    // At rest the panel's height and the tint are their classes again, so
    // they follow content that resizes.
    const settle = (open: boolean) => {
      const { panel, content, goo, rest } = refs
      if (panel.current) panel.current.style.height = open ? '' : '0px'
      // Closed, the content stays clipped shut: `hidden` lands a commit later,
      // and unclipped content would paint below the row for a frame.
      if (content.current) content.current.style.clipPath = open ? '' : 'inset(50%)'
      if (goo.current) goo.current.style.display = ''
      if (rest.current) rest.current.style.display = ''
      remeasure.current?.()
      if (!open) setExitComplete(true)
    }

    const wasOpen = useRef(isOpen)
    useIsoLayoutEffect(() => {
      if (wasOpen.current === isOpen) return
      wasOpen.current = isOpen
      const { panel, content, goo, rest, row } = refs
      if (!panel.current || !content.current) return
      const g = geometry.current
      g.width = panel.current.offsetWidth
      g.row = panel.current.offsetTop
      g.body = content.current.offsetHeight
      // A reopen mid-close keeps its source, so the shape never jumps.
      if (isOpen && progress.get() === 0) g.x = press.current ?? g.width / 2
      press.current = null

      if (reduceMotion) {
        progress.set(isOpen ? 1 : 0)
        settle(isOpen)
        return
      }
      if (goo.current) goo.current.style.display = 'block'
      if (rest.current) rest.current.style.display = 'none'
      if (row.current) row.current.style.height = `${g.row}px`
      render(progress.get())
      const controls = animate(progress, isOpen ? 1 : 0, {
        ...(isOpen ? springEnter(spring[tier]) : spring[tier].exit),
        onUpdate: render,
        onComplete: () => settle(isOpen),
      })
      return () => controls.stop()
    }, [isOpen])

    // The content keeps its natural size while the panel morphs, so this
    // never feeds back: it retargets a running morph and, at rest, lets the
    // group remeasure rows a nested accordion pushed around.
    useIsoLayoutEffect(() => {
      const content = refs.content.current
      if (!content) return
      const observer = new ResizeObserver(() => {
        if (content.offsetHeight > 0) geometry.current.body = content.offsetHeight
        remeasure.current?.()
      })
      observer.observe(content)
      return () => observer.disconnect()
    }, [])

    // Panel keepMounted keeps the element, and its trigger ↔ panel ARIA, through the close.
    return (
      <AccordionPrimitive.Panel
        keepMounted
        render={panelProps => {
          // Base UI's `style` only carries its size vars, which stay `auto`: it never measures a JS animation.
          const {
            hidden: _hidden,
            style: _style,
            ...panel
          } = panelProps as HTMLAttributes<HTMLDivElement> & {
            hidden?: boolean
          }
          return (
            <div {...panel} hidden={!isOpen && exitComplete}>
              {/* Neither this nor the panel is positioned, so the tint covers the whole item (row + panel). */}
              <div ref={panelRef} className={className} {...props}>
                {highlight === 'item' && (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    initial={false}
                    animate={{ opacity: group?.dimOpen ? 0.7 : 1 }}
                    transition={{ duration: spring.moderate.exit.duration }}
                  >
                    <motion.div className="absolute inset-0" style={{ opacity: tint }}>
                      {/* Solid shapes, so the goo threshold sees full alpha; the strength fades as one layer. */}
                      <div className="absolute inset-0 opacity-20 dark:opacity-12">
                        <div ref={refs.rest} className={cn('absolute inset-0 bg-accent', shape.bg)} />
                        {effect === 'goo' && <GooFilter id={gooId} blur={shape.bgRadius * GOO_BLUR_RATIO} />}
                        <div
                          ref={refs.goo}
                          className="absolute inset-0 hidden"
                          style={effect === 'goo' ? { filter: `url(#${gooId})` } : undefined}
                        >
                          <div ref={refs.row} className={cn('absolute inset-x-0 top-0 bg-accent', shape.bg)} />
                          <div ref={refs.shape} className="absolute bg-accent" />
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                <div
                  ref={refs.content}
                  className={cn(
                    'relative pt-1 text-muted-foreground',
                    sizeClasses.px,
                    sizeClasses.text,
                    sizeClasses.variant === 'compact' ? 'pb-2.5' : 'pb-3',
                  )}
                >
                  {children}
                </div>
              </div>
            </div>
          )
        }}
      />
    )
  },
)

AccordionContent.displayName = 'AccordionContent'

export type { AccordionContentProps }
export { AccordionContent }

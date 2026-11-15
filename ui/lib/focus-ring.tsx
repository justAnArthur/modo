/*
 * Local addition (not part of Fluid Functionalism): the keyboard focus ring
 * that springs from row to row in a list, a menu or a tab strip.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useReduceMotion } from './reduced-motion'
import { useShape } from './shape-context'
import { spring } from './springs'
import type { ItemRect } from './use-fluid-hover'
import { cn } from './utils'

interface FocusRingProps {
  /** The focused row's box (from `useFluidHover`'s `itemRects`), or `null` for no ring. */
  rect: ItemRect | null
  /** Jump to the rect instead of springing there, for a reflow that moves the row under the ring. Defaults to `false`. */
  instant?: boolean
  /** Classes for the ring, e.g. another shape's `focusRing` radius. */
  className?: string
}

/**
 * A 1px `focus-ring` border drawn 2px outside the focused row. It springs
 * between rows on `spring.fast` (jumps under reduced motion) and fades out
 * when focus leaves. Render it inside the rows' `relative` container, above
 * the hover highlight.
 */
export function FocusRing({ rect, instant = false, className }: FocusRingProps) {
  const shape = useShape()
  const reduceMotion = useReduceMotion()
  const jump = instant || reduceMotion

  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          aria-hidden
          className={cn('pointer-events-none absolute z-20 border border-focus-ring', shape.focusRing, className)}
          initial={false}
          animate={{ left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 }}
          exit={{ opacity: 0, transition: spring.fast.exit }}
          transition={{ ...(jump ? { duration: 0 } : spring.fast), opacity: { duration: spring.fast.duration } }}
        />
      )}
    </AnimatePresence>
  )
}

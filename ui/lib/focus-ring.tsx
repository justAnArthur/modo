/*
 * Local addition (not part of Fluid Functionalism): the one keyboard ring a
 * list panel draws (Dropdown and its submenus, NavigationMenu's panels,
 * Select): 2px outside the focused row, springing between rows on
 * `spring.fast` (a snap under reduced motion) and fading out on its exit.
 * Its corners follow the surrounding shape's `focusRing` radius, concentric
 * with the row; a popup that pins its own shape passes it.
 */

import { AnimatePresence, motion } from 'motion/react'
import { useReduceMotion } from './reduced-motion'
import { type ShapeVariant, shapeMap, useShape } from './shape-context'
import { spring } from './springs'
import type { ItemRect } from './use-fluid-hover'
import { cn } from './utils'

interface FocusRingProps {
  /** The focused row's rect in the panel's coordinates; nothing while none has keyboard focus. */
  rect: ItemRect | null | undefined
  /** Pins the radius to one shape (popups stay `rounded`); defaults to the surrounding ShapeProvider. */
  shape?: ShapeVariant
}

/** The keyboard ring: 2px outside the focused row, springing between rows. */
function FocusRing({ rect, shape }: FocusRingProps) {
  const surrounding = useShape()
  const radius = (shape ? shapeMap[shape] : surrounding).focusRing
  const reduced = useReduceMotion()
  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          aria-hidden="true"
          className={cn('pointer-events-none absolute z-20 border border-focus-ring', radius)}
          initial={false}
          animate={{ left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 }}
          exit={{ opacity: 0, transition: spring.fast.exit }}
          transition={reduced ? { duration: 0 } : { ...spring.fast, opacity: { duration: spring.fast.duration } }}
        />
      )}
    </AnimatePresence>
  )
}

export type { FocusRingProps }
export { FocusRing }

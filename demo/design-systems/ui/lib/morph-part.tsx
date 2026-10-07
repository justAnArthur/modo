/*
 * Local addition (not part of Fluid Functionalism): shared parts for morphing
 * overlays. A part inside the trigger and its twin inside the overlay share a
 * motion `layoutId`, so the part flies from one to the other while the surface
 * morphs, like motion-primitives' morphing dialog image and title
 * (github.com/ibelick/motion-primitives `components/core/morphing-dialog.tsx`
 * @ 120f64f6ca60348e251f929e9c81f11ccbe45eda — MIT © 2024 ibelick, notice:
 * LICENSE.motion-primitives).
 */

import { motion } from 'motion/react'
import { createContext, type ReactNode, useContext } from 'react'
import { useReduceMotion } from './reduced-motion'
import { spring } from './springs'

/** Set by an overlay root: the id its parts are scoped to and whether it is open. */
const MorphPartScope = createContext<{ id: string; open: boolean } | null>(null)

/** True inside an overlay's surface (`MorphSurface` provides it). */
const MorphPartInOverlay = createContext(false)

const { exit: _exit, ...enter } = spring.slow

interface MorphPartProps {
  /** Pairs the part in the trigger with its twin in the overlay; unique within one overlay. */
  id: string
  /** Classes for the part's box. */
  className?: string
  /** The part's content: an image, a title. */
  children?: ReactNode
}

function MorphPart({ id, className, children }: MorphPartProps) {
  const scope = useContext(MorphPartScope)
  const inOverlay = useContext(MorphPartInOverlay)
  const reduced = useReduceMotion()
  // The overlay's twin lets go of the id as soon as the close starts, so the
  // trigger's part flies back while Base UI still shows the closing overlay.
  const layoutId = scope && !reduced && (scope.open || !inOverlay) ? `${scope.id}-${id}` : undefined

  return (
    <motion.div layoutId={layoutId} transition={enter} className={className}>
      {children}
    </motion.div>
  )
}

export type { MorphPartProps }
export { MorphPart, MorphPartInOverlay, MorphPartScope }

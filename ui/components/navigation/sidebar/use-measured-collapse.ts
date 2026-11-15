/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx`, `sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import type { Transition } from 'motion/react'
import { useRef, useState } from 'react'
import { spring } from '../../../lib/springs'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'

/**
 * The fold of a collapsible group or sub-menu: motion props that animate
 * between 0 and the content's measured `offsetHeight` (never to `auto`,
 * which motion measures wrong under a scaled ancestor). Spread `motion` on
 * the wrapper and put `contentRef` on its content.
 */
export function useMeasuredCollapse<T extends HTMLElement>(open: boolean, enabled = true) {
  const contentRef = useRef<T | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  useIsoLayoutEffect(() => {
    const el = contentRef.current
    if (!enabled || !el || typeof ResizeObserver === 'undefined') return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled])

  // Spring only when this fold toggles. A height change from a nested fold
  // inside it snaps: a spring retargeted every frame chases the child's own
  // animation and drags everything below along late. Do NOT simplify the
  // transition to `open ? spring.moderate : …`.
  const prevOpen = useRef(open)
  const toggling = useRef(false)
  if (prevOpen.current !== open) {
    prevOpen.current = open
    toggling.current = true
  }

  const measured = height !== null
  const transition: Transition = toggling.current ? (open ? spring.moderate : spring.moderate.exit) : { duration: 0 }

  return {
    contentRef,
    measured,
    motion: {
      initial: false,
      // Defined from the first render: motion ignores an `animate` that appears later.
      animate: measured ? { height: open ? height : 0, opacity: open ? 1 : 0 } : { opacity: open ? 1 : 0 },
      transition,
    },
    /** Call from `onAnimationComplete`. */
    settle: () => {
      toggling.current = false
    },
  }
}

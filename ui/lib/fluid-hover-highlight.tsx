/*!
 * Ported from Fluid Functionalism — `registry/default/fluid-hover-highlight.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

'use client'

import { AnimatePresence, motion, type Transition } from 'motion/react'
import { GooIndicator } from './goo-indicator'
import { spring } from './springs'
import type { ItemRect, UseFluidHoverReturn } from './use-fluid-hover'
import { cn } from './utils'

type FluidHoverSource = Pick<UseFluidHoverReturn, 'activeIndex' | 'itemRects' | 'isMeasured' | 'sessionRef'>

interface HighlightFromHook {
  /** The hook's return value. The highlight sits on
   *  `itemRects[activeIndex]` once `isMeasured`, and re-keys on the session. */
  hover: FluidHoverSource
  /** Keep the list's state but show nothing (a closed popup, hover switched
   *  off). Runs the exit fade. */
  hidden?: boolean
  rect?: never
  session?: never
}

interface HighlightFromRect {
  /** For lists that resolve their own rect (the sidebar's unified scope):
   *  the rect to sit on, in the container's coordinate space. `null` hides
   *  the highlight (it fades out on `spring.fast.exit`). */
  rect: ItemRect | null
  /** `sessionRef.current` from `useFluidHover`. It increments when the
   *  cursor enters the container, which re-keys the highlight so it fades in
   *  at `from ?? rect` instead of sliding over from wherever it was last. */
  session: number
  hover?: never
  hidden?: never
}

export type FluidHoverHighlightProps = (HighlightFromHook | HighlightFromRect) & {
  /** Where a fresh session fades in from. A dropdown passes its checked row,
   *  a nav menu its active route. Defaults to the rect itself. */
  from?: ItemRect | null
  /** Radius, z-index, anything else. Merged onto
   *  `absolute bg-hover pointer-events-none`. */
  className?: string
  /** The positional spring. Defaults to `spring.fast`. `false` snaps with no
   *  travel (a reflow moved the rows, not the hover). Reduced motion snaps too. */
  transition?: Transition | false
}

const fade: Transition = { duration: 0.08 }

function highlightSource(props: FluidHoverHighlightProps): {
  rect: ItemRect | null
  session: number
} {
  if (props.hover) {
    const { activeIndex, itemRects, isMeasured, sessionRef } = props.hover
    const rect = !props.hidden && isMeasured && activeIndex !== null ? (itemRects[activeIndex] ?? null) : null
    return { rect, session: sessionRef.current }
  }
  return { rect: props.rect, session: props.session }
}

export function FluidHoverHighlight(props: FluidHoverHighlightProps) {
  const { from, className, transition } = props
  const { rect, session } = highlightSource(props)
  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          key={session}
          data-slot="fluid-hover-highlight"
          className="pointer-events-none absolute top-0 left-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: spring.fast.exit }}
          transition={fade}
        >
          <GooIndicator
            rect={rect}
            from={from}
            className={cn('bg-hover', className)}
            transition={transition ?? spring.fast}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

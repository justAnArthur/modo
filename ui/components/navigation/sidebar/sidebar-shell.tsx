/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { motion } from 'motion/react'
import { type CSSProperties, forwardRef, type HTMLAttributes, useEffect, useRef, useState } from 'react'
import { inertProps } from '../../../lib/inert'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { exitFallbackMs, spring } from '../../../lib/springs'
import { surfaceClasses } from '../../../lib/surface-classes'
import { SurfaceProvider, useLift } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'
import { type SidebarSide, type SidebarVariant, useSidebar } from './sidebar-context'
import { SidebarRail } from './sidebar-rail'

// Crossing the drawer breakpoint dissolves the rail instead of snapping it
// away: opacity fades while `display` rides the same transition
// (allow-discrete), so `none` applies only once the fade lands, and
// @starting-style fades it back in. Literal classes per breakpoint, so
// UnoCSS's extractor sees them; they also hide the rail before hydration.
const BREAKPOINT_FADE_BASE =
  'transition-[opacity,display] ease-out [transition-behavior:allow-discrete] motion-reduce:transition-none'
const BREAKPOINT_HIDDEN: Record<number, string> = {
  640: 'max-sm:hidden max-sm:opacity-0 max-sm:duration-moderate sm:duration-slow sm:starting:opacity-0',
  768: 'max-md:hidden max-md:opacity-0 max-md:duration-moderate md:duration-slow md:starting:opacity-0',
  1024: 'max-lg:hidden max-lg:opacity-0 max-lg:duration-moderate lg:duration-slow lg:starting:opacity-0',
  1280: 'max-xl:hidden max-xl:opacity-0 max-xl:duration-moderate xl:duration-slow xl:starting:opacity-0',
}

/** Props motion redefines with other signatures: never forwarded onto a motion.div. */
type MotionSafeDivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>

export interface SidebarShellProps extends MotionSafeDivProps {
  side: SidebarSide
  variant: SidebarVariant
  /** The `sidebar` variant's inner-edge border. Defaults to `true`. */
  bordered?: boolean
  /** Render the resize/collapse rail. `false` also disables drag-resize. Defaults to `true`. */
  rail?: boolean
  /** Pin the rail's tooltip open or closed; `undefined` leaves it on hover. */
  railTooltipOpen?: boolean
}

/** Mid-drag open flips (a collapse preview and its rescue) spring on the moderate tier; the drag itself tracks 1:1. */
function useWidthTransition(open: boolean, isResizing: boolean) {
  const reduceMotion = useReduceMotion()
  // The flip is read synchronously, since the transition must be right on
  // the commit whose target changes; `dragFlip` then holds the spring
  // through its settle so pointer moves right after a flip retarget it.
  const [dragFlip, setDragFlip] = useState(false)
  const prevOpenRef = useRef(open)
  const openFlipped = prevOpenRef.current !== open
  useEffect(() => {
    const flipped = prevOpenRef.current !== open
    prevOpenRef.current = open
    if (!isResizing) {
      setDragFlip(false)
      return
    }
    if (!flipped) return
    setDragFlip(true)
    const id = setTimeout(() => setDragFlip(false), exitFallbackMs(spring.moderate))
    return () => clearTimeout(id)
  }, [open, isResizing])

  if (reduceMotion) return { duration: 0 }
  if (isResizing) {
    if (!openFlipped && !dragFlip) return { duration: 0 }
    return open ? spring.moderate : spring.moderate.exit
  }
  // A whole column moving is the largest thing here: the slow tier.
  return open ? spring.slow : spring.slow.exit
}

/** The desktop rail: an in-flow sticky column animates its width (reflowing the inset) while the fixed-width panel inside slides out under its clip, so it works in any bounded frame. */
const SidebarShell = forwardRef<HTMLDivElement, SidebarShellProps>(
  ({ side, variant, bordered = true, rail = true, railTooltipOpen, className, children, ...props }, ref) => {
    const { open: kept, hoverOpen, width, mobileBreakpoint, isMobile, isResizing, shellRef } = useSidebar()
    const open = kept || hoverOpen
    const shape = useShape()
    const floatingLevel = useLift(1)
    const transition = useWidthTransition(open, isResizing)
    const shell = useMergeRefs(shellRef, ref)
    const fade = shape.bgRadius >= 20 ? 24 : 12

    return (
      <motion.div
        ref={shell}
        data-slot="sidebar"
        data-state={open ? 'expanded' : 'collapsed'}
        data-collapsible={open ? '' : 'offcanvas'}
        data-variant={variant}
        data-side={side}
        className={cn(
          // No bare `group`: it would fire every descendant's group-hover on rail hover.
          'peer shrink-0 sticky top-0 h-svh overflow-hidden',
          // Flex order decides the side, so Sidebar can precede the inset either way.
          side === 'right' && 'order-last',
          // The inset rail has no card edge: its scroll hairline hugs the rows' gutter.
          variant === 'inset' && '[--scroll-divider-inset:8px]',
          BREAKPOINT_FADE_BASE,
          BREAKPOINT_HIDDEN[mobileBreakpoint],
          // Another breakpoint has no literal utility: JS hides the shell (no fade).
          !BREAKPOINT_HIDDEN[mobileBreakpoint] && isMobile && 'hidden',
          className,
        )}
        initial={false}
        animate={{ width: open ? width : '0rem' }}
        transition={transition}
        {...props}
      >
        <motion.div
          className={cn(
            'absolute inset-y-0 flex h-full flex-col',
            side === 'left' ? 'left-0' : 'right-0',
            variant === 'floating' && 'p-2',
            variant === 'inset' && 'py-2',
          )}
          style={{ width }}
          initial={false}
          animate={{ x: open ? '0%' : side === 'left' ? '-100%' : '100%' }}
          transition={transition}
          // Mid-drag the rail inside holds the pointer through a collapse preview.
          {...inertProps(!open && !isResizing)}
        >
          {variant === 'floating' ? (
            <div
              data-sidebar="sidebar"
              className={cn('flex h-full w-full min-h-0 flex-col', shape.container, surfaceClasses(floatingLevel, 3))}
            >
              <SurfaceProvider value={floatingLevel}>{children}</SurfaceProvider>
            </div>
          ) : (
            <div
              data-sidebar="sidebar"
              className={cn(
                'flex h-full w-full min-h-0 flex-col',
                bordered &&
                  variant === 'sidebar' &&
                  (side === 'left' ? 'border-r border-border' : 'border-l border-border'),
              )}
            >
              {children}
            </div>
          )}
          {rail && (
            <SidebarRail
              tooltipOpen={railTooltipOpen}
              className={cn(
                // The floating card sits in the panel's gutter: the grab strip straddles the card's edge.
                variant === 'floating' &&
                  (side === 'left' ? 'right-1 after:right-[3.5px]' : 'left-1 after:left-[3.5px]'),
                // A rounded card's hairline fades in past the corner radius.
                variant !== 'sidebar' &&
                  'after:inset-y-2 after:[mask-image:linear-gradient(to_bottom,transparent_var(--rail-fade-start),black_var(--rail-fade-end),black_calc(100%-var(--rail-fade-end)),transparent_calc(100%-var(--rail-fade-start)))]',
              )}
              style={
                variant !== 'sidebar'
                  ? ({ '--rail-fade-start': `${fade}px`, '--rail-fade-end': `${fade + 24}px` } as CSSProperties)
                  : undefined
              }
            />
          )}
        </motion.div>
      </motion.div>
    )
  },
)
SidebarShell.displayName = 'SidebarShell'

export { SidebarShell }

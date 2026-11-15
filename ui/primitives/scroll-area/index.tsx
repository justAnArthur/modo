/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/scroll-area.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
  useContext,
} from 'react'
import { useShape } from '../../lib/shape-context'
import { useTouchPrimary } from '../../lib/use-touch-primary'
import { cn } from '../../lib/utils'

// Touch-primary devices get native overflow scrolling (momentum,
// rubber-banding); the exported ScrollBar no-ops there.
const ScrollAreaContext = createContext<boolean>(false)

type Orientation = 'vertical' | 'horizontal' | 'both'

interface ScrollAreaProps extends ComponentPropsWithoutRef<'div'> {
  /** Classes for the inner scrolling viewport — where the `scroll-fade` / `scroll-fade-x` utility goes. */
  viewportClassName?: string
  /** Which axes get scrollbars. Defaults to `"vertical"`. */
  orientation?: Orientation
  /** Classes for the outer container — set the height/width constraint here. */
  className?: string
  /** The scrolling content. Give it an intrinsic size (`w-max`, `whitespace-nowrap`) to overflow horizontally. */
  children?: ReactNode
}

type ScrollAreaComponent = ForwardRefExoticComponent<ScrollAreaProps & RefAttributes<HTMLDivElement>> & {
  Bar: typeof ScrollBar
}

/**
 * A scrollbar that stays out of the way but never disappears, over shadcn's
 * scroll-fade as the baseline edge treatment — restyled to the shape system,
 * with native scroll physics on touch.
 *
 * macOS hides the scrollbar until you start scrolling, so a clipped list
 * gives no sign it has more below. Here the thumb rests narrow and
 * low-contrast, then widens and darkens on hover, and its radius follows the
 * shape system. `className` constrains the outer box; `viewportClassName`
 * goes on the inner scrolling viewport, where the `scroll-fade` (or
 * `scroll-fade-x`) utility dissolves the edges that have more to scroll. On
 * touch-primary devices the whole thing steps aside for native overflow
 * scrolling. Built on Base UI's ScrollArea; scrollbar machinery adapted from
 * Lina (https://lina.sameer.sh).
 *
 * Statics:
 * - `ScrollArea.Bar` — the standalone `ScrollBar`, for hand-composed scroll
 *   areas.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/scroll-area.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, viewportClassName, orientation = 'vertical', ...props }, ref) => {
    const isTouch = useTouchPrimary()

    return (
      <ScrollAreaContext.Provider value={isTouch}>
        {isTouch ? (
          // biome-ignore lint/a11y/useSemanticElements: a scroll container, not a form group
          <div
            ref={ref}
            role="group"
            data-slot="scroll-area"
            aria-roledescription="scroll area"
            className={cn('relative overflow-hidden', className)}
            {...props}
          >
            <div
              data-slot="scroll-area-viewport"
              className={cn(
                'size-full rounded-[inherit]',
                orientation === 'vertical' && 'overflow-y-auto',
                orientation === 'horizontal' && 'overflow-x-auto',
                orientation === 'both' && 'overflow-auto',
                viewportClassName,
              )}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-reachable
              tabIndex={0}
            >
              {children}
            </div>
          </div>
        ) : (
          <ScrollAreaPrimitive.Root
            ref={ref}
            data-slot="scroll-area"
            className={cn('relative overflow-hidden', className)}
            {...props}
          >
            <ScrollAreaPrimitive.Viewport
              data-slot="scroll-area-viewport"
              data-scroll-edges=""
              className={cn('size-full rounded-[inherit]', viewportClassName)}
            >
              {/* An intrinsic size to measure horizontal overflow against. */}
              <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
            </ScrollAreaPrimitive.Viewport>
            {orientation !== 'horizontal' && <ScrollBar orientation="vertical" />}
            {orientation !== 'vertical' && <ScrollBar orientation="horizontal" />}
            {orientation === 'both' && <ScrollAreaPrimitive.Corner />}
          </ScrollAreaPrimitive.Root>
        )}
      </ScrollAreaContext.Provider>
    )
  },
) as ScrollAreaComponent

ScrollArea.displayName = 'ScrollArea'

const ScrollBar = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Scrollbar>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => {
  const isTouch = useContext(ScrollAreaContext)
  const shape = useShape()

  if (isTouch) return null

  return (
    <ScrollAreaPrimitive.Scrollbar
      ref={ref}
      orientation={orientation}
      data-slot="scroll-area-scrollbar"
      className={cn(
        // The 10px track is the hit target; the thumb inside rests narrow.
        'group/scrollbar absolute z-20 flex touch-none select-none',
        // Hiding waits out the thumb's shrink, so it visibly narrows before it fades.
        'opacity-0 transition-opacity duration-moderate-exit ease-out delay-moderate',
        'data-[hovering]:duration-moderate data-[scrolling]:duration-moderate',
        'data-[hovering]:opacity-100 data-[scrolling]:opacity-100',
        'data-[hovering]:delay-0 data-[scrolling]:delay-0',
        orientation === 'vertical' && 'top-0 right-0 h-full w-2.5',
        orientation === 'horizontal' && 'bottom-0 left-0 h-2.5 w-full flex-col',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          'relative bg-overlay/8 transition-[background-color,width,height] duration-moderate ease-in-out',
          'group-hover/scrollbar:bg-overlay/12 active:!bg-overlay/16',
          shape.bg,
          // The thumb sits 2px off the edge; the track stays flush so edge throws land.
          orientation === 'vertical' &&
            'mx-auto my-1 w-1 -translate-x-0.5 h-[var(--scroll-area-thumb-height)] group-hover/scrollbar:w-1.5',
          orientation === 'horizontal' &&
            'my-auto mx-1 h-1 -translate-y-0.5 w-[var(--scroll-area-thumb-width)] group-hover/scrollbar:h-1.5',
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
})

ScrollBar.displayName = 'ScrollBar'

Object.assign(ScrollArea, { Bar: ScrollBar })

export type { ScrollAreaProps }
export { ScrollArea, ScrollBar }

export default ScrollArea

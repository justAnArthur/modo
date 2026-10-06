/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/scroll-area.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/{utils,shape-context}` / `@/hooks/use-touch-primary` imports rewritten to `../../lib/*`.
 * - The root's forwardRef element type `ComponentRef<typeof ScrollAreaPrimitive.Root>` written out
 *   as `HTMLDivElement` (what Base UI's Root forwards): modo's parser needs a first type argument
 *   without `<`/`,`. Same type, no behavior change.
 * - `viewportClassName` / `className` / `children` documented in `ScrollAreaProps` (modo's parser
 *   lists only members declared in the interface body).
 * - modo item: TSDoc (from the FF "Scrollbars" docs page), `ScrollArea.Bar` static (= `ScrollBar`,
 *   still exported by name) and a default export.
 * - Styling reads DS tokens (AGENTS.md styling): literal colors → color
 *   tokens; `duration-80|120|160` and tier-length JS durations →
 *   `duration-<tier>` / `spring.*`.
 */

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

// On touch-primary devices the Base UI machinery is skipped entirely in
// favour of native overflow scrolling (better physics, momentum,
// rubber-banding); the context lets the exported ScrollBar no-op there.
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

interface ScrollAreaStatics {
  /** `ScrollBar` — one scrollbar, for composing a Base UI scroll area by hand. */
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
 */
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, viewportClassName, orientation = 'vertical', ...props }, ref) => {
    const isTouch = useTouchPrimary()

    return (
      <ScrollAreaContext.Provider value={isTouch}>
        {isTouch ? (
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
              className={cn('size-full rounded-[inherit]', viewportClassName)}
            >
              {/* Content gives Base UI an intrinsic size to measure
                  horizontal overflow against. */}
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
) as ForwardRefExoticComponent<ScrollAreaProps & RefAttributes<HTMLDivElement>> & ScrollAreaStatics

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
      // Base UI keeps the scrollbar mounted while scrollable; visibility is
      // a plain opacity transition off its hover/scroll state attributes,
      // matching the cue fade — 160ms in, 120ms out (exits faster, per the
      // animation guidelines); spring tokens are framer-motion configs and
      // don't apply here.
      className={cn(
        // The 10px track stays as a comfortable hit target; the thumb inside
        // it rests narrow and low-contrast, then widens + darkens on hover so
        // it gets out of the way until you reach for it.
        'group/scrollbar absolute z-20 flex touch-none select-none',
        // Show immediately; on hide, wait out the 150ms thumb shrink before
        // fading so the thumb visibly narrows back first instead of the fade
        // masking it.
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
          // Fixed surface-relative overlay ramp (8 → 12 → 16%) — same tint
          // direction as the menu hover/active tokens, one notch stronger.
          'relative bg-overlay/8 transition-[background-color,width,height] duration-moderate ease-in-out',
          'group-hover/scrollbar:bg-overlay/12 active:!bg-overlay/16',
          shape.bg,
          // -translate nudges the thumb 2px off the container edge; the track
          // (and its 10px hit target) stays flush so edge-throws still land.
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

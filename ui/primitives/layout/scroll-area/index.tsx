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
  useRef,
} from 'react'
import { useShape } from '../../../lib/shape-context'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'
import { useTouchPrimary } from '../../../lib/use-touch-primary'
import { cn } from '../../../lib/utils'

// Base UI writes the edge distances (`--scroll-area-overflow-*`) on the
// viewport at every scroll event and registers them non-inherited, except in
// WebKit, where an inherited var re-styles every descendant per event: a long
// list recalculated thousands of elements a frame. Only the viewport reads
// them (`scroll-fade`), so they are registered for WebKit too.
if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  for (const edge of ['x-start', 'x-end', 'y-start', 'y-end']) {
    try {
      CSS.registerProperty({
        name: `--scroll-area-overflow-${edge}`,
        syntax: '<length>',
        inherits: false,
        initialValue: '0px',
      })
    } catch {
      // Already registered.
    }
  }
}

// Touch-primary devices and `native` areas get native overflow scrolling
// (momentum, rubber-banding); the exported ScrollBar no-ops there.
const ScrollAreaContext = createContext<boolean>(false)

// A native viewport writes the same `--scroll-area-overflow-*` edges Base UI
// does, so `scroll-fade` reads them instead of running a scroll-driven
// animation per area (WebKit ticks every one each frame). One observer serves
// every native area, and a var is written only when its edge moved.
const viewportOf = new WeakMap<Element, HTMLElement>()
let edgeObserver: ResizeObserver | undefined

function setEdge(viewport: HTMLElement, edge: string, distance: number) {
  const name = `--scroll-area-overflow-${edge}`
  const value = `${Math.max(0, Math.round(distance))}px`
  if (viewport.style.getPropertyValue(name) !== value) viewport.style.setProperty(name, value)
}

function writeEdges(viewport: HTMLElement) {
  const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = viewport
  setEdge(viewport, 'x-start', scrollLeft)
  setEdge(viewport, 'x-end', scrollWidth - clientWidth - scrollLeft)
  setEdge(viewport, 'y-start', scrollTop)
  setEdge(viewport, 'y-end', scrollHeight - clientHeight - scrollTop)
}

function trackEdges(viewport: HTMLElement) {
  edgeObserver ??= new ResizeObserver(entries => {
    const seen = new Set<HTMLElement>()
    for (const { target } of entries) {
      const area = viewportOf.get(target)
      if (!area || seen.has(area)) continue
      seen.add(area)
      writeEdges(area)
    }
  })
  const observer = edgeObserver
  // The viewport for its own size, its children for the content's.
  const targets = [viewport, ...viewport.children]
  for (const target of targets) {
    viewportOf.set(target, viewport)
    observer.observe(target)
  }
  const onScroll = () => writeEdges(viewport)
  viewport.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    for (const target of targets) observer.unobserve(target)
    viewport.removeEventListener('scroll', onScroll)
  }
}

type Orientation = 'vertical' | 'horizontal' | 'both'

interface ScrollAreaProps extends ComponentPropsWithoutRef<'div'> {
  /** Classes for the inner scrolling viewport — where the `scroll-fade` / `scroll-fade-x` utility goes. */
  viewportClassName?: string
  /** Which axes get scrollbars. Defaults to `"vertical"`. */
  orientation?: Orientation
  /** Native overflow scrolling with the platform's own scrollbar (an overlay one on macOS), as on touch: no observers and no re-render on resize, for scrollers that come by the hundred, such as code blocks. Defaults to `false`. */
  native?: boolean
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
 * scrolling, and `native` does the same anywhere: the fade stays (it is
 * CSS), the drawn thumb gives way to the platform's. Built on Base UI's ScrollArea; scrollbar machinery adapted from
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
  ({ className, children, viewportClassName, orientation = 'vertical', native = false, ...props }, ref) => {
    const isNative = useTouchPrimary() || native
    const viewportRef = useRef<HTMLDivElement>(null)

    // Re-tracked when the children change, so new content is observed.
    useIsoLayoutEffect(() => {
      const viewport = viewportRef.current
      if (isNative && viewport) return trackEdges(viewport)
    }, [isNative, children])

    return (
      <ScrollAreaContext.Provider value={isNative}>
        {isNative ? (
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
              ref={viewportRef}
              data-slot="scroll-area-viewport"
              data-scroll-edges=""
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
  const isNative = useContext(ScrollAreaContext)
  const shape = useShape()

  if (isNative) return null

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

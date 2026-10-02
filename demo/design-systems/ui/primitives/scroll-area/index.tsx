/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/scroll-area.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/{utils,shape-context}` / `@/hooks/use-touch-primary` imports rewritten to `../../_fluid/*`.
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

import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
} from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "../../_fluid/lib/utils";
import { useShape } from "../../_fluid/lib/shape-context";
import { useTouchPrimary } from "../../_fluid/hooks/use-touch-primary";

// On touch-primary devices the Base UI machinery is skipped entirely in
// favour of native overflow scrolling (better physics, momentum,
// rubber-banding); the context lets the exported ScrollBar no-op there.
const ScrollAreaContext = createContext<boolean>(false);

type Orientation = "vertical" | "horizontal" | "both";

interface ScrollAreaProps extends ComponentPropsWithoutRef<"div"> {
  /** Classes for the inner scrolling viewport — where the `scroll-fade` / `scroll-fade-x` utility goes. */
  viewportClassName?: string;
  /** Which axes get scrollbars. Defaults to `"vertical"`. */
  orientation?: Orientation;
  /** Classes for the outer container — set the height/width constraint here. */
  className?: string;
  /** The scrolling content. Give it an intrinsic size (`w-max`, `whitespace-nowrap`) to overflow horizontally. */
  children?: ReactNode;
}

interface ScrollAreaStatics {
  /** `ScrollBar` — one scrollbar, for composing a Base UI scroll area by hand. */
  Bar: typeof ScrollBar;
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
 * @example
 * # The scrollbar
 *
 * A clipped list with the fade and the hover-revealed scrollbar. The thumb
 * widens and darkens as you reach for it; the fade keeps the true start and
 * end edges crisp.
 *
 * ```tsx
 * <ScrollArea viewportClassName="scroll-fade" className="h-56 w-64 border border-border rounded-xl">
 *   <div className="flex flex-col p-3">
 *     {[23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => (
 *       <div key={n} className="px-3 py-2 text-body text-foreground whitespace-nowrap">
 *         v1.{n}.0 — maintenance release
 *       </div>
 *     ))}
 *   </div>
 * </ScrollArea>
 * ```
 *
 * @example
 * # Horizontal
 *
 * A row wider than its container, faded with the x variant: `w-max` lets the
 * content keep its natural width instead of squeezing in.
 *
 * ```tsx
 * <ScrollArea orientation="horizontal" viewportClassName="scroll-fade-x" className="w-full">
 *   <div className="flex gap-2 p-3 w-max">
 *     {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) => (
 *       <div key={month} className="flex items-center justify-center h-20 w-28 shrink-0 border border-border rounded-lg text-body text-foreground">
 *         {month}
 *       </div>
 *     ))}
 *   </div>
 * </ScrollArea>
 * ```
 *
 * @example
 * # Double overflow
 *
 * A grid taller and wider than its box. `orientation="both"` adds both
 * scrollbars and the corner.
 *
 * ```tsx
 * <ScrollArea orientation="both" className="h-80 w-full border border-border rounded-xl">
 *   <div className="w-max p-3 text-body">
 *     <div className="flex">
 *       <div className="w-32 shrink-0 px-3 py-2 text-caption text-muted-foreground">City</div>
 *       {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
 *         <div key={m} className="w-28 shrink-0 px-3 py-2 text-right text-caption text-muted-foreground">{m}</div>
 *       ))}
 *     </div>
 *     {['Amsterdam', 'Berlin', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon', 'London', 'Madrid', 'Oslo', 'Paris', 'Prague', 'Stockholm', 'Vienna', 'Warsaw', 'Zurich'].map((city, r) => (
 *       <div key={city} className="flex border-t border-border">
 *         <div className="w-32 shrink-0 px-3 py-2 text-foreground">{city}</div>
 *         {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => (
 *           <div key={c} className="w-28 shrink-0 px-3 py-2 text-right tabular-nums text-muted-foreground">
 *             {(((r + 3) * (c + 7) * 37) % 900) + 100}
 *           </div>
 *         ))}
 *       </div>
 *     ))}
 *   </div>
 * </ScrollArea>
 * ```
 */
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      children,
      viewportClassName,
      orientation = "vertical",
      ...props
    },
    ref
  ) => {
    const isTouch = useTouchPrimary();

    return (
      <ScrollAreaContext.Provider value={isTouch}>
        {isTouch ? (
          <div
            ref={ref}
            role="group"
            data-slot="scroll-area"
            aria-roledescription="scroll area"
            className={cn("relative overflow-hidden", className)}
            {...props}
          >
            <div
              data-slot="scroll-area-viewport"
              className={cn(
                "size-full rounded-[inherit]",
                orientation === "vertical" && "overflow-y-auto",
                orientation === "horizontal" && "overflow-x-auto",
                orientation === "both" && "overflow-auto",
                viewportClassName
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
            className={cn("relative overflow-hidden", className)}
            {...props}
          >
            <ScrollAreaPrimitive.Viewport
              data-slot="scroll-area-viewport"
              className={cn("size-full rounded-[inherit]", viewportClassName)}
            >
              {/* Content gives Base UI an intrinsic size to measure
                  horizontal overflow against. */}
              <ScrollAreaPrimitive.Content>
                {children}
              </ScrollAreaPrimitive.Content>
            </ScrollAreaPrimitive.Viewport>
            {orientation !== "horizontal" && <ScrollBar orientation="vertical" />}
            {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
            {orientation === "both" && <ScrollAreaPrimitive.Corner />}
          </ScrollAreaPrimitive.Root>
        )}
      </ScrollAreaContext.Provider>
    );
  }
) as ForwardRefExoticComponent<ScrollAreaProps & RefAttributes<HTMLDivElement>> &
  ScrollAreaStatics;

ScrollArea.displayName = "ScrollArea";

const ScrollBar = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Scrollbar>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => {
  const isTouch = useContext(ScrollAreaContext);
  const shape = useShape();

  if (isTouch) return null;

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
        "group/scrollbar absolute z-20 flex touch-none select-none",
        // Show immediately; on hide, wait out the 150ms thumb shrink before
        // fading so the thumb visibly narrows back first instead of the fade
        // masking it.
        "opacity-0 transition-opacity duration-moderate-exit ease-out delay-moderate",
        "data-[hovering]:duration-moderate data-[scrolling]:duration-moderate",
        "data-[hovering]:opacity-100 data-[scrolling]:opacity-100",
        "data-[hovering]:delay-0 data-[scrolling]:delay-0",
        orientation === "vertical" && "top-0 right-0 h-full w-2.5",
        orientation === "horizontal" && "bottom-0 left-0 h-2.5 w-full flex-col",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          // Fixed surface-relative overlay ramp (8 → 12 → 16%) — same tint
          // direction as the menu hover/active tokens, one notch stronger.
          "relative bg-overlay/8 transition-[background-color,width,height] duration-moderate ease-in-out",
          "group-hover/scrollbar:bg-overlay/12 active:!bg-overlay/16",
          shape.bg,
          // -translate nudges the thumb 2px off the container edge; the track
          // (and its 10px hit target) stays flush so edge-throws still land.
          orientation === "vertical" &&
            "mx-auto my-1 w-1 -translate-x-0.5 h-[var(--scroll-area-thumb-height)] group-hover/scrollbar:w-1.5",
          orientation === "horizontal" &&
            "my-auto mx-1 h-1 -translate-y-0.5 w-[var(--scroll-area-thumb-width)] group-hover/scrollbar:h-1.5"
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
});

ScrollBar.displayName = "ScrollBar";

Object.assign(ScrollArea, { Bar: ScrollBar })

export { ScrollArea, ScrollBar };
export type { ScrollAreaProps };

export default ScrollArea

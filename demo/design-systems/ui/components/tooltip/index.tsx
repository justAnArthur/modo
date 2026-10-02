/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tooltip.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/{utils,springs,font-weight,shape-context}` imports
 *   rewritten to `../../_fluid/lib/*`.
 * - `TooltipProps`: `className` / `children` docs filled in from the FF docs API table (modo's
 *   parser needs a description on every member).
 * - modo item: TSDoc (from the FF "Tooltip" docs page), the `Tooltip.Provider` /
 *   `Tooltip.PortalContainer` statics (both still exported by name) and a default export.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { motion, useMotionValue } from "motion/react";
import { cn } from "../../_fluid/lib/utils";
import { spring } from "../../_fluid/lib/springs";
import { useShape } from "../../_fluid/lib/shape-context";

// ---------------------------------------------------------------------------
// Portal container context
// ---------------------------------------------------------------------------

const TooltipPortalContainerContext = createContext<HTMLElement | null>(null);

function TooltipPortalContainer({
  value,
  children,
}: {
  value: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <TooltipPortalContainerContext.Provider value={value}>
      {children}
    </TooltipPortalContainerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_DELAY = 200;

// Tracks whether an app-level <TooltipProvider> is above us. Each Tooltip
// only wraps itself in a local primitive Provider when there isn't one —
// a per-instance Provider would defeat cross-tooltip skip-delay grouping
// (moving between adjacent tooltips would re-wait the full delay).
const TooltipGroupContext = createContext(false);

interface TooltipProviderProps {
  children: ReactNode;
  /** Hover delay before tooltips open, in ms. Defaults to 200. */
  delayDuration?: number;
  /** After a tooltip closes, adjacent tooltips opened within this window
   *  skip the hover delay, in ms. Defaults to 300. */
  skipDelayDuration?: number;
}

/** Groups descendant Tooltips so that once one opens, moving to an adjacent
 *  trigger shows its tooltip instantly instead of re-waiting the full delay.
 *  Wrap once at the app (or section) level; bare Tooltips still work without
 *  it via a per-instance fallback. */
function TooltipProvider({
  children,
  delayDuration = DEFAULT_DELAY,
  skipDelayDuration = 300,
}: TooltipProviderProps) {
  return (
    <TooltipGroupContext.Provider value={true}>
      <TooltipPrimitive.Provider
        delay={delayDuration}
        timeout={skipDelayDuration}
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipGroupContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TooltipSide = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  /** The content displayed inside the tooltip. */
  content: ReactNode;
  /** The trigger element. Must accept a ref. */
  children: React.ReactElement;
  /** Preferred side of the trigger to render the tooltip on. Defaults to `"top"`. */
  side?: TooltipSide;
  /** Distance in pixels between the tooltip and the trigger. Defaults to 8. */
  sideOffset?: number;
  /** Hover delay before this tooltip opens, in ms. Defaults to 200, or to the
   *  ambient TooltipProvider's delayDuration when one is present. */
  delayDuration?: number;
  /** Additional classes applied to the tooltip content container. */
  className?: string;
  /** Extra classes for the portalled positioner element — pass a z utility
   *  here to lift the whole tooltip above other fixed layers (default z-50). */
  contentClassName?: string;
  /** When true, forces the tooltip open. When false, forces it closed. When undefined, uses default hover/focus behavior. */
  forceOpen?: boolean;
  /** Follow the cursor along one axis while hovering the trigger — for tall
   *  or wide triggers (the Sidebar rail) where a centered tooltip sits far
   *  from the pointer. The other axis stays anchored by `side`. */
  followCursor?: "x" | "y";
  /** Called when the tooltip's internal open state changes (before forceOpen is applied). */
  onOpenChange?: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

function getSlideOffset(side: TooltipSide) {
  switch (side) {
    case "top":
      return { y: 4 };
    case "bottom":
      return { y: -4 };
    case "left":
      return { x: 4 };
    case "right":
      return { x: -4 };
  }
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

/**
 * Floating tooltip with spring-based animations, configurable placement, and
 * rich content support.
 *
 * The trigger is whatever element you pass as the single child — it only has
 * to accept a ref. The label is portalled, springs in from the resolved side
 * (4px slide plus a fade, `spring.fast`), and flips when it would collide
 * with the viewport edge. `followCursor` tracks the pointer along one axis
 * for tall or wide triggers, while the other stays anchored by `side`. Built
 * on Base UI's Tooltip.
 *
 * Statics:
 * - `Tooltip.Provider` — `TooltipProvider`: groups tooltips so moving from
 *   one trigger to an adjacent one skips the hover delay.
 * - `Tooltip.PortalContainer` — `TooltipPortalContainer`: portal every
 *   descendant tooltip into a given element instead of the body.
 *
 * @example
 * # Basic
 *
 * One `content` prop and a trigger child. The tooltip opens after the hover
 * delay and closes on pointer-out, blur or Escape.
 *
 * ```tsx
 * <Tooltip content="Save your changes">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * ```
 *
 * @example
 * # Placement
 *
 * `side` picks the preferred side; `sideOffset` is the gap in pixels. A
 * tooltip that would collide with the viewport edge flips to the opposite
 * side and animates from there.
 *
 * ```tsx
 * <div className="flex flex-wrap gap-3">
 *   {['top', 'right', 'bottom', 'left'].map((side) => (
 *     <Tooltip key={side} content={side} side={side}>
 *       <Button variant="secondary" className="capitalize">{side}</Button>
 *     </Tooltip>
 *   ))}
 * </div>
 * ```
 *
 * @example
 * # Rich Content
 *
 * `content` takes any node, not just a string — a shortcut hint, a label
 * with a description, a small stack of rows.
 *
 * ```tsx
 * <Tooltip
 *   content={
 *     <div className="flex flex-col gap-1">
 *       <span className="weight-semibold">Keyboard shortcut</span>
 *       <span className="opacity-70">⌘ + S</span>
 *     </div>
 *   }
 * >
 *   <Button leadingIcon={Plus}>Save</Button>
 * </Tooltip>
 * ```
 *
 * @example
 * # Follow cursor
 *
 * For tall or wide triggers, a centered tooltip sits far from the pointer —
 * `followCursor` tracks it along one axis while the other stays anchored by
 * `side`.
 *
 * ```tsx
 * <div className="flex flex-wrap items-center justify-center gap-6">
 *   <Tooltip content="Following x" side="top" followCursor="x">
 *     <div className="flex h-12 w-64 cursor-default items-center justify-center rounded-lg border border-border text-caption text-muted-foreground">
 *       Move along me
 *     </div>
 *   </Tooltip>
 *   <Tooltip content="Following y" side="right" followCursor="y">
 *     <div className="flex h-40 w-12 cursor-default items-center justify-center rounded-lg border border-border text-caption text-muted-foreground">
 *       <span className="rotate-90 whitespace-nowrap">Move along me</span>
 *     </div>
 *   </Tooltip>
 * </div>
 * ```
 *
 * @example
 * # Delay
 *
 * `delayDuration` overrides the hover delay per tooltip. Wrap a region in
 * `Tooltip.Provider` to share one delay and let adjacent tooltips skip it.
 *
 * ```tsx
 * <Tooltip.Provider delayDuration={300} skipDelayDuration={500}>
 *   <div className="flex flex-wrap gap-3">
 *     <Tooltip content="Instant" delayDuration={0}>
 *       <Button variant="secondary">No delay</Button>
 *     </Tooltip>
 *     <Tooltip content="Grouped: 300ms, then instant between neighbours">
 *       <Button variant="secondary">Grouped</Button>
 *     </Tooltip>
 *     <Tooltip content="Slow" delayDuration={500}>
 *       <Button variant="secondary">500ms delay</Button>
 *     </Tooltip>
 *   </div>
 * </Tooltip.Provider>
 * ```
 */
function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 8,
  delayDuration,
  className,
  contentClassName,
  forceOpen,
  onOpenChange: onOpenChangeProp,
  followCursor,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = forceOpen !== undefined ? forceOpen : internalOpen;
  const shape = useShape();
  const portalContainer = useContext(TooltipPortalContainerContext);
  const hasAmbientProvider = useContext(TooltipGroupContext);

  const slideOffset = getSlideOffset(side);

  // Cursor-follow offset from the trigger's center, driven as a motion value
  // so per-move updates skip React re-renders.
  const followOffset = useMotionValue(0);
  // A force-opened follow-cursor tooltip has no cursor to follow — it rests
  // centered on the trigger until a real pointer takes over.
  useEffect(() => {
    if (forceOpen && followCursor) followOffset.set(0);
  }, [forceOpen, followCursor, followOffset]);
  const handleFollowMove = (event: React.PointerEvent) => {
    if (!followCursor) return;
    const rect = event.currentTarget.getBoundingClientRect();
    followOffset.set(
      followCursor === "y"
        ? event.clientY - (rect.top + rect.height / 2)
        : event.clientX - (rect.left + rect.width / 2)
    );
  };

  const tooltip = (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        setInternalOpen(v);
        onOpenChangeProp?.(v);
      }}
    >
      {/* An explicit delayDuration overrides the ambient provider's delay;
          left undefined, the trigger inherits it from the provider. */}
      <TooltipPrimitive.Trigger
        render={children}
        delay={delayDuration}
        onPointerMove={followCursor ? handleFollowMove : undefined}
      />
      <TooltipPrimitive.Portal container={portalContainer ?? undefined}>
        <TooltipPrimitive.Positioner
          side={side}
          sideOffset={sideOffset}
          className={cn("z-50", contentClassName)}
        >
          <TooltipPrimitive.Popup
            render={(props, state) => {
              const exiting = state.transitionStatus === "ending";
              const contentChildren = content;
              const {
                style: baseStyle,
                // motion.div has incompatible drag/animation event signatures —
                // strip the React-DOM versions so they don't fight motion's own.
                onDrag: _onDrag,
                onDragStart: _onDragStart,
                onDragEnd: _onDragEnd,
                onAnimationStart: _onAnimationStart,
                onAnimationEnd: _onAnimationEnd,
                onAnimationIteration: _onAnimationIteration,
                ...rest
              } = props as React.HTMLAttributes<HTMLDivElement>;
              return (
                // Outer wrapper carries Base UI's popup props plus the
                // cursor-follow motion value; the inner box keeps the
                // enter/exit slide so the two transforms don't fight.
                <motion.div
                  {...rest}
                  style={{
                    ...(baseStyle as React.CSSProperties | undefined),
                    ...(followCursor === "y"
                      ? { y: followOffset }
                      : followCursor === "x"
                        ? { x: followOffset }
                        : {}),
                  }}
                >
                  <motion.div
                    className={cn(
                      // Trim recenters the label; the padding bump only applies
                      // where text-box is supported, keeping the same overall
                      // height (~26px) as untrimmed browsers.
                      "bg-foreground text-background text-caption px-2 py-1",
                      "[text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both]:py-2",
                      shape.bg,
                      "weight-medium",
                      className
                    )}
                    initial={{ opacity: 0, ...slideOffset }}
                    animate={
                      exiting
                        ? { opacity: 0, ...slideOffset }
                        : { opacity: 1, x: 0, y: 0 }
                    }
                    transition={exiting ? spring.fast.exit : spring.fast}
                  >
                    {contentChildren}
                  </motion.div>
                </motion.div>
              );
            }}
          />
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );

  // Fallback: without an ambient TooltipProvider, give this instance its own
  // so a bare <Tooltip> keeps the library's default delay. Grouped skip-delay
  // needs the shared app-level TooltipProvider.
  if (hasAmbientProvider) return tooltip;

  return (
    <TooltipPrimitive.Provider delay={delayDuration ?? DEFAULT_DELAY}>
      {tooltip}
    </TooltipPrimitive.Provider>
  );
}

/* Compound members: the provider and the portal-container scope hang off
   Tooltip as attributes, so examples read `<Tooltip.Provider>`. */
Tooltip.Provider = TooltipProvider;
Tooltip.PortalContainer = TooltipPortalContainer;

export { Tooltip, TooltipPortalContainer, TooltipProvider };
export type { TooltipProps, TooltipProviderProps, TooltipSide };

export default Tooltip

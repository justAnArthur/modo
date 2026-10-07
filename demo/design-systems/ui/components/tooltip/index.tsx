/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tooltip.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/{utils,springs,shape-context}` imports
 *   rewritten to `../../lib/*` (the `@/lib/font-weight` import went with the inline
 *   `fontVariationSettings`, below).
 * - `TooltipProps`: `className` / `children` docs filled in from the FF docs API table (modo's
 *   parser needs a description on every member).
 * - modo item: TSDoc (from the FF "Tooltip" docs page), the `Tooltip.Provider` /
 *   `Tooltip.PortalContainer` statics (both still exported by name) and a default export.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`.
 * - The 4px slide + fade (`getSlideOffset`, `spring.fast`) is replaced by the
 *   shared morph layer (`lib/use-morph.ts` + `MorphSurface`): the label grows
 *   out of its trigger with the goo neck by default, on `spring.moderate`,
 *   with `from` / `effect` / `tier` props; `followCursor` tooltips fade, since
 *   their panel travels with the pointer. The popup's motion wrapper now only
 *   carries the cursor-follow offset.
 * - Moving between adjacent tooltips under a `Tooltip.Provider` skips the
 *   morph (Base UI's `data-instant="delay"` hand-off): the next label shows
 *   in place and the last one goes at once.
 */

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { motion, useMotionValue } from 'motion/react'
import { createContext, type ReactNode, type RefObject, useContext, useEffect, useRef, useState } from 'react'
import { MorphSurface } from '../../lib/morph-layers'
import { useShape } from '../../lib/shape-context'
import { useMorph, useMorphOrigin } from '../../lib/use-morph'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// Portal container context
// ---------------------------------------------------------------------------

const TooltipPortalContainerContext = createContext<HTMLElement | null>(null)

function TooltipPortalContainer({ value, children }: { value: HTMLElement | null; children: ReactNode }) {
  return <TooltipPortalContainerContext.Provider value={value}>{children}</TooltipPortalContainerContext.Provider>
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_DELAY = 200

// Tracks whether an app-level <TooltipProvider> is above us. Each Tooltip
// only wraps itself in a local primitive Provider when there isn't one —
// a per-instance Provider would defeat cross-tooltip skip-delay grouping
// (moving between adjacent tooltips would re-wait the full delay).
const TooltipGroupContext = createContext(false)

interface TooltipProviderProps {
  children: ReactNode
  /** Hover delay before tooltips open, in ms. Defaults to 200. */
  delayDuration?: number
  /** After a tooltip closes, adjacent tooltips opened within this window
   *  skip the hover delay, in ms. Defaults to 300. */
  skipDelayDuration?: number
}

/** Groups descendant Tooltips so that once one opens, moving to an adjacent
 *  trigger shows its tooltip instantly instead of re-waiting the full delay.
 *  Wrap once at the app (or section) level; bare Tooltips still work without
 *  it via a per-instance fallback. */
function TooltipProvider({ children, delayDuration = DEFAULT_DELAY, skipDelayDuration = 300 }: TooltipProviderProps) {
  return (
    <TooltipGroupContext.Provider value={true}>
      <TooltipPrimitive.Provider delay={delayDuration} timeout={skipDelayDuration}>
        {children}
      </TooltipPrimitive.Provider>
    </TooltipGroupContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

interface TooltipProps {
  /** The content displayed inside the tooltip. */
  content: ReactNode
  /** The trigger element. Must accept a ref. */
  children: React.ReactElement
  /** Preferred side of the trigger to render the tooltip on. Defaults to `"top"`. */
  side?: TooltipSide
  /** Distance in pixels between the tooltip and the trigger. Defaults to 8. */
  sideOffset?: number
  /** Hover delay before this tooltip opens, in ms. Defaults to 200, or to the
   *  ambient TooltipProvider's delayDuration when one is present. */
  delayDuration?: number
  /** Additional classes applied to the tooltip content container. */
  className?: string
  /** Extra classes for the portalled positioner element — pass a z utility
   *  here to lift the whole tooltip above other fixed layers (default z-50). */
  contentClassName?: string
  /** When true, forces the tooltip open. When false, forces it closed. When undefined, uses default hover/focus behavior. */
  forceOpen?: boolean
  /** Follow the cursor along one axis while hovering the trigger — for tall
   *  or wide triggers (the Sidebar rail) where a centered tooltip sits far
   *  from the pointer. The other axis stays anchored by `side`. */
  followCursor?: 'x' | 'y'
  /** Called when the tooltip's internal open state changes (before forceOpen is applied). */
  onOpenChange?: (open: boolean) => void
  /** Where the label grows from (see Morph): the trigger, the pointer, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. `followCursor` tooltips always fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Spring tier of the morph. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

/**
 * Floating tooltip with spring-based animations, configurable placement, and
 * rich content support.
 *
 * The trigger is whatever element you pass as the single child — it only has
 * to accept a ref. The label is portalled and grows out of its trigger
 * through the shared morph (see Morph), with the goo neck by default on
 * `spring.moderate`, and flips when it would collide with the viewport edge.
 * `followCursor` tracks the pointer along one axis for tall or wide triggers,
 * while the other stays anchored by `side`. Built on Base UI's Tooltip.
 *
 * Statics:
 * - `Tooltip.Provider` — `TooltipProvider`: groups tooltips so moving from
 *   one trigger to an adjacent one skips the hover delay, and the morph: the
 *   next label shows in place.
 * - `Tooltip.PortalContainer` — `TooltipPortalContainer`: portal every
 *   descendant tooltip into a given element instead of the body.
 *
 * @example {@include ./examples.mdx}
 */
function Tooltip({
  content,
  children,
  side = 'top',
  sideOffset = 8,
  delayDuration,
  className,
  contentClassName,
  forceOpen,
  onOpenChange: onOpenChangeProp,
  followCursor,
  from,
  effect = 'goo',
  tier = 'moderate',
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = forceOpen !== undefined ? forceOpen : internalOpen
  const shape = useShape()
  const portalContainer = useContext(TooltipPortalContainerContext)
  const hasAmbientProvider = useContext(TooltipGroupContext)
  const { origin, capture } = useMorphOrigin()
  // Base UI's hand-off between grouped tooltips: the next one shows in place
  // (its popup carries `data-instant="delay"`) and the last one, closed with
  // reason `none`, goes at once (its own `data-instant` lasts only a frame or two).
  const handedOff = useRef(false)
  const morph = useMorph(open, origin, {
    from,
    effect: followCursor ? 'fade' : effect,
    tier,
    instant: popup => handedOff.current || popup.dataset.instant === 'delay',
  })

  // Cursor-follow offset from the trigger's center, driven as a motion value
  // so per-move updates skip React re-renders.
  const followOffset = useMotionValue(0)
  // A force-opened follow-cursor tooltip has no cursor to follow — it rests
  // centered on the trigger until a real pointer takes over.
  useEffect(() => {
    if (forceOpen && followCursor) followOffset.set(0)
  }, [forceOpen, followCursor, followOffset])
  const handleFollowMove = (event: React.PointerEvent) => {
    if (!followCursor) return
    const rect = event.currentTarget.getBoundingClientRect()
    followOffset.set(
      followCursor === 'y'
        ? event.clientY - (rect.top + rect.height / 2)
        : event.clientX - (rect.left + rect.width / 2),
    )
  }

  const tooltip = (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={(v, details) => {
        if (v) capture(details)
        handedOff.current = !v && details.reason === 'none'
        setInternalOpen(v)
        onOpenChangeProp?.(v)
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
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} className={cn('z-50', contentClassName)}>
          <TooltipPrimitive.Popup
            ref={morph.popupRef}
            className="relative outline-none"
            render={<motion.div style={followCursor ? { [followCursor]: followOffset } : {}} />}
          >
            <MorphSurface
              morph={morph}
              bg="bg-foreground"
              radius={shape.bg}
              className={cn(
                // Trim recenters the label; the padding bump only applies
                // where text-box is supported, keeping the same overall
                // height (~26px) as untrimmed browsers.
                'text-background text-caption px-2 py-1',
                '[text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both]:py-2',
                'weight-medium',
                className,
              )}
            >
              {content}
            </MorphSurface>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )

  // Fallback: without an ambient TooltipProvider, give this instance its own
  // so a bare <Tooltip> keeps the library's default delay. Grouped skip-delay
  // needs the shared app-level TooltipProvider.
  if (hasAmbientProvider) return tooltip

  return <TooltipPrimitive.Provider delay={delayDuration ?? DEFAULT_DELAY}>{tooltip}</TooltipPrimitive.Provider>
}

/* Compound members: the provider and the portal-container scope hang off
   Tooltip as attributes, so examples read `<Tooltip.Provider>`. */
Tooltip.Provider = TooltipProvider
Tooltip.PortalContainer = TooltipPortalContainer

export type { TooltipProps, TooltipProviderProps, TooltipSide }
export { Tooltip, TooltipPortalContainer, TooltipProvider }

export default Tooltip

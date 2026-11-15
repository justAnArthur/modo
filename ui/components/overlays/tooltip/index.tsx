/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tooltip.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { motion, useMotionValue } from 'motion/react'
import {
  createContext,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { MorphSurface } from '../../../lib/morph-layers'
import {
  type Align,
  PortalContainer,
  positionerProps,
  type Side,
  useOverlayRoot,
  usePortalContainer,
} from '../../../lib/overlay'
import { useShape } from '../../../lib/shape-context'
import { type MorphEffect, type MorphFrom, type MorphTier, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'

const DEFAULT_DELAY = 200

/** Portals every descendant tooltip (and every other overlay) into `value`; the shared `PortalContainer`. */
function TooltipPortalContainer({ value, children }: { value: HTMLElement | null; children: ReactNode }) {
  return <PortalContainer value={value}>{children}</PortalContainer>
}

// Each Tooltip wraps itself in its own Base UI Provider only when no
// TooltipProvider is above it: a per-instance Provider would defeat the
// group's skip-delay hand-off.
const TooltipGroupContext = createContext(false)

interface TooltipProviderProps {
  children: ReactNode
  /** Hover delay before tooltips open, in ms. Defaults to `200`. */
  delayDuration?: number
  /** After a tooltip closes, adjacent tooltips opened within this window skip the hover delay, in ms. Defaults to `300`. */
  skipDelayDuration?: number
}

/**
 * Groups descendant Tooltips: once one opens, moving to an adjacent trigger
 * shows its tooltip at once instead of re-waiting the delay. Wrap once at
 * the app or section level; a bare Tooltip still works without it.
 */
function TooltipProvider({ children, delayDuration = DEFAULT_DELAY, skipDelayDuration = 300 }: TooltipProviderProps) {
  return (
    <TooltipGroupContext.Provider value={true}>
      <TooltipPrimitive.Provider delay={delayDuration} timeout={skipDelayDuration}>
        {children}
      </TooltipPrimitive.Provider>
    </TooltipGroupContext.Provider>
  )
}

type TooltipSide = Side

interface TooltipProps {
  /** The content displayed inside the tooltip. */
  content: ReactNode
  /** The trigger element. Must accept a ref. */
  children: ReactElement
  /** Preferred side of the trigger to render the tooltip on; it flips when there is no room. Defaults to `'top'`. */
  side?: TooltipSide
  /** Alignment along that side. Defaults to `'center'`. */
  align?: Align
  /** Distance in px between the tooltip and the trigger. Defaults to `8`. */
  sideOffset?: number
  /** Portal target. Defaults to the nearest `PortalContainer`, else the document body. */
  container?: HTMLElement | null
  /** Hover delay before this tooltip opens, in ms. Defaults to `200`, or to the ambient `TooltipProvider`'s `delayDuration`. */
  delayDuration?: number
  /** Additional classes applied to the tooltip content container. */
  className?: string
  /** Extra classes for the portalled positioner element: a z utility here lifts the whole tooltip above other fixed layers (default `z-50`). */
  contentClassName?: string
  /** Controlled open state: `true` holds it open, `false` holds it closed, `undefined` leaves it to hover and focus. */
  open?: boolean
  /** Initial open state, for an uncontrolled tooltip. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when hover or focus opens or closes the tooltip, also while `open` holds it. */
  onOpenChange?: (open: boolean) => void
  /** Follow the cursor along one axis while hovering the trigger, for tall or wide triggers (the Sidebar rail) where a centered tooltip sits far from the pointer. The other axis stays anchored by `side`. */
  followCursor?: 'x' | 'y'
  /** Where the label grows from (see Morph): the trigger, the pointer, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: MorphFrom
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. `followCursor` tooltips always fade. Defaults to `'goo'`. */
  effect?: MorphEffect
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: MorphTier
}

/**
 * Floating tooltip with spring-based animations, configurable placement, and
 * rich content support.
 *
 * The trigger is whatever element you pass as the single child — it only has
 * to accept a ref. The label is portalled and grows out of its trigger
 * through the shared morph (see Morph), with the goo neck by default on
 * `spring.goo`, and flips when it would collide with the viewport edge.
 * `followCursor` tracks the pointer along one axis for tall or wide triggers,
 * while the other stays anchored by `side`. Built on Base UI's Tooltip.
 *
 * Statics:
 * - `Tooltip.Provider` — `TooltipProvider`: groups tooltips so moving from
 *   one trigger to an adjacent one skips the hover delay, and the morph: the
 *   next label shows in place.
 * - `Tooltip.PortalContainer` — the shared `PortalContainer`: portal every
 *   descendant tooltip into a given element instead of the body.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/tooltip.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
function Tooltip({
  content,
  children,
  side = 'top',
  align,
  sideOffset = 8,
  container,
  delayDuration,
  className,
  contentClassName,
  open: held,
  defaultOpen,
  onOpenChange,
  followCursor,
  from,
  effect = 'goo',
  tier = 'moderate',
}: TooltipProps) {
  // The root tracks hover and focus even while `open` holds it, so letting go
  // shows what the pointer is actually doing.
  const root = useOverlayRoot({ defaultOpen, onOpenChange })
  const open = held ?? root.open
  const shape = useShape()
  const portal = usePortalContainer(container)
  const hasAmbientProvider = useContext(TooltipGroupContext)
  // Base UI's hand-off between grouped tooltips: the next one shows in place
  // (its popup carries `data-instant="delay"`) and the last one, closed with
  // reason `none`, goes at once (its own `data-instant` lasts only a frame or two).
  const handedOff = useRef(false)
  const morph = useMorph(open, root.state.origin, {
    from,
    effect: followCursor ? 'fade' : effect,
    tier,
    instant: popup => handedOff.current || popup.dataset.instant === 'delay',
  })

  // A motion value, so pointer moves skip React renders.
  const followOffset = useMotionValue(0)
  // A held-open follow-cursor tooltip has no cursor to follow: it rests
  // centered until a real pointer takes over.
  useEffect(() => {
    if (held && followCursor) followOffset.set(0)
  }, [held, followCursor, followOffset])
  const handleFollowMove = (event: PointerEvent) => {
    if (!followCursor) return
    const rect = event.currentTarget.getBoundingClientRect()
    followOffset.set(
      followCursor === 'y'
        ? event.clientY - (rect.top + rect.height / 2)
        : event.clientX - (rect.left + rect.width / 2),
    )
  }

  const positioner = positionerProps(
    { side, align, sideOffset, effect },
    { side: 'top', align: 'center', sideOffset: 8 },
  )

  const tooltip = (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={(next, details) => {
        handedOff.current = !next && details.reason === 'none'
        root.onOpenChange(next, details)
      }}
    >
      {/* Left undefined, the delay comes from the provider. */}
      <TooltipPrimitive.Trigger
        render={children}
        delay={delayDuration}
        onPointerMove={followCursor ? handleFollowMove : undefined}
      />
      <TooltipPrimitive.Portal container={portal}>
        <TooltipPrimitive.Positioner {...positioner} className={cn(positioner.className, contentClassName)}>
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
                // The padding bump only applies where text-box trims, so
                // both keep the same height (~26px).
                'text-background text-caption weight-medium px-2 py-1 text-trim supports-[text-box:trim-both]:py-2',
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

  if (hasAmbientProvider) return tooltip

  return <TooltipPrimitive.Provider delay={delayDuration ?? DEFAULT_DELAY}>{tooltip}</TooltipPrimitive.Provider>
}

Tooltip.Provider = TooltipProvider
Tooltip.PortalContainer = TooltipPortalContainer

export type { TooltipProps, TooltipProviderProps, TooltipSide }
export { Tooltip, TooltipPortalContainer, TooltipProvider }

export default Tooltip

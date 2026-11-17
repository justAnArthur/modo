/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tooltip.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { type MotionValue, motion, useMotionValue } from 'motion/react'
import {
  cloneElement,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type MutableRefObject,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useMergeRefs } from '../../../lib/merge-refs'
import { MorphSurface } from '../../../lib/morph-layers'
import {
  type Align,
  type CollisionProps,
  PortalContainer,
  positionerProps,
  type Side,
  useOverlayRoot,
  usePortalContainer,
} from '../../../lib/overlay'
import { useShape } from '../../../lib/shape-context'
import { type SlotProps, slotRender } from '../../../lib/slot'
import { type MorphEffect, type MorphFrom, type MorphOrigin, type MorphTier, useMorph } from '../../../lib/use-morph'
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
  /** Hover delay before tooltips open, in ms (Base UI's name). Defaults to `200`. */
  delay?: number
  /** Same as `delay` (Radix's name); `delay` wins when both are set. Defaults to `200`. */
  delayDuration?: number
  /** After a tooltip closes, adjacent tooltips opened within this window skip the hover delay, in ms. Defaults to `300`. */
  skipDelayDuration?: number
  /** Same as `skipDelayDuration` (Base UI's name); `timeout` wins when both are set. */
  timeout?: number
  /** Delay before tooltips close once the pointer leaves, in ms. Defaults to `0`. */
  closeDelay?: number
}

/**
 * Groups descendant Tooltips: once one opens, moving to an adjacent trigger
 * shows its tooltip at once instead of re-waiting the delay. Wrap once at
 * the app or section level; a bare Tooltip still works without it.
 */
function TooltipProvider({
  children,
  delay,
  delayDuration,
  skipDelayDuration = 300,
  timeout,
  closeDelay,
}: TooltipProviderProps) {
  return (
    <TooltipGroupContext.Provider value={true}>
      <TooltipPrimitive.Provider
        delay={delay ?? delayDuration ?? DEFAULT_DELAY}
        timeout={timeout ?? skipDelayDuration}
        closeDelay={closeDelay}
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipGroupContext.Provider>
  )
}

type TooltipSide = Side

/** What a tooltip's trigger and content read from its root. */
interface TooltipState {
  open: boolean
  origin: RefObject<MorphOrigin>
  // Set when Base UI closed this tooltip to hand off to a grouped neighbour.
  handedOff: MutableRefObject<boolean>
  delayDuration?: number
  closeDelay?: number
  followCursor?: 'x' | 'y'
  followOffset: MotionValue<number>
}

const TooltipStateContext = createContext<TooltipState | null>(null)

function useTooltipState(part: string) {
  const state = useContext(TooltipStateContext)
  if (!state) throw new Error(`${part} must be inside a Tooltip.`)
  return state
}

interface TooltipRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  closeDelay?: number
  followCursor?: 'x' | 'y'
  children?: ReactNode
}

function TooltipRoot({
  open: held,
  defaultOpen,
  onOpenChange,
  delayDuration,
  closeDelay,
  followCursor,
  children,
}: TooltipRootProps) {
  // The root tracks hover and focus even while `open` holds it, so letting go
  // shows what the pointer is actually doing.
  const root = useOverlayRoot({ defaultOpen, onOpenChange })
  const open = held ?? root.open
  const hasAmbientProvider = useContext(TooltipGroupContext)
  const handedOff = useRef(false)
  // A motion value, so pointer moves skip React renders.
  const followOffset = useMotionValue(0)
  // A held-open follow-cursor tooltip has no cursor to follow: it rests
  // centered until a real pointer takes over.
  useEffect(() => {
    if (held && followCursor) followOffset.set(0)
  }, [held, followCursor, followOffset])

  const state = useMemo<TooltipState>(
    () => ({ open, origin: root.state.origin, handedOff, delayDuration, closeDelay, followCursor, followOffset }),
    [open, root.state.origin, delayDuration, closeDelay, followCursor, followOffset],
  )

  const tooltip = (
    <TooltipStateContext.Provider value={state}>
      <TooltipPrimitive.Root
        open={open}
        onOpenChange={(next, details) => {
          // Base UI's hand-off between grouped tooltips: the next one shows in
          // place (its popup carries `data-instant="delay"`) and the last one,
          // closed with reason `none`, goes at once.
          handedOff.current = !next && details.reason === 'none'
          root.onOpenChange(next, details)
        }}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipStateContext.Provider>
  )

  if (hasAmbientProvider) return tooltip

  return <TooltipPrimitive.Provider delay={delayDuration ?? DEFAULT_DELAY}>{tooltip}</TooltipPrimitive.Provider>
}

type TooltipTriggerProps = SlotProps

const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ render, asChild, children, onPointerMove, ...props }, ref) => {
    const { delayDuration, closeDelay, followCursor, followOffset } = useTooltipState('Tooltip.Trigger')
    const el = slotRender(render, asChild, children)

    const follow = (event: PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(event)
      const rect = event.currentTarget.getBoundingClientRect()
      followOffset.set(
        followCursor === 'y'
          ? event.clientY - (rect.top + rect.height / 2)
          : event.clientX - (rect.left + rect.width / 2),
      )
    }

    // Left undefined, the delays come from the provider.
    const shared = {
      ref,
      delay: delayDuration,
      closeDelay,
      onPointerMove: followCursor ? follow : onPointerMove,
      ...props,
    }
    return el ? (
      <TooltipPrimitive.Trigger {...shared} render={el} />
    ) : (
      <TooltipPrimitive.Trigger {...shared}>{children}</TooltipPrimitive.Trigger>
    )
  },
)
TooltipTrigger.displayName = 'TooltipTrigger'

interface TooltipContentProps extends CollisionProps, Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'> {
  /** The label. */
  children?: ReactNode
  /** The element the label renders as, inside the inverted surface; `children` go inside it. */
  render?: ReactElement
  /** Render the single child element as the label instead. Defaults to `false`. */
  asChild?: boolean
  /** Preferred side of the trigger; it flips when there is no room. Defaults to `'top'`. */
  side?: TooltipSide
  /** Alignment along that side. Defaults to `'center'`. */
  align?: Align
  /** Distance in px between the tooltip and the trigger. Defaults to `8`. */
  sideOffset?: number
  /** Portal target. Defaults to the nearest `PortalContainer`, else the document body. */
  container?: HTMLElement | null
  /** Classes for the label's surface. */
  className?: string
  /** Same as `positionerClassName`: extra classes for the portalled positioner element, where a z utility lifts the whole tooltip above other fixed layers (default `z-50`). */
  contentClassName?: string
  /** Where the label grows from (see Morph): the trigger, the pointer, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: MorphFrom
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. `followCursor` tooltips always fade. Defaults to `'goo'`. */
  effect?: MorphEffect
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: MorphTier
}

const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      children,
      render,
      asChild,
      side = 'top',
      align,
      sideOffset = 8,
      alignOffset,
      collisionPadding,
      collisionBoundary,
      positionerClassName,
      container,
      className,
      contentClassName,
      from,
      effect = 'goo',
      tier = 'moderate',
      style,
      ...props
    },
    ref,
  ) => {
    const { open, origin, handedOff, followCursor, followOffset } = useTooltipState('Tooltip.Content')
    const shape = useShape()
    const portal = usePortalContainer(container)
    const morph = useMorph(open, origin, {
      from,
      effect: followCursor ? 'fade' : effect,
      tier,
      instant: popup => handedOff.current || popup.dataset.instant === 'delay',
    })
    const popupRef = useMergeRefs(ref, morph.popupRef)
    const positioner = positionerProps(
      { side, align, sideOffset, alignOffset, collisionPadding, collisionBoundary, positionerClassName, effect },
      { side: 'top', align: 'center', sideOffset: 8 },
    )
    const label = render
      ? children === undefined
        ? render
        : cloneElement(render, undefined, children)
      : (slotRender(undefined, asChild, children) ?? children)

    return (
      <TooltipPrimitive.Portal container={portal}>
        <TooltipPrimitive.Positioner {...positioner} className={cn(positioner.className, contentClassName)}>
          <TooltipPrimitive.Popup
            {...props}
            ref={popupRef}
            className="relative outline-none"
            render={<motion.div style={{ ...style, ...(followCursor ? { [followCursor]: followOffset } : {}) }} />}
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
              {label}
            </MorphSurface>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    )
  },
)
TooltipContent.displayName = 'TooltipContent'

interface TooltipProps extends CollisionProps {
  /** The content displayed inside the tooltip. Leave it out to use `Tooltip` as the root of a compound tooltip (`Tooltip.Trigger` + `Tooltip.Content` inside). */
  content?: ReactNode
  /** The trigger element, which must accept a ref; or, without `content`, the compound parts. */
  children?: ReactNode
  /** Preferred side of the trigger to render the tooltip on; it flips when there is no room. Defaults to `'top'`. */
  side?: TooltipSide
  /** Alignment along that side. Defaults to `'center'`. */
  align?: Align
  /** Distance in px between the tooltip and the trigger. Defaults to `8`. */
  sideOffset?: number
  /** Portal target. Defaults to the nearest `PortalContainer`, else the document body. */
  container?: HTMLElement | null
  /** Hover delay before this tooltip opens, in ms (Base UI's name). Defaults to `200`, or to the ambient `TooltipProvider`'s delay. */
  delay?: number
  /** Same as `delay` (Radix's name); `delay` wins when both are set. */
  delayDuration?: number
  /** Delay before this tooltip closes once the pointer leaves, in ms. Defaults to `0`, or to the ambient `TooltipProvider`'s `closeDelay`. */
  closeDelay?: number
  /** Additional classes applied to the tooltip content container. */
  className?: string
  /** Same as `positionerClassName`: extra classes for the portalled positioner element, where a z utility lifts the whole tooltip above other fixed layers (default `z-50`). */
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
 * Leave `content` out and `Tooltip` is the root of a compound tooltip: a
 * `Tooltip.Trigger` and a `Tooltip.Content` inside it. The root keeps the
 * state props (`open`, `defaultOpen`, `onOpenChange`, `delay` or `delayDuration`,
 * `closeDelay`, `followCursor`); placement and the morph move to the content. The label
 * looks and moves the same either way.
 *
 * Statics:
 * - `Tooltip.Trigger` — the described element: `render={<Button/>}` or
 *   `asChild`, else a plain button around `children`.
 * - `Tooltip.Content` — the label: `side`, `align`, `sideOffset`,
 *   `alignOffset`, `collisionPadding`, `collisionBoundary`, `container`,
 *   `positionerClassName` (or `contentClassName`), the morph options `from`, `effect`,
 *   `tier`, and `render` or `asChild` for the label's own element; other
 *   props land on the popup.
 * - `Tooltip.Provider` — `TooltipProvider`: groups tooltips so moving from
 *   one trigger to an adjacent one skips the hover delay, and the morph: the
 *   next label shows in place. `delay` (or `delayDuration`) sets the hover
 *   delay of every tooltip in it, `closeDelay` how long they linger, and
 *   `skipDelayDuration` (or `timeout`) the hand-off window.
 * - `Tooltip.PortalContainer` — the shared `PortalContainer`: portal every
 *   descendant tooltip into a given element instead of the body.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/tooltip.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Tooltip = Object.assign(
  function Tooltip({
    content,
    children,
    side,
    align,
    sideOffset,
    container,
    alignOffset,
    collisionPadding,
    collisionBoundary,
    positionerClassName,
    delay,
    delayDuration,
    closeDelay,
    className,
    contentClassName,
    open,
    defaultOpen,
    onOpenChange,
    followCursor,
    from,
    effect,
    tier,
  }: TooltipProps) {
    const root = { open, defaultOpen, onOpenChange, delayDuration: delay ?? delayDuration, closeDelay, followCursor }
    if (content === undefined) return <TooltipRoot {...root}>{children}</TooltipRoot>

    return (
      <TooltipRoot {...root}>
        <TooltipTrigger render={children as ReactElement} />
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          collisionBoundary={collisionBoundary}
          positionerClassName={positionerClassName}
          container={container}
          className={className}
          contentClassName={contentClassName}
          from={from}
          effect={effect}
          tier={tier}
        >
          {content}
        </TooltipContent>
      </TooltipRoot>
    )
  },
  {
    Trigger: TooltipTrigger,
    Content: TooltipContent,
    Provider: TooltipProvider,
    PortalContainer: TooltipPortalContainer,
  },
)

export type { TooltipContentProps, TooltipProps, TooltipProviderProps, TooltipSide, TooltipTriggerProps }
export { Tooltip, TooltipContent, TooltipPortalContainer, TooltipProvider, TooltipTrigger }

export default Tooltip

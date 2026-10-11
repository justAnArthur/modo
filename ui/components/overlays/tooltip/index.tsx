/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tooltip.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/{utils,springs,shape-context}` imports
 *   rewritten to `../../../lib/*` (the `@/lib/font-weight` import went with the inline
 *   `fontVariationSettings`, below).
 * - `TooltipProps`: `className` / `children` docs filled in from the FF docs API table (modo's
 *   parser needs a description on every member).
 * - modo item: TSDoc (from the FF "Tooltip" docs page), the `Tooltip.Provider` /
 *   `Tooltip.PortalContainer` statics (both still exported by name) and a default export.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`.
 * - The 4px slide + fade (`getSlideOffset`, `spring.fast`) is replaced by the
 *   shared morph layer (`lib/use-morph.ts` + `MorphSurface`): the label grows
 *   out of its trigger with the goo neck by default, on `spring.goo`,
 *   with `from` / `effect` / `tier` props; `followCursor` tooltips fade, since
 *   their panel travels with the pointer. The popup's motion wrapper now only
 *   carries the cursor-follow offset.
 * - Moving between adjacent tooltips under a `Tooltip.Provider` skips the
 *   morph (Base UI's `data-instant="delay"` hand-off): the next label shows
 *   in place and the last one goes at once.
 * - Compound parts (local, for hosts with a Radix-shaped API): the flat
 *   tooltip is split into `TooltipRoot` (state, origin, grouping fallback),
 *   `TooltipTrigger` (`render` / `asChild` through `lib/slot.ts`) and
 *   `TooltipContent` (`side`, `align`, offsets, the morph options, `render` /
 *   `asChild` for the label's element, rest props on the popup). `Tooltip`
 *   without `content` acts as the root; with `content` it composes the three
 *   parts exactly as before. `TooltipProvider` also takes Base UI's names
 *   (`delay`, `closeDelay`, `timeout`) next to the Radix ones it had.
 *   `TooltipTrigger` drops the slot's `nativeButton` (Base UI's tooltip
 *   trigger has no button semantics), and its `render` element takes the
 *   children when it has none of its own (`slotRender`).
 */

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { type MotionValue, motion, useMotionValue } from 'motion/react'
import {
  cloneElement,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MorphSurface } from '../../../lib/morph-layers'
import { useShape } from '../../../lib/shape-context'
import { type SlotProps, slotRender } from '../../../lib/slot'
import { type MorphOrigin, useMorph, useMorphOrigin } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'

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
const DEFAULT_TIMEOUT = 300

// Tracks whether an app-level <TooltipProvider> is above us. Each Tooltip
// only wraps itself in a local primitive Provider when there isn't one —
// a per-instance Provider would defeat cross-tooltip skip-delay grouping
// (moving between adjacent tooltips would re-wait the full delay).
const TooltipGroupContext = createContext(false)

interface TooltipProviderProps {
  children: ReactNode
  /** Hover delay before tooltips open, in ms. Defaults to 200. */
  delay?: number
  /** Delay before a tooltip closes once the pointer leaves, in ms. Defaults to 0. */
  closeDelay?: number
  /** After a tooltip closes, adjacent tooltips opened within this window
   *  skip the hover delay, in ms. Defaults to 300. */
  timeout?: number
  /** Radix name for `delay`; `delay` wins when both are set. */
  delayDuration?: number
  /** Radix name for `timeout`; `timeout` wins when both are set. A negative
   *  value, as some Radix configs use to turn the skip off, counts as 0. */
  skipDelayDuration?: number
}

/** Groups descendant Tooltips so that once one opens, moving to an adjacent
 *  trigger shows its tooltip instantly instead of re-waiting the full delay.
 *  Wrap once at the app (or section) level; bare Tooltips still work without
 *  it via a per-instance fallback. Takes Base UI's `delay` / `closeDelay` /
 *  `timeout`, or Radix's `delayDuration` / `skipDelayDuration`, so a Radix
 *  provider config can be spread into it. */
function TooltipProvider({
  children,
  delay,
  closeDelay,
  timeout,
  delayDuration,
  skipDelayDuration,
}: TooltipProviderProps) {
  return (
    <TooltipGroupContext.Provider value={true}>
      <TooltipPrimitive.Provider
        delay={delay ?? delayDuration ?? DEFAULT_DELAY}
        closeDelay={closeDelay}
        timeout={Math.max(0, timeout ?? skipDelayDuration ?? DEFAULT_TIMEOUT)}
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipGroupContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Root state, shared by the trigger and the content
// ---------------------------------------------------------------------------

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
type TooltipAlign = 'start' | 'center' | 'end'

interface TooltipState {
  open: boolean
  origin: RefObject<MorphOrigin>
  // Set when Base UI closed this tooltip to hand off to a grouped neighbour.
  handedOff: MutableRefObject<boolean>
  delay?: number
  closeDelay?: number
  followCursor?: 'x' | 'y'
  followOffset: MotionValue<number>
}

const TooltipStateContext = createContext<TooltipState | null>(null)

function useTooltipState(part: string) {
  const state = useContext(TooltipStateContext)
  if (!state) throw new Error(`${part} must be used inside a Tooltip (or Tooltip.Root).`)
  return state
}

interface TooltipRootProps {
  /** Controlled open state. While set, hover and focus only report through `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled tooltip. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when hover, focus or Escape would open or close the tooltip. */
  onOpenChange?: (open: boolean) => void
  /** Hover delay before this tooltip opens, in ms. Defaults to the surrounding TooltipProvider's, else 200. */
  delay?: number
  /** Radix name for `delay`. */
  delayDuration?: number
  /** Delay before it closes once the pointer leaves, in ms. Defaults to the surrounding TooltipProvider's, else 0. */
  closeDelay?: number
  /** Follow the cursor along one axis while hovering the trigger (see Tooltip's `followCursor`). */
  followCursor?: 'x' | 'y'
  /** A `Tooltip.Trigger` and a `Tooltip.Content`. */
  children?: ReactNode
}

/** The state of one compound tooltip: open state, what opened it, the delays and the cursor axis. */
function TooltipRoot({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  delay: delayProp,
  delayDuration,
  closeDelay,
  followCursor,
  children,
}: TooltipRootProps) {
  // Not useControllableState: a forced `open` is an override, and the
  // tooltip's own hover state resumes from where it was once it is lifted.
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp ?? internalOpen
  const hasAmbientProvider = useContext(TooltipGroupContext)
  const { origin, capture } = useMorphOrigin()
  const handedOff = useRef(false)
  const delay = delayProp ?? delayDuration

  // Cursor-follow offset from the trigger's center, driven as a motion value
  // so per-move updates skip React re-renders.
  const followOffset = useMotionValue(0)
  // A force-opened follow-cursor tooltip has no cursor to follow — it rests
  // centered on the trigger until a real pointer takes over.
  useEffect(() => {
    if (openProp && followCursor) followOffset.set(0)
  }, [openProp, followCursor, followOffset])

  const state = useMemo<TooltipState>(
    () => ({ open, origin, handedOff, delay, closeDelay, followCursor, followOffset }),
    [open, origin, delay, closeDelay, followCursor, followOffset],
  )

  const root = (
    <TooltipStateContext.Provider value={state}>
      <TooltipPrimitive.Root
        open={open}
        onOpenChange={(next, details) => {
          if (next) capture(details)
          // Base UI's hand-off between grouped tooltips: the next one shows in
          // place (its popup carries `data-instant="delay"`) and the last one,
          // closed with reason `none`, goes at once.
          handedOff.current = !next && details.reason === 'none'
          setInternalOpen(next)
          onOpenChange?.(next)
        }}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipStateContext.Provider>
  )

  // Fallback: without an ambient TooltipProvider, give this instance its own
  // so a bare tooltip keeps the library's default delay. Grouped skip-delay
  // needs the shared app-level TooltipProvider.
  if (hasAmbientProvider) return root

  return <TooltipPrimitive.Provider delay={delay ?? DEFAULT_DELAY}>{root}</TooltipPrimitive.Provider>
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

type TooltipTriggerProps = SlotProps

/** The element the tooltip describes: `render={<Button/>}`, Radix-style `asChild`, or a plain button around `children`. */
const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  // `nativeButton` is dropped: Base UI's Tooltip.Trigger has no button semantics to adjust.
  ({ render, asChild, children, onPointerMove, nativeButton: _nativeButton, ...props }, ref) => {
    const { delay, closeDelay, followCursor, followOffset } = useTooltipState('Tooltip.Trigger')
    const el = slotRender(render, asChild, children)

    const handleMove = (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(event)
      if (!followCursor) return
      const rect = event.currentTarget.getBoundingClientRect()
      followOffset.set(
        followCursor === 'y'
          ? event.clientY - (rect.top + rect.height / 2)
          : event.clientX - (rect.left + rect.width / 2),
      )
    }

    // An explicit delay overrides the ambient provider's; left undefined, the
    // trigger inherits it from the provider.
    const shared = { ref, delay, closeDelay, onPointerMove: followCursor ? handleMove : onPointerMove, ...props }
    return el ? (
      <TooltipPrimitive.Trigger {...shared} render={el} />
    ) : (
      <TooltipPrimitive.Trigger {...shared}>{children}</TooltipPrimitive.Trigger>
    )
  },
)
TooltipTrigger.displayName = 'TooltipTrigger'

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface TooltipContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'> {
  /** The label. */
  children?: ReactNode
  /** An element to render the label as, inside the inverted surface; the label goes inside it. */
  render?: ReactElement
  /** Radix-style: the single child element is the label, rendered as-is inside the surface. Defaults to `false`. */
  asChild?: boolean
  /** Preferred side of the trigger; flips when it would collide with the viewport edge. Defaults to `"top"`. */
  side?: TooltipSide
  /** Alignment against the trigger along that side. Defaults to `"center"`. */
  align?: TooltipAlign
  /** Distance in pixels between the tooltip and the trigger. Defaults to `8`. */
  sideOffset?: number
  /** Shift in pixels along the alignment axis. Defaults to `0`. */
  alignOffset?: number
  /** Classes for the label's surface. */
  className?: string
  /** Classes for the portalled positioner — a z utility here lifts the tooltip above other fixed layers (default z-50). */
  positionerClassName?: string
  /** Where the label grows from (see Morph): the trigger, the pointer, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. `followCursor` tooltips always fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
}

/** The inverted label, portalled and positioned next to the trigger, grown out of it through the morph. */
const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      children,
      side = 'top',
      align = 'center',
      sideOffset = 8,
      alignOffset = 0,
      className,
      positionerClassName,
      from,
      effect = 'goo',
      tier = 'moderate',
      render,
      asChild,
      style,
      ...props
    },
    ref,
  ) => {
    const { open, origin, handedOff, followCursor, followOffset } = useTooltipState('Tooltip.Content')
    const shape = useShape()
    const portalContainer = useContext(TooltipPortalContainerContext)
    const morph = useMorph(open, origin, {
      from,
      effect: followCursor ? 'fade' : effect,
      tier,
      instant: popup => handedOff.current || popup.dataset.instant === 'delay',
    })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])
    const label = render
      ? children === undefined
        ? render
        : cloneElement(render, undefined, children)
      : (slotRender(undefined, asChild, children) ?? children)

    return (
      <TooltipPrimitive.Portal container={portalContainer ?? undefined}>
        <TooltipPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          className={cn('z-50', positionerClassName)}
        >
          {/* Other props (id, data-*, aria-*, handlers) land on the popup. */}
          <TooltipPrimitive.Popup
            {...props}
            ref={morph.popupRef}
            className="relative outline-none"
            render={<motion.div style={{ ...style, ...(followCursor ? { [followCursor]: followOffset } : {}) }} />}
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
              {label}
            </MorphSurface>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    )
  },
)
TooltipContent.displayName = 'TooltipContent'

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  /** The content displayed inside the tooltip. Leave it out to use `Tooltip` as the root of a compound tooltip (`Tooltip.Trigger` + `Tooltip.Content` inside). */
  content?: ReactNode
  /** The trigger element, which must accept a ref; or, without `content`, the compound parts. */
  children?: ReactNode
  /** Preferred side of the trigger to render the tooltip on. Defaults to `"top"`. */
  side?: TooltipSide
  /** Alignment against the trigger along that side. Defaults to `"center"`. */
  align?: TooltipAlign
  /** Distance in pixels between the tooltip and the trigger. Defaults to `8`. */
  sideOffset?: number
  /** Hover delay before this tooltip opens, in ms. Defaults to 200, or to the ambient TooltipProvider's delay when one is present. */
  delayDuration?: number
  /** Base UI name for `delayDuration`. */
  delay?: number
  /** Delay before it closes once the pointer leaves, in ms. Defaults to the ambient TooltipProvider's, else 0. */
  closeDelay?: number
  /** Additional classes applied to the tooltip content container. */
  className?: string
  /** Extra classes for the portalled positioner element — pass a z utility here to lift the whole tooltip above other fixed layers (default z-50). */
  contentClassName?: string
  /** When true, forces the tooltip open. When false, forces it closed. When undefined, uses default hover/focus behavior. */
  forceOpen?: boolean
  /** Controlled open state, the Radix spelling of `forceOpen`. */
  open?: boolean
  /** Initial open state, for an uncontrolled tooltip. Defaults to `false`. */
  defaultOpen?: boolean
  /** Follow the cursor along one axis while hovering the trigger — for tall or wide triggers (the Sidebar rail) where a centered tooltip sits far from the pointer. The other axis stays anchored by `side`. */
  followCursor?: 'x' | 'y'
  /** Called when the tooltip's internal open state changes (before forceOpen is applied). */
  onOpenChange?: (open: boolean) => void
  /** Where the label grows from (see Morph): the trigger, the pointer, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. `followCursor` tooltips always fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
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
 * Leave `content` out and `Tooltip` becomes the root of a compound tooltip:
 * a `Tooltip.Trigger` and a `Tooltip.Content` inside it, the shape Radix
 * code is written in. The label looks and moves the same either way.
 *
 * Statics:
 * - `Tooltip.Root` — `TooltipRoot`: the compound root on its own: `open`,
 *   `defaultOpen`, `onOpenChange`, `delay` (or `delayDuration`),
 *   `closeDelay`, `followCursor`.
 * - `Tooltip.Trigger` — `TooltipTrigger`: the described element,
 *   `render={<Button/>}` or Radix-style `asChild`.
 * - `Tooltip.Content` — `TooltipContent`: the label: `side`, `align`,
 *   `sideOffset`, `alignOffset`, `positionerClassName`, the morph options
 *   `from`, `effect`, `tier`, and `render` or Radix-style `asChild` for the
 *   label's own element; other props land on the popup.
 * - `Tooltip.Provider` — `TooltipProvider`: groups tooltips so moving from
 *   one trigger to an adjacent one skips the hover delay, and the morph: the
 *   next label shows in place. `delay`, `closeDelay`, `timeout`, or Radix's
 *   `delayDuration` and `skipDelayDuration`.
 * - `Tooltip.PortalContainer` — `TooltipPortalContainer`: portal every
 *   descendant tooltip into a given element instead of the body.
 *
 * @example {@include ./examples.mdx}
 */
function Tooltip({
  content,
  children,
  side,
  align,
  sideOffset,
  delayDuration,
  delay,
  closeDelay,
  className,
  contentClassName,
  forceOpen,
  open,
  defaultOpen,
  onOpenChange,
  followCursor,
  from,
  effect,
  tier,
}: TooltipProps) {
  const root = {
    open: forceOpen ?? open,
    defaultOpen,
    onOpenChange,
    delay: delay ?? delayDuration,
    closeDelay,
    followCursor,
  }
  if (content === undefined) return <TooltipRoot {...root}>{children}</TooltipRoot>

  return (
    <TooltipRoot {...root}>
      <TooltipTrigger render={children as ReactElement} />
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={className}
        positionerClassName={contentClassName}
        from={from}
        effect={effect}
        tier={tier}
      >
        {content}
      </TooltipContent>
    </TooltipRoot>
  )
}

/* Compound members: the parts, the provider and the portal-container scope
   hang off Tooltip as attributes, so examples read `<Tooltip.Provider>`. */
Tooltip.Root = TooltipRoot
Tooltip.Trigger = TooltipTrigger
Tooltip.Content = TooltipContent
Tooltip.Provider = TooltipProvider
Tooltip.PortalContainer = TooltipPortalContainer

export type {
  TooltipAlign,
  TooltipContentProps,
  TooltipProps,
  TooltipProviderProps,
  TooltipRootProps,
  TooltipSide,
  TooltipTriggerProps,
}
export { Tooltip, TooltipContent, TooltipPortalContainer, TooltipProvider, TooltipRoot, TooltipTrigger }

export default Tooltip

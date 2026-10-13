/*
 * Local addition (not part of Fluid Functionalism): a morphing popover. The
 * panel grows out of its trigger through `lib/use-morph.ts`, with the goo neck
 * by default. After beUI's gooey popover (github.com/starc007/ui-components
 * `components/motion/popover.tsx` @ de52f337e520e7ee37749b36eb1c32df86137bcb —
 * MIT © 2026 Saurabh Chauhan, notice: LICENSE.beui) and motion-primitives'
 * morphing popover (github.com/ibelick/motion-primitives
 * `components/core/morphing-popover.tsx` @ 120f64f6ca60348e251f929e9c81f11ccbe45eda
 * — MIT © 2024 ibelick, notice: LICENSE.motion-primitives). Behavior is Base
 * UI's Popover; neither project's own dismissal, gesture or positioning code
 * is ported.
 */

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import {
  type ComponentProps,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useContext,
  useImperativeHandle,
  useMemo,
} from 'react'
import { MorphSurface } from '../../../lib/morph-layers'
import { useShape } from '../../../lib/shape-context'
import { type SlotProps, slotId, slotRender } from '../../../lib/slot'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { inPlaceOffset, type MorphOrigin, opensInPlace, useMorph, useMorphOrigin } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'

interface PopoverContextValue {
  open: boolean
  origin: RefObject<MorphOrigin>
}

const PopoverContext = createContext<PopoverContextValue>({ open: false, origin: { current: {} } })

interface PopoverTriggerProps extends SlotProps {
  /** Open on hover as well as on press (a tap still toggles it on touch). Defaults to `false`. */
  openOnHover?: boolean
  /** Hover delay before opening, in ms. Needs `openOnHover`. Defaults to `300`. */
  delay?: number
  /** Delay before closing once the pointer leaves, in ms. Needs `openOnHover`. Defaults to `0`. */
  closeDelay?: number
}

const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ render, asChild, children, ...props }, ref) => {
    const el = slotRender(render, asChild, children)
    return el ? (
      <PopoverPrimitive.Trigger ref={ref} render={el} {...props} id={slotId(el, props.id)} />
    ) : (
      <PopoverPrimitive.Trigger ref={ref} {...props}>
        {children}
      </PopoverPrimitive.Trigger>
    )
  },
)
PopoverTrigger.displayName = 'PopoverTrigger'

const PopoverClose = forwardRef<HTMLButtonElement, SlotProps>(({ render, asChild, children, ...props }, ref) => {
  const el = slotRender(render, asChild, children)
  return el ? (
    <PopoverPrimitive.Close ref={ref} render={el} {...props} />
  ) : (
    <PopoverPrimitive.Close ref={ref} {...props}>
      {children}
    </PopoverPrimitive.Close>
  )
})
PopoverClose.displayName = 'PopoverClose'

type PositionerProps = ComponentProps<typeof PopoverPrimitive.Positioner>
type PopupProps = ComponentProps<typeof PopoverPrimitive.Popup>

/** What the panel is positioned against: an element, a ref to one, a virtual element (`{ getBoundingClientRect }`), or a function returning either. */
type PopoverAnchor = PositionerProps['anchor']

/** Resolves an `anchor` to the element the panel grows from; a virtual or missing anchor gives `null`. */
function anchorElement(anchor: PopoverAnchor): HTMLElement | null {
  const resolved = typeof anchor === 'function' ? anchor() : anchor
  const el = resolved && 'current' in resolved ? resolved.current : resolved
  return el instanceof HTMLElement ? el : null
}

interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Side of the anchor the panel opens on; it flips when there is no room. Defaults to `'bottom'`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment along that side. Defaults to `'center'`, or `'start'` when the panel opens in place (`effect="morph"` with `hideSource`). */
  align?: 'start' | 'center' | 'end'
  /** Gap between anchor and panel in px — the length of the goo neck. Ignored when the panel opens in place over its trigger (`effect="morph"` with `hideSource`). Defaults to `12`. */
  sideOffset?: number
  /** Shift along the aligned edge in px, after `align` (a number, or Base UI's function of side, align and sizes). Defaults to `0`. */
  alignOffset?: PositionerProps['alignOffset']
  /** What the panel is positioned against instead of the trigger: an element, a ref to one, a virtual element (`{ getBoundingClientRect }`) or a function returning either. An element anchor is also where the panel grows from, and sets `--anchor-width` / `--anchor-height` for sizing the panel to it. Defaults to the trigger. */
  anchor?: PopoverAnchor
  /** Space kept between the panel and the edge of its collision boundary, in px or per side. Defaults to `5`. */
  collisionPadding?: PositionerProps['collisionPadding']
  /** The area the panel must stay inside: an element, several, or a rect. Defaults to `'clipping-ancestors'`. */
  collisionBoundary?: PositionerProps['collisionBoundary']
  /** Where focus goes when the panel opens: a ref, `false` to leave it, `true` for the default, or a function of how it opened (`'mouse'`, `'touch'`, `'pen'`, `'keyboard'`). Defaults to the panel itself. */
  initialFocus?: PopupProps['initialFocus']
  /** Where focus goes when the panel closes: a ref, `false` to leave it, `true` for the default, or a function of how it closed. Defaults to the trigger. */
  finalFocus?: PopupProps['finalFocus']
  /** Where the panel grows from (see Morph): the pressed trigger, the press point, its own center, a viewport edge, or a ref to any element. Defaults to the `anchor` when it is an element, otherwise `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the trigger while open, so it reads as turning into the panel. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
  /** Portal target. Defaults to the document body. */
  container?: HTMLElement | null
  /** Classes for the panel's content box: padding, width, layout. */
  className?: string
  /** The panel's content. Everything inside reads the popover's surface level as its substrate. */
  children?: ReactNode
}

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      side = 'bottom',
      align,
      sideOffset = 12,
      alignOffset,
      anchor,
      collisionPadding,
      collisionBoundary,
      initialFocus,
      finalFocus,
      from,
      effect,
      hideSource,
      tier,
      container,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { open, origin } = useContext(PopoverContext)
    // An element anchor is the morph's source, read as the morph starts (a
    // ref fills after this render). A virtual anchor has no box to grow
    // from, so the panel grows from the trigger.
    const anchorSource = useMemo<RefObject<HTMLElement | null> | undefined>(
      () =>
        anchor
          ? {
              get current() {
                return anchorElement(anchor) ?? origin.current?.trigger ?? null
              },
            }
          : undefined,
      [anchor, origin],
    )
    const morph = useMorph(open, origin, {
      from: from ?? anchorSource,
      effect,
      hideSource,
      tier,
      // A custom `finalFocus` places focus itself; the morph's own return
      // to the trigger would undo it.
      returnFocus: typeof finalFocus === 'boolean' ? finalFocus : finalFocus === undefined,
    })
    const inPlace = opensInPlace({ effect, hideSource })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])
    const shape = useShape()
    // Fixed shadow, like the dropdown and select menus (see Elevated).
    const level = Math.min(useSurface() + 2, 8)

    return (
      <PopoverPrimitive.Portal container={container ?? undefined}>
        <PopoverPrimitive.Positioner
          side={side}
          align={align ?? (inPlace ? 'start' : 'center')}
          sideOffset={inPlace ? inPlaceOffset : sideOffset}
          alignOffset={alignOffset}
          anchor={anchor}
          collisionPadding={collisionPadding}
          collisionBoundary={collisionBoundary}
          className="z-50 outline-none"
        >
          <PopoverPrimitive.Popup
            ref={morph.popupRef}
            initialFocus={initialFocus}
            finalFocus={finalFocus}
            className="relative outline-none"
            {...props}
          >
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shape.container}
                className={cn('flex w-max max-w-[min(92vw,20rem)] flex-col gap-1 p-4', className)}
              >
                {children}
              </MorphSurface>
            </SurfaceProvider>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    )
  },
)
PopoverContent.displayName = 'PopoverContent'

const PopoverTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <PopoverPrimitive.Title
      ref={ref}
      className={cn('text-subtitle weight-semibold text-foreground', className)}
      {...props}
    />
  ),
)
PopoverTitle.displayName = 'PopoverTitle'

const PopoverDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <PopoverPrimitive.Description
      ref={ref}
      className={cn('text-caption text-muted-foreground', className)}
      {...props}
    />
  ),
)
PopoverDescription.displayName = 'PopoverDescription'

/** What `onOpenChange` receives besides the open state: Base UI's Popover change details. */
type PopoverOpenChangeDetails = PopoverPrimitive.Root.ChangeEventDetails

interface PopoverProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled popover. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the popover opens or closes, with Base UI's change details: `reason` (`'escape-key'`, `'outside-press'`, `'trigger-press'`, …), the `event`, and `cancel()` to keep it as it is. */
  onOpenChange?: (open: boolean, details: PopoverOpenChangeDetails) => void
  /** Trap focus and block page interaction while open. Defaults to `false`. */
  modal?: boolean
  /** The trigger and the panel — `Popover.Trigger` plus a `Popover.Content`. */
  children?: ReactNode
}

/**
 * A panel that oozes out of its trigger: the surface melts out of the button
 * through a liquid neck, then lets go and settles beside it.
 *
 * The morph comes from the shared engine (see Morph), so the panel can grow
 * from the trigger (the default), the press point, its own center, a viewport
 * edge or any element, with the goo neck, a plain morph, a slide or a fade.
 * It closes back into wherever it came from. The panel lifts 2 surface levels
 * off its substrate and re-provides that level. Built on Base UI's Popover:
 * it opens on press, or on hover too with `openOnHover`; it flips to the
 * other side when there is no room; Escape and an outside press close it.
 * `onOpenChange` hears why (`details.reason`) and can `details.cancel()` it.
 *
 * Statics:
 * - `Popover.Trigger` — the control that opens it: `render={<Button/>}` or
 *   `asChild`; `openOnHover`, `delay`, `closeDelay`. Children fill a render
 *   element that has none of its own (`render={<span/>}` + children), and
 *   `nativeButton={false}` tells Base UI it isn't a `<button>`.
 * - `Popover.Content` — the panel: `side`, `align` (the trigger's `start`,
 *   `center` or `end`), `sideOffset`, `alignOffset`, `anchor` (position it
 *   against another element than the trigger, which it then grows from),
 *   `collisionPadding`, `collisionBoundary`, `initialFocus`, `finalFocus`
 *   and the morph options `from`, `effect`, `hideSource`, `tier`.
 * - `Popover.Title` / `Popover.Description` — its labelled heading and
 *   supporting line, wired for screen readers.
 * - `Popover.Close` — closes it; same `render` / `asChild` shape.
 *
 * @example {@include ./examples.mdx}
 */
function Popover({ open, defaultOpen = false, onOpenChange, modal = false, children }: PopoverProps) {
  // The change is reported here, not through the state hook, so the
  // handler gets Base UI's details and can cancel it.
  const [current, setCurrent] = useControllableState(open, defaultOpen)
  const { origin, capture } = useMorphOrigin()
  const ctx = useMemo(() => ({ open: current, origin }), [current, origin])

  return (
    <PopoverContext.Provider value={ctx}>
      <PopoverPrimitive.Root
        open={current}
        modal={modal}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details)
          if (details.isCanceled) return
          if (next) capture(details)
          setCurrent(next)
        }}
      >
        {children}
      </PopoverPrimitive.Root>
    </PopoverContext.Provider>
  )
}

Popover.Trigger = PopoverTrigger
Popover.Content = PopoverContent
Popover.Title = PopoverTitle
Popover.Description = PopoverDescription
Popover.Close = PopoverClose

export type { PopoverContentProps, PopoverOpenChangeDetails, PopoverProps, PopoverTriggerProps }
export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger }

export default Popover

/*!
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

'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { type ComponentProps, forwardRef, type HTMLAttributes, type ReactNode, type RefObject, useMemo } from 'react'
import { useMergeRefs } from '../../../lib/merge-refs'
import {
  type AnchorProps,
  OverlayContext,
  positionerProps,
  useOverlay,
  useOverlayRoot,
  usePortalContainer,
} from '../../../lib/overlay'
import { PopupSurface } from '../../../lib/popup-surface'
import { type SlotProps, slotPart } from '../../../lib/slot'
import { type MorphOrigin, type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'

interface PopoverTriggerProps extends SlotProps {
  /** Open on hover as well as on press (a tap still toggles it on touch). Defaults to `false`. */
  openOnHover?: boolean
  /** Hover delay before opening, in ms. Needs `openOnHover`. Defaults to `300`. */
  delay?: number
  /** Delay before closing once the pointer leaves, in ms. Needs `openOnHover`. Defaults to `0`. */
  closeDelay?: number
}

const PopoverTrigger = slotPart<PopoverTriggerProps>(PopoverPrimitive.Trigger, 'PopoverTrigger')
const PopoverClose = slotPart(PopoverPrimitive.Close, 'PopoverClose')

type PositionerProps = ComponentProps<typeof PopoverPrimitive.Positioner>
type PopupProps = ComponentProps<typeof PopoverPrimitive.Popup>

/** What the panel is positioned against: an element, a ref to one, a virtual element (`{ getBoundingClientRect }`), or a function returning either. */
type PopoverAnchor = PositionerProps['anchor']

/** The element an `anchor` resolves to; a virtual or empty anchor has none. */
function anchorElement(anchor: PopoverAnchor): HTMLElement | null {
  const resolved = typeof anchor === 'function' ? anchor() : anchor
  const el = resolved && 'current' in resolved ? resolved.current : resolved
  return el instanceof HTMLElement ? el : null
}

/**
 * The morph source for an `anchor`, read as the morph starts (a ref fills
 * after this render): the anchor element, else the trigger, since a virtual
 * anchor has no box to grow from.
 */
function useAnchorSource(anchor: PopoverAnchor, origin: RefObject<MorphOrigin>) {
  return useMemo<RefObject<HTMLElement | null> | undefined>(
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
}

interface PopoverContentProps extends AnchorProps, MorphProps, HTMLAttributes<HTMLDivElement> {
  /** Positions the panel against this instead of the trigger: an element, a ref to one, a virtual element (`{ getBoundingClientRect }`) or a function returning either. An element anchor is also where the panel grows from (unless `from` says otherwise) and sets `--anchor-width` / `--anchor-height`. Defaults to the trigger. */
  anchor?: PopoverAnchor
  /** Shift along the aligned edge in px, after `align`, or Base UI's function of side, align and sizes. Defaults to `0`. */
  alignOffset?: PositionerProps['alignOffset']
  /** Space kept between the panel and the edge of its collision boundary, in px or per side. Defaults to `5`. */
  collisionPadding?: PositionerProps['collisionPadding']
  /** The area the panel stays inside: an element, several, or a rect. Defaults to `'clipping-ancestors'`. */
  collisionBoundary?: PositionerProps['collisionBoundary']
  /** How the panel avoids collisions, per axis: `side` (`'flip'` or `'none'`), `align` (`'shift'`, `'flip'` or `'none'`), `fallbackAxisSide`. Defaults to flipping sides and shifting along the edge. */
  collisionAvoidance?: PositionerProps['collisionAvoidance']
  /** Where focus goes when the panel opens: a ref, `false` to leave it, `true` for the default, or a function of how it opened (`'mouse'`, `'touch'`, `'pen'`, `'keyboard'`). Defaults to the panel. */
  initialFocus?: PopupProps['initialFocus']
  /** Where focus goes when the panel closes: a ref, `false` to leave it, `true` for the default, or a function of how it closed. Defaults to the trigger. */
  finalFocus?: PopupProps['finalFocus']
  /** Classes for the panel's content box: padding, width, layout. */
  className?: string
  /** The panel's content. Everything inside reads the popover's surface level as its substrate. */
  children?: ReactNode
}

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      side,
      align,
      sideOffset,
      alignOffset,
      anchor,
      collisionPadding,
      collisionBoundary,
      collisionAvoidance,
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
    const { open, origin } = useOverlay('Popover.Content')
    const anchorSource = useAnchorSource(anchor, origin)
    const morph = useMorph(open, origin, {
      from: from ?? anchorSource,
      effect,
      hideSource,
      tier,
      // A custom `finalFocus` places focus itself; the morph's own return to the trigger would undo it.
      returnFocus: typeof finalFocus === 'boolean' ? finalFocus : finalFocus === undefined,
    })
    const popupRef = useMergeRefs(ref, morph.popupRef)

    return (
      <PopoverPrimitive.Portal container={usePortalContainer(container)}>
        <PopoverPrimitive.Positioner
          {...positionerProps(
            { side, align, sideOffset, effect, hideSource },
            { side: 'bottom', align: 'center', sideOffset: 12 },
          )}
          anchor={anchor}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          collisionBoundary={collisionBoundary}
          collisionAvoidance={collisionAvoidance}
        >
          <PopoverPrimitive.Popup
            ref={popupRef}
            initialFocus={initialFocus}
            finalFocus={finalFocus}
            className="relative outline-none"
            {...props}
          >
            <PopupSurface
              morph={morph}
              className={cn('flex w-max max-w-[min(92vw,20rem)] flex-col gap-1 p-4', className)}
            >
              {children}
            </PopupSurface>
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
  /** Called when the popover opens or closes, with Base UI's change details: `reason` (`'trigger-press'`, `'outside-press'`, `'escape-key'`, …), the `event`, and `cancel()` to keep it as it is. */
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
 * `anchor` positions the panel against another element than the trigger (a
 * whole field whose icon opens it); an element anchor is also where the
 * panel grows from. `initialFocus` and `finalFocus` choose where focus goes
 * on open and close.
 *
 * Statics:
 * - `Popover.Trigger` — the control that opens it: `render={<Button/>}` or
 *   `asChild`; `openOnHover`, `delay`, `closeDelay`.
 * - `Popover.Content` — the panel: `side` (default `'bottom'`), `align` (the
 *   trigger's `start`, `center` or `end`; default `'center'`, or `'start'`
 *   when it opens in place), `sideOffset` (default `12`), `alignOffset`,
 *   `anchor`, `collisionPadding`, `collisionBoundary`,
 *   `collisionAvoidance`, `initialFocus`, `finalFocus`, `container`, and
 *   the morph options `from` (default `'trigger'`, or the `anchor`
 *   element), `effect` (default `'goo'`), `hideSource`, `tier` (default
 *   `'slow'`).
 * - `Popover.Title` / `Popover.Description` — its labelled heading and
 *   supporting line, wired for screen readers.
 * - `Popover.Close` — closes it; same `render` / `asChild` shape.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/starc007/ui-components/blob/de52f337e520e7ee37749b36eb1c32df86137bcb/components/motion/popover.tsx beUI
 * @source https://github.com/ibelick/motion-primitives/blob/120f64f6ca60348e251f929e9c81f11ccbe45eda/components/core/morphing-popover.tsx motion-primitives
 * @license MIT © 2026 Saurabh Chauhan
 * @license MIT © 2024 ibelick
 */
const Popover = Object.assign(
  function Popover({ open, defaultOpen, onOpenChange, modal = false, children }: PopoverProps) {
    // Reported here rather than through the root's state, so the handler gets the details and can cancel.
    const root = useOverlayRoot({ open, defaultOpen })

    return (
      <OverlayContext.Provider value={root.state}>
        <PopoverPrimitive.Root
          open={root.open}
          modal={modal}
          onOpenChange={(next, details) => {
            onOpenChange?.(next, details)
            if (!details.isCanceled) root.onOpenChange(next, details)
          }}
        >
          {children}
        </PopoverPrimitive.Root>
      </OverlayContext.Provider>
    )
  },
  {
    Trigger: PopoverTrigger,
    Content: PopoverContent,
    Title: PopoverTitle,
    Description: PopoverDescription,
    Close: PopoverClose,
  },
)

export type { PopoverAnchor, PopoverContentProps, PopoverOpenChangeDetails, PopoverProps, PopoverTriggerProps }
export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger }

export default Popover

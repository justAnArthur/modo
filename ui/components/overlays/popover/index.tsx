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
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
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
import { type MorphProps, useMorph } from '../../../lib/use-morph'
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

interface PopoverContentProps extends AnchorProps, MorphProps, HTMLAttributes<HTMLDivElement> {
  /** Classes for the panel's content box: padding, width, layout. */
  className?: string
  /** The panel's content. Everything inside reads the popover's surface level as its substrate. */
  children?: ReactNode
}

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ side, align, sideOffset, from, effect, hideSource, tier, container, className, children, ...props }, ref) => {
    const { open, origin } = useOverlay('Popover.Content')
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)

    return (
      <PopoverPrimitive.Portal container={usePortalContainer(container)}>
        <PopoverPrimitive.Positioner
          {...positionerProps(
            { side, align, sideOffset, effect, hideSource },
            { side: 'bottom', align: 'center', sideOffset: 12 },
          )}
        >
          <PopoverPrimitive.Popup ref={popupRef} className="relative outline-none" {...props}>
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

interface PopoverProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled popover. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void
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
 *
 * Statics:
 * - `Popover.Trigger` — the control that opens it: `render={<Button/>}` or
 *   `asChild`; `openOnHover`, `delay`, `closeDelay`.
 * - `Popover.Content` — the panel: `side` (default `'bottom'`), `align` (the
 *   trigger's `start`, `center` or `end`; default `'center'`, or `'start'`
 *   when it opens in place), `sideOffset` (default `12`), `container`, and
 *   the morph options `from` (default `'trigger'`), `effect` (default
 *   `'goo'`), `hideSource`, `tier` (default `'slow'`).
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
function Popover({ open, defaultOpen, onOpenChange, modal = false, children }: PopoverProps) {
  const root = useOverlayRoot({ open, defaultOpen, onOpenChange })

  return (
    <OverlayContext.Provider value={root.state}>
      <PopoverPrimitive.Root open={root.open} modal={modal} onOpenChange={root.onOpenChange}>
        {children}
      </PopoverPrimitive.Root>
    </OverlayContext.Provider>
  )
}

Popover.Trigger = PopoverTrigger
Popover.Content = PopoverContent
Popover.Title = PopoverTitle
Popover.Description = PopoverDescription
Popover.Close = PopoverClose

export type { PopoverContentProps, PopoverProps, PopoverTriggerProps }
export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger }

export default Popover

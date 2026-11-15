/*!
 * Local addition (not part of Fluid Functionalism): a hover card that oozes
 * out of its link, like Popover, after beUI's gooey popover
 * (github.com/starc007/ui-components `components/motion/popover.tsx` @
 * de52f337e520e7ee37749b36eb1c32df86137bcb — MIT © 2026 Saurabh Chauhan,
 * notice: LICENSE.beui). Behavior is Base UI's PreviewCard.
 */

'use client'

import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card'
import { type AnchorHTMLAttributes, forwardRef, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
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
import { type MorphFrom, type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'

interface PreviewCardTriggerProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Hover delay before the card opens, in ms. Defaults to `600`. */
  delay?: number
  /** Delay before the card closes once the pointer leaves, in ms. Defaults to `300`. */
  closeDelay?: number
  /** The element that becomes the trigger instead of the default link, e.g. an avatar; it brings its own styling. */
  render?: ReactElement
  /** Extra classes for the link. */
  className?: string
  /** The link's content. */
  children?: ReactNode
}

const PreviewCardTrigger = forwardRef<HTMLAnchorElement, PreviewCardTriggerProps>(
  ({ render, className, ...props }, ref) => (
    <PreviewCardPrimitive.Trigger
      ref={ref}
      render={render}
      className={cn(
        !render &&
          'weight-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-fast hover:decoration-foreground',
        className,
      )}
      {...props}
    />
  ),
)
PreviewCardTrigger.displayName = 'PreviewCardTrigger'

interface PreviewCardContentProps extends AnchorProps, Omit<MorphProps, 'from'>, HTMLAttributes<HTMLDivElement> {
  /** Where the card grows from (see Morph): the hovered link, its own center, a viewport edge, or a ref to any element. A hover has no press point. */
  from?: Exclude<MorphFrom, 'pointer'>
  /** Classes for the card's content box: padding, width, layout. */
  className?: string
  /** The card's content. Everything inside reads the card's surface level as its substrate. */
  children?: ReactNode
}

const PreviewCardContent = forwardRef<HTMLDivElement, PreviewCardContentProps>(
  ({ side, align, sideOffset, from, effect, hideSource, tier, container, className, children, ...props }, ref) => {
    const { open, origin } = useOverlay('PreviewCard.Content')
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)

    return (
      <PreviewCardPrimitive.Portal container={usePortalContainer(container)}>
        <PreviewCardPrimitive.Positioner
          {...positionerProps(
            { side, align, sideOffset, effect, hideSource },
            { side: 'bottom', align: 'center', sideOffset: 12 },
          )}
        >
          <PreviewCardPrimitive.Popup ref={popupRef} className="relative outline-none" {...props}>
            <PopupSurface
              morph={morph}
              className={cn('flex w-max max-w-[min(92vw,20rem)] flex-col gap-3 p-4', className)}
            >
              {children}
            </PopupSurface>
          </PreviewCardPrimitive.Popup>
        </PreviewCardPrimitive.Positioner>
      </PreviewCardPrimitive.Portal>
    )
  },
)
PreviewCardContent.displayName = 'PreviewCardContent'

interface PreviewCardProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled card. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the card opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** The link and the card — `PreviewCard.Trigger` plus a `PreviewCard.Content`. */
  children?: ReactNode
}

/**
 * A card that oozes out of a link on hover: a preview of what is behind it,
 * melting out of the link through a liquid neck.
 *
 * The morph comes from the shared engine (see Morph), so the card can grow
 * from the link (the default), its own center, a viewport edge or any
 * element, with the goo neck, a plain morph, a slide or a fade, and closes
 * back into wherever it came from. The card lifts 2 surface levels off its
 * substrate and re-provides that level. Built on Base UI's PreviewCard: it
 * opens after a hover or focus delay, stays open while the pointer travels
 * into it, flips to the other side when there is no room, and closes on
 * leave, Escape or an outside press. The card is a visual extra that touch
 * and screen-reader users never get, so the link must make sense on its own.
 *
 * Statics:
 * - `PreviewCard.Trigger` — the link: `href`, `delay`, `closeDelay`, or
 *   `render` for another element.
 * - `PreviewCard.Content` — the card: `side` (default `'bottom'`), `align`
 *   (default `'center'`, or `'start'` when it opens in place), `sideOffset`
 *   (default `12`), `container`, and the morph options `from` (default
 *   `'trigger'`), `effect` (default `'goo'`), `hideSource`, `tier` (default
 *   `'slow'`).
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/starc007/ui-components/blob/de52f337e520e7ee37749b36eb1c32df86137bcb/components/motion/popover.tsx beUI
 * @license MIT © 2026 Saurabh Chauhan
 */
function PreviewCard({ open, defaultOpen, onOpenChange, children }: PreviewCardProps) {
  const root = useOverlayRoot({ open, defaultOpen, onOpenChange })

  return (
    <OverlayContext.Provider value={root.state}>
      <PreviewCardPrimitive.Root open={root.open} onOpenChange={root.onOpenChange}>
        {children}
      </PreviewCardPrimitive.Root>
    </OverlayContext.Provider>
  )
}

PreviewCard.Trigger = PreviewCardTrigger
PreviewCard.Content = PreviewCardContent

export type { PreviewCardContentProps, PreviewCardProps, PreviewCardTriggerProps }
export { PreviewCard, PreviewCardContent, PreviewCardTrigger }

export default PreviewCard

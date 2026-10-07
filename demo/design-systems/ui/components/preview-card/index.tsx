/*
 * Local addition (not part of Fluid Functionalism): a hover card that oozes
 * out of its link. The card grows out of the trigger through
 * `lib/use-morph.ts`, with the goo neck by default, like Popover — after
 * beUI's gooey popover (github.com/starc007/ui-components
 * `components/motion/popover.tsx` @ de52f337e520e7ee37749b36eb1c32df86137bcb —
 * MIT © 2026 Saurabh Chauhan, notice: LICENSE.beui). Behavior is Base UI's
 * PreviewCard: hover and focus delays, the safe path into the card, dismissal
 * and positioning.
 */

import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card'
import {
  type AnchorHTMLAttributes,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useImperativeHandle,
  useMemo,
} from 'react'
import { MorphSurface } from '../../lib/morph-layers'
import { useShape } from '../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { inPlaceOffset, type MorphOrigin, opensInPlace, useMorph, useMorphOrigin } from '../../lib/use-morph'
import { cn } from '../../lib/utils'

interface PreviewCardContextValue {
  open: boolean
  origin: RefObject<MorphOrigin>
}

const PreviewCardContext = createContext<PreviewCardContextValue>({ open: false, origin: { current: {} } })

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

interface PreviewCardContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Side of the link the card opens on; it flips when there is no room. Defaults to `'bottom'`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment along that side. Defaults to `'center'`, or `'start'` when the card opens in place (`effect="morph"` with `hideSource`). */
  align?: 'start' | 'center' | 'end'
  /** Gap between link and card in px — the length of the goo neck. Ignored when the card opens in place over its link (`effect="morph"` with `hideSource`). Defaults to `12`. */
  sideOffset?: number
  /** Where the card grows from (see Morph): the hovered link, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the link while open, so it reads as turning into the card. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of the morph. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
  /** Portal target. Defaults to the document body. */
  container?: HTMLElement | null
  /** Classes for the card's content box: padding, width, layout. */
  className?: string
  /** The card's content. Everything inside reads the card's surface level as its substrate. */
  children?: ReactNode
}

const PreviewCardContent = forwardRef<HTMLDivElement, PreviewCardContentProps>(
  (
    {
      side = 'bottom',
      align,
      sideOffset = 12,
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
    const { open, origin } = useContext(PreviewCardContext)
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const inPlace = opensInPlace({ effect, hideSource })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])
    const shape = useShape()
    // Fixed shadow, like Popover (see Elevated).
    const level = Math.min(useSurface() + 2, 8)

    return (
      <PreviewCardPrimitive.Portal container={container ?? undefined}>
        <PreviewCardPrimitive.Positioner
          side={side}
          align={align ?? (inPlace ? 'start' : 'center')}
          sideOffset={inPlace ? inPlaceOffset : sideOffset}
          className="z-50 outline-none"
        >
          <PreviewCardPrimitive.Popup ref={morph.popupRef} className="relative outline-none" {...props}>
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shape.container}
                className={cn('flex w-max max-w-[min(92vw,20rem)] flex-col gap-3 p-4', className)}
              >
                {children}
              </MorphSurface>
            </SurfaceProvider>
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
 * - `PreviewCard.Content` — the card: `side`, `align`, `sideOffset` and the
 *   morph options `from`, `effect`, `hideSource`, `tier`.
 *
 * @example {@include ./examples.mdx}
 */
function PreviewCard({ open, defaultOpen = false, onOpenChange, children }: PreviewCardProps) {
  const [current, setCurrent] = useControllableState(open, defaultOpen, onOpenChange)
  const { origin, capture } = useMorphOrigin()
  const ctx = useMemo(() => ({ open: current, origin }), [current, origin])

  return (
    <PreviewCardContext.Provider value={ctx}>
      <PreviewCardPrimitive.Root
        open={current}
        onOpenChange={(next, details) => {
          if (next) capture(details)
          setCurrent(next)
        }}
      >
        {children}
      </PreviewCardPrimitive.Root>
    </PreviewCardContext.Provider>
  )
}

PreviewCard.Trigger = PreviewCardTrigger
PreviewCard.Content = PreviewCardContent

export type { PreviewCardContentProps, PreviewCardProps, PreviewCardTriggerProps }
export { PreviewCard, PreviewCardContent, PreviewCardTrigger }

export default PreviewCard

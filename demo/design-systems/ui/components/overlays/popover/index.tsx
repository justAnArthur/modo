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
import { type SlotProps, slotRender } from '../../../lib/slot'
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
      <PopoverPrimitive.Trigger ref={ref} render={el} {...props} />
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

interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Side of the trigger the panel opens on; it flips when there is no room. Defaults to `'bottom'`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment along that side. Defaults to `'center'`, or `'start'` when the panel opens in place (`effect="morph"` with `hideSource`). */
  align?: 'start' | 'center' | 'end'
  /** Gap between trigger and panel in px — the length of the goo neck. Ignored when the panel opens in place over its trigger (`effect="morph"` with `hideSource`). Defaults to `12`. */
  sideOffset?: number
  /** Where the panel grows from (see Morph): the pressed trigger, the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
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
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
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
          className="z-50 outline-none"
        >
          <PopoverPrimitive.Popup ref={morph.popupRef} className="relative outline-none" {...props}>
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
 * - `Popover.Content` — the panel: `side`, `align` (the trigger's `start`,
 *   `center` or `end`), `sideOffset` and the morph options `from`,
 *   `effect`, `hideSource`, `tier`.
 * - `Popover.Title` / `Popover.Description` — its labelled heading and
 *   supporting line, wired for screen readers.
 * - `Popover.Close` — closes it; same `render` / `asChild` shape.
 *
 * @example {@include ./examples.mdx}
 */
function Popover({ open, defaultOpen = false, onOpenChange, modal = false, children }: PopoverProps) {
  const [current, setCurrent] = useControllableState(open, defaultOpen, onOpenChange)
  const { origin, capture } = useMorphOrigin()
  const ctx = useMemo(() => ({ open: current, origin }), [current, origin])

  return (
    <PopoverContext.Provider value={ctx}>
      <PopoverPrimitive.Root
        open={current}
        modal={modal}
        onOpenChange={(next, details) => {
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

export type { PopoverContentProps, PopoverProps, PopoverTriggerProps }
export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger }

export default Popover

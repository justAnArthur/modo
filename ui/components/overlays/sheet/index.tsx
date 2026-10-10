/*
 * Local addition (not part of Fluid Functionalism): a sheet attached to an edge
 * of the window. Base UI's Drawer owns the behavior (swipe to dismiss, snap
 * points, focus, scroll lock); the panel grows through the shared morph layer
 * (`lib/use-morph.ts`), from its own edge with the goo neck by default, and a
 * swipe that dismisses it slides it on off its edge (the morph's `exit`). Its
 * title, description, close and trigger are Dialog's parts, which Base UI
 * shares with the Drawer. Replaces beUI's bottom sheet and drawer
 * (github.com/starc007/ui-components @ de52f337e520e7ee37749b36eb1c32df86137bcb
 * — MIT © 2026 Saurabh Chauhan, notice: LICENSE.beui) without porting their
 * drag, snap or focus code.
 */

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { motion } from 'motion/react'
import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useContext,
  useImperativeHandle,
  useState,
} from 'react'
import { MorphSurface } from '../../../lib/morph-layers'
import { useShape } from '../../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogState,
  DialogTitle,
  DialogTrigger,
  useDialogState,
} from '../dialog'

type SheetSide = 'top' | 'right' | 'bottom' | 'left'

/** The sheet's edge, and whether its last close was a swipe. */
const SheetContext = createContext<{ side: SheetSide; swiped: boolean }>({ side: 'bottom', swiped: false })

const SWIPE: Record<SheetSide, 'up' | 'right' | 'down' | 'left'> = {
  top: 'up',
  right: 'right',
  bottom: 'down',
  left: 'left',
}

const PLACEMENT: Record<SheetSide, string> = {
  top: 'inset-x-2 top-2 mx-auto max-w-[36rem] max-h-[calc(100dvh-4rem)]',
  bottom: 'inset-x-2 bottom-2 mx-auto max-w-[36rem] max-h-[calc(100dvh-4rem)]',
  left: 'inset-y-2 left-2 w-[min(24rem,calc(100%-1rem))]',
  right: 'inset-y-2 right-2 w-[min(24rem,calc(100%-1rem))]',
}

const DRAWER_OFFSET = 4

// Literal per shape so the class extractor sees each one.
const INDENT_RADIUS = { pill: 'data-[active]:rounded-3xl', rounded: 'data-[active]:rounded-xl' }

interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Where the sheet grows from (see Morph): its own edge, the pressed trigger, the press point, its center, another edge, or a ref to any element. Defaults to the sheet's `side`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the trigger while open, so it reads as turning into the sheet. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
  /** Portal target. Defaults to the document body. */
  container?: HTMLElement | null
  /** Classes for the sheet's content box: padding, layout. */
  className?: string
  /** The sheet's content. Everything inside reads the sheet's surface level as its substrate. */
  children?: ReactNode
}

const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ from, effect, hideSource, tier, container, className, children, ...props }, ref) => {
    const { side, swiped } = useContext(SheetContext)
    const { open, origin } = useDialogState()
    const morph = useMorph(open, origin, {
      from: from ?? side,
      effect,
      hideSource,
      tier,
      exit: swiped ? { effect: 'slide', from: side } : undefined,
    })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])
    const shape = useShape()
    const level = Math.min(useSurface() + DRAWER_OFFSET, 8)
    const edge = side === 'top' || side === 'bottom'

    return (
      <DrawerPrimitive.Portal container={container ?? undefined}>
        <DrawerPrimitive.Backdrop
          render={<motion.div style={{ opacity: morph.progress }} />}
          className={cn(container ? 'absolute' : 'fixed', 'inset-0 z-50 bg-scrim')}
        />
        {/* The viewport carries Base UI's swipe handling; the popup sits in it. */}
        <DrawerPrimitive.Viewport className={cn(container ? 'absolute' : 'fixed', 'inset-0 z-50')}>
          <DrawerPrimitive.Popup
            ref={morph.popupRef}
            {...props}
            className={cn(
              'absolute flex flex-col focus:outline-none',
              PLACEMENT[side],
              // Follows the finger through Base UI's swipe variables (the snap
              // offset only moves top and bottom sheets) and springs back on
              // release; Base UI drops the transition while a swipe is live.
              '[transform:translate(var(--drawer-swipe-movement-x),calc(var(--drawer-snap-point-offset)_+_var(--drawer-swipe-movement-y)))]',
              'transition-[transform] duration-slow',
            )}
          >
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[level]}
                radius={shape.container}
                className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6', edge && 'pt-3', className)}
              >
                {edge && <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-overlay/16" />}
                {children}
              </MorphSurface>
            </SurfaceProvider>
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.Portal>
    )
  },
)
SheetContent.displayName = 'SheetContent'

const SheetIndent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const shape = useShape()
  return (
    <DrawerPrimitive.Indent
      ref={ref}
      className={cn(
        'origin-top transition-[transform] duration-slow data-[active]:scale-[0.96] data-[active]:overflow-hidden',
        INDENT_RADIUS[shape.variant],
        className,
      )}
      {...props}
    />
  )
})
SheetIndent.displayName = 'SheetIndent'

interface SheetProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled sheet. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the sheet opens or closes, including by a swipe. */
  onOpenChange?: (open: boolean) => void
  /** The edge the sheet is attached to; a swipe back toward it dismisses it. Defaults to `'bottom'`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Snap points for a top or bottom sheet: fractions of the viewport height (0–1), pixels, or `px` / `rem` strings. */
  snapPoints?: (number | string)[]
  /** The snap point an uncontrolled sheet opens at. Defaults to the first one. */
  defaultSnapPoint?: number | string
  /** Traps focus and locks page scroll while open. Defaults to `true`. */
  modal?: boolean
  /** The trigger and the content — `Sheet.Trigger` plus a `Sheet.Content`. */
  children?: ReactNode
}

/**
 * A panel attached to an edge of the window, swiped away to dismiss.
 *
 * The sheet grows out of its own edge with the goo neck by default (see
 * Morph), or from its trigger, the press point or any element, and closes
 * back the same way. Base UI's Drawer does the rest: a swipe back toward the
 * edge dismisses it (it slides on off the edge from where the finger let
 * go), top and bottom sheets can rest at `snapPoints`, and
 * focus and scroll are held while it is open. It floats a spacing step off
 * its edge and lifts 4 surface levels off its substrate, like a dialog; top
 * and bottom sheets show a handle.
 *
 * Statics:
 * - `Sheet.Trigger`, `Sheet.Header`, `Sheet.Footer`, `Sheet.Title`,
 *   `Sheet.Description`, `Sheet.Close` — Dialog's parts, which work the same
 *   here.
 * - `Sheet.Content` — the panel, with the morph options `from`, `effect`,
 *   `hideSource`, `tier`.
 * - `Sheet.Provider` / `Sheet.Indent` — wrap the page in an `Indent` under a
 *   `Provider` and it eases back while any sheet inside is open.
 *
 * @example {@include ./examples.mdx}
 */
function Sheet({
  children,
  open,
  defaultOpen,
  onOpenChange,
  side = 'bottom',
  snapPoints,
  defaultSnapPoint,
  modal = true,
}: SheetProps) {
  const [swiped, setSwiped] = useState(false)

  return (
    <SheetContext.Provider value={{ side, swiped }}>
      <DialogState open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        {root => (
          <DrawerPrimitive.Root
            open={root.open}
            onOpenChange={(next, details) => {
              setSwiped(!next && details.reason === 'swipe')
              root.onOpenChange(next, details)
            }}
            swipeDirection={SWIPE[side]}
            snapPoints={snapPoints}
            defaultSnapPoint={defaultSnapPoint}
            modal={modal}
          >
            {children}
          </DrawerPrimitive.Root>
        )}
      </DialogState>
    </SheetContext.Provider>
  )
}

Sheet.Trigger = DialogTrigger
Sheet.Content = SheetContent
Sheet.Header = DialogHeader
Sheet.Footer = DialogFooter
Sheet.Title = DialogTitle
Sheet.Description = DialogDescription
Sheet.Close = DialogClose
Sheet.Provider = DrawerPrimitive.Provider
Sheet.Indent = SheetIndent

export type { SheetContentProps, SheetProps, SheetSide }
export { Sheet, SheetContent, SheetIndent }

export default Sheet

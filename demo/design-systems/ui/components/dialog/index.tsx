/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/dialog.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/{utils,icon-context,springs,shape-context,
 *   size-context,surface-context,surface-classes}` rewritten to `../../lib/*`;
 *   `@/components/ui/button` → `../button`.
 * - `DialogProps`: every member re-declared with the FF docs API-table text (modo's parser
 *   lists only members declared in the interface body and needs a description on each);
 *   same for `DialogSlotProps` and `DialogContentProps`.
 * - modo item: TSDoc (from the FF "Dialog" docs page) on the root `Dialog`, the compound
 *   statics attached as `Dialog.Trigger = …` (expando properties, so TypeScript types
 *   `<Dialog.Content>` without a cast and modo's check-items sees them), upstream's named
 *   exports kept, and a default export.
 * - FF's "With a sidebar" docs example is not ported: Sidebar is omitted from this port.
 *   A "Surfaces inside a dialog" example (a Select popover lifting off the dialog's own
 *   level) stands in for it — it makes the same point the sidebar dialog made about
 *   composing inside an `xl` panel, using only items this port ships.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` and `font-bold`
 *   → `weight-*`; the `bg-black/40` / `dark:bg-black/80` backdrop → `bg-scrim`.
 * - The panel morphs out of its trigger through the shared morph layer
 *   (`lib/use-morph.ts` + `MorphSurface`, goo by default on `spring.slow`;
 *   `Dialog.Content` takes `from` / `effect` / `hideSource` / `tier`), and the
 *   backdrop's opacity follows the morph's progress. The popup is a
 *   transparent, centered box; its level is painted by the morph's surface
 *   layers and the padding sits on their content box. `Dialog` holds the open
 *   state itself (`useControllableState`) to feed the morph, and scopes
 *   `Morph.Part` pairs to the dialog.
 * - The trigger / close slot shape moved to `lib/slot.ts`, shared with the
 *   other overlays.
 */

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { motion } from 'motion/react'
import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useContext,
  useId,
  useImperativeHandle,
  useMemo,
} from 'react'
import { useIcon } from '../../lib/icon-context'
import { MorphSurface } from '../../lib/morph-layers'
import { MorphPartScope } from '../../lib/morph-part'
import { useShape } from '../../lib/shape-context'
import { useSize, useSizeVariant } from '../../lib/size-context'
import { type SlotProps, slotRender } from '../../lib/slot'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { type MorphOrigin, useMorph, useMorphOrigin } from '../../lib/use-morph'
import { cn } from '../../lib/utils'
import { Button } from '../button'

const DIALOG_OFFSET = 4

// Trigger and Close compose either way — `render={<Button/>}` or Radix-style
// `asChild` with a single child element (lib/slot.ts).
type DialogSlotProps = SlotProps

const DialogContext = createContext<{ open: boolean; origin: RefObject<MorphOrigin> }>({
  open: false,
  origin: { current: {} },
})

const DialogTrigger = forwardRef<HTMLButtonElement, DialogSlotProps>(({ render, asChild, children, ...props }, ref) => {
  const el = slotRender(render, asChild, children)
  return el ? (
    <DialogPrimitive.Trigger ref={ref} render={el} {...props} />
  ) : (
    <DialogPrimitive.Trigger ref={ref} {...props}>
      {children}
    </DialogPrimitive.Trigger>
  )
})
DialogTrigger.displayName = 'DialogTrigger'

const DialogClose = forwardRef<HTMLButtonElement, DialogSlotProps>(({ render, asChild, children, ...props }, ref) => {
  const el = slotRender(render, asChild, children)
  return el ? (
    <DialogPrimitive.Close ref={ref} render={el} {...props} />
  ) : (
    <DialogPrimitive.Close ref={ref} {...props}>
      {children}
    </DialogPrimitive.Close>
  )
})
DialogClose.displayName = 'DialogClose'

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Width: 400, 540, or 880. Compact regions narrow each by 1 notch: 360,
   *  480, 800. `xl` is the canvas for composed layouts — a sidebar beside a
   *  panel — which usually pair it with `className="p-0"` and a fixed
   *  height. Defaults to `"sm"`. */
  size?: 'sm' | 'lg' | 'xl'
  /** Portal target. When set, the overlay and panel render inside this element
   *  (positioned `absolute`) instead of covering the viewport (`fixed`). Pair
   *  with a `position: relative; overflow: hidden` container — and usually
   *  `<Dialog modal={false}>` — to scope a dialog to a bounded region, e.g. a
   *  docs preview. Defaults to the document body / full-viewport behaviour. */
  container?: HTMLElement | null
  /** The ✕ in the top-right corner. Drop it when the content has its own
   *  way out, e.g. a command menu that closes on Escape and on a pick.
   *  Defaults to `true`. */
  showCloseButton?: boolean
  /** Where the panel sits: centered, or anchored 12dvh from the top so a
   *  panel whose height follows its content (a command menu) keeps its top
   *  edge still. Defaults to `"center"`. */
  position?: 'center' | 'top'
  /** Where the panel grows from (see Morph): the pressed trigger (its center when none), the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the trigger while open, so it reads as turning into the panel. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of the morph. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
  /** Dialog content. Everything inside reads the dialog's surface level as its substrate. */
  children?: ReactNode
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      size = 'sm',
      container,
      showCloseButton = true,
      position = 'center',
      from,
      effect,
      hideSource,
      tier,
      ...props
    },
    ref,
  ) => {
    const XIcon = useIcon('x')
    const shape = useShape()
    const substrate = useSurface()
    const dialogLevel = Math.min(substrate + DIALOG_OFFSET, 8)
    // The size ladder narrows the dialog one notch in compact regions —
    // width only, the padding stays put (see Sizes).
    const compact = useSize().variant === 'compact'
    const { open, origin } = useContext(DialogContext)
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])

    return (
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Backdrop
          render={<motion.div style={{ opacity: morph.progress }} />}
          className={cn(container ? 'absolute' : 'fixed', 'inset-0 z-50 bg-scrim')}
        />
        <DialogPrimitive.Popup
          ref={morph.popupRef}
          {...props}
          className={cn(
            container ? 'absolute' : 'fixed',
            'left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 focus:outline-none',
            position === 'top' ? 'top-[12dvh]' : 'top-1/2 -translate-y-1/2',
            size === 'sm' && (compact ? 'max-w-[360px]' : 'max-w-[400px]'),
            size === 'lg' && (compact ? 'max-w-[480px]' : 'max-w-[540px]'),
            size === 'xl' && (compact ? 'max-w-[800px]' : 'max-w-[880px]'),
          )}
        >
          <SurfaceProvider value={dialogLevel}>
            <MorphSurface
              morph={morph}
              bg={SURFACE_BG[dialogLevel]}
              shadow={SURFACE_SHADOW[dialogLevel]}
              radius={shape.container}
              className={cn('p-6', className)}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close
                  render={
                    <Button variant="ghost" size="icon-sm" className="absolute right-3 top-3">
                      <XIcon />
                      <span className="sr-only">Close</span>
                    </Button>
                  }
                />
              )}
            </MorphSurface>
          </SurfaceProvider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    )
  },
)
DialogContent.displayName = 'DialogContent'

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 mt-6', className)} {...props} />
}

const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    // The title role of the type scale — see Sizes.
    const compact = useSizeVariant() === 'compact'
    return (
      <DialogPrimitive.Title
        ref={ref}
        className={cn(
          compact ? 'text-title-compact' : 'text-title',
          'weight-bold text-foreground leading-tight',
          className,
        )}
        {...props}
      />
    )
  },
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const compact = useSizeVariant() === 'compact'
    return (
      <DialogPrimitive.Description
        ref={ref}
        className={cn(compact ? 'text-body-compact' : 'text-body', 'text-muted-foreground', className)}
        {...props}
      />
    )
  },
)
DialogDescription.displayName = 'DialogDescription'

interface DialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Traps focus and locks page scroll while open. Defaults to `true`. */
  modal?: boolean
  /** The trigger and the content — `Dialog.Trigger` plus a `Dialog.Content`. */
  children?: ReactNode
}

/**
 * 3 widths, spring in and out.
 *
 * The panel lifts 4 surface levels off whatever substrate it opens on and
 * re-provides that level, so a dropdown or select inside it keeps climbing
 * the ladder instead of melting into the dialog. Width comes from
 * `Dialog.Content`'s `size` — 400, 540 or 880, each one notch narrower in
 * compact regions. The panel grows out of its trigger through the shared
 * morph (see Morph): goo by default on `spring.slow`, or from the press
 * point, its own center, a viewport edge or any element, and the backdrop
 * fades with it. `Morph.Part` pairs an element in the trigger with its twin
 * in the panel, so a card's image or title flies into the dialog. `position="top"` anchors the panel 12dvh
 * down so a content-sized panel (a command menu) keeps its top edge still.
 * Built on Base UI's Dialog: open state is controlled with `open` /
 * `onOpenChange` or left to `defaultOpen`.
 *
 * Statics:
 * - `Dialog.Trigger` — the control that opens it. `render={<Button/>}` or
 *   Radix-style `asChild` with a single child both work.
 * - `Dialog.Content` — the panel: `size`, `position`, `showCloseButton`,
 *   `container`, and the morph options `from`, `effect`, `hideSource`,
 *   `tier`.
 * - `Dialog.Header` / `Dialog.Footer` — the stacked title block, and the
 *   right-aligned action row.
 * - `Dialog.Title` / `Dialog.Description` — the labelled heading and its
 *   supporting line, wired to the panel for screen readers.
 * - `Dialog.Close` — dismisses it; same `render` / `asChild` shape as the
 *   trigger. `Dialog.Content` renders its own ✕ unless
 *   `showCloseButton={false}`.
 *
 * @example {@include ./examples.mdx}
 */
function Dialog({ children, open, defaultOpen = false, onOpenChange, modal }: DialogProps) {
  // The open state lives here (not in Base UI's Root) because the morph
  // reads it, and the open event tells it which trigger was pressed.
  const [current, setCurrent] = useControllableState(open, defaultOpen, onOpenChange)
  const { origin, capture } = useMorphOrigin()
  const id = useId()
  const ctx = useMemo(() => ({ open: current, origin }), [current, origin])
  const parts = useMemo(() => ({ id, open: current }), [id, current])

  return (
    <DialogContext.Provider value={ctx}>
      <MorphPartScope.Provider value={parts}>
        <DialogPrimitive.Root
          open={current}
          onOpenChange={(next, details) => {
            if (next) capture(details)
            setCurrent(next)
          }}
          modal={modal}
        >
          {children}
        </DialogPrimitive.Root>
      </MorphPartScope.Provider>
    </DialogContext.Provider>
  )
}

Dialog.Trigger = DialogTrigger
Dialog.Content = DialogContent
Dialog.Header = DialogHeader
Dialog.Footer = DialogFooter
Dialog.Title = DialogTitle
Dialog.Description = DialogDescription
Dialog.Close = DialogClose

export type {
  DialogContentProps,
  DialogProps,
  DialogSlotProps as DialogTriggerProps,
  DialogSlotProps as DialogCloseProps,
}
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }

export default Dialog

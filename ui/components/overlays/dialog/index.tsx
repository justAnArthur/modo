/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/dialog.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { motion } from 'motion/react'
import { forwardRef, type HTMLAttributes, type ReactNode, useId, useMemo } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import { MorphPartScope } from '../../../lib/morph-part'
import {
  type OpenChangeDetails,
  OverlayContext,
  type OverlayRootProps,
  useOverlay,
  useOverlayRoot,
  usePortalContainer,
} from '../../../lib/overlay'
import { PopupSurface } from '../../../lib/popup-surface'
import { type SizeVariant, useSizeVariant } from '../../../lib/size-context'
import { type SlotProps, slotPart } from '../../../lib/slot'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { Button } from '../../button'

type DialogSlotProps = SlotProps
type DialogWidth = 'sm' | 'lg' | 'xl'

/** The open state and origin `DialogState` provides, for content built on another Base UI popup (Sheet). */
const useDialogState = () => useOverlay('Dialog part')

const DialogTrigger = slotPart(DialogPrimitive.Trigger, 'DialogTrigger')
const DialogClose = slotPart(DialogPrimitive.Close, 'DialogClose')

// Literal per step so the class extractor sees each one.
const WIDTH: Record<DialogWidth, Record<SizeVariant, string>> = {
  sm: { default: 'max-w-[400px]', compact: 'max-w-[360px]' },
  lg: { default: 'max-w-[540px]', compact: 'max-w-[480px]' },
  xl: { default: 'max-w-[880px]', compact: 'max-w-[800px]' },
}

interface DialogContentProps extends MorphProps, HTMLAttributes<HTMLDivElement> {
  /** Width: 400, 540 or 880px, each one notch narrower in a compact region (360, 480, 800). `xl` is the canvas for a composed layout, usually with `className="p-0"` and a fixed height. Defaults to `'sm'`. */
  width?: DialogWidth
  /** Portal target. Inside it the backdrop and panel are `absolute` instead of covering the viewport; pair it with a `relative overflow-hidden` box and usually `<Dialog modal={false}>`. Defaults to the nearest `PortalContainer`, else the document body. */
  container?: HTMLElement | null
  /** The ✕ in the top-right corner. Drop it when the content has its own way out. Defaults to `true`. */
  showCloseButton?: boolean
  /** Centered, or 12dvh from the top so a panel whose height follows its content keeps its top edge still. Defaults to `'center'`. */
  position?: 'center' | 'top'
  /** Dialog content. Everything inside reads the dialog's surface level as its substrate. */
  children?: ReactNode
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      width = 'sm',
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
    const variant = useSizeVariant()
    const portal = usePortalContainer(container)
    const { open, origin } = useDialogState()
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)
    const inset = portal ? 'absolute' : 'fixed'

    return (
      <DialogPrimitive.Portal container={portal}>
        <DialogPrimitive.Backdrop
          render={<motion.div style={{ opacity: morph.progress }} />}
          className={cn(inset, 'inset-0 z-50 bg-scrim')}
        />
        <DialogPrimitive.Popup
          ref={popupRef}
          {...props}
          className={cn(
            inset,
            'left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 focus:outline-none',
            position === 'top' ? 'top-[12dvh]' : 'top-1/2 -translate-y-1/2',
            WIDTH[width][variant],
          )}
        >
          <PopupSurface morph={morph} lift="panel" className={cn('p-6', className)}>
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close
                render={
                  <Button variant="ghost" size="icon-compact" className="absolute right-3 top-3">
                    <XIcon />
                    <span className="sr-only">Close</span>
                  </Button>
                }
              />
            )}
          </PopupSurface>
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

interface DialogStateProps extends OverlayRootProps {
  children: (root: { open: boolean; onOpenChange: (next: boolean, details: OpenChangeDetails) => void }) => ReactNode
}

/**
 * A dialog's root state, for any dialog-like Base UI root (AlertDialog,
 * Drawer, Command): spread `root` on it. Also scopes `Morph.Part` pairs.
 */
function DialogState({ open, defaultOpen, onOpenChange, children }: DialogStateProps) {
  const root = useOverlayRoot({ open, defaultOpen, onOpenChange })
  const id = useId()
  const parts = useMemo(() => ({ id, open: root.open }), [id, root.open])

  return (
    <OverlayContext.Provider value={root.state}>
      <MorphPartScope.Provider value={parts}>
        {children({ open: root.open, onOpenChange: root.onOpenChange })}
      </MorphPartScope.Provider>
    </OverlayContext.Provider>
  )
}

interface DialogProps {
  /** Controlled open state. Pair with `onOpenChange`. */
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
 * 3 widths, grown out of whatever opened them.
 *
 * The panel lifts 4 surface levels off whatever substrate it opens on and
 * re-provides that level, so a dropdown or select inside it keeps climbing
 * the ladder instead of melting into the dialog. Width comes from
 * `Dialog.Content`'s `width` — 400, 540 or 880, each one notch narrower in
 * compact regions. The panel grows out of its trigger through the shared
 * morph (see Morph): goo by default on `spring.goo`, or from the press
 * point, its own center, a viewport edge or any element, and the backdrop
 * fades with it. `Morph.Part` pairs an element in the trigger with its twin
 * in the panel, so a card's image or title flies into the dialog.
 * `position="top"` anchors the panel 12dvh down so a content-sized panel (a
 * command menu) keeps its top edge still. Built on Base UI's Dialog: open
 * state is controlled with `open` / `onOpenChange` or left to `defaultOpen`.
 *
 * Statics:
 * - `Dialog.Trigger` — the control that opens it. `render={<Button/>}` or
 *   Radix-style `asChild` with a single child both work.
 * - `Dialog.Content` — the panel: `width` (default `'sm'`), `position`
 *   (default `'center'`), `showCloseButton` (default `true`), `container`,
 *   and the morph options `from` (default `'trigger'`), `effect` (default
 *   `'goo'`), `hideSource`, `tier` (default `'slow'`).
 * - `Dialog.Header` / `Dialog.Footer` — the stacked title block, and the
 *   right-aligned action row.
 * - `Dialog.Title` / `Dialog.Description` — the labelled heading and its
 *   supporting line, wired to the panel for screen readers.
 * - `Dialog.Close` — dismisses it; same `render` / `asChild` shape as the
 *   trigger. `Dialog.Content` renders its own ✕ unless
 *   `showCloseButton={false}`.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/dialog.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
function Dialog({ children, open, defaultOpen, onOpenChange, modal }: DialogProps) {
  return (
    <DialogState open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {root => (
        <DialogPrimitive.Root {...root} modal={modal}>
          {children}
        </DialogPrimitive.Root>
      )}
    </DialogState>
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
  DialogWidth,
}
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogState,
  DialogTitle,
  DialogTrigger,
  useDialogState,
}

export default Dialog

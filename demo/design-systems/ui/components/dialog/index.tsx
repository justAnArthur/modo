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
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`.
 */

import {
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'
import { useIcon } from '../../lib/icon-context'
import { spring } from '../../lib/springs'
import { useShape } from '../../lib/shape-context'
import { useSize, useSizeVariant } from '../../lib/size-context'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { surfaceClasses } from '../../lib/surface-classes'
import { Button } from '../button'

const DIALOG_OFFSET = 4

// Trigger and Close compose either way — `render={<Button/>}` (the
// library's composition API, shared with DropdownTrigger) or Radix-style
// `asChild` with a single child element — so one snippet works everywhere.
// Plain button attributes, which both the trigger and the close accept —
// their state-typed render/className/style function forms stay off the
// public surface.
interface DialogSlotProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The element that becomes the control, e.g. a Button. */
  render?: ReactElement
  /** Compose onto the single child instead. Both spellings work in both flavors. Defaults to `false`. */
  asChild?: boolean
  /** Control content when there is no render element. */
  children?: ReactNode
}

function slotRender(render: ReactElement | undefined, asChild: boolean | undefined, children: ReactNode) {
  if (render) return render
  return asChild && isValidElement(children) ? (children as ReactElement) : undefined
}

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
  /** Dialog content. Everything inside reads the dialog's surface level as its substrate. */
  children?: ReactNode
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, size = 'sm', container, showCloseButton = true, position = 'center', ...props }, ref) => {
    const XIcon = useIcon('x')
    const shape = useShape()
    const substrate = useSurface()
    const dialogLevel = Math.min(substrate + DIALOG_OFFSET, 8)
    // The size ladder narrows the dialog one notch in compact regions —
    // width only, the padding stays put (see Sizes).
    const compact = useSize().variant === 'compact'

    // No `if (!open) return null` here — Base UI's `<DialogPrimitive.Popup>`
    // handles mount/unmount itself, and waits for the motion opacity
    // tween below to finish (via `element.getAnimations()`) before unmounting.
    // Returning null early would short-circuit the closing animation.
    return (
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Backdrop
          render={(backdropProps, state) => {
            const exiting = state.transitionStatus === 'ending'
            const {
              style: _style,
              onDrag: _onDrag,
              onDragStart: _onDragStart,
              onDragEnd: _onDragEnd,
              onAnimationStart: _onAnimationStart,
              onAnimationEnd: _onAnimationEnd,
              onAnimationIteration: _onAnimationIteration,
              ...rest
            } = backdropProps as HTMLAttributes<HTMLDivElement>
            return (
              <motion.div
                {...rest}
                className={cn(container ? 'absolute' : 'fixed', 'inset-0 z-50 bg-black/40 dark:bg-black/80')}
                initial={{ opacity: 0 }}
                animate={{ opacity: exiting ? 0 : 1 }}
                transition={exiting ? spring.slow.exit : spring.slow}
              />
            )
          }}
        />
        <DialogPrimitive.Popup
          ref={ref}
          render={(popupProps, state) => {
            const exiting = state.transitionStatus === 'ending'
            const {
              style: baseStyle,
              onDrag: _onDrag,
              onDragStart: _onDragStart,
              onDragEnd: _onDragEnd,
              onAnimationStart: _onAnimationStart,
              onAnimationEnd: _onAnimationEnd,
              onAnimationIteration: _onAnimationIteration,
              ...rest
            } = popupProps as HTMLAttributes<HTMLDivElement>
            return (
              <motion.div
                // Base UI's props first (data attrs, refs, role, etc.)…
                {...rest}
                // …then the consumer's `<Dialog.Content>` props (className,
                // event handlers, data-*, etc.) land on the visible motion.div.
                {...(props as Omit<
                  HTMLAttributes<HTMLDivElement>,
                  | 'onDrag'
                  | 'onDragStart'
                  | 'onDragEnd'
                  | 'onAnimationStart'
                  | 'onAnimationEnd'
                  | 'onAnimationIteration'
                >)}
                className={cn(
                  container ? 'absolute' : 'fixed',
                  'left-1/2 z-50 w-[calc(100%-2rem)]',
                  position === 'top' ? 'top-[12dvh]' : 'top-1/2',
                  surfaceClasses(dialogLevel),
                  'p-6 focus:outline-none',
                  size === 'sm' && (compact ? 'max-w-[360px]' : 'max-w-[400px]'),
                  size === 'lg' && (compact ? 'max-w-[480px]' : 'max-w-[540px]'),
                  size === 'xl' && (compact ? 'max-w-[800px]' : 'max-w-[880px]'),
                  shape.container,
                  className,
                )}
                style={{
                  ...(baseStyle as React.CSSProperties | undefined),
                  ...(props.style as React.CSSProperties | undefined),
                }}
                initial={{ opacity: 0, scale: 0.97, x: '-50%', y: position === 'top' ? 0 : '-50%' }}
                animate={{
                  opacity: exiting ? 0 : 1,
                  scale: exiting ? 0.97 : 1,
                  x: '-50%',
                  y: position === 'top' ? 0 : '-50%',
                }}
                transition={exiting ? spring.slow.exit : spring.slow}
              >
                <SurfaceProvider value={dialogLevel}>
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
                </SurfaceProvider>
              </motion.div>
            )
          }}
        />
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
          'font-bold text-foreground leading-tight',
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
 * compact regions — and both the backdrop and the panel run `spring.slow` in
 * and its faster exit tween out. `position="top"` anchors the panel 12dvh
 * down so a content-sized panel (a command menu) keeps its top edge still.
 * Built on Base UI's Dialog: open state is controlled with `open` /
 * `onOpenChange` or left to `defaultOpen`.
 *
 * Statics:
 * - `Dialog.Trigger` — the control that opens it. `render={<Button/>}` or
 *   Radix-style `asChild` with a single child both work.
 * - `Dialog.Content` — the panel: `size`, `position`, `showCloseButton`,
 *   `container`.
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
function Dialog({ children, open, defaultOpen, onOpenChange, modal }: DialogProps) {
  // Base UI's Root handles controlled/uncontrolled state internally. We only
  // narrow the (open, eventDetails) callback to (open) for our public prop.
  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={next => onOpenChange?.(next)}
      modal={modal}
    >
      {children}
    </DialogPrimitive.Root>
  )
}

Dialog.Trigger = DialogTrigger
Dialog.Content = DialogContent
Dialog.Header = DialogHeader
Dialog.Footer = DialogFooter
Dialog.Title = DialogTitle
Dialog.Description = DialogDescription
Dialog.Close = DialogClose

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose }
export type { DialogProps, DialogContentProps }
export type { DialogSlotProps as DialogTriggerProps, DialogSlotProps as DialogCloseProps }

export default Dialog

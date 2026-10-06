/*
 * Local addition (not part of Fluid Functionalism): a confirm dialog that must
 * be answered. Base UI's AlertDialog root (`role="alertdialog"`, always modal,
 * no outside-press dismissal) under Dialog's own parts, which Base UI shares
 * between the two, so the panel morphs exactly like Dialog's.
 */

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { forwardRef, type ReactNode } from 'react'
import {
  DialogClose,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogState,
  DialogTitle,
  DialogTrigger,
} from '../dialog'

// No ✕ by default: the way out is one of the dialog's own actions.
const AlertDialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ showCloseButton = false, ...props }, ref) => (
    <DialogContent ref={ref} showCloseButton={showCloseButton} {...props} />
  ),
)
AlertDialogContent.displayName = 'AlertDialogContent'

interface AlertDialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled alert dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** The trigger and the content — `AlertDialog.Trigger` plus an `AlertDialog.Content`. */
  children?: ReactNode
}

/**
 * A dialog that asks before something happens and waits for an answer.
 *
 * It is always modal, and a press outside does not close it: only its own
 * actions (and Escape) do, so a destructive step is never confirmed or
 * skipped by accident. Screen readers announce it as an alert. Everything
 * else is Dialog's: the panel grows out of its trigger with the goo neck by
 * default (see Morph), takes the same `size`, `position` and morph options,
 * and lifts 4 surface levels. Unlike Dialog it has no ✕ unless
 * `showCloseButton` asks for one.
 *
 * Statics: the same parts as Dialog — `AlertDialog.Trigger`,
 * `AlertDialog.Content`, `AlertDialog.Header`, `AlertDialog.Footer`,
 * `AlertDialog.Title`, `AlertDialog.Description` and `AlertDialog.Close`.
 *
 * @example {@include ./examples.mdx}
 */
function AlertDialog({ children, open, defaultOpen, onOpenChange }: AlertDialogProps) {
  return (
    <DialogState open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {root => <AlertDialogPrimitive.Root {...root}>{children}</AlertDialogPrimitive.Root>}
    </DialogState>
  )
}

AlertDialog.Trigger = DialogTrigger
AlertDialog.Content = AlertDialogContent
AlertDialog.Header = DialogHeader
AlertDialog.Footer = DialogFooter
AlertDialog.Title = DialogTitle
AlertDialog.Description = DialogDescription
AlertDialog.Close = DialogClose

export type { AlertDialogProps }
export { AlertDialog, AlertDialogContent }

export default AlertDialog

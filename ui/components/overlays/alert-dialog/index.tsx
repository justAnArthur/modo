/*
 * Local addition (not part of Fluid Functionalism): a confirm dialog that must
 * be answered. Base UI's AlertDialog root (`role="alertdialog"`, always modal,
 * no outside-press dismissal) under Dialog's own parts, which Base UI shares
 * between the two, so the panel morphs exactly like Dialog's. `Action` runs a
 * confirm that may return a promise: the button folds into Button's loading
 * circle, and the dialog cannot be dismissed until it settles. `Cancel` is a
 * Close that steps aside while the action runs.
 */

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import {
  cloneElement,
  createContext,
  forwardRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type SlotProps, slotRender } from '../../../lib/slot'
import Button, { type ButtonProps } from '../../button'
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

type ButtonVariant = NonNullable<ButtonProps['variant']>

interface AlertDialogPending {
  /** True while the confirm action runs. */
  pending: boolean
  setPending: (pending: boolean) => void
  /** Closes the dialog, past the pending lock. */
  close: () => void
}

const AlertDialogPendingContext = createContext<AlertDialogPending>({
  pending: false,
  setPending: () => {},
  close: () => {},
})

// No ✕ by default: the way out is one of the dialog's own actions.
const AlertDialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ showCloseButton = false, ...props }, ref) => (
    <DialogContent ref={ref} showCloseButton={showCloseButton} {...props} />
  ),
)
AlertDialogContent.displayName = 'AlertDialogContent'

interface AlertDialogActionProps extends Omit<SlotProps, 'onClick'> {
  /** The confirm. Return a promise to keep the dialog open, the button loading and every way out locked until it settles: it closes on resolve and stays open on reject. Call `event.preventDefault()` to keep it open after a plain return. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown
  /** Called with the reason when the promise `onClick` returned rejects; the dialog stays open. */
  onError?: (error: unknown) => void
  /** Holds the pending state from outside (a mutation's `isPending`): loading, and the dialog locked, while true. Defaults to `false`. */
  pending?: boolean
  /** The Button's variant when there is no `render` element. Defaults to `"primary"`. */
  variant?: ButtonVariant
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as PromiseLike<unknown>).then === 'function'

/** The confirm button: runs `onClick`, waits on the promise it returns, then closes. */
const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  (
    {
      onClick,
      onError,
      pending: pendingProp = false,
      variant = 'primary',
      render,
      asChild,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const { setPending, close } = useContext(AlertDialogPendingContext)
    const [running, setRunning] = useState(false)
    const busy = pendingProp || running

    useEffect(() => {
      setPending(busy)
    }, [busy, setPending])
    useEffect(() => () => setPending(false), [setPending])

    const press = (event: MouseEvent<HTMLButtonElement>) => {
      if (busy) return
      const result = onClick?.(event)
      if (!isThenable(result)) {
        if (!event.defaultPrevented) close()
        return
      }
      // Lock at once, not a render later: an Escape in between must not slip through.
      setPending(true)
      setRunning(true)
      Promise.resolve(result).then(
        () => {
          setRunning(false)
          setPending(false)
          close()
        },
        (error: unknown) => {
          setRunning(false)
          setPending(false)
          onError?.(error)
        },
      )
    }

    const el = slotRender(render, asChild, children)
    if (!el) {
      return (
        <Button ref={ref} variant={variant} loading={busy} disabled={disabled} onClick={press} {...props}>
          {children}
        </Button>
      )
    }
    // Button folds into its spinner; any other element is disabled and marked busy.
    const state = (el as ReactElement).type === Button ? { loading: busy } : { 'aria-busy': busy || undefined }
    return cloneElement(el as ReactElement<Record<string, unknown>>, {
      ...props,
      ...state,
      ref,
      disabled: disabled || busy,
      onClick: press,
    })
  },
)
AlertDialogAction.displayName = 'AlertDialogAction'

interface AlertDialogCancelProps extends SlotProps {
  /** The Button's variant when there is no `render` element. Defaults to `"ghost"`. */
  variant?: ButtonVariant
}

/** Closes without confirming; disabled while the action runs. */
const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  ({ variant = 'ghost', render, asChild, children, disabled, ...props }, ref) => {
    const { pending } = useContext(AlertDialogPendingContext)
    const el = slotRender(render, asChild, children) ?? <Button variant={variant}>{children}</Button>
    return <DialogClose ref={ref} render={el} disabled={disabled || pending} {...props} />
  },
)
AlertDialogCancel.displayName = 'AlertDialogCancel'

interface AlertDialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled alert dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. Not called for a dismissal blocked while an action runs. */
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
 * `AlertDialog.Action` is the confirm. When its `onClick` returns a promise,
 * the button folds into a spinner and the dialog holds still: Cancel greys
 * out, and Escape and every close are ignored until the promise settles. It
 * closes when the promise resolves and stays open when it rejects, handing
 * the reason to `onError`, so the person can try again or cancel.
 *
 * Statics:
 * - `AlertDialog.Action` — the confirm button: `onClick` (may return a
 *   promise), `onError`, `pending`, `variant`, or `render` / `asChild`.
 * - `AlertDialog.Cancel` — closes without confirming, disabled while the
 *   action runs: `variant` (ghost), or `render` / `asChild`.
 * - The same parts as Dialog — `AlertDialog.Trigger`, `AlertDialog.Content`,
 *   `AlertDialog.Header`, `AlertDialog.Footer`, `AlertDialog.Title`,
 *   `AlertDialog.Description` and `AlertDialog.Close`.
 *
 * @example {@include ./examples.mdx}
 */
function AlertDialog({ children, open, defaultOpen, onOpenChange }: AlertDialogProps) {
  const [pending, setPendingState] = useState(false)
  // Read synchronously by the dismissal guard, ahead of the next render.
  const pendingRef = useRef(false)
  const setPending = useCallback((next: boolean) => {
    pendingRef.current = next
    setPendingState(next)
  }, [])
  const closeRef = useRef<() => void>(() => {})
  const ctx = useMemo(() => ({ pending, setPending, close: () => closeRef.current() }), [pending, setPending])

  return (
    <DialogState open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {root => {
        closeRef.current = () => root.onOpenChange(false, {})
        return (
          <AlertDialogPendingContext.Provider value={ctx}>
            <AlertDialogPrimitive.Root
              open={root.open}
              onOpenChange={(next, details) => {
                if (!next && pendingRef.current) {
                  details.cancel()
                  return
                }
                root.onOpenChange(next, details)
              }}
            >
              {children}
            </AlertDialogPrimitive.Root>
          </AlertDialogPendingContext.Provider>
        )
      }}
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
AlertDialog.Action = AlertDialogAction
AlertDialog.Cancel = AlertDialogCancel

export type { AlertDialogActionProps, AlertDialogCancelProps, AlertDialogProps }
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent }

export default AlertDialog

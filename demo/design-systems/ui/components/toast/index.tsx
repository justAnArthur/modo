/*
 * Local addition (not part of Fluid Functionalism): gooey toasts after Sileo
 * (github.com/hiaaryan/sileo `src/sileo.tsx` + `src/styles.css` @
 * 9793f844349983e140cf33cebbb8f51626d41407 — MIT, notice: LICENSE.sileo). A
 * pill with the state's icon and title melts into a body with the description
 * and an action, through the shared goo filter; the body opens a beat after
 * the toast lands and folds back before it leaves (Sileo's autopilot), or
 * whenever it is hovered. Base UI's Toast owns the queue, timers, swipe to
 * dismiss and announcements; Sileo's own store, timers and swipe are not
 * ported. Colors are the status tokens on the inverted surface, the sizes the
 * control ladder's, and the motion the spring tiers.
 */

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { ArrowRight, Check, CircleAlert, Info, LoaderCircle, type LucideIcon, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  cloneElement,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GooFilter } from '../../lib/morph-layers'
import { useShape } from '../../lib/shape-context'
import { sizeMap } from '../../lib/size-context'
import { type SlotProps, slotRender } from '../../lib/slot'
import { spring } from '../../lib/springs'
import { GOO_BLUR_RATIO, holdExit } from '../../lib/use-morph'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'loading' | 'error' | 'warning' | 'info' | 'action'
type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

interface ToastOptions {
  title?: string
  description?: string
  type?: ToastType
  /** Ms before it leaves; 0 keeps it until dismissed. */
  timeout?: number
  action?: { label: string; onClick?: () => void }
}

const ICONS: Record<ToastType, LucideIcon> = {
  success: Check,
  loading: LoaderCircle,
  error: X,
  warning: CircleAlert,
  info: Info,
  action: ArrowRight,
}

// Literal per state so the class extractor sees each one.
const TONES: Record<ToastType, string> = {
  success: 'text-status-success bg-status-success/16',
  loading: 'text-status-loading bg-status-loading/16',
  error: 'text-status-error bg-status-error/16',
  warning: 'text-status-warning bg-status-warning/16',
  info: 'text-status-info bg-status-info/16',
  action: 'text-status-action bg-status-action/16',
}

const VIEWPORT: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4 items-start',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 flex-col-reverse items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse items-center',
  'bottom-right': 'bottom-4 right-4 flex-col-reverse items-end',
}

const ALIGN: Record<ToastPosition, string> = {
  'top-left': 'items-start',
  'top-center': 'items-center',
  'top-right': 'items-end',
  'bottom-left': 'flex-col-reverse items-start',
  'bottom-center': 'flex-col-reverse items-center',
  'bottom-right': 'flex-col-reverse items-end',
}

// The pill is one control tall, and the goo melts as much as its radius allows.
const PILL = sizeMap.default.controlHeight
const BLUR = (PILL / 2) * GOO_BLUR_RATIO
const AUTO_EXPAND_MS = 150
const AUTO_COLLAPSE_BEFORE_MS = 2000

const ToastSettings = createContext<{ position: ToastPosition; timeout: number }>({
  position: 'top-right',
  timeout: 6000,
})

/** Shows toasts from inside a `Toast`: `show`, the per-state shortcuts, `promise` and `close`. */
function useToast() {
  const manager = ToastPrimitive.useToastManager()

  return useMemo(() => {
    const options = ({ action, ...rest }: ToastOptions, type: ToastType) => ({
      ...rest,
      type,
      actionProps: action && { children: action.label, onClick: action.onClick },
    })
    const show = (o: ToastOptions) => manager.add(options(o, o.type ?? 'info'))

    return {
      show,
      success: (o: ToastOptions) => show({ ...o, type: 'success' }),
      error: (o: ToastOptions) => show({ ...o, type: 'error' }),
      warning: (o: ToastOptions) => show({ ...o, type: 'warning' }),
      info: (o: ToastOptions) => show({ ...o, type: 'info' }),
      promise: <T,>(promise: Promise<T>, o: { loading: ToastOptions; success: ToastOptions; error: ToastOptions }) =>
        manager.promise(promise, {
          loading: options(o.loading, 'loading'),
          success: options(o.success, 'success'),
          error: options(o.error, 'error'),
        }),
      close: manager.close,
    }
  }, [manager])
}

function ToastItem({ toast }: { toast: ToastPrimitive.Root.ToastObject }) {
  const { position, timeout } = useContext(ToastSettings)
  const shape = useShape()
  const gooId = `toast-goo-${useId().replace(/:/g, '')}`
  const type = (toast.type ?? 'info') as ToastType
  const Icon = ICONS[type]
  const top = position.startsWith('top')
  const ending = toast.transitionStatus === 'ending'
  const hasBody = Boolean(toast.description || toast.actionProps)
  const [hovered, setHovered] = useState(false)
  const [auto, setAuto] = useState(false)
  const expanded = hasBody && type !== 'loading' && !ending && (hovered || auto)
  const root = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  const [pillWidth, setPillWidth] = useState(PILL)

  useEffect(() => {
    if (!hasBody || type === 'loading') return
    const life = toast.timeout ?? timeout
    const open = setTimeout(() => setAuto(true), AUTO_EXPAND_MS)
    const close =
      life > 0 ? setTimeout(() => setAuto(false), Math.max(AUTO_EXPAND_MS, life - AUTO_COLLAPSE_BEFORE_MS)) : undefined
    return () => {
      clearTimeout(open)
      clearTimeout(close)
    }
  }, [hasBody, type, toast.timeout, timeout])

  // The pill follows its title: measured, then sprung to the new width.
  useLayoutEffect(() => {
    const el = header.current
    if (!el) return
    const measure = () => setPillWidth(Math.max(PILL, el.offsetWidth))
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!ending || !root.current) return
    const hold = holdExit(root.current, 'moderate')
    return () => hold.cancel()
  }, [ending])

  const away = { opacity: 0, y: top ? -6 : 6, scale: 0.95 }

  return (
    <ToastPrimitive.Root
      ref={root}
      toast={toast}
      swipeDirection={[top ? 'up' : 'down', position.endsWith('left') ? 'left' : 'right']}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      render={
        <motion.div
          initial={away}
          animate={ending ? away : { opacity: 1, y: 0, scale: 1 }}
          transition={ending ? spring.moderate.exit : spring.moderate}
        />
      }
      className="relative w-[min(22rem,calc(100vw-2rem))] select-none outline-none [translate:var(--toast-swipe-movement-x)_var(--toast-swipe-movement-y)]"
    >
      <GooFilter id={gooId} blur={BLUR} />
      {/* The filter is the effect itself: it melts the pill and the body, both on the same token fill, into one shape. */}
      <div className={cn('flex flex-col', ALIGN[position])} style={{ filter: `url(#${gooId})` }}>
        <motion.div
          className="flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-foreground"
          initial={{ width: PILL }}
          animate={{ width: pillWidth }}
          transition={spring.slow}
        >
          <div ref={header} className="inline-flex items-center whitespace-nowrap py-1.5 pr-3 pl-1.5">
            <ToastPrimitive.Title className="relative inline-flex items-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${type}-${toast.title}`}
                  className="inline-flex items-center gap-2"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)', transition: spring.moderate.exit }}
                  transition={spring.moderate}
                >
                  <span className={cn('flex size-6 items-center justify-center rounded-full', TONES[type])}>
                    <Icon size={14} strokeWidth={2.5} className={type === 'loading' ? 'animate-spin' : undefined} />
                  </span>
                  <span className="text-body weight-medium text-background">{toast.title}</span>
                </motion.span>
              </AnimatePresence>
            </ToastPrimitive.Title>
          </div>
        </motion.div>
        {hasBody && (
          <motion.div
            className={cn('w-full overflow-hidden bg-foreground', shape.container)}
            initial={false}
            animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
            transition={expanded ? spring.slow : spring.slow.exit}
          >
            <div className="flex flex-col items-start gap-3 p-4">
              <ToastPrimitive.Description className="text-caption text-background/70" />
              {toast.actionProps && (
                <ToastPrimitive.Action className="rounded-full bg-background/12 px-3 py-1 text-caption weight-medium text-background outline-none hover:bg-background/20 focus-visible:ring-1 focus-visible:ring-focus-ring" />
              )}
            </div>
          </motion.div>
        )}
      </div>
    </ToastPrimitive.Root>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map(toast => <ToastItem key={toast.id} toast={toast} />)
}

interface ToastTriggerProps extends Omit<SlotProps, 'type'> {
  /** The toast's title, in the pill. */
  title?: string
  /** Text for the body the pill melts into. */
  description?: string
  /** State: sets the icon and its color. Defaults to `'info'`. */
  type?: 'success' | 'loading' | 'error' | 'warning' | 'info' | 'action'
  /** Ms before it leaves; 0 keeps it until dismissed. Defaults to the `Toast`'s `timeout`. */
  timeout?: number
  /** A button in the body. */
  action?: { label: string; onClick?: () => void }
  /** Runs a task: the toast shows `title` while it is pending, then `success` or `error`. */
  promise?: () => Promise<unknown>
  /** The toast once `promise` resolves. */
  success?: { title?: string; description?: string }
  /** The toast if `promise` rejects. */
  error?: { title?: string; description?: string }
}

const ToastTrigger = forwardRef<HTMLButtonElement, ToastTriggerProps>(
  (
    {
      title,
      description,
      type,
      timeout,
      action,
      promise,
      success,
      error,
      render,
      asChild,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const toast = useToast()
    const el = slotRender(render, asChild, children)
    const press = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (promise) {
        toast.promise(promise(), { loading: { title, description }, success: success ?? {}, error: error ?? {} })
        return
      }
      toast.show({ title, description, type, timeout, action })
    }
    return el ? (
      cloneElement(el, { ...props, ref, onClick: press })
    ) : (
      <button ref={ref} type="button" {...props} onClick={press}>
        {children}
      </button>
    )
  },
)
ToastTrigger.displayName = 'ToastTrigger'

interface ToastProps {
  /** Where toasts stack; the pill sits on that side and the body opens away from the edge. Defaults to `'top-right'`. */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  /** How many toasts show at once; older ones wait. Defaults to `3`. */
  limit?: number
  /** Ms a toast stays; hovering pauses it. Defaults to `6000`. */
  timeout?: number
  /** The part of the app that can show toasts, with `Toast.Trigger`s or `useToast()`. */
  children?: ReactNode
}

/**
 * Gooey toasts: a pill with the state's icon and title that melts into a body
 * with the details.
 *
 * Each toast lands as a pill one control tall; when it has a description or
 * an action, the pill melts into a body a beat later through the shared goo
 * filter (see Morph), and folds back before it leaves, or stays open while
 * hovered. Six states (`success`, `loading`, `error`, `warning`, `info`,
 * `action`) set the icon and its status color; a promise toast spins as
 * `loading` and crossfades into its result. Built on Base UI's Toast:
 * timers pause on hover, a swipe toward the edge dismisses, and screen
 * readers hear every toast.
 *
 * `Toast` wraps the part of the app that shows toasts and renders them at
 * its `position`. Show one with `Toast.Trigger`, or call `useToast()`
 * inside it: `show`, `success`, `error`, `warning`, `info`, `promise` and
 * `close`.
 *
 * Statics:
 * - `Toast.Trigger` — a control that shows a toast when pressed:
 *   `render={<Button/>}` or `asChild`, with the toast's `title`,
 *   `description`, `type`, `timeout`, `action`, or a `promise` with its
 *   `success` / `error` toasts.
 *
 * @example {@include ./examples.mdx}
 */
function Toast({ position = 'top-right', limit = 3, timeout = 6000, children }: ToastProps) {
  const settings = useMemo(() => ({ position, timeout }), [position, timeout])

  return (
    <ToastPrimitive.Provider limit={limit} timeout={timeout}>
      <ToastSettings.Provider value={settings}>
        {children}
        <ToastPrimitive.Portal>
          <ToastPrimitive.Viewport className={cn('fixed z-[60] flex flex-col gap-2 outline-none', VIEWPORT[position])}>
            <ToastList />
          </ToastPrimitive.Viewport>
        </ToastPrimitive.Portal>
      </ToastSettings.Provider>
    </ToastPrimitive.Provider>
  )
}

Toast.Trigger = ToastTrigger

export type { ToastOptions, ToastPosition, ToastProps, ToastTriggerProps, ToastType }
export { Toast, ToastTrigger, useToast }

export default Toast

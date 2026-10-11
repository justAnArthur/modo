/*
 * Local addition (not part of Fluid Functionalism): the toast options and the
 * global `toast()` that works outside React. One module-level Base UI toast
 * manager (`Toast.createToastManager`) carries every call to the `Toast`
 * mounted with `manager={toast}`; calls made before that `Toast` subscribes
 * (a child's mount effect runs before its parent's) wait in a queue and play
 * once it does, so no toast is lost on the first render.
 */

import { type ToastManager, Toast as ToastPrimitive } from '@base-ui/react/toast'
import { isValidElement, type ReactNode } from 'react'
import type { IconComponent } from '../../../lib/icon-context'

type ToastType = 'success' | 'loading' | 'error' | 'warning' | 'info' | 'action'

/** A button in the toast's body. */
interface ToastActionOptions {
  label: ReactNode
  onClick?: () => void
}

interface ToastOptions {
  /** Reuse an id to replace a toast that is still showing. */
  id?: string
  title?: ReactNode
  description?: ReactNode
  type?: ToastType
  /** Ms before it leaves; 0 keeps it until dismissed. */
  timeout?: number
  /** Same as `timeout`; `timeout` wins when both are set. */
  duration?: number
  /** Replaces the state's icon in the pill: an icon component, or any node. */
  icon?: IconComponent | ReactNode
  /** A button in the body (`{ label, onClick }`), or any node. */
  action?: ToastActionOptions | ReactNode
  /** Runs once the toast starts to leave, however it was closed. */
  onClose?: () => void
  /** `high` is announced at once by screen readers; `low` waits its turn. */
  priority?: 'low' | 'high'
}

/** What a toast keeps beside Base UI's own fields. */
interface ToastData {
  icon?: IconComponent | ReactNode
  action?: ReactNode
}

type ToastInput = string | ToastOptions
type ToastResult<T> = ToastInput | ((value: T) => ToastInput)

interface ToastPromiseOptions<T> {
  loading: ToastInput
  success: ToastResult<T>
  error: ToastResult<unknown>
}

/** A shown toast: its id, and updating or dismissing it. */
interface ToastHandle {
  id: string
  update: (options: ToastInput) => void
  dismiss: () => void
}

const isActionButton = (action: unknown): action is ToastActionOptions =>
  typeof action === 'object' && action !== null && !isValidElement(action) && 'label' in action

/** Drops `undefined` keys: Base UI merges an update over the toast, so a missing key must not clear a field. */
function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

/** Options as Base UI's manager takes them: the action button as `actionProps`, the rest in `data`. */
function toManagerOptions(input: ToastInput) {
  const { action, icon, duration, timeout, ...rest } = typeof input === 'string' ? { title: input } : input
  const button = isActionButton(action)
  return defined({
    ...rest,
    timeout: timeout ?? duration,
    actionProps: button ? { children: action.label, onClick: action.onClick } : undefined,
    data:
      icon !== undefined || (action !== undefined && !button)
        ? { icon, action: button ? undefined : action }
        : undefined,
  })
}

const withType = (input: ToastInput, type: ToastType): ToastOptions =>
  typeof input === 'string' ? { title: input, type } : { ...input, type }

const resultOptions = <T>(result: ToastResult<T>) =>
  typeof result === 'function' ? (value: T) => toManagerOptions(result(value)) : toManagerOptions(result)

/** Base UI's manager, holding its events until a provider listens. */
function createQueuedManager(): ToastManager<ToastData> {
  const manager = ToastPrimitive.createToastManager<ToastData>()
  let listeners = 0
  let queue: (() => void)[] = []
  let count = 0
  const whenHeard = (run: () => void) => {
    if (listeners) run()
    else queue.push(run)
  }

  return {
    ' subscribe': listener => {
      const unsubscribe = manager[' subscribe'](listener)
      listeners++
      const queued = queue
      queue = []
      for (const run of queued) run()
      return () => {
        listeners--
        unsubscribe()
      }
    },
    add: options => {
      // A known id, so the caller can update or dismiss a toast still queued.
      const id = options.id ?? `toast-global-${++count}`
      whenHeard(() => manager.add({ ...options, id }))
      return id
    },
    close: id => whenHeard(() => manager.close(id)),
    update: (id, updates) => whenHeard(() => manager.update(id, updates)),
    promise: (promise, options) => {
      if (listeners) return manager.promise(promise, options)
      // The toast reports a rejection; the caller still gets the original promise.
      queue.push(() => manager.promise(promise, options).catch(() => {}))
      return promise
    },
  }
}

const manager = createQueuedManager()

function show(input: ToastInput, type?: ToastType): ToastHandle {
  const options = toManagerOptions(input)
  const id = manager.add({ type: 'info', ...options, ...(type && { type }) })
  return {
    id,
    update: next => manager.update(id, toManagerOptions(next)),
    dismiss: () => manager.close(id),
  }
}

/**
 * Shows a toast from anywhere — an event handler, a fetch wrapper, code
 * outside React — in the `Toast` mounted with `manager={toast}`. Returns a
 * handle with the id, `update` and `dismiss`.
 */
const toast = Object.assign((input: ToastInput) => show(input), {
  /** A `success` toast. */
  success: (input: ToastInput) => show(input, 'success'),
  /** An `error` toast. */
  error: (input: ToastInput) => show(input, 'error'),
  /** A `warning` toast. */
  warning: (input: ToastInput) => show(input, 'warning'),
  /** An `info` toast. */
  info: (input: ToastInput) => show(input, 'info'),
  /** A spinning `loading` toast that stays until updated or dismissed (unless given a `timeout`). */
  loading: (input: ToastInput) => show({ timeout: 0, ...withType(input, 'loading') }),
  /** Runs `promise` behind a `loading` toast that turns into its `success` or `error` toast. Returns the promise. */
  promise: <T>(promise: Promise<T>, options: ToastPromiseOptions<T>) =>
    manager.promise(promise, {
      loading: toManagerOptions(options.loading),
      success: resultOptions(options.success),
      error: resultOptions(options.error),
    }),
  /** Changes a toast that is showing. */
  update: (id: string, input: ToastInput) => manager.update(id, toManagerOptions(input)),
  /** Closes one toast, or every toast without an id. */
  dismiss: (id?: string) => manager.close(id),
  // Base UI's provider subscribes through this key, so `toast` itself is what `<Toast manager>` takes.
  ' subscribe': manager[' subscribe'],
})

/** What `<Toast manager>` takes: the global `toast`, or a manager from Base UI's `Toast.createToastManager()`. */
type ToastSource = Pick<ToastManager, ' subscribe'>

export type {
  ToastActionOptions,
  ToastData,
  ToastHandle,
  ToastInput,
  ToastOptions,
  ToastPromiseOptions,
  ToastSource,
  ToastType,
}
export { toast, toManagerOptions }

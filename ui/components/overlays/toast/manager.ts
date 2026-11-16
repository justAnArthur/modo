/*
 * Local addition (not part of Fluid Functionalism): the toast API both ways
 * share, and the global `toast()` that works outside React. `toastApi` turns
 * a Base UI manager into `show`, the per-state shortcuts, `promise`,
 * `update` and `close`; `useToast()` builds it over the provider's store,
 * `toast` over one module-level manager that a `Toast` mounted with
 * `manager={toast}` subscribes its store to, so both reach the same stack.
 * Calls made before that `Toast` subscribes (a child's mount effect runs
 * before its parent's) wait in a queue and play once it does. On the server
 * nothing will ever subscribe, so calls there are dropped instead.
 */

import { type ToastManager, Toast as ToastPrimitive } from '@base-ui/react/toast'

type ToastType = 'success' | 'loading' | 'error' | 'warning' | 'info' | 'action'

interface ToastOptions {
  /** Reuse an id to replace a toast that is still showing. */
  id?: string
  title?: string
  description?: string
  type?: ToastType
  /** Ms before it leaves; 0 keeps it until dismissed. */
  timeout?: number
  action?: { label: string; onClick?: () => void }
}

/** A toast's options, or just its title. */
type ToastInput = string | ToastOptions
type ToastResult<T> = ToastInput | ((value: T) => ToastInput)

interface ToastPromiseOptions<T> {
  loading: ToastInput
  success: ToastResult<T>
  error: ToastResult<unknown>
}

type ManagerCalls = Pick<ToastManager, 'add' | 'close' | 'update' | 'promise'>

/** Options as Base UI's manager takes them. Keys left out stay out, so an update never clears a field it doesn't name. */
function managerOptions(input: ToastInput) {
  const { action, ...rest } = typeof input === 'string' ? { title: input } : input
  return { ...rest, ...(action && { actionProps: { children: action.label, onClick: action.onClick } }) }
}

const resultOptions = <T>(result: ToastResult<T>) =>
  typeof result === 'function' ? (value: T) => managerOptions(result(value)) : managerOptions(result)

/** The imperative toast API over a Base UI manager: what `useToast()` and the global `toast` both are. */
function toastApi(manager: ManagerCalls) {
  const show = (input: ToastInput, type?: ToastType) =>
    manager.add({ type: 'info', ...managerOptions(input), ...(type && { type }) })

  return {
    /** Shows a toast (`info` unless its `type` says otherwise) and returns its id. */
    show: (input: ToastInput) => show(input),
    success: (input: ToastInput) => show(input, 'success'),
    error: (input: ToastInput) => show(input, 'error'),
    warning: (input: ToastInput) => show(input, 'warning'),
    info: (input: ToastInput) => show(input, 'info'),
    /** A spinning toast that stays while it is `loading`; updated to another type, it leaves on its own `timeout` or the `Toast`'s. */
    loading: (input: ToastInput) => show(input, 'loading'),
    /** Runs `promise` behind a `loading` toast that turns into its `success` or `error` toast. Returns the promise. */
    promise: <T>(promise: Promise<T>, options: ToastPromiseOptions<T>) =>
      manager.promise(promise, {
        loading: managerOptions(options.loading),
        success: resultOptions(options.success),
        error: resultOptions(options.error),
      }),
    /** Changes a toast that is showing. */
    update: (id: string, input: ToastInput) => manager.update(id, managerOptions(input)),
    /** Closes one toast, or every toast without an id. */
    close: (id?: string) => manager.close(id),
  }
}

const browser = typeof window !== 'undefined'

/** Base UI's manager, holding its calls until a provider listens. */
function createQueuedManager(): ToastManager {
  const manager = ToastPrimitive.createToastManager()
  let listeners = 0
  let queue: (() => void)[] = []
  let count = 0
  const whenHeard = (run: () => void) => {
    if (listeners) run()
    else if (browser) queue.push(run)
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
      // A known id, so the caller can update or close a toast still queued.
      const id = options.id ?? `toast-global-${++count}`
      whenHeard(() => manager.add({ ...options, id }))
      return id
    },
    close: id => whenHeard(() => manager.close(id)),
    update: (id, updates) => whenHeard(() => manager.update(id, updates)),
    promise: (promise, options) => {
      if (listeners) return manager.promise(promise, options)
      // The toast reports a rejection; the caller still gets the original promise.
      if (browser) queue.push(() => manager.promise(promise, options).catch(() => {}))
      return promise
    },
  }
}

const globalManager = createQueuedManager()
const globalApi = toastApi(globalManager)

/**
 * Shows a toast from anywhere (an event handler, a fetch wrapper, code
 * outside React) in the `Toast` mounted with `manager={toast}`: `toast(…)`,
 * `toast.success` / `error` / `warning` / `info` / `loading`, `promise`,
 * `update` and `close`. Each takes options or a title.
 */
const toast = Object.assign((input: ToastInput) => globalApi.show(input), globalApi, {
  // Base UI's provider subscribes through this key, so `toast` itself is what `<Toast manager>` takes.
  ' subscribe': globalManager[' subscribe'],
})

/** What `<Toast manager>` takes: the global `toast`, or a manager from Base UI's `Toast.createToastManager()`. */
type ToastSource = Pick<ToastManager, ' subscribe'>

export type { ToastInput, ToastOptions, ToastPromiseOptions, ToastSource, ToastType }
export { toast, toastApi }

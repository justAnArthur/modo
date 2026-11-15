/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllableState } from '../../../lib/use-controllable-state'
import type { InputMessageStatus, QueuedMessage } from './shared'

const NO_QUEUE: QueuedMessage[] = []

interface MessageQueueOptions {
  status: InputMessageStatus | undefined
  defaultStatus: InputMessageStatus | undefined
  onStatusChange: ((status: InputMessageStatus) => void) | undefined
  onStop: (() => void) | undefined
  queue: QueuedMessage[] | undefined
  defaultQueue: QueuedMessage[] | undefined
  onQueueChange: ((queue: QueuedMessage[]) => void) | undefined
  onSend: ((value: string, files: File[], meta?: { queuedId?: string }) => void) | undefined
}

/**
 * The streaming status and the queue of messages typed while it streams. On
 * the streaming → idle edge the head of the queue dispatches through `onSend`;
 * the consumer sets the status back to streaming there, which re-arms it.
 */
export function useMessageQueue(options: MessageQueueOptions) {
  const { onStop, onSend } = options
  const statusEnabled = options.status !== undefined || options.defaultStatus !== undefined
  const statusControlled = options.status !== undefined
  const [statusValue, setStatus] = useControllableState<InputMessageStatus>(
    options.status,
    options.defaultStatus ?? 'idle',
    options.onStatusChange,
  )
  const status = statusEnabled ? statusValue : undefined

  const [queue, setQueue] = useControllableState<QueuedMessage[]>(
    options.queue,
    options.defaultQueue ?? NO_QUEUE,
    options.onQueueChange,
  )
  // Read by the handlers, so two submits before a controlled `queue` round-trips both land.
  const queueRef = useRef(queue)
  queueRef.current = queue
  const supported = statusEnabled && (options.onQueueChange !== undefined || options.defaultQueue !== undefined)
  const [announcement, setAnnouncement] = useState('')

  // An uncontrolled status can always stop: Stop flips it to idle itself.
  const canStop = onStop !== undefined || !statusControlled
  const stop = useCallback(() => {
    onStop?.()
    if (!statusControlled) setStatus('idle')
  }, [onStop, statusControlled, setStatus])

  const previous = useRef(status)
  useEffect(() => {
    const prev = previous.current
    previous.current = status
    if (!supported || prev !== 'streaming' || status !== 'idle') return
    const [next, ...rest] = queue
    if (!next) return
    setQueue(rest)
    onSend?.(next.text, next.files, { queuedId: next.id })
    setAnnouncement(`Message sent.${rest.length ? ` ${rest.length} still queued.` : ''}`)
  }, [status, supported, queue, setQueue, onSend])

  const enqueue = useCallback(
    (text: string, files: File[]) => setQueue([...queueRef.current, { id: crypto.randomUUID(), text, files }]),
    [setQueue],
  )

  const remove = useCallback(
    (item: QueuedMessage) => setQueue(queueRef.current.filter(q => q.id !== item.id)),
    [setQueue],
  )

  const move = useCallback(
    (item: QueuedMessage, dir: -1 | 1) => {
      const next = [...queueRef.current]
      const i = next.findIndex(q => q.id === item.id)
      const a = next[i]
      const b = next[i + dir]
      if (i < 0 || !a || !b) return
      next[i] = b
      next[i + dir] = a
      setQueue(next)
    },
    [setQueue],
  )

  return {
    supported,
    streaming: status === 'streaming',
    canStop,
    stop,
    queue,
    setQueue,
    enqueue,
    remove,
    move,
    announcement,
  }
}

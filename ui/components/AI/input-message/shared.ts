/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

import type { ReactNode, RefObject } from 'react'

type InputMessageStatus = 'idle' | 'streaming'

interface InputMessageSlotContext {
  /** Opens the native file picker. Pass `acceptOverride` (e.g. `"image/*"`) to narrow the accepted types for this one invocation. */
  openFilePicker: (acceptOverride?: string) => void
  /** Currently-attached files. */
  files: File[]
}

type InputMessageSlot = ReactNode | ((ctx: InputMessageSlotContext) => ReactNode)

/** A message held in the queue while the assistant is responding: the trimmed text and the files attached when it was queued, so editing restores both. `id` is minted on enqueue. */
interface QueuedMessage {
  id: string
  text: string
  files: File[]
}

/** Moves the caret to the end of the textarea on the next frame, optionally focusing it. */
function caretToEnd(ref: RefObject<HTMLTextAreaElement | null>, focus = true) {
  requestAnimationFrame(() => {
    const el = ref.current
    if (!el) return
    if (focus) el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
}

export type { InputMessageSlot, InputMessageSlotContext, InputMessageStatus, QueuedMessage }
export { caretToEnd }

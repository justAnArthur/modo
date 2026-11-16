/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md.
 */

'use client'

import { type KeyboardEvent, type RefObject, useCallback, useRef, useState } from 'react'
import { caretToEnd } from './shared'

const isPlain = (e: KeyboardEvent) => !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey

/**
 * Readline-style recall of sent messages: ArrowUp with the caret on the first
 * line walks back, ArrowDown on the last line walks forward and past the
 * newest entry restores the draft. `exit` leaves history mode (typing, sending).
 */
export function useHistoryNav(
  history: string[],
  value: string,
  setValue: (value: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const [index, setIndex] = useState<number | null>(null)
  const draft = useRef('')

  const exit = useCallback(() => setIndex(null), [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!history.length || !isPlain(e)) return
      const el = e.currentTarget
      const caret = el.selectionStart ?? 0
      const end = el.selectionEnd ?? caret

      if (e.key === 'ArrowUp' && !value.slice(0, caret).includes('\n')) {
        const start = index ?? history.length
        if (start === 0) return
        e.preventDefault()
        if (index == null) draft.current = value
        setIndex(start - 1)
        setValue(history[start - 1] ?? '')
        caretToEnd(textareaRef, false)
        return
      }

      if (e.key === 'ArrowDown' && index != null && !value.slice(end).includes('\n')) {
        e.preventDefault()
        const next = index + 1
        setIndex(next >= history.length ? null : next)
        setValue(next >= history.length ? draft.current : (history[next] ?? ''))
        caretToEnd(textareaRef, false)
      }
    },
    [history, value, index, setValue, textareaRef],
  )

  return { exit, onKeyDown }
}

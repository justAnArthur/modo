/*
 * Local addition (not part of Fluid Functionalism): the editable DatePicker's
 * text control. Typing fills the locale's numeric mask (`lib/date-mask.ts`),
 * the rest of it muted after the caret. After utegsk/ui's `MaskedDateInput`.
 */

'use client'

import type { Locale } from 'date-fns'
import { forwardRef, type InputHTMLAttributes, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  dateMask,
  editMask,
  formatMask,
  layoutMask,
  localeDigits,
  maskGhost,
  maskLength,
  parseMask,
} from '../../../../lib/date-mask'
import { useSize } from '../../../../lib/size-context'
import { cn } from '../../../../lib/utils'

interface MaskedDateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size'> {
  /** The committed date; `null` when empty. */
  value: Date | null
  /** A complete, allowed date as it is typed; `null` once emptied, or when the field is left holding no such date. */
  onValueChange: (value: Date | null) => void
  /** Whether what the field holds can't be a date (impossible, refused, or left incomplete). */
  onInvalidChange: (invalid: boolean) => void
  locale: Locale
  withTime: boolean
  /** Whether a typed date may be picked (the calendar's months, `disabledDays`). */
  allowed: (date: Date) => boolean
}

/** Puts the caret after the `count`th digit, once React has written the text. */
function caretAfter(input: HTMLInputElement, count: number) {
  requestAnimationFrame(() => {
    let seen = 0
    let i = 0
    while (i < input.value.length && seen < count) {
      if (/\p{Nd}/u.test(input.value[i] ?? '')) seen++
      i++
    }
    input.setSelectionRange(i, i)
  })
}

const MaskedDateInput = forwardRef<HTMLInputElement, MaskedDateInputProps>(
  (
    {
      value,
      onValueChange,
      onInvalidChange,
      locale,
      withTime,
      allowed,
      placeholder,
      onKeyDown,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const size = useSize()
    const mask = useMemo(() => dateMask(locale, withTime), [locale, withTime])
    const digitMap = useMemo(() => localeDigits(locale), [locale])
    const length = maskLength(mask)
    const formatted = value ? formatMask(value, mask) : ''
    // What is typed while it differs from the value (being typed, or invalid); `null` shows the value.
    const [draft, setDraft] = useState<string | null>(null)
    const [focused, setFocused] = useState(false)
    const text = draft ?? formatted
    // The last real date, for Escape; and what this field last reported, to tell its own changes from outside ones.
    const lastValid = useRef(value)
    if (value) lastValid.current = value
    const reported = useRef(formatted)

    const report = (next: Date | null) => {
      reported.current = next ? formatMask(next, mask) : ''
      if (next?.getTime() !== value?.getTime()) onValueChange(next)
    }

    const flag = (invalid: boolean) => onInvalidChange(invalid)

    // A calendar pick or a reset from outside replaces whatever was typed.
    useEffect(() => {
      if (formatted === reported.current) return
      reported.current = formatted
      setDraft(null)
      onInvalidChange(false)
    }, [formatted, onInvalidChange])

    const digitsIn = (s: string) => Array.from(s, char => digitMap.get(char) ?? '').join('')

    const commit = (digits: string) => {
      const next = digits.slice(0, length)
      setDraft(layoutMask(next, mask))
      if (!next) {
        flag(false)
        report(null)
        return
      }
      if (next.length < length) return flag(false)
      const date = parseMask(next, mask, value)
      const ok = !!date && allowed(date)
      flag(!ok)
      if (ok) report(date)
    }

    const restore = (e: KeyboardEvent<HTMLInputElement>) => {
      const back = lastValid.current
      const backText = back ? formatMask(back, mask) : ''
      if (text === backText && value?.getTime() === back?.getTime()) return
      // Handled here: a surrounding Dialog must not close as well.
      e.preventDefault()
      e.stopPropagation()
      setDraft(null)
      flag(false)
      report(back)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented || props.readOnly || props.disabled) return
      if (e.key === 'Escape') return restore(e)
      const digit = digitMap.get(e.key)
      if (digit === undefined && e.key !== 'Backspace' && e.key !== 'Delete') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const input = e.currentTarget
      const start = input.selectionStart ?? text.length
      const end = input.selectionEnd ?? start
      const edit = editMask(
        digitsIn(text),
        digitsIn(text.slice(0, start)).length,
        digitsIn(text.slice(0, end)).length,
        digit === undefined ? (e.key as 'Backspace' | 'Delete') : { digit },
        length,
      )
      if (!edit) return
      e.preventDefault()
      commit(edit.digits)
      caretAfter(input, edit.caret)
    }

    const ghost = maskGhost(mask)
    // The mask shows once the field is in use; at rest a `placeholder` takes its place.
    const showGhost = focused || !!text || placeholder === undefined

    return (
      <span className="relative flex h-full min-w-0 flex-1 items-center">
        {showGhost && (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre tabular-nums',
              size.text,
            )}
          >
            <span className="invisible">{text}</span>
            <span className="text-muted-foreground">{ghost.slice(text.length)}</span>
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          {...props}
          value={text}
          placeholder={showGhost ? undefined : placeholder}
          // Paste, autofill and soft keyboards arrive here rather than as keys.
          onChange={e => commit(digitsIn(e.target.value))}
          onKeyDown={handleKeyDown}
          onFocus={e => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={e => {
            setFocused(false)
            const digits = digitsIn(text)
            const date = parseMask(digits, mask, value)
            if (!digits || (date && allowed(date))) setDraft(null)
            else {
              // Left incomplete or refused: it stays on screen, marked, and the value empties.
              flag(true)
              report(null)
            }
            onBlur?.(e)
          }}
          className={cn(
            'relative w-full min-w-0 bg-transparent tabular-nums text-foreground outline-none font-[inherit] weight-normal placeholder:text-muted-foreground',
            size.text,
          )}
        />
      </span>
    )
  },
)
MaskedDateInput.displayName = 'MaskedDateInput'

export type { MaskedDateInputProps }
export { MaskedDateInput }

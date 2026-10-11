/*
 * Local addition (not part of Fluid Functionalism): the editable DatePicker's
 * text field. Typing fills a numeric mask in the locale's own order
 * ("DD.MM.YYYY", "MM/DD/YYYY", with "HH:mm" for a time); the rest of the mask
 * shows muted after the caret. After utegsk/ui's `MaskedDateInput`
 * (`packages/ui/src/components/form/calendar/date-input.client.tsx`).
 */

import { getDate, getHours, getMinutes, getMonth, getYear, isValid, type Locale, set } from 'date-fns'
import {
  type FocusEvent,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSize } from '../../../../lib/size-context'
import { cn } from '../../../../lib/utils'

type Part = 'day' | 'month' | 'year' | 'hour' | 'minute'
type Slot = { type: Part; width: number } | { type: 'literal'; value: string }

const PLACEHOLDER: Record<Part, string> = { day: 'DD', month: 'MM', year: 'YYYY', hour: 'HH', minute: 'mm' }

/** The locale's numeric date (and 24-hour time) as a mask: parts in order, literals between. */
function maskOf(locale: Locale, withTime: boolean): Slot[] {
  const parts = new Intl.DateTimeFormat(locale.code, {
    calendar: 'gregory',
    numberingSystem: 'latn',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  }).formatToParts(new Date(2006, 10, 22, 13, 45))
  return parts.flatMap<Slot>(part => {
    if (part.type === 'literal') return [{ type: 'literal', value: part.value }]
    if (!(part.type in PLACEHOLDER)) return []
    const type = part.type as Part
    return [{ type, width: type === 'year' ? 4 : 2 }]
  })
}

/** Every digit the locale writes, mapped to its Latin twin, so "٢" types as "2". */
function digitsOf(locale: Locale) {
  const format = new Intl.NumberFormat(locale.code, { useGrouping: false })
  const map = new Map<string, string>()
  for (let digit = 0; digit <= 9; digit++) {
    map.set(String(digit), String(digit))
    for (const char of format.format(digit)) if (/\p{Nd}/u.test(char)) map.set(char, String(digit))
  }
  return map
}

const digitCount = (mask: Slot[]) => mask.reduce((n, slot) => n + (slot.type === 'literal' ? 0 : slot.width), 0)

/** The typed digits laid into the mask; a literal follows each finished part. */
function layout(digits: string, mask: Slot[]) {
  let at = 0
  let text = ''
  for (const slot of mask) {
    if (slot.type === 'literal') {
      if (text) text += slot.value
      continue
    }
    const chunk = digits.slice(at, at + slot.width)
    if (!chunk) break
    text += chunk
    at += chunk.length
    if (chunk.length < slot.width) break
  }
  return text.trimEnd()
}

function formatMasked(date: Date, mask: Slot[]) {
  const values: Record<Part, number> = {
    day: getDate(date),
    month: getMonth(date) + 1,
    year: getYear(date),
    hour: getHours(date),
    minute: getMinutes(date),
  }
  return mask
    .map(slot => (slot.type === 'literal' ? slot.value : String(values[slot.type]).padStart(slot.width, '0')))
    .join('')
}

/** A complete set of digits as a date, keeping `base`'s time when the mask has none; `null` when no such day exists. */
function parseMasked(digits: string, mask: Slot[], base: Date | null): Date | null {
  const values: Partial<Record<Part, number>> = {}
  let at = 0
  for (const slot of mask) {
    if (slot.type === 'literal') continue
    values[slot.type] = Number(digits.slice(at, at + slot.width))
    at += slot.width
  }
  const { day = 0, month = 0, year = 0, hour, minute } = values
  const date = set(base ?? new Date(0), {
    year,
    month: month - 1,
    date: day,
    hours: hour ?? base?.getHours() ?? 0,
    minutes: minute ?? base?.getMinutes() ?? 0,
    seconds: 0,
    milliseconds: 0,
  })
  const exact =
    isValid(date) &&
    year >= 1000 &&
    getYear(date) === year &&
    getMonth(date) === month - 1 &&
    getDate(date) === day &&
    (hour === undefined || getHours(date) === hour) &&
    (minute === undefined || getMinutes(date) === minute)
  return exact ? date : null
}

/** Puts the caret after the `count`th digit. */
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

interface MaskedDateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type'> {
  /** The committed date; `null` when empty. */
  value: Date | null
  /** The value from outside can't be read as a date: keep what was typed and stay invalid. */
  externallyInvalid: boolean
  /** A complete, real date; `null` once emptied; an Invalid Date when left incomplete or impossible (Escape then brings back the last real date). */
  onValueChange: (value: Date | null) => void
  /** Whether what is typed can't be a date (impossible, or left incomplete). */
  onInvalidChange: (invalid: boolean) => void
  locale: Locale
  withTime: boolean
  /** Whether a day may be picked (bounds, disabled days). */
  allowed: (date: Date) => boolean
}

/** A numeric text field over the locale's date mask. */
const MaskedDateInput = forwardRef<HTMLInputElement, MaskedDateInputProps>(
  (
    {
      value,
      externallyInvalid,
      onValueChange,
      onInvalidChange,
      locale,
      withTime,
      allowed,
      onFocus,
      onBlur,
      onKeyDown,
      placeholder,
      className,
      ...props
    },
    ref,
  ) => {
    const size = useSize()
    const mask = useMemo(() => maskOf(locale, withTime), [locale, withTime])
    const digitMap = useMemo(() => digitsOf(locale), [locale])
    const full = digitCount(mask)
    const formatted = value && isValid(value) ? formatMasked(value, mask) : ''
    const [text, setText] = useState(formatted)
    const [focused, setFocused] = useState(false)
    // Typed text the value can't hold (incomplete, impossible): kept until replaced.
    const keepText = useRef(false)
    // The last real date, so Escape can bring it back after an invalid entry.
    const lastValid = useRef<Date | null>(null)
    if (value && isValid(value)) lastValid.current = value
    // Whether the Invalid Date in `value` is one this field reported.
    const emittedInvalid = useRef(false)

    const emit = (next: Date | null) => {
      emittedInvalid.current = next !== null && !isValid(next)
      onValueChange(next)
    }

    const digitsIn = (s: string) => Array.from(s, char => digitMap.get(char) ?? '').join('')

    const flag = (invalid: boolean) => onInvalidChange(invalid)

    // The value changed from outside (a calendar pick, a reset): show it.
    useEffect(() => {
      if (focused || (keepText.current && externallyInvalid)) return
      keepText.current = false
      setText(formatted)
      flag(false)
    }, [formatted, externallyInvalid, focused])

    const commit = (digits: string) => {
      const next = digits.slice(0, full)
      setText(layout(next, mask))
      if (!next) {
        keepText.current = false
        flag(false)
        emit(null)
        return
      }
      if (next.length < full) {
        flag(false)
        return
      }
      const date = parseMasked(next, mask, value && isValid(value) ? value : null)
      const ok = !!date && allowed(date)
      flag(!ok)
      if (ok) {
        keepText.current = false
        emit(date)
      }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented || props.readOnly || props.disabled) return
      const input = e.currentTarget
      const start = input.selectionStart ?? text.length
      const end = input.selectionEnd ?? start
      const digits = digitsIn(text)
      const from = digitsIn(text.slice(0, start)).length
      const to = digitsIn(text.slice(0, end)).length
      const typed = digitMap.get(e.key)

      if (typed !== undefined) {
        e.preventDefault()
        // Overtype in place, so a fixed-width mask edits like a segmented field.
        const next =
          from === to
            ? from < digits.length
              ? digits.slice(0, from) + typed + digits.slice(from + 1)
              : digits + typed
            : digits.slice(0, from) + typed + digits.slice(to)
        commit(next)
        caretAfter(input, from + 1)
        return
      }
      if (e.key === 'Escape') {
        const restore = lastValid.current
        const restored = restore ? formatMasked(restore, mask) : ''
        // The picker hands an Invalid Date down as `null` + `externallyInvalid`.
        const invalidNow = externallyInvalid || (value !== null && !isValid(value))
        if (text === restored && !invalidNow) return
        // Handled here: a surrounding Dialog must not close as well.
        e.preventDefault()
        e.stopPropagation()
        keepText.current = false
        setText(restored)
        flag(false)
        if (invalidNow && emittedInvalid.current) emit(restore)
        return
      }
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      let cutFrom = from
      let cutTo = to
      if (cutFrom === cutTo) {
        if (e.key === 'Backspace') cutFrom = Math.max(0, cutFrom - 1)
        else cutTo = Math.min(digits.length, cutTo + 1)
      }
      if (cutFrom === cutTo) return
      e.preventDefault()
      commit(digits.slice(0, cutFrom) + digits.slice(cutTo))
      caretAfter(input, cutFrom)
    }

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      const digits = digitsIn(text)
      const date = digits.length === full ? parseMasked(digits, mask, value && isValid(value) ? value : null) : null
      if (digits && !(date && allowed(date))) {
        // Left incomplete or impossible: say so, and let a form see it.
        keepText.current = true
        flag(true)
        emit(new Date(Number.NaN))
      }
      onBlur?.(e)
    }

    const ghost =
      placeholder === undefined
        ? mask.map(slot => (slot.type === 'literal' ? slot.value : PLACEHOLDER[slot.type])).join('')
        : ''

    return (
      <span className="relative flex h-full min-w-0 flex-1 items-center">
        {/* The rest of the mask, muted, right after what is typed. */}
        {ghost && (
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
          {...props}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={e => commit(digitsIn(e.target.value))}
          onFocus={e => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative w-full min-w-0 bg-transparent tabular-nums text-foreground outline-none font-[inherit] placeholder:text-muted-foreground',
            size.text,
            className,
          )}
        />
      </span>
    )
  },
)
MaskedDateInput.displayName = 'MaskedDateInput'

export type { MaskedDateInputProps }
export { MaskedDateInput }

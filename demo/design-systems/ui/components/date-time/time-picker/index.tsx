/*
 * Local addition (not part of Fluid Functionalism): a time-of-day field with
 * scrolling hour and minute columns. Props after utegsk/ui's TimePicker
 * (`hourCycle`, a string value), kept in line with the other pickers here.
 */

import { format, type Locale, set } from 'date-fns'
import { useRef } from 'react'
import { defaultLocale, type HourCycle, hourCycleOf, parseTimeText } from '../../../lib/date-locale'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { PickerInput, PickerShell } from '../picker-shell'
import { pad, type Time, TimeColumns } from '../time-columns'

interface TimePickerProps {
  /** The picked time as `"HH:mm"` on a 24-hour clock (an `<input type="time">`'s value); `null` when empty. */
  value?: string | null
  /** Initial time, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: string | null
  /** Called with the new `"HH:mm"`, or `null` when the field is cleared. */
  onValueChange?: (value: string | null) => void
  /** The clock shown: `'h12'` / `'h11'` add an AM/PM column. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale: the time's format and the AM/PM names. Defaults to `enUS`. */
  locale?: Locale
  /** Shown while empty. */
  placeholder?: string
  /** Disables the field. Defaults to `false`. */
  disabled?: boolean
  /** Marks the field invalid. Defaults to `false`. */
  invalid?: boolean
  /** Pins the field and its panel to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled panel. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the panel opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Id of the field, for a `Label`'s `htmlFor`. */
  id?: string
  /** Classes for the field. */
  className?: string
}

const toTime = (value: string | null): Time | null => {
  const [hours, minutes] = value?.split(':').map(Number) ?? []
  return hours === undefined || minutes === undefined ? null : { hours, minutes }
}
const toValue = ({ hours, minutes }: Time) => `${pad(hours)}:${pad(minutes)}`

/**
 * A time-of-day field with scrolling hour and minute columns.
 *
 * The panel opens with the time as text, selected and ready to type over
 * ("15:33", "3:33 PM"), above an hour column and a minute column; a 12-hour
 * clock adds an AM/PM column. Each column keeps its pick in the middle and
 * marks it with a dot. The value is `"HH:mm"` on a 24-hour clock whatever the
 * locale shows, the same as a native time input's.
 *
 * @example {@include ./examples.mdx}
 */
function TimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  hourCycle,
  minuteStep = 1,
  locale = defaultLocale,
  placeholder,
  disabled,
  invalid,
  size,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  id,
  className,
}: TimePickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const time = toTime(value)
  const formatted = time ? format(set(new Date(), time), 'p', { locale }) : ''

  const readTime = (text: string) => {
    if (!text.trim()) {
      setValue(null)
      return true
    }
    const read = parseTimeText(text, locale)
    if (!read) return false
    setValue(toValue({ hours: read.getHours(), minutes: read.getMinutes() }))
    return true
  }

  return (
    <PickerShell
      open={open}
      onOpenChange={setOpen}
      size={size}
      invalid={invalid}
      disabled={disabled}
      icon="clock"
      display={formatted}
      placeholder={placeholder}
      header={
        <PickerInput
          ref={input}
          aria-label={placeholder ?? 'Time'}
          placeholder={placeholder}
          formatted={formatted}
          onText={readTime}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
      }
      initialFocus={input}
      id={id}
      className={className}
    >
      <div className="flex h-56 justify-center [&>:first-child]:border-s-0">
        <TimeColumns
          value={time}
          onValueChange={next => setValue(toValue(next))}
          hourCycle={hourCycle ?? hourCycleOf(locale)}
          minuteStep={minuteStep}
          locale={locale}
          orientation="vertical"
        />
      </div>
    </PickerShell>
  )
}

export type { TimePickerProps }
export { TimePicker }

export default TimePicker

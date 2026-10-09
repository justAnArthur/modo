/*
 * Local addition (not part of Fluid Functionalism): a date field over the
 * scrolling Calendar (react-day-picker). Props after shadcn's date picker
 * and utegsk/ui's DatePicker (`withTime`, `hourCycle`), kept in line with the
 * other pickers here.
 */

import { endOfMonth, format, type Locale, set } from 'date-fns'
import { useRef } from 'react'
import { dateMatchModifiers, type Matcher } from 'react-day-picker'
import { defaultLocale, type HourCycle, hourCycleOf, parseDateText, parseTimeText } from '../../../lib/date-locale'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import Calendar from '../calendar'
import { PickerInput, PickerShell } from '../picker-shell'
import { TimeColumns } from '../time-columns'

interface DatePickerProps {
  /** The picked date (and time, with `withTime`); `null` when empty. */
  value?: Date | null
  /** Initial date, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: Date | null
  /** Called with the new date, or `null` when the field is cleared. */
  onValueChange?: (value: Date | null) => void
  /** Adds hour and minute columns, and the time to the field. Defaults to `false`. */
  withTime?: boolean
  /** The clock for the time: `'h12'` / `'h11'` add an AM/PM column. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`): names, formats, the week's first day and what typing reads. Defaults to `enUS`. */
  locale?: Locale
  /** Shown while empty. */
  placeholder?: string
  /** `true` disables the field; any other react-day-picker matcher (a date, `{ before }`, `{ dayOfWeek }`, a function…) disables the days it matches. */
  disabled?: Matcher | Matcher[]
  /** The first month the calendar reaches. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month the calendar reaches. Defaults to 50 years ahead. */
  endMonth?: Date
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
  /** Text direction of the panel; `'rtl'` mirrors it. */
  dir?: 'ltr' | 'rtl'
  /** Id of the field, for a `Label`'s `htmlFor`. */
  id?: string
  /** Classes for the field. */
  className?: string
}

/** Keeps `from`'s time of day on a newly picked day. */
const keepTime = (day: Date, from: Date | null) =>
  set(day, { hours: from?.getHours() ?? 0, minutes: from?.getMinutes() ?? 0, seconds: 0, milliseconds: 0 })

/**
 * A date field that opens a scrolling calendar, with an optional time.
 *
 * Pressing the field turns it into its panel: the date as text, selected and
 * ready to type over, above a Calendar whose months scroll past with month
 * and year columns beside them. Typing reads the date in the locale's own
 * formats ("9.10.2026", "9 Oct 2026", "October 9, 2026") and scrolls the
 * calendar to it; picking a day commits it and closes the panel. `withTime`
 * adds the time beside the date and hour and minute columns (plus AM/PM on a
 * 12-hour clock), and keeps the panel open while you set both. On a phone the
 * panel is a bottom sheet, its columns turned into strips above the days.
 *
 * Localized through `locale`, a react-day-picker locale: month and weekday
 * names, the formats shown and read, the week's first day and the clock all
 * follow it, and `dir="rtl"` mirrors the panel.
 *
 * @example {@include ./examples.mdx}
 */
function DatePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  withTime = false,
  hourCycle,
  minuteStep = 1,
  locale = defaultLocale,
  placeholder,
  disabled,
  startMonth,
  endMonth,
  invalid,
  size,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dir,
  id,
  className,
}: DatePickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const dateInput = useRef<HTMLInputElement>(null)
  // `true` turns the field off; any other matcher picks out days.
  const off = typeof disabled === 'boolean' && disabled
  const days = off ? undefined : disabled

  const allowed = (date: Date) =>
    (!startMonth || date >= startMonth) &&
    (!endMonth || date <= endOfMonth(endMonth)) &&
    !(days && dateMatchModifiers(date, days))

  const readDate = (text: string) => {
    if (!text.trim()) {
      setValue(null)
      return true
    }
    const date = parseDateText(text, locale, value ?? undefined)
    if (!date || !allowed(date)) return false
    setValue(withTime ? keepTime(date, value) : date)
    return true
  }

  const readTime = (text: string) => {
    const time = parseTimeText(text, locale, value ?? new Date())
    if (!time) return false
    setValue(time)
    return true
  }

  const header = (
    <>
      <PickerInput
        ref={dateInput}
        aria-label={placeholder ?? 'Date'}
        placeholder={placeholder}
        formatted={value ? format(value, 'PP', { locale }) : ''}
        onText={readDate}
        onEnter={() => setOpen(false)}
        className="flex-1"
      />
      {withTime && (
        <PickerInput
          aria-label="Time"
          formatted={value ? format(value, 'p', { locale }) : ''}
          onText={readTime}
          onEnter={() => setOpen(false)}
          className="w-28 shrink-0"
        />
      )}
    </>
  )

  return (
    <PickerShell
      open={open}
      onOpenChange={setOpen}
      size={size}
      invalid={invalid}
      disabled={off}
      icon="calendar"
      display={value ? format(value, withTime ? 'PP, p' : 'PP', { locale }) : ''}
      placeholder={placeholder}
      header={header}
      initialFocus={dateInput}
      id={id}
      dir={dir}
      className={className}
    >
      <Calendar
        mode="single"
        locale={locale}
        selected={value ?? undefined}
        onSelect={day => {
          setValue(day ? (withTime ? keepTime(day, value) : day) : null)
          if (day && !withTime) setOpen(false)
        }}
        disabled={days}
        startMonth={startMonth}
        endMonth={endMonth}
        dir={dir}
        extraColumns={
          withTime
            ? orientation => (
                <TimeColumns
                  value={value && { hours: value.getHours(), minutes: value.getMinutes() }}
                  onValueChange={time => setValue(set(value ?? new Date(), { ...time, seconds: 0, milliseconds: 0 }))}
                  hourCycle={hourCycle ?? hourCycleOf(locale)}
                  minuteStep={minuteStep}
                  locale={locale}
                  orientation={orientation}
                />
              )
            : undefined
        }
      />
    </PickerShell>
  )
}

export type { DatePickerProps }
export { DatePicker }

export default DatePicker

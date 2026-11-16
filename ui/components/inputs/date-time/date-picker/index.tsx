/*
 * Local addition (not part of Fluid Functionalism): a date field over the
 * scrolling Calendar (react-day-picker). Props after shadcn's date picker
 * and utegsk/ui's DatePicker (`withTime`, `hourCycle`), kept in line with the
 * other pickers here. `editable` (a masked text field) and string values
 * after utegsk/ui's DatePicker as well.
 */

'use client'

import { format, type Locale, set } from 'date-fns'
import { type RefObject, useRef, useState } from 'react'
import type { Matcher } from 'react-day-picker'
import { defaultLocale, type HourCycle, hourCycleOf, parseDateText, parseTimeText } from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import Calendar from '../calendar'
import { type DateOf, type DateValueType, readDateValue, writeDateValue } from '../date-value'
import { isDayAllowed } from '../day-rules'
import { PickerInput, PickerShell } from '../picker-shell'
import { TimeColumns } from '../time-columns'
import { MaskedDateInput } from './masked-date-input'

/** Every word the picker shows or announces, for translating it. */
interface DatePickerLabels {
  /** Names the date field and the panel's date input. Defaults to the `placeholder`, else `"Date"`. */
  date?: string
  /** Names the panel's time input. Defaults to `"Time"`. */
  time?: string
  /** Names the icon button that opens the calendar of an `editable` field. Defaults to `"Open calendar"`. */
  calendar?: string
  /** Names the panel's close button. Defaults to `"Close"`. */
  close?: string
}

interface DatePickerProps<T extends DateValueType = 'date'> {
  /** The picked date (and time, with `withTime`); `null` when empty. A `Date`, or with `valueType="string"` an ISO string (`"2026-10-09"`, `"2026-10-09T15:33"`) read as local time; a string that reads as no date marks the field invalid. */
  value?: DateOf<T> | null
  /** Initial date, for an uncontrolled picker, in the same type as `value`. Defaults to `null`. */
  defaultValue?: DateOf<T> | null
  /** Called with the new date in the type `valueType` picks, or `null` when the field is cleared (or an `editable` field is left holding no real date). */
  onValueChange?: (value: DateOf<T> | null) => void
  /** What the value is: a `Date`, or a `"string"` in ISO form (`"yyyy-MM-dd"`, `"yyyy-MM-ddTHH:mm"` with `withTime`, as `name` submits it). Types `value`, `defaultValue` and `onValueChange` to match. Defaults to `'date'`. */
  valueType?: T
  /** The field is a text input to type the date into, in the locale's numeric order ("09.10.2026", "10/09/2026") with the rest of the mask muted after the caret; its calendar icon opens the panel. Defaults to `false`. */
  editable?: boolean
  /** Every word the picker shows or announces (`date`, `time`, `calendar`, `close`), for translating it. Defaults to English. */
  labels?: DatePickerLabels
  /** Adds hour and minute columns, and the time to the field. Defaults to `false`. */
  withTime?: boolean
  /** The clock for the time: on `'h12'` / `'h11'` the hours read with AM/PM. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`): names, formats, the week's first day and what typing reads. Defaults to `enUS`. */
  locale?: Locale
  /** Shown while empty. */
  placeholder?: string
  /** Disables the field. Defaults to `false`. */
  disabled?: boolean
  /** Days that can't be picked or typed: any react-day-picker matcher (a date, `{ before }`, `{ dayOfWeek }`, a function…). */
  disabledDays?: Matcher | Matcher[]
  /** The first month the calendar reaches. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month the calendar reaches. Defaults to 50 years ahead. */
  endMonth?: Date
  /** Where the calendar opens while no date is picked (a date of birth's decade, say). Defaults to the current month. */
  defaultMonth?: Date
  /** Framed at rest, or invisible until hovered or focused. Defaults to `"bordered"`. */
  variant?: FieldVariant
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
  /** Which side of the days the month and year columns stand on. Defaults to `'end'`. */
  columnsSide?: 'start' | 'end'
  /** Which side of the days the hour and minute columns stand on, outside the month and year columns when they share it. Defaults to `'end'`. */
  timeColumnsSide?: 'start' | 'end'
  /** Id of the field (an `editable` field's input), for a `Label`'s `htmlFor`. */
  id?: string
  /** Submits the value under this name in a form (`"yyyy-MM-dd"`, or `"yyyy-MM-ddTHH:mm"` with `withTime`). */
  name?: string
  /** Where the panel grows from (see Morph): the field, the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'` (the field). */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How the panel grows (see Morph), as Combobox's list does: with the liquid goo neck, a plain morph, a slide or a fade. `'morph'` with `hideSource` opens it in place over the field. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the field while open, so it reads as turning into the panel. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
  /** Classes for the field. */
  className?: string
}

/** Keeps `from`'s time of day on a newly picked day. */
const keepTime = (day: Date, from: Date | null) =>
  set(day, { hours: from?.getHours() ?? 0, minutes: from?.getMinutes() ?? 0, seconds: 0, milliseconds: 0 })

/**
 * A date field that opens a scrolling calendar, with an optional time.
 *
 * Pressing the field opens its panel the way Combobox opens its list (goo out
 * of the field; `effect="morph"` with `hideSource` turns the field into it in
 * place): the date as text, selected and ready to type over, above a Calendar
 * whose months scroll past with month and year columns beside them. Typing
 * reads the date in the locale's own formats ("9.10.2026", "9 Oct 2026",
 * "October 9, 2026") and scrolls the calendar to it; picking a day commits it
 * and closes the panel. `withTime` adds the time beside the date and hour and
 * minute columns (the hours read with AM/PM on a 12-hour clock), and keeps the
 * panel open while you set both. `columnsSide` and `timeColumnsSide` stand
 * either set of columns before or after the days. On a phone the panel is a
 * bottom sheet, its columns turned into strips above the days.
 *
 * `editable` makes the field itself a text input: type the digits and the
 * locale's separators fall into place ("09.10.2026" in German, "10/09/2026"
 * in English; a time is typed on a 24-hour clock), with the rest of the mask
 * muted after the caret, and the calendar icon opens the panel. A complete
 * date commits as you type it. One that can't exist, falls on a disabled day,
 * or is left half typed marks the field invalid and empties the value;
 * Escape brings back the last real date.
 *
 * The value is a `Date`, or with `valueType="string"` an ISO string
 * (`"2026-10-09"`, `"2026-10-09T15:33"` with `withTime`) in and out, typed to
 * match: the format `name` submits, read as local time.
 *
 * Localized through `locale`, a react-day-picker locale: month and weekday
 * names, the formats shown and read, the week's first day and the clock all
 * follow it, and `dir="rtl"` mirrors the panel. `labels` translates the
 * words it shows and announces.
 *
 * @example {@include ./examples.mdx}
 */
function DatePicker<T extends DateValueType = 'date'>({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  valueType,
  editable = false,
  labels,
  withTime = false,
  hourCycle,
  minuteStep = 1,
  locale = defaultLocale,
  disabledDays,
  startMonth,
  endMonth,
  defaultMonth,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dir,
  columnsSide,
  timeColumnsSide,
  id,
  invalid,
  ...shell
}: DatePickerProps<T>) {
  const [raw, setRaw] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const [typedInvalid, setTypedInvalid] = useState(false)
  const dateInput = useRef<HTMLInputElement>(null)
  const fieldInput = useRef<HTMLInputElement>(null)
  const read = readDateValue(raw)
  // A string that reads as no date: shown as empty, marked invalid.
  const unreadable = read !== null && Number.isNaN(read.getTime())
  const value = unreadable ? null : read
  const isInvalid = invalid || unreadable || typedInvalid || undefined
  const setValue = (date: Date | null) => setRaw(date && writeDateValue(date, (valueType ?? 'date') as T, withTime))
  const allowed = (date: Date) => isDayAllowed(date, { startMonth, endMonth, disabledDays })
  const dateLabel = labels?.date ?? shell.placeholder ?? 'Date'

  const readDate = (text: string) => {
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
        aria-label={dateLabel}
        placeholder={dateLabel}
        formatted={value ? format(value, 'PP', { locale }) : ''}
        onText={readDate}
        onClear={() => setValue(null)}
        onEnter={() => setOpen(false)}
        className="flex-1"
      />
      {withTime && (
        <PickerInput
          aria-label={labels?.time ?? 'Time'}
          formatted={value ? format(value, 'p', { locale }) : ''}
          onText={readTime}
          onClear={() => setValue(null)}
          onEnter={() => setOpen(false)}
          className="w-28 shrink-0"
        />
      )}
    </>
  )

  return (
    <PickerShell
      {...shell}
      id={editable ? undefined : id}
      invalid={isInvalid}
      open={open}
      onOpenChange={setOpen}
      icon="calendar"
      display={value ? format(value, withTime ? 'PP, p' : 'PP', { locale }) : ''}
      formValue={value ? writeDateValue(value, 'string', withTime) : undefined}
      header={header}
      initialFocus={dateInput}
      editor={
        editable && (
          <MaskedDateInput
            ref={fieldInput}
            id={id}
            aria-label={dateLabel}
            aria-invalid={isInvalid}
            placeholder={shell.placeholder}
            disabled={shell.disabled}
            value={value}
            onValueChange={setValue}
            onInvalidChange={setTypedInvalid}
            locale={locale}
            withTime={withTime}
            allowed={allowed}
          />
        )
      }
      editorRef={fieldInput}
      triggerLabel={labels?.calendar}
      closeLabel={labels?.close}
      dir={dir}
    >
      <Calendar
        mode="single"
        locale={locale}
        selected={value ?? undefined}
        onSelect={day => {
          setValue(day ? (withTime ? keepTime(day, value) : day) : null)
          if (day && !withTime) setOpen(false)
        }}
        disabled={disabledDays}
        startMonth={startMonth}
        endMonth={endMonth}
        defaultMonth={defaultMonth}
        dir={dir}
        columnsSide={columnsSide}
        extraColumnsSide={timeColumnsSide}
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

export type { DatePickerLabels, DatePickerProps }
export { DatePicker }

export default DatePicker

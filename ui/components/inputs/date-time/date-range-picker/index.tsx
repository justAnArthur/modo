/*
 * Local addition (not part of Fluid Functionalism): a date range field over
 * the scrolling Calendar (react-day-picker's range mode). Props after
 * shadcn's range picker and utegsk/ui's DateRangePicker, kept in line with
 * the other pickers here.
 */

'use client'

import { format, type Locale } from 'date-fns'
import { type RefObject, useRef, useState } from 'react'
import type { DateRange, Matcher } from 'react-day-picker'
import { defaultLocale, parseDateText } from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import Calendar from '../calendar'
import { isDayAllowed } from '../day-rules'
import { PickerInput, PickerShell } from '../picker-shell'

interface DateRangePickerProps {
  /** The picked range, react-day-picker's `{ from, to }`; `null` when empty. */
  value?: DateRange | null
  /** Initial range, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: DateRange | null
  /** Called with the new range: `{ from }` alone after the first click, `null` when cleared. */
  onValueChange?: (value: DateRange | null) => void
  /** A react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`). Defaults to `enUS`. */
  locale?: Locale
  /** Shown while empty. */
  placeholder?: string
  /** Disables the field. Defaults to `false`. */
  disabled?: boolean
  /** Days that can't be picked or typed: any react-day-picker matcher. */
  disabledDays?: Matcher | Matcher[]
  /** The first month the calendar reaches. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month the calendar reaches. Defaults to 50 years ahead. */
  endMonth?: Date
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
  /** Id of the field, for a `Label`'s `htmlFor`. */
  id?: string
  /** Submits the value under this name in a form (both ends as `"yyyy-MM-dd"`, start first). */
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

/**
 * A field for a span of days, picked with two clicks on a scrolling calendar.
 *
 * The first click starts the range and the days under the pointer preview it;
 * the second ends it (either way round) and closes the panel. The header
 * holds both ends as text, each read in the locale's formats as you type, and
 * the field shows the range the way the locale writes one ("9 – 15 Oct
 * 2026"). Everything else — the month and year columns, the bottom sheet on a
 * phone, the locale — works as in DatePicker.
 *
 * @example {@include ./examples.mdx}
 */
function DateRangePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  locale = defaultLocale,
  disabledDays,
  startMonth,
  endMonth,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dir,
  columnsSide,
  ...shell
}: DateRangePickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpenState] = useControllableState(openProp, defaultOpen, onOpenChange)
  // After the first click, the next one ends the range.
  const [picking, setPicking] = useState(false)
  const fromInput = useRef<HTMLInputElement>(null)
  const from = value?.from
  const to = value?.to

  const setOpen = (next: boolean) => {
    setPicking(false)
    setOpenState(next)
  }

  const pick = (day: Date) => {
    if (!picking || !from) {
      setValue({ from: day, to: undefined })
      setPicking(true)
      return
    }
    setValue(day < from ? { from: day, to: from } : { from, to: day })
    setOpen(false)
  }

  const readEnd = (end: 'from' | 'to') => (text: string) => {
    const date = parseDateText(text, locale, (end === 'from' ? from : to) ?? undefined)
    if (!date || !isDayAllowed(date, { startMonth, endMonth, disabledDays })) return false
    if (end === 'from') setValue({ from: date, to: to && to >= date ? to : undefined })
    else if (!from || date < from) return false
    else setValue({ from, to: date })
    return true
  }

  const display = from
    ? to
      ? new Intl.DateTimeFormat(locale.code, { dateStyle: 'medium' }).formatRange(from, to)
      : `${format(from, 'PP', { locale })} –`
    : ''

  const header = (
    <>
      <PickerInput
        ref={fromInput}
        aria-label="Start date"
        placeholder={shell.placeholder}
        formatted={from ? format(from, 'PP', { locale }) : ''}
        onText={readEnd('from')}
        onClear={() => setValue(null)}
        onEnter={() => setOpen(false)}
        className="min-w-0 flex-1"
      />
      <span aria-hidden className="px-0.5 text-muted-foreground">
        –
      </span>
      <PickerInput
        aria-label="End date"
        formatted={to ? format(to, 'PP', { locale }) : ''}
        onText={readEnd('to')}
        onClear={() => setValue(from ? { from, to: undefined } : null)}
        onEnter={() => setOpen(false)}
        className="min-w-0 flex-1"
      />
    </>
  )

  return (
    <PickerShell
      {...shell}
      open={open}
      onOpenChange={setOpen}
      icon="calendar"
      display={display}
      formValue={from && to ? [format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd')] : undefined}
      header={header}
      initialFocus={fromInput}
      dir={dir}
    >
      <Calendar
        mode="range"
        locale={locale}
        selected={value ?? undefined}
        // The range is ours to build (two clicks, then close); DayPicker's own
        // range logic would keep extending it.
        onSelect={(_, day) => pick(day)}
        disabled={disabledDays}
        startMonth={startMonth}
        endMonth={endMonth}
        dir={dir}
        columnsSide={columnsSide}
      />
    </PickerShell>
  )
}

export type { DateRangePickerProps }
export { DateRangePicker }

export default DateRangePicker

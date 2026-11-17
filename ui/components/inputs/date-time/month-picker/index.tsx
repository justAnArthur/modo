/*
 * Local addition (not part of Fluid Functionalism): a month field with
 * scrolling month and year columns. After utegsk/ui's MonthPicker, its value
 * the month's first day (as react-day-picker's `month` is) instead of
 * `{ month, year }`. `withYear`, `formatDate`, `labels`, the form props and
 * a BCP 47 `locale` after utegsk/ui's as well.
 */

'use client'

import { format, type Locale, startOfMonth } from 'date-fns'
import { type AriaAttributes, type FocusEvent, type ReactNode, type RefObject, useMemo, useRef } from 'react'
import {
  defaultLocale,
  fieldLabel,
  monthRange,
  parseMonthNameText,
  parseMonthText,
  resolveLocale,
} from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import { ScrollColumn } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import {
  ColumnsPanel,
  columnsPopupClass,
  type PickerControlAttributes,
  PickerInput,
  PickerShell,
} from '../picker-shell'

/** Every word the picker announces, for translating it. */
interface MonthPickerLabels {
  /** Names the panel's month input. Defaults to the `placeholder`, else `"Month"`. */
  field?: string
  /** Names the month column. Defaults to the locale's name for it. */
  month?: string
  /** Names the year column. Defaults to the locale's name for it. */
  year?: string
  /** Names the panel's close button. Defaults to `"Close"`. */
  close?: string
}

interface MonthPickerProps {
  /** The picked month as its first day; `null` when empty. */
  value?: Date | null
  /** Initial month, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: Date | null
  /** Called with the new month's first day, or `null` when the field is cleared. */
  onValueChange?: (value: Date | null) => void
  /** A react-day-picker / date-fns locale, or a BCP 47 tag (`"sk"`) read through Intl: month names and what typing reads. Defaults to `enUS`. */
  locale?: Locale | string
  /** Adds the year column, and the year to the field; `false` leaves a month of the current year (or of the value's). Defaults to `true`. */
  withYear?: boolean
  /** The field's text for a month, in place of the locale's ("October 2026"): `(date) => …`, given its first day. */
  formatDate?: (date: Date) => ReactNode
  /** Every word the picker announces (`field`, `month`, `year`, `close`), for translating it. Defaults to English and the locale's field names. */
  labels?: MonthPickerLabels
  /** Shown while empty. */
  placeholder?: string
  /** The first month that can be picked. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month that can be picked. Defaults to 50 years ahead. */
  endMonth?: Date
  /** Shows the value but never opens. Defaults to the surrounding Field's `readOnly`. */
  readOnly?: boolean
  /** A native form won't submit while the value is empty. Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** Names the field's button in place of its label. */
  'aria-label'?: string
  /** Ids of the elements naming the field's button, in place of its own label. */
  'aria-labelledby'?: string
  /** Ids of the elements describing the field's button (a hint, an error message). */
  'aria-describedby'?: string
  /** Marks the value invalid, as `invalid` does. */
  'aria-invalid'?: AriaAttributes['aria-invalid']
  /** Called when the field's button loses focus. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  /** Attributes for the field's button: a `ref`, `data-*`, `autoFocus`, `tabIndex`, handlers (they run before the picker's own). */
  controlProps?: PickerControlAttributes
  /** Disables the field. Defaults to `false`. */
  disabled?: boolean
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
  /** Id of the field, for a `Label`'s `htmlFor`. */
  id?: string
  /** Submits the value under this name in a form (`"yyyy-MM"`). */
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
 * A field for a month of a year: a billing period, a card's expiry.
 *
 * The panel has the month as text to type over ("October 2026", "10/2026"),
 * above a month column and a year column; the picked month and year carry a
 * dot. The value is the month's first day, the way react-day-picker names a
 * month.
 *
 * @example {@include ./examples.mdx}
 */
function MonthPicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  locale: localeProp = defaultLocale,
  withYear = true,
  formatDate,
  labels,
  startMonth,
  endMonth,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...shell
}: MonthPickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const locale = resolveLocale(localeProp)
  const today = useMemo(() => new Date(), [])
  const { start, end } = monthRange(today, startMonth, endMonth)
  const year = value?.getFullYear() ?? today.getFullYear()
  const formatted = value ? format(value, withYear ? 'LLLL y' : 'LLLL', { locale }) : ''

  // Clamped into the range, so a year change can't land outside it.
  const pick = (date: Date) => setValue(startOfMonth(date < start ? start : date > end ? end : date))

  const readMonth = (text: string) => {
    const read = withYear ? parseMonthText(text, locale) : parseMonthNameText(text, locale, new Date(year, 0, 1))
    if (!read || read < start || read > end) return false
    setValue(startOfMonth(read))
    return true
  }

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => ({
        value: m,
        label: format(new Date(2000, m, 1), 'LLLL', { locale }),
        disabled: new Date(year, m, 1) < start || new Date(year, m, 1) > end,
      })),
    [locale, year, start.getTime(), end.getTime()],
  )
  const years = useMemo(
    () =>
      Array.from({ length: end.getFullYear() - start.getFullYear() + 1 }, (_, i) => ({
        value: start.getFullYear() + i,
        label: String(start.getFullYear() + i),
      })),
    [start.getFullYear(), end.getFullYear()],
  )

  return (
    <PickerShell
      {...shell}
      open={open}
      onOpenChange={setOpen}
      icon="calendar"
      display={value && formatDate ? formatDate(value) : formatted}
      closeLabel={labels?.close}
      formValue={value ? format(value, 'yyyy-MM') : undefined}
      header={
        <PickerInput
          ref={input}
          aria-label={labels?.field ?? shell.placeholder ?? 'Month'}
          placeholder={shell.placeholder}
          formatted={formatted}
          onText={readMonth}
          onClear={() => setValue(null)}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
      }
      initialFocus={input}
      popupClassName={columnsPopupClass}
    >
      <ColumnsPanel>
        <ScrollColumn
          label={labels?.month ?? fieldLabel(locale, 'month')}
          options={months}
          value={value?.getMonth() ?? null}
          follow={value?.getMonth() ?? today.getMonth()}
          onValueChange={m => pick(new Date(year, m, 1))}
          className="min-w-0 flex-1"
        />
        {withYear && (
          <ScrollColumn
            label={labels?.year ?? fieldLabel(locale, 'year')}
            options={years}
            value={value?.getFullYear() ?? null}
            follow={year}
            onValueChange={y => pick(new Date(y, value?.getMonth() ?? today.getMonth(), 1))}
            className="min-w-0 flex-1"
          />
        )}
      </ColumnsPanel>
    </PickerShell>
  )
}

export type { MonthPickerLabels, MonthPickerProps }
export { MonthPicker }

export default MonthPicker

/*
 * Local addition (not part of Fluid Functionalism): a month field with
 * scrolling month and year columns. After utegsk/ui's MonthPicker, its value
 * the month's first day (as react-day-picker's `month` is) instead of
 * `{ month, year }`.
 */

import { addYears, endOfYear, format, type Locale, startOfMonth, startOfYear } from 'date-fns'
import { forwardRef, type ReactNode, type RefObject, useMemo, useRef } from 'react'
import {
  defaultLocale,
  fieldLabel,
  parseMonthNameText,
  parseMonthText,
  resolveLocale,
} from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import { dividedColumns, ScrollColumn } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import { controlAttributes, invalidOf, type PickerControlProps, PickerInput, PickerShell } from '../picker-shell'

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

interface MonthPickerProps extends PickerControlProps {
  /** The picked month as its first day; `null` when empty. */
  value?: Date | null
  /** Initial month, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: Date | null
  /** Called with the new month's first day, or `null` when the field is cleared. */
  onValueChange?: (value: Date | null) => void
  /** A react-day-picker / date-fns locale, or a BCP 47 tag (`"sk"`) read through Intl: month names and what typing reads. Defaults to `enUS`. */
  locale?: Locale | string
  /** Adds the year column, and the year to the field. `false` leaves a month of the current year (or of the value's). Defaults to `true`. */
  withYear?: boolean
  /** The field's text for a month, in place of the locale's ("October 2026"): `(date) => …`, given its first day. */
  formatDate?: (date: Date) => ReactNode
  /** Every word the picker announces (`field`, `month`, `year`, `close`), for translating it. Defaults to English and the locale's field names. */
  labels?: MonthPickerLabels
  /** Shows the month but never opens. Defaults to `false`. */
  readOnly?: boolean
  /** Names the value for a native form: a hidden input carries it as `"yyyy-MM"` (an `<input type="month">`'s value). */
  name?: string
  /** Shown while empty. */
  placeholder?: string
  /** The first month that can be picked. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month that can be picked. Defaults to 50 years ahead. */
  endMonth?: Date
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
 * month. `withYear={false}` leaves the month column alone, for a month of
 * no particular year (the value keeps the current year).
 *
 * `formatDate` writes the field's text and `labels` every word it
 * announces; `locale` also takes a BCP 47 tag. `readOnly` shows the month
 * and never opens. In a form, `name` submits the value as `"yyyy-MM"` and
 * `required` stops an empty submit; `id`, the `aria-*` props, `onBlur`,
 * `controlProps` and the `ref` reach the field's button.
 *
 * @example {@include ./examples.mdx}
 */
const MonthPicker = forwardRef<HTMLButtonElement, MonthPickerProps>(function MonthPicker(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    locale: localeProp = defaultLocale,
    withYear = true,
    formatDate,
    labels,
    readOnly = false,
    name,
    placeholder,
    startMonth,
    endMonth,
    disabled,
    variant,
    invalid,
    size,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    id,
    from,
    effect,
    hideSource,
    tier,
    className,
    ...control
  },
  ref,
) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const locale = resolveLocale(localeProp)
  const today = useMemo(() => new Date(), [])
  const start = startOfMonth(startMonth ?? startOfYear(addYears(today, -100)))
  const end = startOfMonth(endMonth ?? endOfYear(addYears(today, 50)))
  const year = value?.getFullYear() ?? today.getFullYear()
  const formatted = value ? format(value, withYear ? 'LLLL y' : 'LLLL', { locale }) : ''

  // Clamped into the range, so a year change can't land outside it.
  const pick = (date: Date) => setValue(startOfMonth(date < start ? start : date > end ? end : date))

  const readMonth = (text: string) => {
    if (!text.trim()) {
      setValue(null)
      return true
    }
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
      open={open}
      onOpenChange={setOpen}
      size={size}
      variant={variant}
      invalid={invalidOf(invalid, control['aria-invalid'])}
      disabled={disabled}
      readOnly={readOnly}
      icon="calendar"
      display={value && formatDate ? formatDate(value) : formatted}
      placeholder={placeholder}
      closeLabel={labels?.close}
      controlRef={ref}
      controlProps={controlAttributes(control)}
      formValues={[{ slot: 'value', name, value: value ? format(value, 'yyyy-MM') : '' }]}
      required={control.required}
      header={
        <PickerInput
          ref={input}
          aria-label={labels?.field || placeholder || 'Month'}
          placeholder={placeholder}
          formatted={formatted}
          onText={readMonth}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
      }
      initialFocus={input}
      popupClassName="w-[max(var(--anchor-width,0px),14rem)]"
      id={id}
      from={from}
      effect={effect}
      hideSource={hideSource}
      tier={tier}
      className={className}
    >
      <div className={cn(dividedColumns, 'h-56')}>
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
      </div>
    </PickerShell>
  )
})

export type { MonthPickerLabels, MonthPickerProps }
export { MonthPicker }

export default MonthPicker

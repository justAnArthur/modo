/*
 * Local addition (not part of Fluid Functionalism): a month field with
 * scrolling month and year columns. After utegsk/ui's MonthPicker, its value
 * the month's first day (as react-day-picker's `month` is) instead of
 * `{ month, year }`.
 */

import { addYears, endOfYear, format, type Locale, startOfMonth, startOfYear } from 'date-fns'
import { type RefObject, useMemo, useRef } from 'react'
import { defaultLocale, fieldLabel, parseMonthText } from '../../../../lib/date-locale'
import { dividedColumns, ScrollColumn } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import { PickerInput, PickerShell } from '../picker-shell'

interface MonthPickerProps {
  /** The picked month as its first day; `null` when empty. */
  value?: Date | null
  /** Initial month, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: Date | null
  /** Called with the new month's first day, or `null` when the field is cleared. */
  onValueChange?: (value: Date | null) => void
  /** A react-day-picker / date-fns locale: month names and what typing reads. Defaults to `enUS`. */
  locale?: Locale
  /** Shown while empty. */
  placeholder?: string
  /** The first month that can be picked. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month that can be picked. Defaults to 50 years ahead. */
  endMonth?: Date
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
  locale = defaultLocale,
  placeholder,
  startMonth,
  endMonth,
  disabled,
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
}: MonthPickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const today = useMemo(() => new Date(), [])
  const start = startOfMonth(startMonth ?? startOfYear(addYears(today, -100)))
  const end = startOfMonth(endMonth ?? endOfYear(addYears(today, 50)))
  const year = value?.getFullYear() ?? today.getFullYear()
  const formatted = value ? format(value, 'LLLL y', { locale }) : ''

  // Clamped into the range, so a year change can't land outside it.
  const pick = (date: Date) => setValue(startOfMonth(date < start ? start : date > end ? end : date))

  const readMonth = (text: string) => {
    if (!text.trim()) {
      setValue(null)
      return true
    }
    const read = parseMonthText(text, locale)
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
      invalid={invalid}
      disabled={disabled}
      icon="calendar"
      display={formatted}
      placeholder={placeholder}
      header={
        <PickerInput
          ref={input}
          aria-label={placeholder ?? 'Month'}
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
          label={fieldLabel(locale, 'month')}
          options={months}
          value={value?.getMonth() ?? null}
          follow={value?.getMonth() ?? today.getMonth()}
          onValueChange={m => pick(new Date(year, m, 1))}
          className="min-w-0 flex-1"
        />
        <ScrollColumn
          label={fieldLabel(locale, 'year')}
          options={years}
          value={value?.getFullYear() ?? null}
          follow={year}
          onValueChange={y => pick(new Date(y, value?.getMonth() ?? today.getMonth(), 1))}
          className="min-w-0 flex-1"
        />
      </div>
    </PickerShell>
  )
}

export type { MonthPickerProps }
export { MonthPicker }

export default MonthPicker

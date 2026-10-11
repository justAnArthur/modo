/*
 * Local addition (not part of Fluid Functionalism): a date field over the
 * scrolling Calendar (react-day-picker). Props after shadcn's date picker
 * and utegsk/ui's DatePicker (`withTime`, `hourCycle`), kept in line with the
 * other pickers here.
 *
 * `editable` (after utegsk/ui's): the field is a numeric text input over the
 * locale's date mask (`masked-date-input.tsx`), and its calendar icon is the
 * button that opens the panel. `value` also takes a string; one that reads as
 * no date, like an Invalid Date, shows the invalid state and its caption.
 * Every label is a prop (`labels`), the field's text a `formatDate`, and an
 * optional row under the calendar (`actions`) picks today or clears.
 * `hidden` days, `required` / `unselectable`, the form props and a string
 * `locale` follow utegsk/ui's 0.14 DatePicker.
 */

import { endOfMonth, format, isValid, type Locale, parseISO, set, startOfDay } from 'date-fns'
import {
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type Ref,
  type RefAttributes,
  type RefObject,
  useRef,
  useState,
} from 'react'
import { dateMatchModifiers, type Matcher } from 'react-day-picker'
import {
  defaultLocale,
  formatTime,
  type HourCycle,
  hourCycleOf,
  parseDateText,
  parseTimeText,
  resolveLocale,
} from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import { type SizeVariant, useSize } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import Button from '../../../button'
import Calendar from '../calendar'
import { controlAttributes, invalidOf, type PickerControlProps, PickerInput, PickerShell } from '../picker-shell'
import { TimeColumns } from '../time-columns'
import { MaskedDateInput } from './masked-date-input'

/** Every word the picker shows or announces, for translating it. */
interface DatePickerLabels {
  /** Names the date field (and the panel's date input). Defaults to the `placeholder`, else `"Date"`. */
  date?: string
  /** Names the panel's time input. Defaults to `"Time"`. */
  time?: string
  /** Names the calendar button of an `editable` field. Defaults to `"Open calendar"`. */
  calendar?: string
  /** Names the panel's close button. Defaults to `"Close"`. */
  close?: string
  /** Names the month column. Defaults to the locale's name for it. */
  month?: string
  /** Names the year column. Defaults to the locale's name for it. */
  year?: string
  /** Names the hour column (`withTime`). Defaults to the locale's name for it. */
  hour?: string
  /** Names the minute column (`withTime`). Defaults to the locale's name for it. */
  minute?: string
  /** The `actions` row's button that picks today. Defaults to `"Today"`. */
  today?: string
  /** The `actions` row's button that empties the field. Defaults to `"Clear"`. */
  clear?: string
  /** Caption under a field holding no real date, rendered as the field's next sibling; `null` keeps only the destructive ring. Defaults to `"Invalid date"`. */
  invalid?: ReactNode
}

interface DatePickerProps extends PickerControlProps {
  /** The picked date (and time, with `withTime`); `null` when empty. A string is read as a date: a bare `"2026-10-09"` as that day at local midnight, a full timestamp as written; one that reads as none shows the invalid state. */
  value?: Date | string | null
  /** Initial date, for an uncontrolled picker; a string reads as `value`'s does. Defaults to `null`. */
  defaultValue?: Date | string | null
  /** Called with the new date, or `null` when the field is cleared. An `editable` field left with an incomplete or impossible date reports an Invalid Date (`isNaN(date.getTime())`), so a form can reject it. */
  onValueChange?: (value: Date | null) => void
  /** The field is a text input to type the date into, in the locale's numeric order ("09.10.2026", "10/09/2026"); its calendar icon opens the panel. Defaults to `false`. */
  editable?: boolean
  /** The field's text for a date, in place of the locale's medium format: `(date) => …`. */
  formatDate?: (date: Date) => ReactNode
  /** Every word the picker shows or announces (`date`, `time`, `calendar`, `close`, `month`, `year`, `hour`, `minute`, `today`, `clear`, `invalid`), for translating it. Defaults to English and the locale's field names. */
  labels?: DatePickerLabels
  /** Adds a row under the calendar with Today and Clear. Defaults to `false`. */
  actions?: boolean
  /** Shows the value but never opens or takes typing. Defaults to `false`. */
  readOnly?: boolean
  /** Adds hour and minute columns, and the time to the field. Defaults to `false`. */
  withTime?: boolean
  /** The clock for the time: on `'h12'` / `'h11'` the hours read with AM/PM. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`), or a BCP 47 tag (`"sk"`) read through Intl: names, formats, the week's first day and what typing reads (a tag reads numeric dates and English names). Defaults to `enUS`. */
  locale?: Locale | string
  /** Shown while empty. */
  placeholder?: string
  /** `true` disables the field; any other react-day-picker matcher (a date, `{ before }`, `{ dayOfWeek }`, a function…) disables the days it matches. */
  disabled?: Matcher | Matcher[]
  /** Days to leave out of the calendar, as react-day-picker matchers: they show as gaps and can't be typed either. */
  hidden?: Matcher | Matcher[]
  /** Marks the value required: a native form won't submit while it is empty, an editable field's input carries `required`, and pressing the picked day again keeps it. Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** A picked date can't be cleared: pressing its day again, emptying the text or Clear (hidden) all keep it. Defaults to `false`. */
  unselectable?: boolean
  /** Names the value for a native form: a hidden input carries it as `"yyyy-MM-dd"` (with `withTime`, `"yyyy-MM-ddTHH:mm"`), an `<input type="date">`'s value; empty while there is no real date. */
  name?: string
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
  /** Which side of the days the hour and minute columns stand on, outside the month and year columns when they share it. Defaults to `'end'`. */
  timeColumnsSide?: 'start' | 'end'
  /** Id of the field's control (its button, or an `editable` field's input), for a `Label`'s `htmlFor`. */
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
 * A value as a date: `null` when empty, an Invalid Date when it reads as
 * none. A bare `yyyy-MM-dd` is that day at local midnight (`new Date` would
 * read it as UTC midnight: the day before, west of UTC).
 */
function toDate(value: Date | string | null) {
  if (value === null || value === '') return null
  if (value instanceof Date) return value
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date(value)
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
 * `editable` turns the field into a text input: type the digits and the
 * locale's separators fall into place ("09.10.2026" in German,
 * "10/09/2026" in English), with the rest of the mask muted after the caret;
 * the calendar icon opens the panel. A date that can't exist, or one left
 * half typed, turns the field destructive with a caption under it, and so
 * does a `value` that reads as no date. `actions` adds Today and Clear under
 * the calendar.
 *
 * Localized through `locale`, a react-day-picker locale: month and weekday
 * names, the formats shown and read, the week's first day and the clock all
 * follow it, and `dir="rtl"` mirrors the panel. Every word it shows or
 * announces comes from `labels`, and `formatDate` writes the field's text.
 *
 * `hidden` days leave gaps in the calendar and can't be typed. `required`
 * keeps the picked day when it is pressed again and stops an empty native
 * form submit; `unselectable` keeps a picked date from being cleared at all.
 * `name` submits the value through a hidden input (`"yyyy-MM-dd"`, or
 * `"yyyy-MM-ddTHH:mm"` with time), and `id`, the `aria-*` props, `onBlur`,
 * `controlProps` and the `ref` reach the field's control: the button that
 * opens the panel, or an `editable` field's input. `locale` also takes a
 * BCP 47 tag ("sk"), read through Intl.
 *
 * The invalid caption renders as the field's next sibling rather than inside
 * a wrapper, so the field keeps its place in a flex row or grid exactly as
 * before and an input being typed into never remounts when the caption comes
 * and goes. Lay the picker in a column (or wrap it) where the caption should
 * sit under the field.
 *
 * @example {@include ./examples.mdx}
 */
const DatePicker: ForwardRefExoticComponent<DatePickerProps & RefAttributes<HTMLButtonElement | HTMLInputElement>> =
  forwardRef<HTMLButtonElement | HTMLInputElement, DatePickerProps>(function DatePicker(
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      editable = false,
      formatDate,
      labels,
      actions = false,
      readOnly = false,
      withTime = false,
      hourCycle,
      minuteStep = 1,
      locale: localeProp = defaultLocale,
      placeholder,
      disabled,
      hidden,
      required,
      unselectable = false,
      name,
      startMonth,
      endMonth,
      variant,
      invalid,
      size,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      dir,
      columnsSide,
      timeColumnsSide,
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
    const [raw, setRaw] = useControllableState<Date | string | null>(
      valueProp,
      defaultValue,
      onValueChange as ((value: Date | string | null) => void) | undefined,
    )
    const locale = resolveLocale(localeProp)
    const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
    const [typedInvalid, setTypedInvalid] = useState(false)
    const sizeClasses = useSize(size)
    const dateInput = useRef<HTMLInputElement>(null)
    const date = toDate(raw)
    const unreadable = date !== null && !isValid(date)
    // The picked date, when there is a real one.
    const value = unreadable ? null : date
    // `unselectable`: a real date is never cleared.
    const setValue = (next: Date | null) => {
      if (next === null && unselectable && value) return
      setRaw(next)
    }
    const showInvalid = unreadable || typedInvalid
    const dateLabel = labels?.date || placeholder || 'Date'
    const invalidCaption = labels?.invalid === undefined ? 'Invalid date' : labels.invalid
    // `true` turns the field off; any other matcher picks out days.
    const off = typeof disabled === 'boolean' && disabled
    const days = off ? undefined : disabled

    const allowed = (date: Date) =>
      (!startMonth || date >= startMonth) &&
      (!endMonth || date <= endOfMonth(endMonth)) &&
      !(days && dateMatchModifiers(date, days)) &&
      !(hidden && dateMatchModifiers(date, hidden))

    const readDate = (text: string) => {
      if (!text.trim()) {
        if (unselectable && value) return false
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
          aria-label={dateLabel}
          placeholder={placeholder}
          formatted={value ? format(value, 'PP', { locale }) : ''}
          onText={readDate}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
        {withTime && (
          <PickerInput
            aria-label={labels?.time ?? 'Time'}
            formatted={value ? formatTime(value, locale, hourCycle) : ''}
            onText={readTime}
            onEnter={() => setOpen(false)}
            className="w-28 shrink-0"
          />
        )}
      </>
    )

    const isInvalid = invalidOf(invalid, control['aria-invalid'])
    const attributes = controlAttributes(control)

    const editor = editable ? (
      <MaskedDateInput
        ref={ref as Ref<HTMLInputElement>}
        {...attributes}
        id={id}
        aria-label={control['aria-label'] ?? (control['aria-labelledby'] ? undefined : dateLabel)}
        aria-invalid={isInvalid || showInvalid || undefined}
        required={required}
        value={value}
        externallyInvalid={unreadable}
        onValueChange={setValue}
        onInvalidChange={setTypedInvalid}
        locale={locale}
        withTime={withTime}
        allowed={allowed}
        disabled={off}
        readOnly={readOnly}
        clearable={!unselectable}
      />
    ) : undefined

    const shell = (
      <PickerShell
        open={open}
        onOpenChange={setOpen}
        size={size}
        variant={variant}
        invalid={isInvalid || showInvalid}
        disabled={off}
        readOnly={readOnly}
        icon="calendar"
        display={
          value
            ? (formatDate?.(value) ??
              (withTime
                ? `${format(value, 'PP', { locale })}, ${formatTime(value, locale, hourCycle)}`
                : format(value, 'PP', { locale })))
            : ''
        }
        controlRef={ref as Ref<HTMLButtonElement>}
        controlProps={editable ? undefined : attributes}
        formValues={[
          { slot: 'value', name, value: value ? format(value, withTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd') : '' },
        ]}
        required={required}
        placeholder={placeholder}
        header={header}
        initialFocus={dateInput}
        editor={editor}
        triggerLabel={labels?.calendar ?? 'Open calendar'}
        closeLabel={labels?.close}
        id={id}
        dir={dir}
        from={from}
        effect={effect}
        hideSource={hideSource}
        tier={tier}
        className={className}
      >
        <Calendar
          mode="single"
          locale={locale}
          selected={value ?? undefined}
          onSelect={day => {
            // Pressing the picked day again clears it, unless the date must stay.
            if (!day && (required || unselectable) && value) {
              if (!withTime) setOpen(false)
              return
            }
            setValue(day ? (withTime ? keepTime(day, value) : day) : null)
            if (day && !withTime) setOpen(false)
          }}
          disabled={days}
          hidden={hidden}
          columnLabels={labels}
          startMonth={startMonth}
          endMonth={endMonth}
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
                    labels={labels}
                  />
                )
              : undefined
          }
        />
        {actions && (
          <div className="flex items-center justify-between gap-1 border-t border-border pt-1">
            <Button
              variant="ghost"
              size={sizeClasses.variant === 'compact' ? 'xs' : 'compact'}
              disabled={!allowed(startOfDay(new Date()))}
              onClick={() => {
                const today = startOfDay(new Date())
                setValue(withTime ? keepTime(today, value) : today)
                if (!withTime) setOpen(false)
              }}
            >
              {labels?.today ?? 'Today'}
            </Button>
            {!unselectable && (
              <Button
                variant="ghost"
                size={sizeClasses.variant === 'compact' ? 'xs' : 'compact'}
                disabled={raw === null}
                onClick={() => {
                  setValue(null)
                  setTypedInvalid(false)
                }}
              >
                {labels?.clear ?? 'Clear'}
              </Button>
            )}
          </div>
        )}
      </PickerShell>
    )

    // The caption is a sibling, so the field (and a focused input in it) never remounts as it comes and goes.
    return (
      <>
        {shell}
        {showInvalid && invalidCaption !== null && (
          <p
            role="alert"
            className={cn(
              'mt-1 weight-medium text-destructive',
              sizeClasses.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
            )}
          >
            {invalidCaption}
          </p>
        )}
      </>
    )
  })

export type { DatePickerLabels, DatePickerProps }
export { DatePicker }

export default DatePicker

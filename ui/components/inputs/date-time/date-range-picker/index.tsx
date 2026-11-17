/*
 * Local addition (not part of Fluid Functionalism): a date range field over
 * the scrolling Calendar (react-day-picker's range mode). Props after
 * shadcn's range picker and utegsk/ui's DateRangePicker (`editable`,
 * `withTime`, `hourCycle`, `hidden`, `formatDate`, per-end names and input
 * props, the form props and a BCP 47 `locale`), kept in line with the other
 * pickers here.
 */

'use client'

import { format, type Locale, set } from 'date-fns'
import {
  type AriaAttributes,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  useRef,
  useState,
} from 'react'
import type { Matcher } from 'react-day-picker'
import {
  defaultLocale,
  formatTime,
  type HourCycle,
  hourCycleOf,
  parseDateText,
  parseDateTimeText,
  resolveLocale,
} from '../../../../lib/date-locale'
import { FieldStateContext } from '../../../../lib/field-box'
import type { FieldVariant } from '../../../../lib/field-classes'
import { useMergeRefs } from '../../../../lib/merge-refs'
import { type SizeVariant, useSize } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import Calendar from '../calendar'
import { MaskedDateInput } from '../date-picker/masked-date-input'
import { type DateRangeOf, type DateValueType, readDateValue, writeDateValue } from '../date-value'
import { isDayAllowed } from '../day-rules'
import { controlAttributes, invalidOf, type PickerControlAttributes, PickerInput, PickerShell } from '../picker-shell'
import { type Time, TimeColumns } from '../time-columns'

/** Every word the picker shows or announces, for translating it. */
interface DateRangePickerLabels {
  /** Names the range's start: the panel's start input, and an `editable` field's. Defaults to `"Start date"`. */
  start?: string
  /** Names the range's end: the panel's end input, and an `editable` field's. Defaults to `"End date"`. */
  end?: string
  /** Names the icon button that opens the calendar of an `editable` field. Defaults to `"Open calendar"`. */
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
  /** Caption under a field holding an end that is no real date (typed, or a `value` that reads as none), rendered as the field's next sibling; `null` keeps only the destructive ring. Defaults to `"Invalid date"`. */
  invalid?: ReactNode
}

/** Attributes for one end's input of an `editable` range, its `ref` included. */
type DateRangeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> & {
  ref?: Ref<HTMLInputElement>
  [data: `data-${string}`]: string | number | boolean | undefined
}

interface DateRangePickerProps<T extends DateValueType = 'date'> {
  /** The picked range, react-day-picker's `{ from, to }`; `null` when empty. Its ends are `Date`s, or with `valueType="string"` ISO strings (`"2026-10-09"`, `"2026-10-09T15:33"` with `withTime`) read as local time. */
  value?: DateRangeOf<T> | null
  /** Initial range, for an uncontrolled picker, in the same type as `value`. Defaults to `null`. */
  defaultValue?: DateRangeOf<T> | null
  /** Called with the new range in the type `valueType` picks: `{ from }` alone after the first click, `null` when cleared. */
  onValueChange?: (value: DateRangeOf<T> | null) => void
  /** What the range's ends are: `Date`s, or `"string"`s in ISO form (`"yyyy-MM-dd"`, `"yyyy-MM-ddTHH:mm"` with `withTime`, as `name` submits them). Types `value`, `defaultValue` and `onValueChange` to match. Defaults to `'date'`. */
  valueType?: T
  /** The field is two text inputs to type the ends into, in the locale's numeric order ("09.10.2026 – 15.10.2026"), as DatePicker's `editable`; its calendar icon opens the panel. Defaults to `false`. */
  editable?: boolean
  /** Adds hour and minute columns, and the times to the field. The columns set the end being picked (the start after the first click, the end after the second), or whichever end's input has focus; a new start takes 00:00 and a new end 23:59. Defaults to `false`. */
  withTime?: boolean
  /** The clock for the times: on `'h12'` / `'h11'` the hours read with AM/PM. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** The field's text for each end, in place of the locale's range format: `(date) => …`. */
  formatDate?: (date: Date) => ReactNode
  /** Every word the picker shows or announces (`start`, `end`, `calendar`, `close`, `month`, `year`, `hour`, `minute`, `invalid`), for translating it. Defaults to English and the locale's field names. */
  labels?: DateRangePickerLabels
  /** A react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`), or a BCP 47 tag (`"sk"`) read through Intl. Defaults to `enUS`. */
  locale?: Locale | string
  /** Shown while empty. */
  placeholder?: string
  /** Disables the field. Defaults to `false`. */
  disabled?: boolean
  /** Days that can't be picked or typed: any react-day-picker matcher. */
  disabledDays?: Matcher | Matcher[]
  /** Days left out of the calendar, as react-day-picker matchers: they show as gaps and can't be typed either. */
  hidden?: Matcher | Matcher[]
  /** Shows the range but never opens or takes typing. Defaults to the surrounding Field's `readOnly`. */
  readOnly?: boolean
  /** A native form won't submit until both ends are set (an `editable` field's inputs carry `required`). Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** The first month the calendar reaches. Defaults to 100 years back. */
  startMonth?: Date
  /** The last month the calendar reaches. Defaults to 50 years ahead. */
  endMonth?: Date
  /** Where the calendar opens while no range is picked (a date of birth's decade, say). Defaults to the current month. */
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
  /** Id of the field's control (its button, or an `editable` field's start input), for a `Label`'s `htmlFor`. */
  id?: string
  /** Submits both ends under this name in a form, start first, once both are set (`"yyyy-MM-dd"`, or `"yyyy-MM-ddTHH:mm"` with `withTime`). */
  name?: string
  /** Names the start's hidden input on its own, in place of `name`. */
  startName?: string
  /** Names the end's hidden input on its own, in place of `name`. */
  endName?: string
  /** Attributes for an `editable` field's start input (`ref`, `id`, `aria-*`, handlers…), over the picker's own. */
  startInputProps?: DateRangeInputProps
  /** Attributes for an `editable` field's end input, over the picker's own. */
  endInputProps?: DateRangeInputProps
  /** Names the field's control (its button, or both inputs of an `editable` field) in place of its label. */
  'aria-label'?: string
  /** Ids of the elements naming the field's control, in place of its own label. */
  'aria-labelledby'?: string
  /** Ids of the elements describing the field's control (a hint, an error message). */
  'aria-describedby'?: string
  /** Marks the value invalid, as `invalid` does. */
  'aria-invalid'?: AriaAttributes['aria-invalid']
  /** Called when the field's control (its button, or either input of an `editable` field) loses focus. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  /** Attributes for the field's control: its button, or both inputs of an `editable` field (the `ref` its start's). */
  controlProps?: PickerControlAttributes
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

type End = 'from' | 'to'

/** `day` at `time`'s hours and minutes. */
const atTime = (day: Date, { hours, minutes }: Time) => set(day, { hours, minutes, seconds: 0, milliseconds: 0 })

const timeOf = (date: Date | undefined, fallback: Time): Time =>
  date ? { hours: date.getHours(), minutes: date.getMinutes() } : fallback

const START_TIME: Time = { hours: 0, minutes: 0 }
const END_TIME: Time = { hours: 23, minutes: 59 }

// Lights the header input of the end the time columns set.
const ACTIVE_END = { active: true, invalid: false, disabled: false, readOnly: false, required: false }

/**
 * A field for a span of days, picked with two clicks on a scrolling calendar.
 *
 * The first click starts the range and the days under the pointer preview it;
 * the second ends it (either way round) and closes the panel. The header
 * holds both ends as text, each read in the locale's formats as you type, and
 * the field shows the range the way the locale writes one ("9 – 15 Oct
 * 2026"). Everything else — the month and year columns, the bottom sheet on a
 * phone, the locale — works as in DatePicker, and so does `valueType`:
 * `"string"` takes and reports both ends as ISO strings (`"2026-10-09"`).
 *
 * `editable` turns the field into two masked inputs, one per end, typed as
 * DatePicker's are; the calendar icon opens the panel, and an end that can't
 * be a date marks the field with a caption under it. `withTime` adds the
 * times: hour and minute columns beside the days set the end being picked
 * (the start after the first click, the end after the second) or whichever
 * end's header input has focus, lit in the header, and the panel stays open
 * until closed. `formatDate` writes each end in the field and `labels` every
 * word; `hidden` days leave gaps, and `readOnly` shows the range without
 * opening.
 *
 * In a form, `name` submits both ends through hidden inputs (or `startName` /
 * `endName` one each), and `required` stops a submit until both are set.
 * `id`, the `aria-*` props, `onBlur` and `controlProps` reach the field's
 * control: its button, or both inputs of an `editable` field (`id` and the
 * `ref` its start's), where `startInputProps` and `endInputProps` add to
 * each.
 *
 * @example {@include ./examples.mdx}
 */
function DateRangePicker<T extends DateValueType = 'date'>({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  valueType,
  editable = false,
  withTime = false,
  hourCycle,
  minuteStep = 1,
  formatDate,
  labels,
  locale: localeProp = defaultLocale,
  disabledDays,
  hidden,
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
  startName,
  endName,
  startInputProps,
  endInputProps,
  ...shell
}: DateRangePickerProps<T>) {
  const [raw, setRaw] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpenState] = useControllableState(openProp, defaultOpen, onOpenChange)
  // After the first click, the next one ends the range.
  const [picking, setPicking] = useState(false)
  // The end the time columns set.
  const [activeEnd, setActiveEnd] = useState<End>('from')
  const [typedInvalid, setTypedInvalid] = useState<Record<End, boolean>>({ from: false, to: false })
  const locale = resolveLocale(localeProp)
  const sizeClasses = useSize(shell.size)
  const fromInput = useRef<HTMLInputElement>(null)
  const fromField = useRef<HTMLInputElement>(null)
  const { ref: controlRef, ...attributes } = controlAttributes(shell)
  const startRef = useMergeRefs<HTMLElement>(fromField, controlRef, startInputProps?.ref)
  const ends = [readDateValue(raw?.from), readDateValue(raw?.to)]
  // An end that reads as no date: shown as empty, marked invalid.
  const unreadable = ends.some(end => end !== null && Number.isNaN(end.getTime()))
  const [from, to] = unreadable ? [undefined, undefined] : ends.map(end => end ?? undefined)
  const value = from ? { from, to } : null
  const showInvalid = unreadable || typedInvalid.from || typedInvalid.to
  const isInvalid = invalidOf(invalid, shell['aria-invalid']) || showInvalid || undefined
  const invalidCaption = labels?.invalid === undefined ? 'Invalid date' : labels.invalid
  const startLabel = labels?.start ?? 'Start date'
  const endLabel = labels?.end ?? 'End date'
  const write = (date: Date | undefined) => date && writeDateValue(date, (valueType ?? 'date') as T, withTime)
  const setValue = (range: { from: Date | undefined; to?: Date } | null) =>
    setRaw(range && { from: write(range.from), to: write(range.to) })
  const allowed = (date: Date) => isDayAllowed(date, { startMonth, endMonth, disabledDays, hidden })

  const setOpen = (next: boolean) => {
    setPicking(false)
    if (next) setActiveEnd('from')
    setOpenState(next)
  }

  const pick = (day: Date) => {
    if (!picking || !from) {
      setValue({ from: withTime ? atTime(day, timeOf(from, START_TIME)) : day, to: undefined })
      setPicking(true)
      setActiveEnd('from')
      return
    }
    if (!withTime) {
      setValue(day < from ? { from: day, to: from } : { from, to: day })
      setOpen(false)
      return
    }
    // With times each end keeps its own: the start's, and the end's (23:59 for a new one).
    const endTime = timeOf(to, END_TIME)
    const end = atTime(day, endTime)
    setValue(
      end < from ? { from: atTime(day, timeOf(from, START_TIME)), to: atTime(from, endTime) } : { from, to: end },
    )
    setPicking(false)
    setActiveEnd('to')
  }

  /** Sets the active end's time; a missing end takes the start's day (or today's). */
  const setTime = (time: Time) => {
    if (activeEnd === 'from') {
      const next = atTime(from ?? new Date(), time)
      setValue({ from: to && next > to ? to : next, to })
      return
    }
    if (!from) return
    const next = atTime(to ?? from, time)
    setValue({ from, to: next < from ? from : next })
  }

  const readEnd = (end: End) => (text: string) => {
    const reference = (end === 'from' ? from : to) ?? undefined
    const date = withTime ? parseDateTimeText(text, locale, reference) : parseDateText(text, locale, reference)
    if (!date || !allowed(date)) return false
    if (end === 'from') setValue({ from: date, to: to && to >= date ? to : undefined })
    else if (!from || date < from) return false
    else setValue({ from, to: date })
    return true
  }

  /** What an editable end's input reports: a real date, or `null` once emptied or left holding none. */
  const typeEnd = (end: End) => (date: Date | null) => {
    if (end === 'from') setValue(date ? { from: date, to: to && to >= date ? to : undefined } : null)
    else setValue(date ? { from, to: date } : from ? { from, to: undefined } : null)
  }

  const dateText = (date: Date) =>
    withTime
      ? `${format(date, 'PP', { locale })}, ${formatTime(date, locale, hourCycle)}`
      : format(date, 'PP', { locale })

  const displayOf = (): ReactNode => {
    if (!from) return ''
    if (formatDate)
      return (
        <>
          {formatDate(from)} – {to && formatDate(to)}
        </>
      )
    if (!to) return `${dateText(from)} –`
    return new Intl.DateTimeFormat(locale.code, {
      dateStyle: 'medium',
      ...(withTime && { timeStyle: 'short', ...(hourCycle && { hourCycle }) }),
    }).formatRange(from, to)
  }

  const headerInput = (end: End) => {
    const field = (
      <PickerInput
        ref={end === 'from' ? fromInput : undefined}
        aria-label={end === 'from' ? startLabel : endLabel}
        placeholder={end === 'from' ? shell.placeholder : undefined}
        formatted={end === 'from' ? (from ? dateText(from) : '') : to ? dateText(to) : ''}
        onText={readEnd(end)}
        onClear={() => setValue(end === 'from' || !from ? null : { from, to: undefined })}
        onEnter={() => setOpen(false)}
        onFocus={() => setActiveEnd(end)}
        // With times, an end needs room for its whole text ("Oct 1, 2026, 12:00 AM"): below that the ends stack.
        className={cn('min-w-0 flex-1', withTime && 'min-w-[10.5rem]')}
      />
    )
    return withTime && activeEnd === end ? (
      <FieldStateContext.Provider value={ACTIVE_END}>{field}</FieldStateContext.Provider>
    ) : (
      field
    )
  }

  const header = (
    <div className={cn('flex min-w-0 flex-1 items-center', withTime && 'flex-wrap gap-y-1')}>
      {headerInput('from')}
      <span aria-hidden className="px-0.5 text-muted-foreground">
        –
      </span>
      {headerInput('to')}
    </div>
  )

  const labelFor = (own: DateRangeInputProps | undefined, fallback: string) =>
    own?.['aria-label'] ??
    shell['aria-label'] ??
    ((own?.['aria-labelledby'] ?? shell['aria-labelledby']) ? undefined : fallback)

  const masked = (end: End, own: DateRangeInputProps | undefined) => {
    const { ref: _ref, ...rest } = own ?? {}
    return (
      <MaskedDateInput
        {...attributes}
        id={end === 'from' ? id : undefined}
        required={shell.required}
        readOnly={shell.readOnly}
        disabled={shell.disabled}
        {...rest}
        ref={end === 'from' ? startRef : own?.ref}
        aria-label={labelFor(own, end === 'from' ? startLabel : endLabel)}
        aria-invalid={isInvalid}
        value={(end === 'from' ? from : to) ?? null}
        onValueChange={typeEnd(end)}
        onInvalidChange={flag => setTypedInvalid(state => ({ ...state, [end]: flag }))}
        locale={locale}
        withTime={withTime}
        allowed={date => allowed(date) && (end === 'from' || !from || date >= from)}
      />
    )
  }

  const field = (
    <PickerShell
      {...shell}
      id={editable ? undefined : id}
      invalid={isInvalid}
      closeLabel={labels?.close}
      open={open}
      onOpenChange={setOpen}
      icon="calendar"
      display={displayOf()}
      formValue={
        from && to ? [writeDateValue(from, 'string', withTime), writeDateValue(to, 'string', withTime)] : undefined
      }
      formNames={[startName, endName]}
      header={header}
      initialFocus={fromInput}
      editor={
        editable && (
          <>
            {masked('from', startInputProps)}
            <span aria-hidden className={cn('shrink-0 text-muted-foreground', sizeClasses.text)}>
              –
            </span>
            {masked('to', endInputProps)}
          </>
        )
      }
      editorRef={fromField}
      triggerLabel={labels?.calendar}
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
        hidden={hidden}
        columnLabels={labels}
        startMonth={startMonth}
        endMonth={endMonth}
        defaultMonth={defaultMonth}
        dir={dir}
        columnsSide={columnsSide}
        extraColumnsSide={timeColumnsSide}
        extraColumns={
          withTime
            ? orientation => {
                const end = activeEnd === 'from' ? from : to
                return (
                  <TimeColumns
                    key="time"
                    value={end ? timeOf(end, START_TIME) : null}
                    onValueChange={setTime}
                    hourCycle={hourCycle ?? hourCycleOf(locale)}
                    minuteStep={minuteStep}
                    locale={locale}
                    orientation={orientation}
                    labels={labels}
                  />
                )
              }
            : undefined
        }
      />
    </PickerShell>
  )

  // As DatePicker's: a sibling, so the field never remounts as the caption comes and goes.
  return (
    <>
      {field}
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
}

export type { DateRangeInputProps, DateRangePickerLabels, DateRangePickerProps }
export { DateRangePicker }

export default DateRangePicker

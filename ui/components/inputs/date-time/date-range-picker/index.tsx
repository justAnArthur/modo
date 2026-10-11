/*
 * Local addition (not part of Fluid Functionalism): a date range field over
 * the scrolling Calendar (react-day-picker's range mode). Props after
 * shadcn's range picker and utegsk/ui's DateRangePicker (`editable`,
 * `withTime`, `hourCycle`, `hidden`, per-end input props), kept in line with
 * the other pickers here.
 */

import { endOfMonth, format, isValid, type Locale, set } from 'date-fns'
import {
  type ForwardRefExoticComponent,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type RefAttributes,
  type RefObject,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type DateRange, dateMatchModifiers, type Matcher } from 'react-day-picker'
import {
  defaultLocale,
  formatTime,
  type HourCycle,
  hourCycleOf,
  parseDateText,
  parseDateTimeText,
  resolveLocale,
} from '../../../../lib/date-locale'
import { FieldStateContext, type FieldVariant } from '../../../../lib/field-classes'
import { type SizeVariant, useSize } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import Calendar from '../calendar'
import { MaskedDateInput } from '../date-picker/masked-date-input'
import {
  assignRefs,
  controlAttributes,
  invalidOf,
  type PickerControlProps,
  PickerInput,
  PickerShell,
} from '../picker-shell'
import { type Time, TimeColumns } from '../time-columns'

/** Every word the picker shows or announces, for translating it. */
interface DateRangePickerLabels {
  /** Names the range's start: the panel's start input, and an `editable` field's. Defaults to `"Start date"`. */
  start?: string
  /** Names the range's end: the panel's end input, and an `editable` field's. Defaults to `"End date"`. */
  end?: string
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
  /** Caption under an `editable` field holding an end that is no real date, rendered as the field's next sibling; `null` keeps only the destructive ring. Defaults to `"Invalid date"`. */
  invalid?: ReactNode
}

/** Attributes for one end's input of an `editable` range, its `ref` included. */
type DateRangeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> & { ref?: Ref<HTMLInputElement> } & { [data: `data-${string}`]: string | number | boolean | undefined }

interface DateRangePickerProps extends PickerControlProps {
  /** The picked range, react-day-picker's `{ from, to }`; `null` when empty. */
  value?: DateRange | null
  /** Initial range, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: DateRange | null
  /** Called with the new range: `{ from }` alone after the first click, `null` when cleared. An `editable` end left incomplete or impossible reports an Invalid Date there (`isNaN(date.getTime())`), so a form can reject it. */
  onValueChange?: (value: DateRange | null) => void
  /** The field is two text inputs to type the ends into, in the locale's numeric order ("09.10.2026 – 15.10.2026"); its calendar icon opens the panel. Defaults to `false`. */
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
  /** Shows the range but never opens or takes typing. Defaults to `false`. */
  readOnly?: boolean
  /** A react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`), or a BCP 47 tag (`"sk"`) read through Intl. Defaults to `enUS`. */
  locale?: Locale | string
  /** Shown while empty. */
  placeholder?: string
  /** `true` disables the field; any other react-day-picker matcher disables the days it matches. */
  disabled?: Matcher | Matcher[]
  /** Days to leave out of the calendar, as react-day-picker matchers: they show as gaps and can't be typed either. */
  hidden?: Matcher | Matcher[]
  /** Names both ends for a native form: two hidden inputs carry them, start then end, as `"yyyy-MM-dd"` (with `withTime`, `"yyyy-MM-ddTHH:mm"`). */
  name?: string
  /** Names the start's hidden input on its own, in place of `name`. */
  startName?: string
  /** Names the end's hidden input on its own, in place of `name`. */
  endName?: string
  /** Attributes for an `editable` field's start input (`ref`, `id`, `aria-*`, handlers…), over the picker's own. */
  startInputProps?: DateRangeInputProps
  /** Attributes for an `editable` field's end input, over the picker's own. */
  endInputProps?: DateRangeInputProps
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
  /** Id of the field's control (its button, or an `editable` field's start input), for a `Label`'s `htmlFor`. */
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

type End = 'from' | 'to'

/** A real date, or `undefined` for none (or an Invalid Date). */
const real = (date: Date | undefined) => (date && isValid(date) ? date : undefined)

/** `day` at `time`'s hours and minutes. */
const atTime = (day: Date, { hours, minutes }: Time) => set(day, { hours, minutes, seconds: 0, milliseconds: 0 })

const timeOf = (date: Date | undefined, fallback: Time): Time =>
  date ? { hours: date.getHours(), minutes: date.getMinutes() } : fallback

const START_TIME: Time = { hours: 0, minutes: 0 }
const END_TIME: Time = { hours: 23, minutes: 59 }

const ACTIVE_END = { active: true, invalid: false, disabled: false }

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
 * `editable` turns the field into two masked inputs, one per end, typed in
 * the locale's numeric order as DatePicker's are; the calendar icon opens the
 * panel. `withTime` adds the times: hour and minute columns beside the days
 * set the end being picked (the start after the first click, the end after
 * the second) or whichever end's header input has focus, lit in the header,
 * and the panel stays open until closed. `formatDate` writes each end in the
 * field and `labels` every word, `hidden` days leave gaps, and `readOnly`
 * shows the range without opening.
 *
 * In a form, `name` submits both ends through hidden inputs (or
 * `startName` / `endName` one each), and `required` stops a submit until
 * both are set. `id`, the `aria-*` props, `onBlur`, `controlProps` and the
 * `ref` reach the field's control: its button, or both inputs of an
 * `editable` field (the `ref` and `id` its start), where `startInputProps`
 * and `endInputProps` add to each.
 *
 * @example {@include ./examples.mdx}
 */
const DateRangePicker: ForwardRefExoticComponent<
  DateRangePickerProps & RefAttributes<HTMLButtonElement | HTMLInputElement>
> = forwardRef<HTMLButtonElement | HTMLInputElement, DateRangePickerProps>(function DateRangePicker(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    editable = false,
    withTime = false,
    hourCycle,
    minuteStep = 1,
    formatDate,
    labels,
    readOnly = false,
    locale: localeProp = defaultLocale,
    placeholder,
    disabled,
    hidden,
    name,
    startName,
    endName,
    startInputProps,
    endInputProps,
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
    // `from` is also the range's start, below.
    from: growFrom,
    effect,
    hideSource,
    tier,
    className,
    ...control
  },
  ref,
) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpenState] = useControllableState(openProp, defaultOpen, onOpenChange)
  // After the first click, the next one ends the range.
  const [picking, setPicking] = useState(false)
  // The end the time columns set.
  const [activeEnd, setActiveEnd] = useState<End>('from')
  const [typedInvalid, setTypedInvalid] = useState<Record<End, boolean>>({ from: false, to: false })
  const fromInput = useRef<HTMLInputElement>(null)
  const sizeClasses = useSize(size)
  const locale = resolveLocale(localeProp)
  // `true` turns the field off; any other matcher picks out days.
  const off = typeof disabled === 'boolean' && disabled
  const days = off ? undefined : disabled
  const from = real(value?.from)
  const to = from ? real(value?.to) : undefined
  // An end that reads as no date (an editable end left half typed).
  const unreadable = { from: !!value?.from && !from, to: !!value?.to && !real(value.to) }
  const showInvalid = unreadable.from || unreadable.to || typedInvalid.from || typedInvalid.to
  const invalidCaption = labels?.invalid === undefined ? 'Invalid date' : labels.invalid
  const startLabel = labels?.start ?? 'Start date'
  const endLabel = labels?.end ?? 'End date'

  const setOpen = (next: boolean) => {
    setPicking(false)
    if (next) setActiveEnd('from')
    setOpenState(next)
  }

  const allowed = (date: Date) =>
    (!startMonth || date >= startMonth) &&
    (!endMonth || date <= endOfMonth(endMonth)) &&
    !(days && dateMatchModifiers(date, days)) &&
    !(hidden && dateMatchModifiers(date, hidden))

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
    const startTime = timeOf(from, START_TIME)
    const end = atTime(day, endTime)
    setValue(end < from ? { from: atTime(day, startTime), to: atTime(from, endTime) } : { from, to: end })
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
    if (!text.trim()) {
      setValue(end === 'from' ? null : from ? { from, to: undefined } : null)
      return true
    }
    const reference = (end === 'from' ? from : to) ?? undefined
    const date = withTime ? parseDateTimeText(text, locale, reference) : parseDateText(text, locale, reference)
    if (!date || !allowed(date)) return false
    if (end === 'from') setValue({ from: date, to: to && to >= date ? to : undefined })
    else if (!from || date < from) return false
    else setValue({ from, to: date })
    return true
  }

  /** What an editable end's input reports: a real date, `null` once emptied, or an Invalid Date. */
  const typeEnd = (end: End) => (date: Date | null) => {
    if (end === 'from') {
      if (date === null) setValue(null)
      else if (!isValid(date)) setValue({ from: date, to: value?.to })
      else setValue({ from: date, to: to && to >= date ? to : undefined })
      return
    }
    if (date === null) setValue(from ? { from, to: undefined } : null)
    else setValue({ from: value?.from, to: date })
  }

  const dateText = (date: Date) =>
    withTime
      ? `${format(date, 'PP', { locale })}, ${formatTime(date, locale, hourCycle)}`
      : format(date, 'PP', { locale })

  const displayOf = (from: Date | undefined, to: Date | undefined): ReactNode => {
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

  const endInput = (end: End, ariaLabel: string) => {
    const own = end === 'from' ? fromInput : undefined
    const formatted = end === 'from' ? from : to
    const field = (
      <PickerInput
        ref={own}
        aria-label={ariaLabel}
        placeholder={end === 'from' ? placeholder : undefined}
        formatted={formatted ? dateText(formatted) : ''}
        onText={readEnd(end)}
        onEnter={() => setOpen(false)}
        onFocus={() => setActiveEnd(end)}
        className="min-w-0 flex-1"
      />
    )
    // With times, the end the columns set is lit.
    return withTime && activeEnd === end ? (
      <FieldStateContext.Provider value={ACTIVE_END}>{field}</FieldStateContext.Provider>
    ) : (
      field
    )
  }

  const header = (
    <>
      {endInput('from', startLabel)}
      <span aria-hidden className="px-0.5 text-muted-foreground">
        –
      </span>
      {endInput('to', endLabel)}
    </>
  )

  const isInvalid = invalidOf(invalid, control['aria-invalid'])
  const attributes = controlAttributes(control)
  const labelFor = (props: DateRangeInputProps | undefined, fallback: string) =>
    props?.['aria-label'] ??
    control['aria-label'] ??
    ((props?.['aria-labelledby'] ?? control['aria-labelledby']) ? undefined : fallback)

  // The picker's `ref` is the start input's too.
  const startRef = useMemo(() => assignRefs<HTMLInputElement>(ref, startInputProps?.ref), [ref, startInputProps?.ref])

  const masked = (end: End, props: DateRangeInputProps | undefined) => {
    const { ref: inputRef, ...rest } = props ?? {}
    return (
      <MaskedDateInput
        ref={end === 'from' ? startRef : inputRef}
        {...attributes}
        id={end === 'from' ? id : undefined}
        required={control.required}
        {...rest}
        aria-label={labelFor(props, end === 'from' ? startLabel : endLabel)}
        aria-invalid={isInvalid || unreadable[end] || typedInvalid[end] || undefined}
        value={(end === 'from' ? from : real(value?.to)) ?? null}
        externallyInvalid={unreadable[end]}
        onValueChange={typeEnd(end)}
        onInvalidChange={flag => setTypedInvalid(state => ({ ...state, [end]: flag }))}
        locale={locale}
        withTime={withTime}
        allowed={date => allowed(date) && (end === 'from' || !from || date >= from)}
        disabled={off || rest.disabled}
        readOnly={readOnly || rest.readOnly}
        className={cn('text-center', rest.className)}
      />
    )
  }

  const editor = editable ? (
    <>
      {masked('from', startInputProps)}
      <span aria-hidden className={cn('shrink-0 text-muted-foreground', sizeClasses.text)}>
        –
      </span>
      {masked('to', endInputProps)}
    </>
  ) : undefined

  const iso = (date: Date | undefined) => (date ? format(date, withTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd') : '')

  const shell = (
    <PickerShell
      open={open}
      onOpenChange={setOpen}
      size={size}
      variant={variant}
      invalid={editable ? isInvalid || showInvalid : isInvalid}
      disabled={off}
      readOnly={readOnly}
      icon="calendar"
      display={displayOf(from, to)}
      placeholder={placeholder}
      header={header}
      initialFocus={fromInput}
      editor={editor}
      triggerLabel={labels?.calendar ?? 'Open calendar'}
      closeLabel={labels?.close}
      controlRef={ref as Ref<HTMLButtonElement>}
      controlProps={editable ? undefined : attributes}
      formValues={[
        { slot: 'start', name: startName ?? name, value: iso(from) },
        { slot: 'end', name: endName ?? name, value: iso(to) },
      ]}
      required={control.required}
      id={id}
      dir={dir}
      from={growFrom}
      effect={effect}
      hideSource={hideSource}
      tier={tier}
      className={className}
    >
      <Calendar
        mode="range"
        locale={locale}
        selected={from ? { from, to } : undefined}
        // The range is ours to build (two clicks, then close); DayPicker's own
        // range logic would keep extending it.
        onSelect={(_, day) => pick(day)}
        disabled={days}
        hidden={hidden}
        startMonth={startMonth}
        endMonth={endMonth}
        dir={dir}
        columnsSide={columnsSide}
        columnLabels={labels}
        extraColumnsSide={timeColumnsSide}
        extraColumns={
          withTime
            ? orientation => {
                const end = activeEnd === 'from' ? from : to
                return (
                  <TimeColumns
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

  // As DatePicker's: the caption is a sibling, so the field never remounts as it comes and goes.
  return (
    <>
      {shell}
      {editable && showInvalid && invalidCaption !== null && (
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

export type { DateRangeInputProps, DateRangePickerLabels, DateRangePickerProps }
export { DateRangePicker }

export default DateRangePicker

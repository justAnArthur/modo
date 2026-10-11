/*
 * Local addition (not part of Fluid Functionalism): a time-of-day field with
 * scrolling hour and minute columns. Props after utegsk/ui's TimePicker
 * (`hourCycle`, a string value), kept in line with the other pickers here.
 */

import { type Locale, set } from 'date-fns'
import { forwardRef, type ReactNode, type RefObject, useRef } from 'react'
import {
  defaultLocale,
  formatTime,
  type HourCycle,
  hourCycleOf,
  parseTimeText,
  resolveLocale,
} from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import { dividedColumns } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import { controlAttributes, invalidOf, type PickerControlProps, PickerInput, PickerShell } from '../picker-shell'
import { pad, type Time, TimeColumns } from '../time-columns'

/** Every word the picker shows or announces, for translating it. */
interface TimePickerLabels {
  /** Names the panel's time input. Defaults to the `placeholder`, else `"Time"`. */
  time?: string
  /** Names the hour column. Defaults to the locale's name for it. */
  hour?: string
  /** Names the minute column. Defaults to the locale's name for it. */
  minute?: string
  /** Names the panel's close button. Defaults to `"Close"`. */
  close?: string
}

interface TimePickerProps extends PickerControlProps {
  /** The picked time as `"HH:mm"` on a 24-hour clock (an `<input type="time">`'s value); `null` when empty. */
  value?: string | null
  /** Initial time, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: string | null
  /** Called with the new `"HH:mm"`, or `null` when the field is cleared. */
  onValueChange?: (value: string | null) => void
  /** The clock shown: on `'h12'` / `'h11'` the hours read with AM/PM. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale, or a BCP 47 tag (`"sk"`) read through Intl: the time's format and the AM/PM names. Defaults to `enUS`. */
  locale?: Locale | string
  /** The field's text for a time, in place of the locale's format: `(value) => …`, given `"HH:mm"`. */
  formatTime?: (value: string) => ReactNode
  /** Every word the picker announces (`time`, `hour`, `minute`, `close`), for translating it. Defaults to English and the locale's field names. */
  labels?: TimePickerLabels
  /** Shows the time but never opens. Defaults to `false`. */
  readOnly?: boolean
  /** Names the value for a native form: a hidden input carries it as `"HH:mm"`. */
  name?: string
  /** Shown while empty. */
  placeholder?: string
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

const toTime = (value: string | null): Time | null => {
  const [hours, minutes] = value?.split(':').map(Number) ?? []
  return hours === undefined || minutes === undefined ? null : { hours, minutes }
}
const toValue = ({ hours, minutes }: Time) => `${pad(hours)}:${pad(minutes)}`

/**
 * A time-of-day field with scrolling hour and minute columns.
 *
 * The panel opens with the time as text, selected and ready to type over
 * ("15:33", "3:33 PM"), above an hour column and a minute column; on a
 * 12-hour clock the hours read with AM/PM, and the field writes the time on
 * the same clock. Each column keeps its pick in the middle and
 * marks it with a dot. The value is `"HH:mm"` on a 24-hour clock whatever the
 * locale shows, the same as a native time input's.
 *
 * `formatTime` writes the field's text and `labels` every word it
 * announces; `locale` also takes a BCP 47 tag. `readOnly` shows the time
 * and never opens. In a form, `name` submits the value as `"HH:mm"` and
 * `required` stops an empty submit; `id`, the `aria-*` props, `onBlur`,
 * `controlProps` and the `ref` reach the field's button.
 *
 * @example {@include ./examples.mdx}
 */
const TimePicker = forwardRef<HTMLButtonElement, TimePickerProps>(function TimePicker(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    hourCycle,
    minuteStep = 1,
    locale: localeProp = defaultLocale,
    formatTime: formatValue,
    labels,
    readOnly = false,
    name,
    placeholder,
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
  const clock = hourCycle ?? hourCycleOf(locale)
  const time = toTime(value)
  const formatted = time ? formatTime(set(new Date(), time), locale, hourCycle) : ''

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
      variant={variant}
      invalid={invalidOf(invalid, control['aria-invalid'])}
      disabled={disabled}
      readOnly={readOnly}
      icon="clock"
      display={time && formatValue ? formatValue(toValue(time)) : formatted}
      placeholder={placeholder}
      closeLabel={labels?.close}
      controlRef={ref}
      controlProps={controlAttributes(control)}
      formValues={[{ slot: 'value', name, value: time ? toValue(time) : '' }]}
      required={control.required}
      header={
        <PickerInput
          ref={input}
          aria-label={labels?.time ?? placeholder ?? 'Time'}
          placeholder={placeholder}
          formatted={formatted}
          onText={readTime}
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
        <TimeColumns
          value={time}
          onValueChange={next => setValue(toValue(next))}
          hourCycle={clock}
          minuteStep={minuteStep}
          locale={locale}
          orientation="vertical"
          fill
          labels={labels}
        />
      </div>
    </PickerShell>
  )
})

export type { TimePickerLabels, TimePickerProps }
export { TimePicker }

export default TimePicker

/*
 * Local addition (not part of Fluid Functionalism): a time-of-day field with
 * scrolling hour and minute strips. Props after utegsk/ui's TimePicker
 * (`hourCycle`, a string value), kept in line with the other pickers here.
 */

import { format, type Locale, set } from 'date-fns'
import { type RefObject, useRef } from 'react'
import { defaultLocale, type HourCycle, hourCycleOf, parseTimeText } from '../../../../lib/date-locale'
import { dividedStrips } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { PickerInput, PickerShell } from '../picker-shell'
import { pad, type Time, TimeColumns } from '../time-columns'

interface TimePickerProps {
  /** The picked time as `"HH:mm"` on a 24-hour clock (an `<input type="time">`'s value); `null` when empty. */
  value?: string | null
  /** Initial time, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: string | null
  /** Called with the new `"HH:mm"`, or `null` when the field is cleared. */
  onValueChange?: (value: string | null) => void
  /** The clock shown: on `'h12'` / `'h11'` the hours read with AM/PM. Defaults to the locale's. */
  hourCycle?: HourCycle
  /** Steps between the minute strip's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale: the time's format and the AM/PM names. Defaults to `enUS`. */
  locale?: Locale
  /** Shown while empty. */
  placeholder?: string
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

const toTime = (value: string | null): Time | null => {
  const [hours, minutes] = value?.split(':').map(Number) ?? []
  return hours === undefined || minutes === undefined ? null : { hours, minutes }
}
const toValue = ({ hours, minutes }: Time) => `${pad(hours)}:${pad(minutes)}`

/**
 * A time-of-day field with scrolling hour and minute strips.
 *
 * The panel opens with the time as text, selected and ready to type over
 * ("15:33", "3:33 PM"), above an hour strip and a minute strip; on a
 * 12-hour clock the hours read with AM/PM. Each strip keeps its pick in the middle and
 * marks it with a dot. The value is `"HH:mm"` on a 24-hour clock whatever the
 * locale shows, the same as a native time input's.
 *
 * @example {@include ./examples.mdx}
 */
function TimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  hourCycle,
  minuteStep = 1,
  locale = defaultLocale,
  placeholder,
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
}: TimePickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const time = toTime(value)
  const formatted = time ? format(set(new Date(), time), 'p', { locale }) : ''

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
      invalid={invalid}
      disabled={disabled}
      icon="clock"
      display={formatted}
      placeholder={placeholder}
      header={
        <PickerInput
          ref={input}
          aria-label={placeholder ?? 'Time'}
          placeholder={placeholder}
          formatted={formatted}
          onText={readTime}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
      }
      initialFocus={input}
      popupClassName="w-[max(var(--anchor-width,0px),20rem)]"
      id={id}
      from={from}
      effect={effect}
      hideSource={hideSource}
      tier={tier}
      className={className}
    >
      <div className={dividedStrips}>
        <TimeColumns
          value={time}
          onValueChange={next => setValue(toValue(next))}
          hourCycle={hourCycle ?? hourCycleOf(locale)}
          minuteStep={minuteStep}
          locale={locale}
          orientation="horizontal"
          labelled
        />
      </div>
    </PickerShell>
  )
}

export type { TimePickerProps }
export { TimePicker }

export default TimePicker

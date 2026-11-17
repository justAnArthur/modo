/*
 * Local addition (not part of Fluid Functionalism): a time-of-day field with
 * scrolling hour and minute columns. Props after utegsk/ui's TimePicker
 * (`hourCycle`, a string value, `formatTime`, `labels`, the form props and a
 * BCP 47 `locale`), kept in line with the other pickers here.
 */

'use client'

import { type Locale, set } from 'date-fns'
import { type AriaAttributes, type FocusEvent, type ReactNode, type RefObject, useRef } from 'react'
import {
  defaultLocale,
  formatTime as formatClock,
  type HourCycle,
  hourCycleOf,
  parseTimeText,
  resolveLocale,
} from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import {
  ColumnsPanel,
  columnsPopupClass,
  type PickerControlAttributes,
  PickerInput,
  PickerShell,
} from '../picker-shell'
import { pad, type Time, TimeColumns } from '../time-columns'

/** Every word the picker announces, for translating it. */
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

interface TimePickerProps {
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
  /** Shown while empty. */
  placeholder?: string
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
  /** Submits the value under this name in a form (`"HH:mm"`). */
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
 * 12-hour clock the hours read with AM/PM. Each column keeps its pick in the middle and
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
  locale: localeProp = defaultLocale,
  formatTime,
  labels,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...shell
}: TimePickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const locale = resolveLocale(localeProp)
  const time = toTime(value)
  const formatted = time ? formatClock(set(new Date(), time), locale, hourCycle) : ''

  const readTime = (text: string) => {
    const read = parseTimeText(text, locale)
    if (!read) return false
    setValue(toValue({ hours: read.getHours(), minutes: read.getMinutes() }))
    return true
  }

  return (
    <PickerShell
      {...shell}
      open={open}
      onOpenChange={setOpen}
      icon="clock"
      display={time && formatTime ? formatTime(toValue(time)) : formatted}
      closeLabel={labels?.close}
      formValue={value ?? undefined}
      header={
        <PickerInput
          ref={input}
          aria-label={labels?.time ?? shell.placeholder ?? 'Time'}
          placeholder={shell.placeholder}
          formatted={formatted}
          onText={readTime}
          onClear={() => setValue(null)}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
      }
      initialFocus={input}
      popupClassName={columnsPopupClass}
    >
      <ColumnsPanel>
        <TimeColumns
          value={time}
          onValueChange={next => setValue(toValue(next))}
          hourCycle={hourCycle ?? hourCycleOf(locale)}
          minuteStep={minuteStep}
          locale={locale}
          orientation="vertical"
          fill
          labels={labels}
        />
      </ColumnsPanel>
    </PickerShell>
  )
}

export type { TimePickerLabels, TimePickerProps }
export { TimePicker }

export default TimePicker

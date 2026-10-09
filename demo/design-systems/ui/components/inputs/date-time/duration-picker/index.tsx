/*
 * Local addition (not part of Fluid Functionalism): a duration field with
 * scrolling hour and minute columns. Props after utegsk/ui's DurationPicker
 * (`maxHours`, `minuteStep`), its value a date-fns `Duration` instead of
 * decimal hours.
 */

import { type Duration, formatDuration, type Locale } from 'date-fns'
import { type RefObject, useMemo, useRef } from 'react'
import { defaultLocale, fieldLabel } from '../../../../lib/date-locale'
import { dividedColumns, ScrollColumn } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import { PickerInput, PickerShell } from '../picker-shell'
import { pad } from '../time-columns'

interface DurationPickerProps {
  /** The picked duration, a date-fns `Duration` (`{ hours, minutes }`); `null` when empty. */
  value?: Duration | null
  /** Initial duration, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: Duration | null
  /** Called with the new duration, or `null` when the field is cleared. */
  onValueChange?: (value: Duration | null) => void
  /** The longest duration's hours: the hour column runs from 0 to it. Defaults to `99`. */
  maxHours?: number
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale: the field spells the duration out in it ("1 Stunde 30 Minuten"). Defaults to `enUS`. */
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

/** "1:30", or a bare number of hours ("2"). */
const TYPED = /^\s*(\d{1,3})(?::(\d{1,2}))?\s*$/

/**
 * A field for a length of time, in hours and minutes.
 *
 * The field spells the duration out in the locale ("1 hour 30 minutes"); its
 * panel has it as `H:mm` to type over, above an hour column (0 to `maxHours`)
 * and a minute column stepping by `minuteStep`. The value is a date-fns
 * `Duration`, `{ hours, minutes }`, ready for `formatDuration` or date math.
 *
 * @example {@include ./examples.mdx}
 */
function DurationPicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  maxHours = 99,
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
}: DurationPickerProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  const input = useRef<HTMLInputElement>(null)
  const hours = value?.hours ?? 0
  const minutes = value?.minutes ?? 0

  const display = value
    ? hours || minutes
      ? formatDuration({ hours, minutes }, { locale, format: ['hours', 'minutes'] })
      : formatDuration({ minutes: 0 }, { locale, format: ['minutes'], zero: true })
    : ''

  const readDuration = (text: string) => {
    if (!text.trim()) {
      setValue(null)
      return true
    }
    const match = TYPED.exec(text)
    const h = Number(match?.[1])
    const m = Number(match?.[2] ?? 0)
    if (!match || h > maxHours || m > 59) return false
    setValue({ hours: h, minutes: m })
    return true
  }

  const hourOptions = useMemo(
    () => Array.from({ length: maxHours + 1 }, (_, h) => ({ value: h, label: String(h) })),
    [maxHours],
  )
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => ({
        value: i * minuteStep,
        label: pad(i * minuteStep),
      })),
    [minuteStep],
  )

  return (
    <PickerShell
      open={open}
      onOpenChange={setOpen}
      size={size}
      invalid={invalid}
      disabled={disabled}
      icon="clock"
      display={display}
      placeholder={placeholder}
      header={
        <PickerInput
          ref={input}
          aria-label={placeholder ?? 'Duration'}
          placeholder="0:00"
          formatted={value ? `${hours}:${pad(minutes)}` : ''}
          onText={readDuration}
          onEnter={() => setOpen(false)}
          className="flex-1"
        />
      }
      initialFocus={input}
      id={id}
      from={from}
      effect={effect}
      hideSource={hideSource}
      tier={tier}
      className={className}
    >
      <div className={cn(dividedColumns, 'h-56 justify-center')}>
        <ScrollColumn
          label={fieldLabel(locale, 'hour')}
          options={hourOptions}
          value={value ? hours : null}
          onValueChange={h => setValue({ hours: h, minutes })}
          className="w-16 shrink-0"
        />
        <ScrollColumn
          label={fieldLabel(locale, 'minute')}
          options={minuteOptions}
          value={value ? minutes : null}
          onValueChange={m => setValue({ hours, minutes: m })}
          className="w-16 shrink-0"
        />
      </div>
    </PickerShell>
  )
}

export type { DurationPickerProps }
export { DurationPicker }

export default DurationPicker

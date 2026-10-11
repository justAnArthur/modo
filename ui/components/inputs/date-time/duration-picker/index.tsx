/*
 * Local addition (not part of Fluid Functionalism): a duration field with
 * scrolling hour and minute columns. Props after utegsk/ui's DurationPicker
 * (`minHours`, `maxHours`, `hourStep`, `minuteStep`, `formatValue`), its
 * value a date-fns `Duration` instead of decimal hours.
 */

import { type Duration, formatDuration, type Locale } from 'date-fns'
import { forwardRef, type ReactNode, type RefObject, useMemo, useRef } from 'react'
import { defaultLocale, fieldLabel, resolveLocale } from '../../../../lib/date-locale'
import type { FieldVariant } from '../../../../lib/field-classes'
import { dividedColumns, ScrollColumn } from '../../../../lib/scroll-column'
import type { SizeVariant } from '../../../../lib/size-context'
import { useControllableState } from '../../../../lib/use-controllable-state'
import { cn } from '../../../../lib/utils'
import { controlAttributes, invalidOf, type PickerControlProps, PickerInput, PickerShell } from '../picker-shell'
import { pad } from '../time-columns'

/** Every word the picker announces, for translating it. */
interface DurationPickerLabels {
  /** Names the panel's duration input. Defaults to the `placeholder`, else `"Duration"`. */
  duration?: string
  /** Names the hour column. Defaults to the locale's name for it. */
  hour?: string
  /** Names the minute column. Defaults to the locale's name for it. */
  minute?: string
  /** Names the panel's close button. Defaults to `"Close"`. */
  close?: string
}

interface DurationPickerProps extends PickerControlProps {
  /** The picked duration, a date-fns `Duration` (`{ hours, minutes }`); `null` when empty. */
  value?: Duration | null
  /** Initial duration, for an uncontrolled picker. Defaults to `null`. */
  defaultValue?: Duration | null
  /** Called with the new duration, or `null` when the field is cleared. */
  onValueChange?: (value: Duration | null) => void
  /** The shortest duration's hours: the hour column starts at it, and a minute picked on an empty field takes it. Defaults to `0`. */
  minHours?: number
  /** The longest duration's hours: the hour column runs up to it. Defaults to `99`. */
  maxHours?: number
  /** Steps between the hour column's options, from `minHours`. Defaults to `1`. */
  hourStep?: number
  /** Steps between the minute column's options. Defaults to `1`. */
  minuteStep?: number
  /** A react-day-picker / date-fns locale, or a BCP 47 tag (`"sk"`) read through Intl: the field spells the duration out in it ("1 Stunde 30 Minuten"; a tag reads the names in English). Defaults to `enUS`. */
  locale?: Locale | string
  /** The field's text for a duration, in place of the locale's words: `(value) => …`, given `{ hours, minutes }`. */
  formatValue?: (value: Duration) => ReactNode
  /** Every word the picker announces (`duration`, `hour`, `minute`, `close`), for translating it. Defaults to English and the locale's field names. */
  labels?: DurationPickerLabels
  /** Shows the duration but never opens. Defaults to `false`. */
  readOnly?: boolean
  /** Names the value for a native form: a hidden input carries it as an ISO 8601 duration (`"PT1H30M"`). */
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

/** "1:30", or a bare number of hours ("2"). */
const TYPED = /^\s*(\d{1,3})(?::(\d{1,2}))?\s*$/

/**
 * A field for a length of time, in hours and minutes.
 *
 * The field spells the duration out in the locale ("1 hour 30 minutes"); its
 * panel has it as `H:mm` to type over, above an hour column (`minHours` to
 * `maxHours`, stepping by `hourStep`) and a minute column stepping by
 * `minuteStep`. The value is a date-fns `Duration`, `{ hours, minutes }`,
 * ready for `formatDuration` or date math.
 *
 * `formatValue` writes the field's text and `labels` every word it
 * announces; `locale` also takes a BCP 47 tag. `readOnly` shows the duration
 * and never opens. In a form, `name` submits the value as an ISO 8601
 * duration (`"PT1H30M"`) and `required` stops an empty submit; `id`, the
 * `aria-*` props, `onBlur`, `controlProps` and the `ref` reach the field's
 * button.
 *
 * @example {@include ./examples.mdx}
 */
const DurationPicker = forwardRef<HTMLButtonElement, DurationPickerProps>(function DurationPicker(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    minHours = 0,
    maxHours = 99,
    hourStep = 1,
    minuteStep = 1,
    locale: localeProp = defaultLocale,
    formatValue,
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
  const hours = value?.hours ?? minHours
  const minutes = value?.minutes ?? 0

  const spelled = () =>
    hours || minutes
      ? formatDuration({ hours, minutes }, { locale, format: ['hours', 'minutes'] })
      : formatDuration({ minutes: 0 }, { locale, format: ['minutes'], zero: true })
  const display = value ? (formatValue?.({ hours, minutes }) ?? spelled()) : ''

  const readDuration = (text: string) => {
    if (!text.trim()) {
      setValue(null)
      return true
    }
    const match = TYPED.exec(text)
    const h = Number(match?.[1])
    const m = Number(match?.[2] ?? 0)
    if (!match || h < minHours || h > maxHours || m > 59) return false
    setValue({ hours: h, minutes: m })
    return true
  }

  const hourOptions = useMemo(
    () =>
      Array.from({ length: Math.floor((maxHours - minHours) / Math.max(1, hourStep)) + 1 }, (_, i) => {
        const h = minHours + i * Math.max(1, hourStep)
        return { value: h, label: String(h) }
      }),
    [minHours, maxHours, hourStep],
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
      variant={variant}
      invalid={invalidOf(invalid, control['aria-invalid'])}
      disabled={disabled}
      readOnly={readOnly}
      icon="clock"
      display={display}
      placeholder={placeholder}
      closeLabel={labels?.close}
      controlRef={ref}
      controlProps={controlAttributes(control)}
      formValues={[{ slot: 'value', name, value: value ? `PT${hours}H${minutes}M` : '' }]}
      required={control.required}
      header={
        <PickerInput
          ref={input}
          aria-label={labels?.duration ?? placeholder ?? 'Duration'}
          placeholder="0:00"
          formatted={value ? `${hours}:${pad(minutes)}` : ''}
          onText={readDuration}
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
          label={labels?.hour ?? fieldLabel(locale, 'hour')}
          options={hourOptions}
          value={value ? hours : null}
          onValueChange={h => setValue({ hours: h, minutes })}
          className="min-w-0 flex-1"
        />
        <ScrollColumn
          label={labels?.minute ?? fieldLabel(locale, 'minute')}
          options={minuteOptions}
          value={value ? minutes : null}
          onValueChange={m => setValue({ hours, minutes: m })}
          className="min-w-0 flex-1"
        />
      </div>
    </PickerShell>
  )
})

export type { DurationPickerLabels, DurationPickerProps }
export { DurationPicker }

export default DurationPicker

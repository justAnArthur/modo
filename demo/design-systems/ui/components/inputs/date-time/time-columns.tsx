/*
 * Local addition (not part of Fluid Functionalism): the hour column (its
 * AM/PM folded in on a 12-hour clock) and the minute column the date picker
 * (with time) and the time picker share. Not an item (a file in a group folder).
 */

import { format, type Locale } from 'date-fns'
import { useMemo } from 'react'
import { fieldLabel, type HourCycle } from '../../../lib/date-locale'
import { ScrollColumn, type ScrollColumnProps } from '../../../lib/scroll-column'
import { cn } from '../../../lib/utils'

interface Time {
  hours: number
  minutes: number
}

interface TimeColumnsProps {
  value: Time | null
  onValueChange: (time: Time) => void
  hourCycle: HourCycle
  minuteStep: number
  locale: Locale
  orientation: 'vertical' | 'horizontal'
  /** Names each strip before it, for a panel made of strips alone. Defaults to `false`. */
  labelled?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Columns for the hour (with its AM/PM on a 12-hour clock) and the minute; a row of them divides itself. */
function TimeColumns({
  value,
  onValueChange,
  hourCycle,
  minuteStep,
  locale,
  orientation,
  labelled = false,
}: TimeColumnsProps) {
  const Column = labelled ? LabelledStrip : ScrollColumn
  const twelve = hourCycle === 'h12' || hourCycle === 'h11'
  const hours = value?.hours ?? null
  const minutes = value?.minutes ?? 0

  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => ({
        value: h,
        // "12 AM" … "11 PM" (h11: "0 AM" … "11 PM"), in the locale's words.
        label: twelve ? format(new Date(2000, 0, 1, h), hourCycle === 'h11' ? 'K a' : 'h a', { locale }) : pad(h),
      })),
    [twelve, hourCycle, locale],
  )
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => ({
        value: i * minuteStep,
        label: pad(i * minuteStep),
      })),
    [minuteStep],
  )

  // Narrower than the month and year columns; an hour with its AM/PM needs a little more.
  const vertical = orientation === 'vertical'

  return (
    <>
      <Column
        label={fieldLabel(locale, 'hour')}
        options={hourOptions}
        value={hours}
        onValueChange={h => onValueChange({ hours: h, minutes })}
        orientation={orientation}
        className={vertical ? cn('shrink-0', twelve ? 'w-15' : 'w-12') : 'w-full'}
      />
      <Column
        label={fieldLabel(locale, 'minute')}
        options={minuteOptions}
        value={hours === null ? null : minutes}
        onValueChange={m => onValueChange({ hours: hours ?? 0, minutes: m })}
        orientation={orientation}
        className={vertical ? 'w-12 shrink-0' : 'w-full'}
      />
    </>
  )
}

/** A horizontal ScrollColumn with its name before it ("Hour", "Minute"), for a panel of strips. */
function LabelledStrip<T extends number | string>({ label, className: _, ...props }: ScrollColumnProps<T>) {
  return (
    <div className="flex items-center">
      <span aria-hidden className="w-16 shrink-0 ps-3 text-caption text-muted-foreground">
        {label.charAt(0).toLocaleUpperCase() + label.slice(1)}
      </span>
      <ScrollColumn {...props} label={label} orientation="horizontal" className="min-w-0 flex-1" />
    </div>
  )
}

export type { Time }
export { LabelledStrip, pad, TimeColumns }

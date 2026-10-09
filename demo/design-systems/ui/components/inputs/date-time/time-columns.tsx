/*
 * Local addition (not part of Fluid Functionalism): the hour column (its
 * AM/PM folded in on a 12-hour clock) and the minute column the date picker
 * (with time) and the time picker share. Not an item (a file in a group folder).
 */

import { format, type Locale } from 'date-fns'
import { useMemo } from 'react'
import { fieldLabel, type HourCycle } from '../../../lib/date-locale'
import { ScrollColumn } from '../../../lib/scroll-column'
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
  /** Columns share the row's width equally instead of keeping their narrow fixed widths. Defaults to `false`. */
  fill?: boolean
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
  fill = false,
}: TimeColumnsProps) {
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

  const vertical = orientation === 'vertical'
  // Beside a calendar: narrower than its month and year columns, an hour
  // with its AM/PM a little wider. On their own (`fill`): an equal share.
  const width = (fixed: string) => (!vertical ? 'w-full' : fill ? 'min-w-0 flex-1' : cn('shrink-0', fixed))

  return (
    <>
      <ScrollColumn
        label={fieldLabel(locale, 'hour')}
        options={hourOptions}
        value={hours}
        onValueChange={h => onValueChange({ hours: h, minutes })}
        orientation={orientation}
        className={width(twelve ? 'w-15' : 'w-12')}
      />
      <ScrollColumn
        label={fieldLabel(locale, 'minute')}
        options={minuteOptions}
        value={hours === null ? null : minutes}
        onValueChange={m => onValueChange({ hours: hours ?? 0, minutes: m })}
        orientation={orientation}
        className={width('w-12')}
      />
    </>
  )
}

export type { Time }
export { pad, TimeColumns }

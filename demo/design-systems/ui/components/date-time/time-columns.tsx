/*
 * Local addition (not part of Fluid Functionalism): the hour, minute and
 * AM/PM columns the date picker (with time) and the time picker share. Not an
 * item (a file in a group folder).
 */

import { format, type Locale } from 'date-fns'
import { useMemo } from 'react'
import { fieldLabel, type HourCycle } from '../../lib/date-locale'
import { ScrollColumn } from '../../lib/scroll-column'
import { cn } from '../../lib/utils'

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
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Columns for the hour, the minute and, on a 12-hour clock, the day period. */
function TimeColumns({
  value,
  onValueChange,
  hourCycle,
  minuteStep,
  locale,
  orientation,
  className,
}: TimeColumnsProps) {
  const twelve = hourCycle === 'h12' || hourCycle === 'h11'
  const hours = value?.hours ?? null
  const minutes = value?.minutes ?? 0
  const pm = (hours ?? 0) >= 12

  const hourOptions = useMemo(
    () =>
      twelve
        ? Array.from({ length: 12 }, (_, i) => ({ value: i, label: String(hourCycle === 'h12' ? i || 12 : i) }))
        : Array.from({ length: 24 }, (_, i) => ({ value: i, label: pad(i) })),
    [twelve, hourCycle],
  )
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => ({
        value: i * minuteStep,
        label: pad(i * minuteStep),
      })),
    [minuteStep],
  )
  const periodOptions = useMemo(
    () => [
      { value: 0, label: format(new Date(2000, 0, 1, 0), 'a', { locale }) },
      { value: 12, label: format(new Date(2000, 0, 1, 12), 'a', { locale }) },
    ],
    [locale],
  )

  const column = cn(
    orientation === 'vertical' ? 'w-14 shrink-0 border-s border-border' : 'w-full border-b border-border',
    className,
  )

  return (
    <>
      <ScrollColumn
        label={fieldLabel(locale, 'hour')}
        options={hourOptions}
        value={hours === null ? null : twelve ? hours % 12 : hours}
        onValueChange={h => onValueChange({ hours: twelve && pm ? h + 12 : h, minutes })}
        orientation={orientation}
        className={column}
      />
      <ScrollColumn
        label={fieldLabel(locale, 'minute')}
        options={minuteOptions}
        value={hours === null ? null : minutes}
        onValueChange={m => onValueChange({ hours: hours ?? 0, minutes: m })}
        orientation={orientation}
        className={column}
      />
      {twelve && (
        <ScrollColumn
          label={fieldLabel(locale, 'dayPeriod')}
          options={periodOptions}
          value={hours === null ? null : pm ? 12 : 0}
          onValueChange={p => onValueChange({ hours: ((hours ?? 0) % 12) + p, minutes })}
          orientation={orientation}
          className={column}
        />
      )}
    </>
  )
}

export type { Time }
export { pad, TimeColumns }

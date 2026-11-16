/*
 * Local addition (not part of Fluid Functionalism): how DatePicker and
 * DateRangePicker take and report their value, a `Date` or an ISO string.
 */

import { format, parseISO } from 'date-fns'

/** What a date picker's value is: a `Date`, or an ISO string (`"2026-10-09"`, `"2026-10-09T15:33"` with a time). */
type DateValueType = 'date' | 'string'

/** The value type `valueType` picks. */
type DateOf<T extends DateValueType> = T extends 'string' ? string : Date

/** A range in the type `valueType` picks: react-day-picker's `{ from, to }` shape. */
interface DateRangeOf<T extends DateValueType> {
  from: DateOf<T> | undefined
  to?: DateOf<T> | undefined
}

/**
 * A value as a date: `null` when empty, an Invalid Date when a string reads
 * as none. An ISO string without an offset reads as local time, so a bare
 * `"2026-10-09"` is that day's local midnight (`new Date` would read it as
 * UTC midnight: the day before, west of UTC).
 */
function readDateValue(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') return null
  return typeof value === 'string' ? parseISO(value) : value
}

/** A date written as `type`: the date itself, or `"yyyy-MM-dd"` (`"yyyy-MM-ddTHH:mm"` with a time). */
function writeDateValue<T extends DateValueType>(date: Date, type: T, withTime = false): DateOf<T> {
  return (type === 'string' ? format(date, withTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd') : date) as DateOf<T>
}

export type { DateOf, DateRangeOf, DateValueType }
export { readDateValue, writeDateValue }

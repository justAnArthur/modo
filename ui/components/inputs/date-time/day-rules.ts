/*
 * Local addition (not part of Fluid Functionalism): which days a typed date
 * may land on, for the pickers over Calendar.
 */

import { endOfMonth } from 'date-fns'
import { dateMatchModifiers, type Matcher } from 'react-day-picker'

interface DayRules {
  startMonth?: Date
  endMonth?: Date
  disabledDays?: Matcher | Matcher[]
  /** Days left out of the calendar: never picked or typed either. */
  hidden?: Matcher | Matcher[]
}

/** Whether `date` lies in the calendar's months and matches none of `disabledDays` or `hidden`. */
export function isDayAllowed(date: Date, { startMonth, endMonth, disabledDays, hidden }: DayRules) {
  return (
    (!startMonth || date >= startMonth) &&
    (!endMonth || date <= endOfMonth(endMonth)) &&
    !(disabledDays && dateMatchModifiers(date, disabledDays)) &&
    !(hidden && dateMatchModifiers(date, hidden))
  )
}

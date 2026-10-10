/*
 * Local addition (not part of Fluid Functionalism): what the date and time
 * pickers read off a locale. The locale is react-day-picker's (a date-fns
 * `Locale`, `import { de } from 'react-day-picker/locale'`); Intl fills in
 * what date-fns doesn't carry (the hour cycle, field names).
 */

import { isValid, type Locale, parse } from 'date-fns'
import { enUS } from 'react-day-picker/locale'

type HourCycle = 'h11' | 'h12' | 'h23' | 'h24'

const defaultLocale: Locale = enUS

/** The clock the locale writes times on: `h12` / `h11` read with AM/PM. */
function hourCycleOf(locale: Locale): HourCycle {
  return new Intl.DateTimeFormat(locale.code, { hour: 'numeric' }).resolvedOptions().hourCycle ?? 'h23'
}

function parseWith(text: string, patterns: string[], locale: Locale, reference: Date): Date | null {
  for (const pattern of patterns) {
    const date = parse(text.trim(), pattern, reference, { locale })
    // A year under four digits is one still being typed ("9.10.20").
    if (isValid(date) && date.getFullYear() >= 1000) return date
  }
  return null
}

/** A typed date in any of the locale's own formats, short to full: "09.10.2026", "9 Oct 2026", "October 9, 2026". */
function parseDateText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, ['P', 'PP', 'PPP', 'PPPP'], locale, reference)
}

/** A typed time, in the locale's format ("3:33 PM") or on a 24-hour clock ("15:33"), on `reference`'s day. */
function parseTimeText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, ['p', 'HH:mm', 'H:mm'], locale, reference)
}

/** A typed month and year: "October 2026", "Oct 2026", "10/2026". */
function parseMonthText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, ['LLLL y', 'LLL y', 'MM/y', 'M/y', 'MM.y'], locale, reference)
}

/** The locale's name for a date field, for a column's accessible label. */
function fieldLabel(locale: Locale, field: 'month' | 'year' | 'hour' | 'minute' | 'dayPeriod') {
  return new Intl.DisplayNames(locale.code, { type: 'dateTimeField' }).of(field) ?? field
}

export type { HourCycle }
export { defaultLocale, fieldLabel, hourCycleOf, parseDateText, parseMonthText, parseTimeText }

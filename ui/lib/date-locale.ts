/*
 * Local addition (not part of Fluid Functionalism): what the date and time
 * pickers read off a locale. The locale is react-day-picker's (a date-fns
 * `Locale`, `import { de } from 'react-day-picker/locale'`); Intl fills in
 * what date-fns doesn't carry (the hour cycle, field names). A BCP 47 tag
 * ("sk", "de-AT") becomes a date-fns `Locale` read off Intl (`resolveLocale`,
 * after utegsk/ui's `localeFromTag`).
 */

import { format, isValid, type Locale, parse } from 'date-fns'
import { enUS } from 'react-day-picker/locale'

type HourCycle = 'h11' | 'h12' | 'h23' | 'h24'

const defaultLocale: Locale = enUS

/** The clock the locale writes times on: `h12` / `h11` read with AM/PM. */
function hourCycleOf(locale: Locale): HourCycle {
  return new Intl.DateTimeFormat(locale.code, { hour: 'numeric' }).resolvedOptions().hourCycle ?? 'h23'
}

function parseWith(text: string, patterns: string[], locale: Locale, reference: Date): Date | null {
  // Intl writes a narrow no-break space before AM/PM; typing has a plain one.
  const typed = text.trim().replace(/\s+/g, ' ')
  for (const pattern of patterns) {
    const date = parse(typed, pattern, reference, { locale })
    // A year under four digits is one still being typed ("9.10.20").
    if (isValid(date) && date.getFullYear() >= 1000) return date
  }
  return null
}

const DATE_PATTERNS = ['P', 'PP', 'PPP', 'PPPP']
const TIME_PATTERNS = ['p', 'HH:mm', 'H:mm', 'h:mm a']

/** A typed date in any of the locale's own formats, short to full: "09.10.2026", "9 Oct 2026", "October 9, 2026". */
function parseDateText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, DATE_PATTERNS, locale, reference)
}

/** A typed time, in the locale's format ("3:33 PM") or on a 24-hour clock ("15:33"), on `reference`'s day. */
function parseTimeText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, TIME_PATTERNS, locale, reference)
}

/** A typed date with an optional time after it ("9 Oct 2026, 15:33"); a date alone keeps `reference`'s time. */
function parseDateTimeText(text: string, locale: Locale, reference = new Date()) {
  const withTime = DATE_PATTERNS.flatMap(date => TIME_PATTERNS.flatMap(time => [`${date}, ${time}`, `${date} ${time}`]))
  return parseWith(text, withTime, locale, reference) ?? parseWith(text, DATE_PATTERNS, locale, reference)
}

/** A typed month and year: "October 2026", "Oct 2026", "10/2026". */
function parseMonthText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, ['LLLL y', 'LLL y', 'MM/y', 'M/y', 'MM.y'], locale, reference)
}

/** A typed month alone ("October", "Oct", "10"), in `reference`'s year. */
function parseMonthNameText(text: string, locale: Locale, reference = new Date()) {
  return parseWith(text, ['LLLL', 'LLL', 'MM', 'M'], locale, reference)
}

/** The locale's name for a date field, for a column's accessible label. */
function fieldLabel(locale: Locale, field: 'month' | 'year' | 'hour' | 'minute' | 'dayPeriod') {
  return new Intl.DisplayNames(locale.code, { type: 'dateTimeField' }).of(field) ?? field
}

/** A time of day as the locale writes it ('p'), on `hourCycle`'s clock when that isn't the locale's own. */
function formatTime(date: Date, locale: Locale, hourCycle?: HourCycle) {
  if (!hourCycle || hourCycle === hourCycleOf(locale)) return format(date, 'p', { locale })
  return new Intl.DateTimeFormat(locale.code, { hour: 'numeric', minute: '2-digit', hourCycle }).format(date)
}

/* A BCP 47 tag as a date-fns Locale */

type Width = 'narrow' | 'short' | 'abbreviated' | 'wide' | 'any'

const INTL_WIDTH: Record<Width, 'narrow' | 'short' | 'long'> = {
  narrow: 'narrow',
  short: 'short',
  abbreviated: 'short',
  wide: 'long',
  any: 'long',
}

// Mon 2 Jan 2006, 09:04:05: single digits show whether the locale pads them.
const SAMPLE = new Date(2006, 0, 2, 9, 4, 5)

const part = (tag: string, options: Intl.DateTimeFormatOptions, date: Date, type: Intl.DateTimeFormatPartTypes) =>
  new Intl.DateTimeFormat(tag, options).formatToParts(date).find(p => p.type === type)?.value ?? ''

// Punctuation and spaces stand as they are; anything else is quoted, as date-fns wants letters to be.
const literal = (text: string) => {
  const plain = text.replace(/\s/g, ' ')
  return /^[ ,./:-]*$/.test(plain) ? plain : `'${plain.replaceAll("'", "''")}'`
}

/** The date-fns pattern the locale writes a date or time in, read off Intl. */
function patternOf(tag: string, options: Intl.DateTimeFormatOptions) {
  const formatter = new Intl.DateTimeFormat(tag, options)
  const twelve = formatter.resolvedOptions().hourCycle
  const hourLetter = twelve === 'h23' ? 'H' : twelve === 'h24' ? 'k' : twelve === 'h11' ? 'K' : 'h'
  return formatter
    .formatToParts(SAMPLE)
    .map(({ type, value }) => {
      const padded = value.length > 1
      if (type === 'year') return value.length === 2 ? 'yy' : 'y'
      if (type === 'month') {
        if (/^\d+$/.test(value)) return padded ? 'MM' : 'M'
        return value === part(tag, { month: 'long', day: 'numeric' }, SAMPLE, 'month') ? 'MMMM' : 'MMM'
      }
      if (type === 'day') return padded ? 'dd' : 'd'
      if (type === 'weekday') return value === part(tag, { weekday: 'long' }, SAMPLE, 'weekday') ? 'EEEE' : 'EEE'
      if (type === 'hour') return padded ? hourLetter + hourLetter : hourLetter
      if (type === 'minute') return 'mm'
      if (type === 'second') return 'ss'
      if (type === 'dayPeriod') return 'a'
      return literal(value)
    })
    .join('')
}

/** The first day of the week, where the engine knows it (`Intl.Locale` week info); else Sunday. */
function weekStartOf(tag: string) {
  const locale = new Intl.Locale(tag) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number }
    weekInfo?: { firstDay: number }
  }
  const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay ?? 7
  return (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/** A date-fns Locale for a BCP 47 tag: Intl's month, weekday and AM/PM names, formats and first weekday; typing reads numeric dates and English names. */
function localeFromTag(tag: string): Locale {
  const width = (options?: { width?: Width }) => INTL_WIDTH[options?.width ?? 'wide']
  return {
    ...enUS,
    code: tag,
    localize: {
      ...enUS.localize,
      month: (month, options) =>
        part(
          tag,
          // Beside a day a month takes its formatting form (Slovak "októbra"), alone its standalone one.
          options?.context === 'formatting' ? { month: width(options), day: 'numeric' } : { month: width(options) },
          new Date(2000, month, 1),
          'month',
        ),
      day: (day, options) => part(tag, { weekday: width(options) }, new Date(2000, 0, 2 + day), 'weekday'),
      dayPeriod: (period, options) =>
        part(tag, { hour: 'numeric', hourCycle: 'h12' }, new Date(2000, 0, 1, period === 'pm' ? 13 : 1), 'dayPeriod') ||
        enUS.localize.dayPeriod(period, options),
    },
    formatLong: {
      date: ({ width: w = 'full' } = {}) => patternOf(tag, { dateStyle: w as 'full' | 'long' | 'medium' | 'short' }),
      time: ({ width: w = 'full' } = {}) =>
        patternOf(tag, { timeStyle: w === 'full' || w === 'long' ? 'medium' : 'short' }),
      dateTime: enUS.formatLong.dateTime,
    },
    options: { ...enUS.options, weekStartsOn: weekStartOf(tag) },
  }
}

const fromTag = new Map<string, Locale>()

/**
 * The locale the pickers work in: a react-day-picker / date-fns `Locale` as
 * given, or a BCP 47 tag ("sk", "de-AT") read through Intl (cached, so the
 * same tag is the same object). An unknown tag falls back to `enUS`.
 */
function resolveLocale(locale: Locale | string = defaultLocale): Locale {
  if (typeof locale !== 'string') return locale
  let resolved = fromTag.get(locale)
  if (resolved) return resolved
  try {
    resolved = localeFromTag(Intl.getCanonicalLocales(locale)[0] ?? 'en-US')
  } catch {
    resolved = defaultLocale
  }
  fromTag.set(locale, resolved)
  return resolved
}

export type { HourCycle }
export {
  defaultLocale,
  fieldLabel,
  formatTime,
  hourCycleOf,
  parseDateText,
  parseDateTimeText,
  parseMonthNameText,
  parseMonthText,
  parseTimeText,
  resolveLocale,
}

/*
 * Local addition (not part of Fluid Functionalism): the numeric mask an
 * editable DatePicker types into, in the locale's own order ("DD.MM.YYYY",
 * "MM/DD/YYYY", with "HH:mm" for a time). After utegsk/ui's
 * `MaskedDateInput`. Pure: the field keeps only digits and lays them out here.
 */

import { getDate, getHours, getMinutes, getMonth, getYear, isValid, type Locale, set } from 'date-fns'

type MaskPart = 'day' | 'month' | 'year' | 'hour' | 'minute'
type MaskSlot = { type: MaskPart; width: number } | { type: 'literal'; value: string }

const GHOST: Record<MaskPart, string> = { day: 'DD', month: 'MM', year: 'YYYY', hour: 'HH', minute: 'mm' }

/**
 * The locale's numeric date as a mask: parts in order, literals between.
 * The time is always on a 24-hour clock: digits alone can't say AM or PM.
 */
function dateMask(locale: Locale, withTime: boolean): MaskSlot[] {
  const parts = new Intl.DateTimeFormat(locale.code, {
    calendar: 'gregory',
    numberingSystem: 'latn',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  }).formatToParts(new Date(2006, 10, 22, 13, 45))
  return parts.flatMap<MaskSlot>(part => {
    if (part.type === 'literal') return [{ type: 'literal', value: part.value }]
    if (!(part.type in GHOST)) return []
    const type = part.type as MaskPart
    return [{ type, width: type === 'year' ? 4 : 2 }]
  })
}

/** Every digit the locale writes, mapped to its Latin twin, so "٢" types as "2". */
function localeDigits(locale: Locale) {
  const format = new Intl.NumberFormat(locale.code, { useGrouping: false })
  const map = new Map<string, string>()
  for (let digit = 0; digit <= 9; digit++) {
    map.set(String(digit), String(digit))
    for (const char of format.format(digit)) if (/\p{Nd}/u.test(char)) map.set(char, String(digit))
  }
  return map
}

const maskLength = (mask: MaskSlot[]) => mask.reduce((n, slot) => n + (slot.type === 'literal' ? 0 : slot.width), 0)

/** The whole mask as placeholders: "DD.MM.YYYY". */
const maskGhost = (mask: MaskSlot[]) =>
  mask.map(slot => (slot.type === 'literal' ? slot.value : GHOST[slot.type])).join('')

/** Typed digits laid into the mask; a literal follows each finished part. */
function layoutMask(digits: string, mask: MaskSlot[]) {
  let at = 0
  let text = ''
  for (const slot of mask) {
    if (slot.type === 'literal') {
      if (text) text += slot.value
      continue
    }
    const chunk = digits.slice(at, at + slot.width)
    if (!chunk) break
    text += chunk
    at += chunk.length
    if (chunk.length < slot.width) break
  }
  return text.trimEnd()
}

function formatMask(date: Date, mask: MaskSlot[]) {
  const values: Record<MaskPart, number> = {
    day: getDate(date),
    month: getMonth(date) + 1,
    year: getYear(date),
    hour: getHours(date),
    minute: getMinutes(date),
  }
  return mask
    .map(slot => (slot.type === 'literal' ? slot.value : String(values[slot.type]).padStart(slot.width, '0')))
    .join('')
}

/**
 * A full set of digits as a date, keeping `base`'s time when the mask has
 * none; `null` while incomplete, or when no such day (or time) exists.
 */
function parseMask(digits: string, mask: MaskSlot[], base: Date | null): Date | null {
  if (digits.length !== maskLength(mask)) return null
  const values: Partial<Record<MaskPart, number>> = {}
  let at = 0
  for (const slot of mask) {
    if (slot.type === 'literal') continue
    values[slot.type] = Number(digits.slice(at, at + slot.width))
    at += slot.width
  }
  const { day = 0, month = 0, year = 0, hour, minute } = values
  const date = set(base ?? new Date(0), {
    year,
    month: month - 1,
    date: day,
    hours: hour ?? base?.getHours() ?? 0,
    minutes: minute ?? base?.getMinutes() ?? 0,
    seconds: 0,
    milliseconds: 0,
  })
  // `set` rolls over (31 Feb → 3 Mar, 25:00 → the next day): only an exact match counts.
  const exact =
    isValid(date) &&
    year >= 1000 &&
    getYear(date) === year &&
    getMonth(date) === month - 1 &&
    getDate(date) === day &&
    (hour === undefined || getHours(date) === hour) &&
    (minute === undefined || getMinutes(date) === minute)
  return exact ? date : null
}

type MaskEdit = { digit: string } | 'Backspace' | 'Delete'

/**
 * One keystroke on the digits, between digit offsets `from` and `to` (the
 * selection). A digit overtypes in place, so the fixed-width mask edits like a
 * segmented field; Backspace and Delete cut the selection or one digit.
 * Returns the new digits and the caret's digit offset, or `null` for a no-op.
 */
function editMask(digits: string, from: number, to: number, edit: MaskEdit, length: number) {
  if (typeof edit === 'object') {
    const next =
      from === to
        ? digits.slice(0, from) + edit.digit + digits.slice(from + 1)
        : digits.slice(0, from) + edit.digit + digits.slice(to)
    return { digits: next.slice(0, length), caret: Math.min(from + 1, length) }
  }
  let cutFrom = from
  let cutTo = to
  if (cutFrom === cutTo) {
    if (edit === 'Backspace') cutFrom = Math.max(0, cutFrom - 1)
    else cutTo = Math.min(digits.length, cutTo + 1)
  }
  if (cutFrom === cutTo) return null
  return { digits: digits.slice(0, cutFrom) + digits.slice(cutTo), caret: cutFrom }
}

export type { MaskEdit, MaskPart, MaskSlot }
export { dateMask, editMask, formatMask, layoutMask, localeDigits, maskGhost, maskLength, parseMask }

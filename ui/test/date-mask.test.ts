import { describe, expect, test } from 'bun:test'
import { ar, de, enUS } from 'react-day-picker/locale'
import { readDateValue, writeDateValue } from '../components/inputs/date-time/date-value'
import {
  dateMask,
  editMask,
  formatMask,
  layoutMask,
  localeDigits,
  maskGhost,
  maskLength,
  parseMask,
} from '../lib/date-mask'

describe('dateMask', () => {
  test('follows the locale order and separators', () => {
    expect(maskGhost(dateMask(de, false))).toBe('DD.MM.YYYY')
    expect(maskGhost(dateMask(enUS, false))).toBe('MM/DD/YYYY')
    expect(maskLength(dateMask(enUS, false))).toBe(8)
  })

  test('adds a 24-hour time', () => {
    expect(maskGhost(dateMask(de, true))).toBe('DD.MM.YYYY, HH:mm')
    expect(maskLength(dateMask(enUS, true))).toBe(12)
  })
})

describe('layoutMask', () => {
  const mask = dateMask(de, false)

  test('a literal follows each finished part only', () => {
    expect(layoutMask('', mask)).toBe('')
    expect(layoutMask('0', mask)).toBe('0')
    expect(layoutMask('09', mask)).toBe('09.')
    expect(layoutMask('0910', mask)).toBe('09.10.')
    expect(layoutMask('09102026', mask)).toBe('09.10.2026')
  })
})

describe('formatMask / parseMask', () => {
  const de0 = dateMask(de, false)
  const en1 = dateMask(enUS, true)

  test('round-trips a date', () => {
    const date = new Date(2026, 9, 9)
    expect(formatMask(date, de0)).toBe('09.10.2026')
    expect(parseMask('09102026', de0, null)).toEqual(date)
    expect(formatMask(new Date(2026, 9, 9, 15, 33), en1)).toBe('10/09/2026, 15:33')
    expect(parseMask('100920261533', en1, null)).toEqual(new Date(2026, 9, 9, 15, 33))
  })

  test('keeps the base time when the mask has none', () => {
    expect(parseMask('09102026', de0, new Date(2000, 0, 1, 8, 30))).toEqual(new Date(2026, 9, 9, 8, 30))
  })

  test('refuses incomplete, impossible and short-year dates', () => {
    expect(parseMask('0910202', de0, null)).toBeNull()
    expect(parseMask('31022026', de0, null)).toBeNull()
    expect(parseMask('09130026', de0, null)).toBeNull()
    expect(parseMask('09100999', de0, null)).toBeNull()
    expect(parseMask('100920262500', en1, null)).toBeNull()
  })
})

describe('localeDigits', () => {
  test("maps the locale's own digits to Latin ones", () => {
    const digits = localeDigits({ ...ar, code: 'ar-EG' })
    expect(digits.get('٢')).toBe('2')
    expect(digits.get('7')).toBe('7')
    expect(digits.get('.')).toBeUndefined()
  })
})

describe('editMask', () => {
  test('a digit overtypes in place, or appends at the end', () => {
    expect(editMask('0910', 1, 1, { digit: '5' }, 8)).toEqual({ digits: '0510', caret: 2 })
    expect(editMask('09', 2, 2, { digit: '1' }, 8)).toEqual({ digits: '091', caret: 3 })
  })

  test('a digit replaces a selection', () => {
    expect(editMask('09102026', 0, 8, { digit: '1' }, 8)).toEqual({ digits: '1', caret: 1 })
  })

  test('a full mask takes no more digits', () => {
    expect(editMask('09102026', 8, 8, { digit: '1' }, 8)).toEqual({ digits: '09102026', caret: 8 })
  })

  test('Backspace and Delete cut one digit or the selection', () => {
    expect(editMask('0910', 4, 4, 'Backspace', 8)).toEqual({ digits: '091', caret: 3 })
    expect(editMask('0910', 0, 0, 'Delete', 8)).toEqual({ digits: '910', caret: 0 })
    expect(editMask('0910', 1, 3, 'Backspace', 8)).toEqual({ digits: '00', caret: 1 })
    expect(editMask('0910', 0, 0, 'Backspace', 8)).toBeNull()
  })
})

describe('date values', () => {
  test('a bare ISO day reads as local midnight', () => {
    expect(readDateValue('2026-10-09')).toEqual(new Date(2026, 9, 9))
    expect(readDateValue('2026-10-09T15:33')).toEqual(new Date(2026, 9, 9, 15, 33))
  })

  test('empty reads as null, an unreadable string as an Invalid Date', () => {
    expect(readDateValue(null)).toBeNull()
    expect(readDateValue('')).toBeNull()
    expect(Number.isNaN(readDateValue('soon')?.getTime())).toBe(true)
  })

  test('writes the type asked for', () => {
    const date = new Date(2026, 9, 9, 15, 33)
    expect(writeDateValue(date, 'date')).toBe(date)
    expect(writeDateValue(date, 'string')).toBe('2026-10-09')
    expect(writeDateValue(date, 'string', true)).toBe('2026-10-09T15:33')
  })
})

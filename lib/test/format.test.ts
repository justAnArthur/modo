import { describe, expect, test } from 'bun:test'
import { lengthMeta, ms, primaryFamily, px, range, rem } from '../src/runtime/tokens/format'

describe('token formatting', () => {
  test('px, ms and rem trim trailing zeros', () => {
    expect([px(16), px(0.5), px(2.3333), rem(12), rem(10)]).toEqual(['16px', '0.5px', '2.33px', '0.75rem', '0.625rem'])
    expect([ms(150), ms(0.5), ms(66.6667)]).toEqual(['150ms', '0.5ms', '66.67ms'])
  })

  test('a length shows its declared value, then the units it is not in', () => {
    expect(lengthMeta('0.25rem', 4)).toBe('0.25rem · 4px')
    expect(lengthMeta('8px', 8)).toBe('8px · 0.5rem')
    expect(lengthMeta('calc(var(--radius) - 4px)', 6)).toBe('calc(var(--radius) - 4px) · 6px · 0.375rem')
    expect(lengthMeta('9999px', 9999)).toBe('9999px')
    expect(lengthMeta('auto', null)).toBe('auto')
  })

  test('a range needs two distinct known sizes', () => {
    expect(range([4, null, 32, 8])).toBe('4px to 32px')
    expect(range([4, 4])).toBeNull()
    expect(range([null])).toBeNull()
  })

  test('the primary family is the first in the stack, unquoted', () => {
    expect(primaryFamily('"Inter Variable", ui-sans-serif')).toBe('Inter Variable')
    expect(primaryFamily('system-ui')).toBe('system-ui')
  })
})

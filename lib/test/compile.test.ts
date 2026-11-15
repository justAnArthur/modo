import { describe, expect, test } from 'bun:test'
import { compileExampleBody, loadBabel } from '../src/runtime/items/compile'

describe('compileExampleBody', () => {
  test('one-line siblings compile', async () => {
    await loadBabel()
    expect(typeof compileExampleBody('<b>a</b> <b>b</b>')).toBe('function')
  })
})

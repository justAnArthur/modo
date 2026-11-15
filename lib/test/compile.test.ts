import { describe, expect, test } from 'bun:test'
import { compileExampleBody, loadBabel } from '../src/runtime/items/compile'

describe('compileExampleBody', () => {
  test('one-line siblings compile', async () => {
    await loadBabel()
    expect(compileExampleBody('<b>a</b> <b>b</b>')).toBeFunction()
  })
})

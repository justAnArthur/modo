import { describe, expect, test } from 'bun:test'
import { buildGroup, parseCss } from '../src/lib/css'
import { compileExampleBody, isCompiledExample } from '../src/lib/example'
import { parseItemSource } from '../src/lib/tsdoc'

describe('parseItemSource', () => {
  test("a prop's doc is not the item's", () => {
    const r = parseItemSource(
      `export default function Button({ children }: {\n  /** Button content. */\n  children?: string\n}) {}`,
    )
    expect(r.description).toBe('')
  })

  test('a union laid out one member per line', () => {
    const r = parseItemSource(
      `export default function X({ variant }: {\n  variant?:\n    | 'primary'\n    | 'secondary'\n  size?: number\n}) {}`,
    )
    expect(r.props.map(p => [p.name, p.type])).toEqual([
      ['variant', "'primary' | 'secondary'"],
      ['size', 'number'],
    ])
  })

  test('a generic component exported at the bottom', () => {
    const r = parseItemSource(
      `/** Item doc. */\nfunction Item() {}\n\n/** Select doc. */\nfunction Select<T extends string>({ value }: { value: T }) {}\nexport default Select\n`,
    )
    expect([r.description, r.props.map(p => p.name)]).toEqual(['Select doc.', ['value']])
  })

  test('props: { … } is a type literal, not destructuring', () => {
    const r = parseItemSource(`export default function X(props: { /** A. */ a: string }) {}`)
    expect(r.props).toEqual([{ name: 'a', optional: false, type: 'string', description: 'A.' }])
  })

  test('an anonymous default export leaves the name to the bundler', () => {
    expect(parseItemSource(`export default function ({ a }: { a?: string }) {}`).name).toBe('')
  })

  test('@default fills the column; @values drops for literal unions', () => {
    const r = parseItemSource(
      `export default function T({ size }: {\n  /** Style. @values a, b @default 'a' */\n  variant?: 'a' | 'b'\n  /** Size. @values default, sm */\n  size?: string\n}) {}`,
    )
    expect(r.props.map(p => [p.default, p.description])).toEqual([
      ["'a'", 'Style.'],
      [undefined, 'Size. One of `default`, `sm`.'],
    ])
  })
})

describe('parseCss', () => {
  test('the last declaration in a block needs no `;`', () => {
    expect(parseCss(':root { --a: red }\n.dark { --b: blue; }').map(v => [v.name, v.value])).toEqual([
      ['--a', 'red'],
      ['--b', 'blue'],
    ])
  })

  test('typography by name: weights, leading and tracking are not sizes', () => {
    const vars = parseCss(
      ':root { --leading-tight: 1.25; --tracking-tight: -0.01em; --font-weight-bold: 700; --text-h1: 6rem; --font-sans: Inter }',
    )
    expect(buildGroup('typography', vars).vars.map(v => v.swatch?.kind)).toEqual([
      undefined,
      undefined,
      'font-weight',
      'font-size',
      'font-family',
    ])
  })

  test('a type role classifies by what it references; its color has no swatch', () => {
    const vars = parseCss(
      ':root { --text-body: 13px; --font-size-p: var(--text-body); --line-height-p: 20px; --color-p: var(--muted) }',
    )
    expect(buildGroup('typography', vars).vars.map(v => v.swatch?.kind)).toEqual([
      'font-size',
      'font-size',
      undefined,
      undefined,
    ])
  })
})

describe('compileExampleBody', () => {
  test('one-line siblings compile', () => {
    expect(isCompiledExample(compileExampleBody('<b>a</b> <b>b</b>'))).toBe(true)
  })
})

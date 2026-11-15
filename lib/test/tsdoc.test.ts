import { describe, expect, test } from 'bun:test'
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

  test('a component without props has no props and no errors', () => {
    const r = parseItemSource(`/** Divider. */\nexport default function Divider() {}`)
    expect([r.props, r.errors]).toEqual([[], []])
  })

  test('an anonymous default export leaves the name to the bundler', () => {
    expect(parseItemSource(`export default function ({ a }: { a?: string }) {}`).name).toBe('')
  })

  test('block tags around @example neither leak into prose nor drop examples', () => {
    const r = parseItemSource(
      `/**\n * Lead.\n * @deprecated Use Y.\n * @example {@include ./examples.mdx}\n * @since 1.2\n */\nexport default function X() {}`,
    )
    expect([r.description, r.exampleDocs, r.tags]).toEqual([
      'Lead.',
      ['./examples.mdx'],
      [
        { tag: 'deprecated', text: 'Use Y.' },
        { tag: 'since', text: '1.2' },
      ],
    ])
  })

  test('an unknown @word at line start stays prose', () => {
    const r = parseItemSource(`/**\n * Built over the\n * @fluid sidebar.\n */\nexport default function X() {}`)
    expect([r.description, r.tags]).toEqual(['Built over the\n@fluid sidebar.', []])
  })

  test('an @ line inside an example fence is code, not a tag', () => {
    const r = parseItemSource(
      '/**\n * @example\n * ```tsx\n * @media\n * <X />\n * ```\n */\nexport default function X() {}',
    )
    expect([r.examples.map(e => e.code), r.tags]).toEqual([['@media\n<X />'], []])
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

  test('a modifier tag leaves the lines after it to the description', () => {
    const r = parseItemSource('/**\n * Button.\n * @beta\n * Second paragraph.\n */\nexport default function X() {}')
    expect([r.description, r.tags]).toEqual(['Button.\nSecond paragraph.', [{ tag: 'beta', text: '' }]])
  })

  test('an @ line inside a ~~~ fence is code, not a tag', () => {
    const r = parseItemSource('/**\n * Lead.\n * ~~~css\n * @deprecated\n * ~~~\n */\nexport default function X() {}')
    expect(r.tags).toEqual([])
  })
})

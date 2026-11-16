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

  test('parts through Object.assign: the block on the const, props from the function', () => {
    const r = parseItemSource(
      `interface PopoverProps {\n  /** Opens it. */\n  open?: boolean\n}\nfunction Trigger() {\n  return null\n}\n/** Popover. */\nconst Popover = Object.assign(\n  function Popover({ open = false }: PopoverProps) {\n    return null\n  },\n  { Trigger },\n)\nexport default Popover\n`,
    )
    expect([r.name, r.description, r.props, r.errors]).toEqual([
      'Popover',
      'Popover.',
      [{ name: 'open', optional: true, type: 'boolean', default: 'false', description: 'Opens it.' }],
      [],
    ])
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
    expect([r.description, r.mdxExamples, r.tags]).toEqual([
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

  test('a forwardRef const takes its props from the named type, an extending interface too', () => {
    const r = parseItemSource(
      `interface InputProps extends Base {\n  /** Size. */\n  size?: 'sm' | 'md'\n}\n/** Input. */\nconst Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => null)\nexport default Input\n`,
    )
    expect([r.description, r.props, r.errors]).toEqual([
      'Input.',
      [{ name: 'size', optional: true, type: "'sm' | 'md'", description: 'Size.' }],
      [],
    ])
  })

  test('a generic component takes its props from a generic interface', () => {
    const r = parseItemSource(
      `interface PickerProps<T extends Kind = 'date'> {\n  /** The value. */\n  value?: ValueOf<T> | null\n}\n/** Picker. */\nfunction Picker<T extends Kind = 'date'>({ value = null }: PickerProps<T>) {}\nexport default Picker\n`,
    )
    expect([r.description, r.props, r.errors]).toEqual([
      'Picker.',
      [{ name: 'value', optional: true, type: 'ValueOf<T> | null', description: 'The value.', default: 'null' }],
      [],
    ])
  })

  test('a forwardRef over a type alias', () => {
    const r = parseItemSource(
      `type P = { a: string }\nconst X = forwardRef<HTMLDivElement, P>(() => null)\nexport default X\n`,
    )
    expect(r.props.map(p => p.name)).toEqual(['a'])
  })

  test('{@include} inlines Markdown, {@includeCode} fences it with its language, a missing file is an error', () => {
    const files: Record<string, string> = { './guide.md': 'Guide **text**.\n', './demo.ts': 'const a = 1\n' }
    const r = parseItemSource(
      `/**\n * Lead.\n *\n * {@include ./guide.md}\n *\n * {@includeCode ./demo.ts}\n *\n * {@include ./gone.md}\n */\nexport default function X() {}`,
      { readFile: path => files[path] ?? null },
    )
    expect(r.description).toBe('Lead.\n\nGuide **text**.\n\n```ts\nconst a = 1\n```')
    expect(r.errors).toEqual(['{@include ./gone.md}: file not found'])
  })

  test('@example {@include ./x.mdx} lands in mdxExamples; an inline example stays an example', () => {
    const r = parseItemSource(
      '/**\n * @example {@include ./examples.mdx}\n * @example\n * # Basic\n * ```tsx\n * <X />\n * ```\n */\nexport default function X() {}',
      { readFile: () => 'never read' },
    )
    expect([r.mdxExamples, r.examples]).toEqual([
      ['./examples.mdx'],
      [{ title: 'Basic', description: undefined, code: '<X />' }],
    ])
  })

  test('a bare JSX @example on the tag line is the code', () => {
    const r = parseItemSource('/**\n * Lead.\n * @example <Greeting name="Ada" />\n */\nexport default function X() {}')
    expect([r.examples, r.errors]).toEqual([[{ code: '<Greeting name="Ada" />' }], []])
  })

  test('a bare multi-line JSX @example runs to the next tag', () => {
    const r = parseItemSource(
      '/**\n * @example\n * <Stack>\n *   <X />\n * </Stack>\n * @since 1.2\n */\nexport default function X() {}',
    )
    expect([r.examples, r.tags]).toEqual([[{ code: '<Stack>\n  <X />\n</Stack>' }], [{ tag: 'since', text: '1.2' }]])
  })

  test('a bare JSX @example takes a # title and caption above it, as a fenced one does', () => {
    const r = parseItemSource(
      '/**\n * @example\n * # Tones\n * Two of them.\n * <X />\n * <X tone="accent" />\n */\nexport default function X() {}',
    )
    expect(r.examples).toEqual([{ title: 'Tones', description: 'Two of them.', code: '<X />\n<X tone="accent" />' }])
  })

  test('an @example with neither a fence nor JSX is reported, not dropped silently', () => {
    const r = parseItemSource('/**\n * @example Just words.\n */\nexport default function X() {}')
    expect([r.examples, r.errors]).toEqual([
      [],
      ['@example without code: fence it, or start its JSX on a line of its own with `<`'],
    ])
  })

  test('an @ line inside a ~~~ fence is code, not a tag', () => {
    const r = parseItemSource('/**\n * Lead.\n * ~~~css\n * @deprecated\n * ~~~\n */\nexport default function X() {}')
    expect(r.tags).toEqual([])
  })
})

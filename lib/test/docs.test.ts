import { beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { createDocsService as create, type DocsService } from '../src/node/docs'
import { createBundler } from '../src/plugins/bundle'

// The fixture host with its packages installed. node_modules is gitignored, so the packages
// live in fixtures/docs/packages and are copied in; `*.tmp` is ignored too, and the copy sits
// inside lib so react's types resolve.
const FIXTURES = resolve(import.meta.dir, 'fixtures', 'docs')
const HOST = resolve(import.meta.dir, 'fixtures.tmp', 'docs-host')
const item = (id: string) => join(HOST, 'components', id, 'index.tsx')
const fromHost = (files: string[]) => files.map(f => relative(HOST, f))
const IDS = [
  'default-reexport',
  'import-reexport',
  'named-reexport',
  'relative-reexport',
  'third-party',
  'typed-reexport',
  'wrapper',
  'wrapper-by-name',
]

async function createDocsService(opts: Parameters<typeof create>[0]): Promise<DocsService> {
  const service = await create(opts)
  if (!service) throw new Error('typescript is a devDependency of the lib')
  return service
}

let docs: DocsService

beforeAll(async () => {
  rmSync(HOST, { recursive: true, force: true })
  cpSync(join(FIXTURES, 'host'), HOST, { recursive: true })
  for (const name of readdirSync(join(FIXTURES, 'packages')))
    cpSync(join(FIXTURES, 'packages', name), join(HOST, 'node_modules', name), { recursive: true })
  docs = await createDocsService({ root: HOST })
  docs.refresh(IDS.map(item))
})

const write = (file: string, text: string) => {
  mkdirSync(resolve(file, '..'), { recursive: true })
  writeFileSync(file, text)
}

const BASE_DOCS = 'A button from the base design system.\n\nIt presses.'
const BASE_EXAMPLES = ['node_modules/base-ds/components/button/examples.mdx']

describe('re-exports', () => {
  test.each([
    ['default-reexport', 'Button'],
    ['named-reexport', 'Button'],
    ['import-reexport', 'Button'],
  ])('%s reads the source behind the `source` condition', (id, name) => {
    const p = docs.parse(item(id))
    expect(p.errors).toEqual([])
    expect(p.name).toBe(name)
    expect(p.description).toBe(BASE_DOCS)
    expect(p.tags).toEqual([{ tag: 'since', text: '2.0' }])
    expect(fromHost(p.mdxExamples)).toEqual(BASE_EXAMPLES)
    // Inherited DOM attributes and the non-modo package's props stay out.
    expect(p.props.map(prop => [prop.name, prop.type, prop.default])).toEqual([
      ['variant', "'solid' | 'ghost'", "'solid'"],
      ['loading', 'boolean', undefined],
      ['children', 'ReactNode', undefined],
    ])
  })

  test('a package with typings only is read from its .d.ts', () => {
    const p = docs.parse(item('typed-reexport'))
    expect(p.errors).toEqual([])
    expect([p.name, p.description]).toEqual(['TypedButton', 'A button known only from its typings.'])
    expect(fromHost(p.mdxExamples)).toEqual(['node_modules/typed-ds/build/components/button/examples.mdx'])
    expect(p.props.map(prop => [prop.name, prop.default])).toEqual([['size', "'md'"]])
  })

  test('a relative re-export resolves includes next to its target', () => {
    const p = docs.parse(item('relative-reexport'))
    expect([p.name, p.description, p.errors]).toEqual(['Badge', 'A badge kept in a sibling file.', []])
    expect(fromHost(p.mdxExamples)).toEqual(['components/relative-reexport/examples.mdx'])
    expect(p.props).toEqual([{ name: 'label', type: 'string', optional: false, description: 'The label.' }])
  })
})

describe('{@inheritDoc}', () => {
  test('a wrapper gets the base docs and examples first, then its own; the tags are its own', () => {
    const p = docs.parse(item('wrapper'))
    expect(p.errors).toEqual([])
    expect(p.name).toBe('FancyButton')
    expect(p.description).toBe(`${BASE_DOCS}\n\nThe fancy one glows.`)
    expect(p.tags).toEqual([{ tag: 'beta', text: '' }])
    expect(fromHost(p.mdxExamples)).toEqual([...BASE_EXAMPLES, 'components/wrapper/examples.mdx'])
    expect(p.props.map(prop => [prop.name, prop.default])).toEqual([
      ['glow', 'false'],
      ['variant', "'solid'"],
      ['children', undefined],
    ])
  })

  test('by a name in scope, through a typings-only package', () => {
    const p = docs.parse(item('wrapper-by-name'))
    expect(p.errors).toEqual([])
    expect([p.name, p.description]).toEqual(['Submit', 'A button known only from its typings.\n\nSubmits a form.'])
    expect(fromHost(p.mdxExamples)).toEqual(['node_modules/typed-ds/build/components/button/examples.mdx'])
    expect(p.props.map(prop => prop.name)).toEqual(['form'])
  })

  test('an unresolvable reference is reported', async () => {
    const file = join(HOST, 'components', 'inline', 'index.tsx')
    const src = '/**\n * {@inheritDoc nope/missing}\n *\n * Own.\n */\nexport default function X() {}\n'
    const service = await createDocsService({ root: HOST, overlay: new Map([[file, src]]) })
    service.refresh([file])
    const p = service.parse(file)
    expect([p.description, p.errors]).toEqual([
      'Own.',
      ['{@inheritDoc nope/missing}: could not resolve "nope/missing"'],
    ])
  })

  test('a diamond is not a cycle; a cycle is reported once', async () => {
    const dir = join(HOST, 'late', 'diamond')
    const doc = (text: string, refs: string[]) =>
      `/**\n${refs.map(r => ` * {@inheritDoc ./${r}}\n`).join('')} * ${text}\n */\nexport default function X() {\n  return null\n}\n`
    const files = new Map([
      [join(dir, 'index.tsx'), doc('X.', ['b', 'c'])],
      [join(dir, 'b.tsx'), doc('B.', ['d'])],
      [join(dir, 'c.tsx'), doc('C.', ['d'])],
      [join(dir, 'd.tsx'), doc('D.', [])],
      [join(dir, 'loop.tsx'), doc('Loop.', ['loop'])],
    ])
    const service = await createDocsService({ root: HOST, overlay: files })
    service.refresh([join(dir, 'index.tsx'), join(dir, 'loop.tsx')])
    const p = service.parse(join(dir, 'index.tsx'))
    expect([p.description, p.errors]).toEqual(['D.\n\nB.\n\nD.\n\nC.\n\nX.', []])
    expect(service.parse(join(dir, 'loop.tsx')).errors).toEqual(['{@inheritDoc}: circular'])
  })
})

describe('runs', () => {
  test('an import that failed resolves once its file exists', async () => {
    const dir = join(HOST, 'late', 'late')
    rmSync(dir, { recursive: true, force: true })
    const file = join(dir, 'index.tsx')
    write(file, "export { default } from './impl'\n")
    const service = await createDocsService({ root: HOST })
    service.refresh([file])
    expect(service.parse(file).errors).toEqual(['Could not resolve the default export from "./impl"'])
    write(join(dir, 'impl.tsx'), '/** Late. */\nexport default function Late() {\n  return null\n}\n')
    service.refresh([file])
    expect(service.parse(file)).toMatchObject({ name: 'Late', description: 'Late.', errors: [] })
  })

  test("includes stay inside the comment's package", async () => {
    const pkg = join(HOST, 'node_modules', 'nosy')
    write(join(pkg, 'package.json'), '{ "name": "nosy", "exports": { ".": { "source": "./index.tsx" } } }')
    write(
      join(pkg, 'index.tsx'),
      '/**\n * Nosy. {@include ../../package.json}\n *\n * @example {@include ../../x.mdx}\n */\nexport default function Nosy() {\n  return null\n}\n',
    )
    const file = join(HOST, 'late', 'nosy', 'index.tsx')
    write(file, "export { default } from 'nosy'\n")
    const service = await createDocsService({ root: HOST })
    service.refresh([file])
    const p = service.parse(file)
    expect([p.description, p.mdxExamples]).toEqual(['Nosy.', []])
    expect(p.errors).toEqual([
      `@example {@include ../../x.mdx}: outside ${pkg}`,
      '{@include ../../package.json}: file not found',
    ])
  })
})

describe('props through the compiler', () => {
  const parse = async (src: string) => {
    const file = join(HOST, 'components', 'inline', 'index.tsx')
    const service = await createDocsService({ root: HOST, overlay: new Map([[file, src]]) })
    service.refresh([file])
    return service.parse(file)
  }

  test('extends, Omit, Pick, Partial and intersections; DOM attributes stay out', async () => {
    const p = await parse(`
      import type { HTMLAttributes } from 'react'
      interface Base {
        /** A. */
        a: string
        /** B. */
        b: number
        /** C. */
        c: boolean
      }
      type Props = Partial<Pick<Base, 'a' | 'b'>> & Omit<Base, 'a' | 'b'> & HTMLAttributes<HTMLDivElement> & {
        /** D. */
        d?: 'x' | 'y'
      }
      export default function X(props: Props) { return null }
    `)
    expect(p.props.map(prop => [prop.name, prop.optional, prop.description])).toEqual([
      ['a', true, 'A.'],
      ['b', true, 'B.'],
      ['c', false, 'C.'],
      ['d', true, 'D.'],
    ])
  })

  test('a type imported from another file', async () => {
    const dir = join(HOST, 'late', 'imported')
    const files = new Map([
      [
        join(dir, 'index.tsx'),
        "import type { P } from './types'\nexport default function X({ a = 1 }: P) { return null }\n",
      ],
      [join(dir, 'types.ts'), 'export interface P {\n  /** A. */\n  a?: number\n  /** B. */\n  "b-c": string\n}\n'],
    ])
    const service = await createDocsService({ root: HOST, overlay: files })
    service.refresh([join(dir, 'index.tsx')])
    expect(service.parse(join(dir, 'index.tsx')).props).toEqual([
      { name: 'a', type: 'number', optional: true, description: 'A.', default: '1' },
      { name: 'b-c', type: 'string', optional: false, description: 'B.' },
    ])
  })

  test("the lib's slot types count when installed, so a Button typed with them still matches its slot", async () => {
    const lib = join(HOST, 'node_modules', '@justanarthur', 'modo')
    write(join(lib, 'package.json'), '{ "name": "@justanarthur/modo", "types": "./index.d.ts" }')
    write(
      join(lib, 'index.d.ts'),
      "import type { ReactNode } from 'react'\nexport interface ButtonSlotProps {\n  children: ReactNode\n  'aria-label'?: string\n}\n",
    )
    const p = await parse(
      "import type { ButtonSlotProps } from '@justanarthur/modo'\nexport default function Button({ children }: ButtonSlotProps) { return null }\n",
    )
    expect(p.props.map(prop => [prop.name, prop.optional])).toEqual([
      ['children', false],
      ['aria-label', true],
    ])
  })

  test('defaults: the code, else @default, else a closing "Defaults to `x`."; a constant keeps the docs', async () => {
    const p = await parse(`
      import { forwardRef } from 'react'
      const GAP = 4
      interface P {
        /** Side. Defaults to \`'start'\`. */
        side?: string
        /** Gap. Defaults to \`4\`. @default 8 */
        gap?: number
        /** Size. Defaults to \`'md'\`. */
        size?: string
        /** Space. Defaults to \`4\`. */
        space?: number
      }
      const X = forwardRef<HTMLDivElement, P>(({ size = 'lg', space = GAP }, ref) => null)
      export default X
    `)
    expect(p.props.map(prop => [prop.name, prop.default])).toEqual([
      ['side', "'start'"],
      ['gap', '8'],
      ['size', "'lg'"],
      ['space', '4'],
    ])
  })

  test('generic forwardRef, a compound component and a React 19 ref prop', async () => {
    const fwd = await parse(`
      import { forwardRef } from 'react'
      interface P { /** Size. */ size?: number }
      const X = forwardRef<HTMLDivElement, P>((props, ref) => null)
      export default X
    `)
    expect(fwd.props.map(prop => prop.name)).toEqual(['size'])
    const compound = await parse(`
      function Root({ title }: { /** Title. */ title: string }) { return null }
      function Header() { return null }
      /** A card. */
      const Card = Object.assign(Root, { Header })
      export default Card
    `)
    expect([compound.name, compound.description, compound.props.map(prop => prop.name)]).toEqual([
      'Card',
      'A card.',
      ['title'],
    ])
    const r19 = await parse(`
      import type { Ref } from 'react'
      export default function X({ ref, size = 2 }: { /** The root. */ ref?: Ref<HTMLDivElement>; size?: number }) { return null }
    `)
    expect(r19.props.map(prop => [prop.name, prop.default])).toEqual([
      ['ref', undefined],
      ['size', '2'],
    ])
  })
})

// The plain parser's cases (tsdoc.test.ts) read the same through the compiler.
describe('parity with the plain parser', () => {
  const cases: Array<[string, string]> = [
    [
      'a prop doc',
      `export default function Button({ children }: {\n  /** Button content. */\n  children?: string\n}) {}`,
    ],
    [
      'a multi-line union',
      `export default function X({ variant }: {\n  variant?:\n    | 'primary'\n    | 'secondary'\n  size?: number\n}) {}`,
    ],
    [
      'a generic component exported at the bottom',
      `/** Item doc. */\nfunction Item() {}\n\n/** Select doc. */\nfunction Select<T extends string>({ value }: { value: T }) {}\nexport default Select\n`,
    ],
    ['props: { … }', `export default function X(props: { /** A. */ a: string }) {}`],
    ['no props', `/** Divider. */\nexport default function Divider() {}`],
    ['anonymous', `export default function ({ a }: { a?: string }) {}`],
    [
      'block tags',
      `/**\n * Lead.\n * @deprecated Use Y.\n * @example {@include ./examples.mdx}\n * @since 1.2\n */\nexport default function X() {}`,
    ],
    [
      'bare JSX examples',
      `/**\n * Lead.\n * @example <X name="Ada" />\n * @example\n * # Stacked\n * <X />\n * <X />\n */\nexport default function X() {}`,
    ],
    ['an unknown @word', `/**\n * Built over the\n * @fluid sidebar.\n */\nexport default function X() {}`],
    [
      '@default and @values',
      `export default function T({ size }: {\n  /** Style. @values a, b @default 'a' */\n  variant?: 'a' | 'b'\n  /** Size. @values default, sm */\n  size?: string\n}) {}`,
    ],
    [
      'forwardRef over an extending interface',
      `interface InputProps extends Base {\n  /** Size. */\n  size?: 'sm' | 'md'\n}\n/** Input. */\nconst Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => null)\nexport default Input\n`,
    ],
    [
      'forwardRef over a type alias',
      `type P = { a: string }\nconst X = forwardRef<HTMLDivElement, P>(() => null)\nexport default X\n`,
    ],
  ]

  test.each(cases)('%s', async (_, src) => {
    const { parseItemSource } = await import('../src/lib/tsdoc')
    const file = join(HOST, 'components', 'parity', 'index.tsx')
    const service = await createDocsService({ root: HOST, overlay: new Map([[file, src]]) })
    service.refresh([file])
    const { errors: _e, mdxExamples, ...viaCompiler } = service.parse(file)
    const { errors: _p, mdxExamples: plainMdx, ...plain } = parseItemSource(src)
    expect(viaCompiler).toEqual(plain)
    expect(mdxExamples).toEqual(plainMdx.map(path => join(HOST, 'components', 'parity', path)))
  })
})

describe('bundle', () => {
  async function build() {
    const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      const bundler = createBundler({ userRoot: HOST, configPath: join(HOST, 'modo.config.ts') })
      return { bundler, result: await bundler.get() }
    } finally {
      stderr.mockRestore()
    }
  }

  test('examples compile from the source their docs were read from', async () => {
    const { result } = await build()
    const byId = Object.fromEntries(result.items.map(it => [it.id, it]))
    expect(Object.keys(byId).sort()).toEqual(IDS)
    // Re-exported items share one compiled examples module (the base's); the wrapper gets
    // the base's, then its own.
    expect(byId['default-reexport']!.mdxExamples).toEqual(byId['named-reexport']!.mdxExamples)
    expect(byId.wrapper!.mdxExamples).toHaveLength(2)
    expect(byId.wrapper!.mdxExamples[0]).toBe(byId['default-reexport']!.mdxExamples[0]!)
    for (const it of result.items) for (const doc of it.mdxExamples) expect(existsSync(doc)).toBe(true)
  })

  test('the source condition applies to modo packages only, and only when the source ships', async () => {
    const { bundler } = await build()
    const built = (dir: string): string =>
      readdirSync(dir, { withFileTypes: true })
        .map(e => (e.isDirectory() ? built(join(dir, e.name)) : readFileSync(join(dir, e.name), 'utf8')))
        .join('\n')
    const out = built(bundler.outdir)
    expect([out.includes('ghost-dist'), out.includes('plain-dist'), out.includes('plain-source')]).toEqual([
      true,
      true,
      false,
    ])
  })
})

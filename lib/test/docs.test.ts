import { beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { discoverItems } from '../src/lib/discover-items'
import { createDocsService, type DocsService } from '../src/lib/docs'
import { TIERS } from '../src/lib/tiers'
import { createBundler } from '../src/plugins/bundle'

// The fixture host with its packages installed: node_modules is gitignored,
// so the packages live in fixtures/packages and are copied in. `*.tmp` is
// ignored too, and the copy sits inside lib so react's types resolve.
const FIXTURES = resolve(import.meta.dir, 'fixtures')
const HOST = resolve(import.meta.dir, 'fixtures.tmp', 'host')
const item = (id: string) => resolve(HOST, 'components', id, 'index.tsx')
const fromHost = (files: string[]) => files.map(f => relative(HOST, f))

let docs: DocsService

beforeAll(() => {
  cpSync(join(FIXTURES, 'host'), HOST, { recursive: true })
  for (const name of readdirSync(join(FIXTURES, 'packages')))
    cpSync(join(FIXTURES, 'packages', name), join(HOST, 'node_modules', name), { recursive: true })
  docs = createDocsService({ root: HOST })
  docs.refresh(discoverItems(join(HOST, 'components')).map(it => join(it.dir, 'index.tsx')))
})

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
    expect(fromHost(p.exampleDocs)).toEqual(BASE_EXAMPLES)
    expect(fromHost(p.sources)).toEqual(['node_modules/base-ds/components/button/index.tsx'])
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
    expect(fromHost(p.exampleDocs)).toEqual(['node_modules/typed-ds/build/components/button/examples.mdx'])
    expect(p.props.map(prop => prop.name)).toEqual(['size'])
  })

  test('a relative re-export resolves includes next to its target', () => {
    const p = docs.parse(item('relative-reexport'))
    expect([p.name, p.description, p.errors]).toEqual(['Badge', 'A badge kept in a sibling file.', []])
    expect(fromHost(p.exampleDocs)).toEqual(['components/relative-reexport/examples.mdx'])
    expect(p.props).toEqual([{ name: 'label', type: 'string', optional: false, description: 'The label.' }])
  })
})

describe('{@inheritDoc}', () => {
  test('a wrapper inherits the base docs first, and lists its own and the inherited props', () => {
    const p = docs.parse(item('wrapper'))
    expect(p.errors).toEqual([])
    expect(p.name).toBe('FancyButton')
    expect(p.description).toBe(`${BASE_DOCS}\n\nThe fancy one glows.`)
    expect(fromHost(p.exampleDocs)).toEqual([...BASE_EXAMPLES, 'components/wrapper/examples.mdx'])
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
    expect(fromHost(p.exampleDocs)).toEqual(['node_modules/typed-ds/build/components/button/examples.mdx'])
    expect(p.props.map(prop => prop.name)).toEqual(['form'])
  })

  test('an unresolvable reference is reported', () => {
    const src = '/**\n * {@inheritDoc nope/missing}\n *\n * Own.\n */\nexport default function X() {}\n'
    const file = join(HOST, 'components', 'inline', 'index.tsx')
    const service = createDocsService({ root: HOST, overlay: new Map([[file, src]]) })
    service.refresh([file])
    const p = service.parse(file)
    expect([p.description, p.errors]).toEqual([
      'Own.',
      ['{@inheritDoc nope/missing}: could not resolve "nope/missing"'],
    ])
  })
})

describe('runs', () => {
  const write = (file: string, text: string) => {
    mkdirSync(resolve(file, '..'), { recursive: true })
    writeFileSync(file, text)
  }

  test('an import that failed resolves once its file exists', () => {
    const dir = join(HOST, 'late', 'late')
    rmSync(dir, { recursive: true, force: true })
    const file = join(dir, 'index.tsx')
    write(file, "export { default } from './impl'\n")
    const service = createDocsService({ root: HOST })
    service.refresh([file])
    expect(service.parse(file).errors).toEqual(['Could not resolve the default export from "./impl"'])
    write(join(dir, 'impl.tsx'), '/** Late. */\nexport default function Late() {\n  return null\n}\n')
    service.refresh([file])
    expect(service.parse(file)).toMatchObject({ name: 'Late', description: 'Late.', errors: [] })
  })

  test('a diamond of {@inheritDoc} is not a cycle', () => {
    const dir = join(HOST, 'late', 'diamond')
    const doc = (text: string, refs: string[]) =>
      `/**\n${refs.map(r => ` * {@inheritDoc ./${r}}\n`).join('')} * ${text}\n */\nexport default function X() {\n  return null\n}\n`
    const files = new Map([
      [join(dir, 'index.tsx'), doc('X.', ['b', 'c'])],
      [join(dir, 'b.tsx'), doc('B.', ['d'])],
      [join(dir, 'c.tsx'), doc('C.', ['d'])],
      [join(dir, 'd.tsx'), doc('D.', [])],
    ])
    const service = createDocsService({ root: HOST, overlay: files })
    service.refresh([join(dir, 'index.tsx')])
    const p = service.parse(join(dir, 'index.tsx'))
    expect([p.description, p.errors]).toEqual(['D.\n\nB.\n\nD.\n\nC.\n\nX.', []])
  })

  test("includes stay inside the comment's package", () => {
    const pkg = join(HOST, 'node_modules', 'nosy')
    write(join(pkg, 'package.json'), '{ "name": "nosy", "exports": { ".": { "source": "./index.tsx" } } }')
    write(
      join(pkg, 'index.tsx'),
      '/**\n * Nosy. {@include ../../package.json}\n *\n * @example {@include ../../x.mdx}\n */\nexport default function Nosy() {\n  return null\n}\n',
    )
    const file = join(HOST, 'late', 'nosy', 'index.tsx')
    write(file, "export { default } from 'nosy'\n")
    const service = createDocsService({ root: HOST })
    service.refresh([file])
    const p = service.parse(file)
    expect([p.description, p.exampleDocs]).toEqual(['Nosy.', []])
    expect(p.errors).toEqual([
      `@example {@include ../../x.mdx}: outside ${pkg}`,
      '{@include ../../package.json}: file not found',
    ])
  })
})

describe('props through the compiler', () => {
  const parse = (src: string) => {
    const file = join(HOST, 'components', 'inline', 'index.tsx')
    const service = createDocsService({ root: HOST, overlay: new Map([[file, src]]) })
    service.refresh([file])
    return service.parse(file)
  }

  test('extends, Omit, Pick, Partial and intersections', () => {
    const p = parse(`
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

  test('generic forwardRef and a React 19 component with ref in its props', () => {
    const fwd = parse(`
      import { forwardRef, type Ref } from 'react'
      interface P { /** Size. */ size?: number }
      const X = forwardRef<HTMLDivElement, P>((props, ref) => null)
      export default X
    `)
    expect(fwd.props.map(prop => prop.name)).toEqual(['size'])
    const r19 = parse(`
      import type { Ref } from 'react'
      export default function X({ ref, size = 2 }: { /** The root. */ ref?: Ref<HTMLDivElement>; size?: number }) { return null }
    `)
    expect(r19.props.map(prop => [prop.name, prop.default])).toEqual([
      ['ref', undefined],
      ['size', '2'],
    ])
  })
})

describe('bundle', () => {
  test('examples compile from the source they were read from', async () => {
    const bundler = createBundler({ userRoot: HOST, configPath: join(HOST, 'modo.config.ts') })
    const { items } = await bundler.get()
    const byId = Object.fromEntries(items.map(it => [it.id, it]))
    expect(Object.keys(byId).sort()).toEqual([
      'default-reexport',
      'import-reexport',
      'named-reexport',
      'relative-reexport',
      'third-party',
      'typed-reexport',
      'wrapper',
      'wrapper-by-name',
    ])
    // The re-exported items share one compiled examples module (the base's);
    // the wrapper gets the base's, then its own.
    expect(byId['default-reexport']!.exampleDocs).toEqual(byId['named-reexport']!.exampleDocs)
    expect(byId.wrapper!.exampleDocs).toHaveLength(2)
    expect(byId.wrapper!.exampleDocs[0]).toBe(byId['default-reexport']!.exampleDocs[0]!)
    for (const it of items) for (const doc of it.exampleDocs) expect(existsSync(doc)).toBe(true)
  })

  test('the source condition applies to modo packages only, and only when the source ships', async () => {
    const bundler = createBundler({ userRoot: HOST, configPath: join(HOST, 'modo.config.ts') })
    const { items } = await bundler.get()
    expect(items.map(it => it.id)).toContain('third-party')
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

// The lib's own design system: every item still parses cleanly through the
// compiler (the docs-identity check against the regex parser is in the PR).
describe('ui', () => {
  const root = resolve(import.meta.dir, '../../ui')
  test.skipIf(!existsSync(root))('every item parses without errors', () => {
    const service = createDocsService({ root })
    const files = TIERS.flatMap(tier =>
      existsSync(join(root, tier)) ? discoverItems(join(root, tier)).map(it => join(it.dir, 'index.tsx')) : [],
    )
    service.refresh(files)
    for (const file of files) {
      const p = service.parse(file)
      expect([relative(root, file), p.errors]).toEqual([relative(root, file), []])
      expect(p.description.length).toBeGreaterThan(0)
      for (const doc of p.exampleDocs) expect(existsSync(doc)).toBe(true)
    }
  })

  test.skipIf(!existsSync(root))('a host re-exporting a modo-ui item gets its docs', () => {
    const host = resolve(HOST, '..', 'ui-host')
    const scope = join(host, 'node_modules', '@justanarthur')
    mkdirSync(scope, { recursive: true })
    if (!existsSync(join(scope, 'modo-ui'))) symlinkSync(root, join(scope, 'modo-ui'), 'dir')
    const file = join(host, 'components', 'select', 'index.tsx')
    const service = createDocsService({
      root: host,
      overlay: new Map([[file, "export { default } from '@justanarthur/modo-ui/components/inputs/select'\n"]]),
    })
    const direct = join(root, 'components', 'inputs', 'select', 'index.tsx')
    service.refresh([file, direct])
    expect(service.parse(file)).toEqual(service.parse(direct))
  })
})

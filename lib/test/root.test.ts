import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { discoverTiers } from '../src/lib/discover-items'
import { itemsRootOf } from '../src/lib/root'
import { siteConfigSchema } from '../src/lib/schema'
import { createBundler } from '../src/plugins/bundle'
import { tokensPlugin } from '../src/plugins/tokens'

// Two hosts: one with its sources under `src/`, one in the project root. `*.tmp` is gitignored.
const BASE = resolve(import.meta.dir, 'fixtures.tmp', 'root')
const SRC_HOST = join(BASE, 'src-host')
const FLAT_HOST = join(BASE, 'flat-host')

const write = (file: string, text: string) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

const item = (name: string) => `/** The ${name}. */\nexport default function ${name}() {\n  return null\n}\n`

function site(host: string, root: string, config: string) {
  const at = (rel: string) => join(host, root, rel)
  write(at('components/button/index.tsx'), item('Button'))
  write(at('components/forms/field/index.tsx'), item('Field'))
  write(at('primitives/icon/index.tsx'), item('Icon'))
  write(at('tokens/colors.css'), ':root {\n  --primary: var(--brand);\n}\n')
  write(join(host, 'package.json'), JSON.stringify({ name: 'host', private: true, type: 'module' }))
  write(join(host, 'modo.config.ts'), config)
}

beforeAll(() => {
  rmSync(BASE, { recursive: true, force: true })
  site(SRC_HOST, 'src', "export default { name: 'Src host', root: 'src' }\n")
  // a tier folder in the project root is not an item of a site rooted at src/
  write(join(SRC_HOST, 'blocks/stray/index.tsx'), item('Stray'))
  site(FLAT_HOST, '.', "export default { name: 'Flat host' }\n")
})

afterAll(() => rmSync(BASE, { recursive: true, force: true }))

describe('root option', () => {
  test('the schema takes `root`; it is optional', () => {
    expect(siteConfigSchema.parse({ name: 'x', root: 'src' }).root).toBe('src')
    expect(siteConfigSchema.parse({ name: 'x' }).root).toBeUndefined()
  })

  test('resolves against the project root; the default is the project root', () => {
    expect(itemsRootOf('/p', { root: 'src' })).toBe('/p/src')
    expect(itemsRootOf('/p', { root: '../lib' })).toBe('/lib')
    expect(itemsRootOf('/p', {})).toBe('/p')
    expect(itemsRootOf('/p', null)).toBe('/p')
  })
})

describe('discoverTiers', () => {
  test('finds the tiers under the root, groups and all, in docs order', () => {
    const { items, duplicates } = discoverTiers(join(SRC_HOST, 'src'))
    expect(items.map(i => [i.tier, i.id, i.group])).toEqual([
      ['primitives', 'icon', undefined],
      ['components', 'button', undefined],
      ['components', 'field', 'forms'],
    ])
    expect(duplicates).toEqual([])
  })

  test('without `root` the project root is searched, as before', () => {
    expect(discoverTiers(FLAT_HOST).items.map(i => `${i.tier}/${i.id}`)).toEqual([
      'primitives/icon',
      'components/button',
      'components/field',
    ])
    // the project root of the src host holds only a stray block
    expect(discoverTiers(SRC_HOST).items.map(i => `${i.tier}/${i.id}`)).toEqual(['blocks/stray'])
  })

  test('an id repeated in a tier is reported once, the first standing', () => {
    const root = join(BASE, 'dupes')
    write(join(root, 'components/a/same/index.tsx'), item('One'))
    write(join(root, 'components/b/same/index.tsx'), item('Two'))
    const { items, duplicates } = discoverTiers(root)
    expect(items.map(i => i.group)).toEqual(['a'])
    expect(duplicates.map(i => i.group)).toEqual(['b'])
  })
})

describe('the bundle', () => {
  const bundle = (host: string) => createBundler({ userRoot: host, configPath: join(host, 'modo.config.ts') }).get()

  test('builds the items under `root`', async () => {
    const { items, config } = await bundle(SRC_HOST)
    expect(config?.root).toBe('src')
    expect(items.map(i => `${i.tier}/${i.id}`).sort()).toEqual([
      'components/button',
      'components/field',
      'primitives/icon',
    ])
    expect(items.find(i => i.id === 'button')?.description).toBe('The Button.')
    expect(items.find(i => i.id === 'button')?.file).toBe(join(SRC_HOST, 'src/components/button/index.tsx'))
  })

  test('builds the same items from the project root without `root`', async () => {
    const { items } = await bundle(FLAT_HOST)
    expect(items.map(i => `${i.tier}/${i.id}`).sort()).toEqual([
      'components/button',
      'components/field',
      'primitives/icon',
    ])
  })
})

describe('tokens', () => {
  const tokens = async (host: string) => {
    const plugin = tokensPlugin({ userRoot: host, configPath: join(host, 'modo.config.ts') })
    const load = plugin.load as (this: unknown, id: string) => Promise<string>
    const meta = await load.call({}, '\0virtual:modo-tokens')
    const css = await load.call({}, '\0virtual:modo-tokens-css')
    return { meta, css }
  }

  test('are read from `<root>/tokens`', async () => {
    const { meta, css } = await tokens(SRC_HOST)
    expect(meta).toContain('--primary')
    expect(css).toContain(join(SRC_HOST, 'src/tokens/colors.css'))
  })

  test('are read from `<project root>/tokens` without `root`', async () => {
    const { meta, css } = await tokens(FLAT_HOST)
    expect(meta).toContain('--primary')
    expect(css).toContain(join(FLAT_HOST, 'tokens/colors.css'))
  })

  test('a root without a tokens folder has none, whatever the project root holds', async () => {
    write(join(SRC_HOST, 'tokens/other.css'), ':root {\n  --stray: 1px;\n}\n')
    const { meta } = await tokens(SRC_HOST)
    expect(meta).not.toContain('--stray')
  })
})

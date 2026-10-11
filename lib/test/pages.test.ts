import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import esbuild from 'esbuild'
import { discoverPages } from '../src/lib/discover-pages'
import { pageEntries, pagesMdx } from '../src/plugins/pages'
import { groupTitle, groupTree } from '../src/runtime/groups'
import { decodePath } from '../src/runtime/url'

const FIXTURE = resolve(import.meta.dir, 'fixtures/pages')

function tree(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'modo-pages-'))
  for (const f of files) {
    mkdirSync(dirname(join(root, f)), { recursive: true })
    writeFileSync(join(root, f), '')
  }
  return root
}

describe('discoverPages', () => {
  test('slugs drop .mdx and ordering prefixes; folders are groups, prefixes kept', () => {
    const { pages } = discoverPages(join(FIXTURE, 'pages'))
    expect(pages.map(p => [p.slug, p.group])).toEqual([
      ['intro', undefined],
      ['guides/migration', '02-guides'],
      ['guides/advanced-usage', '02-guides'],
      ['návody', '03-návody'],
      ['návody/začíname', '03-návody'],
      ['changelog', undefined],
      ['my page', undefined],
    ])
  })

  test("a folder's index.mdx is the folder, listed first; the root one is `index`", () => {
    const root = tree(['index.mdx', 'guides/01-a.mdx', 'guides/index.mdx', 'guides/deep/index.mdx'])
    expect(discoverPages(root).pages.map(p => [p.slug, p.group])).toEqual([
      ['index', undefined],
      ['guides', 'guides'],
      ['guides/a', 'guides'],
      ['guides/deep', 'guides/deep'],
    ])
  })

  test('slugs are NFC, whatever form the file system spells them in', () => {
    const root = tree(['n\u0061\u0301vod.mdx'])
    expect(discoverPages(root).pages.map(p => p.slug)).toEqual(['n\u00e1vod'])
  })

  test('only .mdx files count', () => {
    const root = tree(['a.mdx', 'b.md', 'c.tsx', 'nested/d.mdx'])
    expect(discoverPages(root).pages.map(p => p.slug)).toEqual(['a', 'nested/d'])
  })

  test('a docs/ slug or a repeated one is skipped', () => {
    const root = tree(['01-setup.mdx', 'setup.mdx', 'docs.mdx', 'docs/x.mdx', 'index.mdx'])
    const { pages, skipped } = discoverPages(root)
    expect(pages.map(p => p.slug)).toEqual(['index', 'setup'])
    expect(skipped).toEqual(['docs/x.mdx', 'docs.mdx', 'setup.mdx'])
  })

  test('no folder, no pages', () => {
    expect(discoverPages(join(tmpdir(), 'modo-no-such-dir'))).toEqual({ pages: [], skipped: [] })
  })

  test('config.pages moves the folder; a page keeps the key the bundle settles on', () => {
    const root = tree(['docs-pages/a.mdx', 'pages/b.mdx'])
    const keys = (config: Parameters<typeof pageEntries>[1]) => {
      const seen: string[] = []
      pageEntries(root, config, (_, key) => {
        seen.push(key)
        return 'usr/taken'
      })
      return seen
    }
    expect(keys({ name: 'x', pages: 'docs-pages' })).toEqual(['pages/a'])
    expect(keys(null)).toEqual(['pages/b'])
  })
})

describe('page groups', () => {
  test('an ordering prefix sorts the group and leaves its title', () => {
    const t = groupTree([
      { id: 'a', group: '02-guides' },
      { id: 'b', group: '01-getting-started' },
    ])
    expect(t.groups.map(g => g.title)).toEqual(['Getting started', 'Guides'])
    expect(groupTitle('form-controls')).toBe('Form controls')
  })
})

describe('decodePath', () => {
  test('escaped and spaced paths match their slugs', () => {
    expect(decodePath('/ui/n%C3%A1vody/za%C4%8D%C3%ADname')).toBe('/ui/návody/začíname')
    expect(decodePath(encodeURI('/my page'))).toBe('/my page')
    expect(decodePath('/na%CC%81vody')).toBe('/n\u00e1vody')
  })

  test('a malformed escape is left as is', () => {
    expect(decodePath('/bad%E0%A4%A')).toBe('/bad%E0%A4%A')
  })
})

describe('pagesMdx', () => {
  test('compiles frontmatter and wraps top-level JSX as examples; other .mdx is left alone', async () => {
    pageEntries(FIXTURE, null, (_, key) => key)
    const page = join(FIXTURE, 'pages/01-intro.mdx')
    const r = await esbuild.build({
      entryPoints: [page],
      absWorkingDir: FIXTURE,
      bundle: true,
      write: false,
      format: 'esm',
      external: ['react', 'react/jsx-runtime'],
      plugins: [pagesMdx],
      logLevel: 'silent',
    })
    const out = r.outputFiles[0]!.text
    expect(out).toContain(`"title": "Introduction"`)
    expect(out).toContain('ModoExample')
    expect(out).toContain('data-badge')

    const other = tree(['x.mdx'])
    const failed = await esbuild
      .build({ entryPoints: [join(other, 'x.mdx')], write: false, plugins: [pagesMdx], logLevel: 'silent' })
      .then(
        () => false,
        () => true,
      )
    expect(failed).toBe(true)
  })
})

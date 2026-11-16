import { afterAll, describe, expect, spyOn, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { resolvePackageFile, resolveUserFile } from '../src/node/resolve-ref'
import { createBundler } from '../src/plugins/bundle'

// A host whose modo.config.ts names a design system's docs module by package specifier.
const host = realpathSync(mkdtempSync(join(tmpdir(), 'modo-refs-')))
afterAll(() => rmSync(host, { recursive: true, force: true }))

const write = (rel: string, text: string) => {
  mkdirSync(dirname(join(host, rel)), { recursive: true })
  writeFileSync(join(host, rel), text)
}

const pkg = join(host, 'node_modules/@acme/ds')
write(
  'node_modules/@acme/ds/package.json',
  JSON.stringify({
    name: '@acme/ds',
    exports: {
      // `source` wins over `default` whatever the key order
      './docs': { default: './dist/docs.js', source: './docs/index.ts' },
      './docs/chrome.css': './docs/chrome.css',
      './built': { types: './dist/built.d.ts', default: './dist/built.js' },
      './components/*': { source: './components/*/index.tsx' },
      './internal/*': null,
    },
  }),
)
write('node_modules/@acme/ds/docs/index.ts', "export * from './chrome'\n")
write(
  'node_modules/@acme/ds/docs/chrome.ts',
  "export const Nav = () => 'source'\nexport const Theme = () => 'theme'\nexport const Plus = 1\n",
)
write('node_modules/@acme/ds/docs/chrome.css', '[data-modo="app"] { display: grid; }\n')
write('node_modules/@acme/ds/dist/docs.js', "export const Nav = () => 'built'\n")
write('node_modules/@acme/ds/dist/built.js', "export const Link = () => 'built-only'\n")
write('node_modules/@acme/ds/components/button/index.tsx', 'export default () => null\n')
write('node_modules/@acme/ds/internal/x.ts', '')
// No `exports`: subpaths are files under the package.
write('node_modules/plain/package.json', JSON.stringify({ name: 'plain' }))
write('node_modules/plain/lib/icons.tsx', 'export const Icon = () => null\n')
write('node_modules/plain/index.js', '')
// A workspace package linked into node_modules.
write('packages/linked/package.json', JSON.stringify({ name: 'linked', exports: { './docs': './docs.tsx' } }))
write('packages/linked/docs.tsx', 'export default () => null\n')
symlinkSync(join(host, 'packages/linked'), join(host, 'node_modules/linked'))

describe('resolvePackageFile', () => {
  test('goes through the exports: the source file when it ships, else import / default', () => {
    expect(resolvePackageFile('@acme/ds/docs', host)).toBe(join(pkg, 'docs/index.ts'))
    expect(resolvePackageFile('@acme/ds/built', host)).toBe(join(pkg, 'dist/built.js'))
    expect(resolvePackageFile('@acme/ds/docs/chrome.css', host)).toBe(join(pkg, 'docs/chrome.css'))
    expect(resolvePackageFile('@acme/ds/components/button', host)).toBe(join(pkg, 'components/button/index.tsx'))
  })

  test('null for what the package does not export, an absent package or a path', () => {
    expect(resolvePackageFile('@acme/ds/nope', host)).toBeNull()
    expect(resolvePackageFile('@acme/ds/internal/x', host)).toBeNull()
    expect(resolvePackageFile('@acme/ds', host)).toBeNull()
    expect(resolvePackageFile('missing/docs', host)).toBeNull()
    expect(resolvePackageFile('./docs', host)).toBeNull()
    expect(resolvePackageFile('/abs/docs', host)).toBeNull()
  })

  test('a package without exports resolves its subpaths as files', () => {
    expect(resolvePackageFile('plain/lib/icons', host)).toBe(join(host, 'node_modules/plain/lib/icons.tsx'))
    expect(resolvePackageFile('plain', host)).toBe(join(host, 'node_modules/plain/index.js'))
  })

  test('a linked workspace package resolves to its real path, from a folder below the host', () => {
    mkdirSync(join(host, 'sub/dir'), { recursive: true })
    expect(resolvePackageFile('linked/docs', join(host, 'sub/dir'))).toBe(join(host, 'packages/linked/docs.tsx'))
  })
})

describe('resolveUserFile', () => {
  test('a project path wins over a package of the same name', () => {
    write('plain/lib/icons.ts', '')
    expect(resolveUserFile(host, 'plain/lib/icons')).toBe(join(host, 'plain/lib/icons.ts'))
    expect(resolveUserFile(host, '@acme/ds/docs')).toBe(join(pkg, 'docs/index.ts'))
  })
})

describe('createBundler', () => {
  test('shell, panel and examples refs bundle from a package, its stylesheets beside them', async () => {
    write(
      'modo.config.ts',
      `export default {
  name: 'T',
  shell: { Sidebar: '@acme/ds/docs#Nav', Link: '@acme/ds/built#Link', Icon: '@acme/ds/missing#Icon' },
  panel: { items: [{ label: 'Theme', component: '@acme/ds/docs#Theme' }] },
  examples: '@acme/ds/docs',
}`,
    )
    const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true)
    const { extras, scope } = await createBundler({ userRoot: host, configPath: join(host, 'modo.config.ts') })
      .get()
      .finally(() => stderr.mockRestore())

    const nav = extras.get('@acme/ds/docs#Nav')!
    expect([nav.exported, nav.cssFiles]).toEqual([true, [join(pkg, 'docs/chrome.css')]])
    expect(extras.get('@acme/ds/docs#Theme')?.bundlePath).toBe(nav.bundlePath)
    expect(readFileSync(nav.bundlePath, 'utf8')).toContain('"source"')

    const link = extras.get('@acme/ds/built#Link')!
    expect([link.exported, readFileSync(link.bundlePath, 'utf8').includes('built-only')]).toEqual([true, true])
    expect(extras.has('@acme/ds/missing#Icon')).toBe(false)
    expect(scope?.exports).toEqual(['Nav', 'Plus', 'Theme'])
  })
})

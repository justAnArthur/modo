import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { resolvePackageFile } from '../src/lib/resolve-source'
import { createBundler } from '../src/plugins/bundle'

// A host whose modo.config.ts points the chrome's slots and a panel item at a
// design system's published module by package specifier. `*.tmp` is gitignored.
const HOST = resolve(import.meta.dir, 'fixtures.tmp', 'shell-host')
const PKG = join(HOST, 'node_modules', 'chrome-ds')

const write = (file: string, text: string) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

beforeAll(() => {
  rmSync(HOST, { recursive: true, force: true })
  write(join(HOST, 'package.json'), JSON.stringify({ name: 'shell-host', private: true, type: 'module' }))
  // `./docs` ships its source and a built copy, `./built` only the built one
  write(
    join(PKG, 'package.json'),
    JSON.stringify({
      name: 'chrome-ds',
      type: 'module',
      exports: {
        './docs': { source: './docs/index.ts', default: './dist/docs/index.js' },
        './docs/chrome.css': './docs/chrome.css',
        './built': { types: './dist/built.d.ts', default: './dist/built.js' },
      },
    }),
  )
  write(join(PKG, 'docs/index.ts'), "export * from './chrome'\n")
  write(
    join(PKG, 'docs/chrome.ts'),
    "export const DocsNav = () => 'source'\nexport const ThemeSwitcher = () => 'theme'\n",
  )
  write(join(PKG, 'docs/chrome.css'), '[data-modo="app"] { display: grid; }\n')
  write(join(PKG, 'dist/docs/index.js'), "export const DocsNav = () => 'built'\n")
  write(join(PKG, 'dist/built.js'), "export const Link = () => 'built-only'\n")
  write(
    join(HOST, 'modo.config.ts'),
    `export default {
  name: 'Shell host',
  shell: { Sidebar: 'chrome-ds/docs#DocsNav', Link: 'chrome-ds/built#Link', Icon: 'chrome-ds/missing#Icon' },
  panel: { items: [{ label: 'Theme', component: 'chrome-ds/docs#ThemeSwitcher' }] },
}
`,
  )
})

afterAll(() => rmSync(HOST, { recursive: true, force: true }))

describe('package specifiers', () => {
  test('resolve through the package exports: the source file when it ships, else the built one', () => {
    expect(resolvePackageFile('chrome-ds/docs', HOST)).toBe(join(PKG, 'docs/index.ts'))
    expect(resolvePackageFile('chrome-ds/built', HOST)).toBe(join(PKG, 'dist/built.js'))
    expect(resolvePackageFile('chrome-ds/docs/chrome.css', HOST)).toBe(join(PKG, 'docs/chrome.css'))
    expect(resolvePackageFile('chrome-ds/nope', HOST)).toBeNull()
    expect(resolvePackageFile('not-installed/docs', HOST)).toBeNull()
    expect(resolvePackageFile('./docs', HOST)).toBeNull()
  })

  test('a shell slot and a panel item are bundled from the package, their css beside them', async () => {
    const bundler = createBundler({ userRoot: HOST, configPath: join(HOST, 'modo.config.ts') })
    const { extras } = await bundler.get()
    const nav = extras.get('chrome-ds/docs#DocsNav')
    expect(nav?.exported).toBe(true)
    expect(nav?.cssFiles).toEqual([join(PKG, 'docs/chrome.css')])
    // both refs into one module share its entry
    expect(extras.get('chrome-ds/docs#ThemeSwitcher')?.bundlePath).toBe(nav?.bundlePath)
    expect(readFileSync(nav!.bundlePath, 'utf8')).toContain('chrome-ds/docs/chrome.ts')
    const link = extras.get('chrome-ds/built#Link')
    expect(link?.exported).toBe(true)
    expect(readFileSync(link!.bundlePath, 'utf8')).toContain('built-only')
    // an export the package doesn't have is no extra
    expect(extras.has('chrome-ds/missing#Icon')).toBe(false)
    expect(existsSync(nav!.bundlePath)).toBe(true)
  })
})

import type { Plugin } from 'vite'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { parseItemSource } from '../lib/tsdoc'
import {
  resolveShellSlots,
  type LoadedComponent,
  type ParsedItemLite,
  type ResolvedShell,
} from '../lib/slots'
import { loadModoConfig } from '../lib/config.loader'
import { discoverCssForFile } from '../lib/discover-css'
import esbuild from 'esbuild'

interface Options {
  userRoot: string
  libDir: string
}

const SHELL_VIRTUAL = 'virtual:modo-shell'
const SHELL_RESOLVED = '\0virtual:modo-shell'
const SHELL_CSS_VIRTUAL = 'virtual:modo-shell-css'
const SHELL_CSS_RESOLVED = '\0virtual:modo-shell-css'
const SHELL_DS_CSS_VIRTUAL = 'virtual:modo-shell-ds-css'
const SHELL_DS_CSS_RESOLVED = '\0virtual:modo-shell-ds-css'

const DS_ROOT = (libDir: string) => resolve(libDir, 'src', 'runtime', 'shell', 'ds')

function tmpDir(root: string): string {
  return resolve(root, '.modo-tmp')
}

function ensureTmpDir(root: string): string {
  const dir = tmpDir(root)
  mkdirSync(dir, { recursive: true })
  return dir
}

async function bundleToFile(filePath: string, userRoot: string, prefix: string): Promise<{ path: string }> {
  const dir = ensureTmpDir(userRoot)
  const outFile = join(dir, `${prefix}-${randomUUID()}.mjs`)
  await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    outfile: outFile,
    platform: 'neutral',
    target: 'es2022',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty', '.svg': 'dataurl' },
    jsx: 'automatic',
    jsxImportSource: 'react',
    logLevel: 'silent',
  })
  return { path: '/@fs' + outFile }
}

async function bundle(filePath: string, userRoot: string, prefix: string): Promise<{ path: string; Component: unknown }> {
  const { path } = await bundleToFile(filePath, userRoot, prefix)
  const absPath = path.startsWith('/@fs') ? path.slice('/@fs'.length) : path
  const mod = (await import(pathToFileURL(absPath).href + `?p=${prefix}&t=${Date.now()}`)) as {
    default?: unknown
  }
  return { path, Component: (mod.default ?? mod) as unknown }
}

async function discoverUserItems(userRoot: string): Promise<ParsedItemLite[]> {
  const tiers = ['primitives', 'components', 'blocks'] as const
  const items: ParsedItemLite[] = []
  for (const tier of tiers) {
    const tierDir = resolve(userRoot, tier)
    if (!existsSync(tierDir)) continue
    for (const entry of readdirSync(tierDir)) {
      const itemDir = resolve(tierDir, entry)
      if (!statSync(itemDir).isDirectory()) continue
      const tsx = resolve(itemDir, 'index.tsx')
      if (!existsSync(tsx)) continue
      const parsed = parseItemSource(readFileSync(tsx, 'utf8'))
      const item: ParsedItemLite = {
        name: parsed.name || entry,
        id: entry,
        tier,
        props: parsed.props.map((p) => ({ name: p.name, optional: p.optional })),
      }
      try {
        const { path } = await bundleToFile(tsx, userRoot, `${tier}-${entry}`)
        item.bundleUrl = path
      } catch (err) {
        console.warn(`[shell] failed to bundle ${tier}/${entry}:`, (err as Error).message)
      }
      items.push(item)
    }
  }
  return items
}

type ResolvedShellExport = ResolvedShell & { cssFiles: string[] }

async function resolveShellForUser(opts: Options): Promise<{ shell: ResolvedShellExport; warnings: string[] }> {
  const warnings: string[] = []
  const config = await loadModoConfig(opts.userRoot)
  const userItems = await discoverUserItems(opts.userRoot)

  async function loadShellDS(slotPath: string): Promise<LoadedComponent | null> {
    const file = resolve(DS_ROOT(opts.libDir), slotPath, 'index.tsx')
    if (!existsSync(file)) return null
    const { path, Component } = await bundle(file, opts.userRoot, `ds-${slotPath.replace(/[/]/g, '-')}`)
    return {
      Component: Component as React.ComponentType<any>,
      cssPaths: discoverCssForFile(file),
      source: 'shell-ds',
      resolvedPath: `shell-ds:${slotPath}`,
      bundlePath: path,
    }
  }

  async function loadUserPath(p: string): Promise<LoadedComponent | null> {
    const abs = resolve(opts.userRoot, p)
    if (!existsSync(abs)) return null
    const stat = statSync(abs)
    let file = abs
    if (stat.isDirectory()) {
      const candidate = resolve(abs, 'index.tsx')
      if (!existsSync(candidate)) return null
      file = candidate
    }
    const { path, Component } = await bundle(file, opts.userRoot, `usr-${p.replace(/[^a-zA-Z0-9]+/g, '-')}`)
    return {
      Component: Component as React.ComponentType<any>,
      cssPaths: discoverCssForFile(file),
      source: 'config',
      resolvedPath: p,
      bundlePath: path,
    }
  }

  const resolved = await resolveShellSlots(
    { name: config.name, shell: config.shell },
    userItems,
    loadShellDS,
    loadUserPath,
    { warnings },
  )
  const cssFiles = [
    ...resolved.Button.cssPaths,
    ...resolved.Link.cssPaths,
    ...resolved.Code.cssPaths,
    ...resolved.Sidebar.Root.cssPaths,
    ...resolved.Sidebar.Item.cssPaths,
    ...resolved.Sidebar.Section.cssPaths,
    ...resolved.Panel.cssPaths,
  ]
  return {
    shell: {
      Button: resolved.Button,
      Link: resolved.Link,
      Code: resolved.Code,
      Sidebar: { Root: resolved.Sidebar.Root, Item: resolved.Sidebar.Item, Section: resolved.Sidebar.Section },
      Panel: resolved.Panel,
      cssFiles,
    },
    warnings,
  }
}

export function shellPlugin(options: Options): Plugin {
  let cache: { shell: ResolvedShellExport; warnings: string[] } | null = null
  let cachePromise: Promise<{ shell: ResolvedShellExport; warnings: string[] }> | null = null

  function getCache(): Promise<{ shell: ResolvedShellExport; warnings: string[] }> {
    if (cache) return Promise.resolve(cache)
    if (cachePromise) return cachePromise
    cachePromise = resolveShellForUser(options).then((result) => {
      cache = result
      cachePromise = null
      return result
    })
    return cachePromise
  }

  const shellDsCssFiles: string[] = []
  function collectShellDsCss() {
    const root = DS_ROOT(options.libDir)
    const visit = (dir: string) => {
      if (!existsSync(dir)) return
      for (const f of readdirSync(dir)) {
        const p = resolve(dir, f)
        if (statSync(p).isDirectory()) visit(p)
        else if (p.endsWith('.css')) shellDsCssFiles.push(p)
      }
    }
    visit(root)
  }
  collectShellDsCss()

  return {
    name: 'modo:shell',
    enforce: 'pre',
    resolveId(id) {
      if (id === SHELL_VIRTUAL) return SHELL_RESOLVED
      if (id === SHELL_CSS_VIRTUAL) return SHELL_CSS_RESOLVED
      if (id === SHELL_DS_CSS_VIRTUAL) return SHELL_DS_CSS_RESOLVED
      return null
    },
    async load(id) {
      if (id === SHELL_DS_CSS_RESOLVED) {
        const imports = shellDsCssFiles.map((f) => `import ${JSON.stringify(f)};`).join('\n')
        return [imports, `export default '';`].join('\n')
      }
      if (id === SHELL_RESOLVED) {
        const { shell, warnings } = await getCache()
        if (warnings.length > 0) {
          process.stderr.write(`[modo:shell] warnings:\n${warnings.map((w) => '  • ' + w).join('\n')}\n`)
        }
        const slotBindings: Array<{ name: string; bundlePath?: string }> = [
          { name: '__Button', bundlePath: shell.Button.bundlePath },
          { name: '__Link', bundlePath: shell.Link.bundlePath },
          { name: '__Code', bundlePath: shell.Code.bundlePath },
          { name: '__SidebarRoot', bundlePath: shell.Sidebar.Root.bundlePath },
          { name: '__SidebarItem', bundlePath: shell.Sidebar.Item.bundlePath },
          { name: '__SidebarSection', bundlePath: shell.Sidebar.Section.bundlePath },
          { name: '__Panel', bundlePath: shell.Panel.bundlePath },
        ]
        const imports = slotBindings
          .filter((s) => s.bundlePath)
          .map((s) => `import __mod_${s.name} from ${JSON.stringify(s.bundlePath)};`)
          .join('\n')
        const bindings = slotBindings
          .map((s) =>
            s.bundlePath
              ? `const ${s.name} = (__mod_${s.name}.default ?? __mod_${s.name});`
              : `const ${s.name} = null;`,
          )
          .join('\n')
        return [
          imports,
          bindings,
          `export const shell = {`,
          `  Button: __Button,`,
          `  Link: __Link,`,
          `  Code: __Code,`,
          `  Sidebar: { Root: __SidebarRoot, Item: (__SidebarRoot && __SidebarRoot.Item) ?? __SidebarItem, Section: (__SidebarRoot && __SidebarRoot.Section) ?? __SidebarSection },`,
          `  Panel: __Panel,`,
          `};`,
          `export const shellCSS = '';`,
          `export default shell;`,
        ].join('\n')
      }
      if (id === SHELL_CSS_RESOLVED) {
        const { shell } = await getCache()
        const imports = shell.cssFiles.map((f) => `import ${JSON.stringify(f)};`).join('\n')
        return [imports, `export default '';`].join('\n')
      }
      return null
    },
  }
}

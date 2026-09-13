import type { Plugin } from 'vite'
import type { ComponentType } from 'react'
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

type PanelItemExport = {
  label: string
  bundlePath: string
  Component: unknown
  cssPaths: string[]
}

type ResolvedShellExport = ResolvedShell & {
  cssFiles: string[]
  panelItems: PanelItemExport[]
}

async function resolveShellForUser(opts: Options): Promise<{ shell: ResolvedShellExport; warnings: string[] }> {
  const warnings: string[] = []
  const configPath = process.env.MODO_CONFIG_PATH ?? resolve(opts.userRoot, 'modo.config.ts')
  const config = await loadModoConfig(configPath)
  const userItems = await discoverUserItems(opts.userRoot)

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
    loadUserPath,
    { warnings },
  )
  const panelItems: PanelItemExport[] = []
  for (const item of config.panel?.items ?? []) {
    const lc = await loadUserPath(item.component)
    if (!lc?.bundlePath) {
      warnings.push(`panel item "${item.label}" component "${item.component}" could not be resolved`)
      continue
    }
    panelItems.push({
      label: item.label,
      bundlePath: lc.bundlePath,
      Component: lc.Component,
      cssPaths: lc.cssPaths,
    })
  }
  const cssFiles = [
    ...resolved.Button.cssPaths,
    ...resolved.Link.cssPaths,
    ...resolved.Code.cssPaths,
    ...resolved.Sidebar.Root.cssPaths,
    ...resolved.Sidebar.Item.cssPaths,
    ...resolved.Sidebar.Section.cssPaths,
    ...resolved.Panel.cssPaths,
    ...panelItems.flatMap((it) => it.cssPaths),
  ]
  return {
    shell: {
      Button: resolved.Button,
      Link: resolved.Link,
      Code: resolved.Code,
      Sidebar: { Root: resolved.Sidebar.Root, Item: resolved.Sidebar.Item, Section: resolved.Sidebar.Section },
      Panel: resolved.Panel,
      cssFiles,
      panelItems,
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

  return {
    name: 'modo:shell',
    enforce: 'pre',
    resolveId(id) {
      if (id === SHELL_VIRTUAL) return SHELL_RESOLVED
      if (id === SHELL_CSS_VIRTUAL) return SHELL_CSS_RESOLVED
      return null
    },
    async load(id) {
      if (id === SHELL_RESOLVED) {
        const { shell, warnings } = await getCache()
        if (warnings.length > 0) {
          process.stderr.write(`[modo:shell] warnings:\n${warnings.map((w) => '  • ' + w).join('\n')}\n`)
        }
        const slotBindings: Array<{ name: string; bundlePath?: string; fallbackName?: string }> = [
          { name: '__Button', bundlePath: shell.Button.bundlePath, fallbackName: shell.Button.fallbackName },
          { name: '__Link', bundlePath: shell.Link.bundlePath, fallbackName: shell.Link.fallbackName },
          { name: '__Code', bundlePath: shell.Code.bundlePath, fallbackName: shell.Code.fallbackName },
          { name: '__SidebarRoot', bundlePath: shell.Sidebar.Root.bundlePath, fallbackName: shell.Sidebar.Root.fallbackName },
          { name: '__SidebarItem', bundlePath: shell.Sidebar.Item.bundlePath, fallbackName: shell.Sidebar.Item.fallbackName },
          { name: '__SidebarSection', bundlePath: shell.Sidebar.Section.bundlePath, fallbackName: shell.Sidebar.Section.fallbackName },
          { name: '__Panel', bundlePath: shell.Panel.bundlePath, fallbackName: shell.Panel.fallbackName },
        ]
        const panelItemBindings = shell.panelItems.map((it, idx) => ({
          name: `__PanelItem${idx}`,
          bundlePath: it.bundlePath,
        }))
        const fallbackImports = slotBindings
          .filter((s) => s.fallbackName && !s.bundlePath)
          .map((s) => `import { ${s.fallbackName} as __fb_${s.name} } from '../lib/slots';`)
          .join('\n')
        const imports = [
          `import { primitives as __primitives } from 'virtual:modo-items';`,
          fallbackImports,
          ...slotBindings
            .filter((s) => s.bundlePath)
            .map((s) => `import __mod_${s.name} from ${JSON.stringify(s.bundlePath)};`),
          ...panelItemBindings.map((s) => `import __mod_${s.name} from ${JSON.stringify(s.bundlePath)};`),
        ].join('\n')
        const bindings = [
          ...slotBindings.map((s) => {
            if (s.bundlePath) return `const ${s.name} = (__mod_${s.name}.default ?? __mod_${s.name});`
            if (s.fallbackName) return `const ${s.name} = __fb_${s.name};`
            return `const ${s.name} = null;`
          }),
          ...panelItemBindings.map(
            (s) => `const ${s.name}_Comp = (__mod_${s.name}.default ?? __mod_${s.name});`,
          ),
        ].join('\n')
        const panelItemsJson = shell.panelItems
          .map(
            (it, idx) =>
              `{ label: ${JSON.stringify(it.label)}, bundlePath: ${JSON.stringify(it.bundlePath)}, Component: __PanelItem${idx}_Comp, cssPaths: ${JSON.stringify(it.cssPaths)} }`,
          )
          .join(',')
        return [
          imports,
          bindings,
          `export const shell = {`,
          `  Button: __Button,`,
          `  Link: __Link,`,
          `  Code: __Code,`,
          `  Sidebar: { Root: __SidebarRoot, Item: (__SidebarRoot && __SidebarRoot.Item) ?? __SidebarItem, Section: (__SidebarRoot && __SidebarRoot.Section) ?? __SidebarSection },`,
          `  Panel: __Panel,`,
          `  primitives: __primitives,`,
          `};`,
          `export const panelItems = [${panelItemsJson}];`,
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

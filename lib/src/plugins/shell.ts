import type { Plugin } from 'vite'
import type { ComponentType } from 'react'
import {
  resolveShellSlots,
  type LoadedComponent,
  type ParsedItemLite,
  type ResolvedShell,
} from '../lib/slots'
import type { SiteConfig } from '../lib/schema'
import type { Bundler, BundleResult } from './bundle'

interface Options {
  userRoot: string
  libDir: string
  bundler: Bundler
}

const SHELL_VIRTUAL = 'virtual:modo-shell'
const SHELL_RESOLVED = '\0virtual:modo-shell'
const SHELL_CSS_VIRTUAL = 'virtual:modo-shell-css'
const SHELL_CSS_RESOLVED = '\0virtual:modo-shell-css'

type PanelItemExport = {
  label: string
  bundlePath: string
  cssPaths: string[]
}

type ResolvedShellExport = ResolvedShell & {
  cssFiles: string[]
  panelItems: PanelItemExport[]
}

type ShellResult = { shell: ResolvedShellExport; warnings: string[] }

// Everything comes from the shared build (./bundle): items for interface
// matching, config.shell / panel modules from its `extras`. Components are
// only ever imported in the browser, never in node.
async function resolveShellForUser(result: BundleResult): Promise<ShellResult> {
  const warnings: string[] = []
  const config: Pick<SiteConfig, 'name' | 'shell' | 'panel'> = result.config ?? { name: '' }
  const userItems: ParsedItemLite[] = result.items.map((it) => ({
    name: it.name,
    id: it.id,
    tier: it.tier,
    props: it.props.map((p) => ({ name: p.name, optional: p.optional })),
    bundleUrl: it.bundlePath,
  }))

  async function loadUserPath(p: string): Promise<LoadedComponent | null> {
    const extra = result.extras.get(p)
    if (!extra?.hasDefault) return null
    return {
      Component: null as unknown as ComponentType<any>,
      cssPaths: extra.cssFiles,
      source: 'config',
      resolvedPath: p,
      bundlePath: extra.bundlePath,
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
      cssPaths: lc.cssPaths,
    })
  }
  const cssFiles = [
    ...resolved.Button.cssPaths,
    ...resolved.Link.cssPaths,
    ...resolved.Code.cssPaths,
    ...resolved.Icon.cssPaths,
    ...resolved.Sidebar.Root.cssPaths,
    ...resolved.Sidebar.Item.cssPaths,
    ...resolved.Sidebar.Section.cssPaths,
    ...panelItems.flatMap((it) => it.cssPaths),
  ]
  return {
    shell: {
      Button: resolved.Button,
      Link: resolved.Link,
      Code: resolved.Code,
      Select: resolved.Select,
      Icon: resolved.Icon,
      Sidebar: { Root: resolved.Sidebar.Root, Item: resolved.Sidebar.Item, Section: resolved.Sidebar.Section },
      cssFiles,
      panelItems,
    },
    warnings,
  }
}

export function shellPlugin(options: Options): Plugin {
  // Cached per build result: a rebuild (bundler.invalidate) yields a new one.
  let cache: { result: BundleResult; value: Promise<ShellResult> } | null = null

  async function getCache(): Promise<ShellResult> {
    const result = await options.bundler.get()
    if (cache?.result !== result) cache = { result, value: resolveShellForUser(result) }
    return cache.value
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
          { name: '__Select', bundlePath: shell.Select.bundlePath, fallbackName: shell.Select.fallbackName },
          { name: '__Icon', bundlePath: shell.Icon.bundlePath, fallbackName: shell.Icon.fallbackName },
          { name: '__SidebarRoot', bundlePath: shell.Sidebar.Root.bundlePath, fallbackName: shell.Sidebar.Root.fallbackName },
          { name: '__SidebarItem', bundlePath: shell.Sidebar.Item.bundlePath, fallbackName: shell.Sidebar.Item.fallbackName },
          { name: '__SidebarSection', bundlePath: shell.Sidebar.Section.bundlePath, fallbackName: shell.Sidebar.Section.fallbackName },
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
          `  Select: __Select,`,
          `  Icon: __Icon,`,
          `  Sidebar: { Root: __SidebarRoot, Item: (__SidebarRoot && __SidebarRoot.Item) ?? __SidebarItem, Section: (__SidebarRoot && __SidebarRoot.Section) ?? __SidebarSection },`,
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

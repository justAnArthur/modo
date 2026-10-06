import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import type { SiteConfig } from '../lib/schema'
import { type LoadedComponent, type ParsedItemLite, type ResolvedShell, resolveShellSlots } from '../lib/slots'
import type { BundleResult, Bundler } from './bundle'
import { cssModule } from './css-module'

interface Options {
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
  exportName?: string
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
  const config: Pick<SiteConfig, 'shell' | 'panel'> = result.config ?? {}
  const userItems: ParsedItemLite[] = result.items.map(it => ({
    name: it.name,
    id: it.id,
    tier: it.tier,
    props: it.props.map(p => ({ name: p.name, optional: p.optional })),
    bundleUrl: it.bundlePath,
  }))

  async function loadUserPath(p: string): Promise<LoadedComponent | null> {
    const extra = result.extras.get(p)
    if (!extra?.exported) return null
    return {
      cssPaths: extra.cssFiles,
      source: 'config',
      resolvedPath: p,
      bundlePath: extra.bundlePath,
      exportName: extra.exportName,
    }
  }

  const resolved = await resolveShellSlots(config, userItems, loadUserPath, { warnings })
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
      exportName: lc.exportName,
      cssPaths: lc.cssPaths,
    })
  }
  const cssFiles = [
    resolved.Button,
    resolved.Link,
    resolved.Code,
    resolved.Select,
    resolved.Icon,
    resolved.Sidebar.Root,
    resolved.Sidebar.Item,
    resolved.Sidebar.Section,
    ...panelItems,
  ].flatMap(it => it.cssPaths)
  return {
    shell: {
      Button: resolved.Button,
      Link: resolved.Link,
      Code: resolved.Code,
      Select: resolved.Select,
      Icon: resolved.Icon,
      Sidebar: {
        Root: resolved.Sidebar.Root,
        Item: resolved.Sidebar.Item,
        Section: resolved.Sidebar.Section,
      },
      cssFiles,
      panelItems,
    },
    warnings,
  }
}

export function shellPlugin(options: Options): Plugin {
  // Cached per build result: a rebuild (bundler.invalidate) yields a new one.
  let cache: { result: BundleResult; value: Promise<ShellResult> } | null = null
  let lastReport = ''
  // An absolute path: a virtual module's relative import would resolve from the process cwd.
  const slotsModule = JSON.stringify(resolve(options.libDir, 'src/lib/slots.tsx'))

  async function getCache(): Promise<ShellResult> {
    const result = await options.bundler.get()
    if (cache?.result !== result) cache = { result, value: resolveShellForUser(result).then(report) }
    return cache.value
  }

  // Printed once per changed set, in the bundler's format, not on every load.
  function report(shell: ShellResult): ShellResult {
    const text = shell.warnings.map(w => `[modo:shell] warning: ${w}`).join('\n')
    if (text && text !== lastReport) process.stderr.write(`${text}\n`)
    lastReport = text
    return shell
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
        const { shell } = await getCache()
        const slotBindings = Object.entries({
          __Button: shell.Button,
          __Link: shell.Link,
          __Code: shell.Code,
          __Select: shell.Select,
          __Icon: shell.Icon,
          __SidebarRoot: shell.Sidebar.Root,
          __SidebarItem: shell.Sidebar.Item,
          __SidebarSection: shell.Sidebar.Section,
        }).map(([name, s]) => ({ name, ...s }))
        const panelItemBindings = shell.panelItems.map((it, idx) => ({
          name: `__PanelItem${idx}`,
          ...it,
        }))
        const exportOf = (s: { name: string; exportName?: string }) =>
          `__mod_${s.name}[${JSON.stringify(s.exportName ?? 'default')}]`
        const fallbackImports = slotBindings
          .filter(s => s.fallbackName && !s.bundlePath)
          .map(s => `import { ${s.fallbackName} as __fb_${s.name} } from ${slotsModule};`)
          .join('\n')
        const imports = [
          fallbackImports,
          ...[...slotBindings.filter(s => s.bundlePath), ...panelItemBindings].map(
            s => `import * as __mod_${s.name} from ${JSON.stringify(s.bundlePath)};`,
          ),
        ].join('\n')
        const bindings = [
          // Every slot has a bundle or a plain fallback.
          ...slotBindings.map(s => `const ${s.name} = ${s.bundlePath ? exportOf(s) : `__fb_${s.name}`};`),
          ...panelItemBindings.map(s => `const ${s.name}_Comp = ${exportOf(s)};`),
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
          `  Sidebar: { Root: __SidebarRoot, Item: __SidebarRoot.Item ?? __SidebarItem, Section: __SidebarRoot.Section ?? __SidebarSection },`,
          `};`,
          `export const panelItems = [${panelItemsJson}];`,
        ].join('\n')
      }
      if (id === SHELL_CSS_RESOLVED) {
        const { shell } = await getCache()
        return cssModule(shell.cssFiles)
      }
      return null
    },
  }
}

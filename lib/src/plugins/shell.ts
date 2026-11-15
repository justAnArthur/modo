import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { isComponentRef } from '../lib/refs'
import type { SiteConfig } from '../lib/schema'
import type { BundleResult, Bundler } from './bundle'
import { createReporter } from './report'
import { type BuiltSlot, resolveShellSlots, type ShellResolution, type SlotResolution } from './slots'
import { cssModule, virtualModules } from './virtual'

interface Options {
  libDir: string
  bundler: Bundler
}

interface PanelResolution extends BuiltSlot {
  label: string
}

interface ShellBuild {
  shell: ShellResolution
  panelItems: PanelResolution[]
  logo: BuiltSlot | null
  cssFiles: string[]
}

// Everything comes from the shared build: items for matching, pinned and panel
// modules from its `extras`.
function resolveShell(result: BundleResult): { build: ShellBuild; warnings: string[] } {
  const config: Partial<SiteConfig> = result.config ?? {}
  const loadPinned = (ref: string): BuiltSlot | null => {
    const extra = result.extras.get(ref)
    if (!extra?.exported) return null
    const { bundlePath, exportName, cssFiles } = extra
    return { source: 'config', bundlePath, exportName, cssFiles }
  }

  const { shell, warnings } = resolveShellSlots(config, result.items, loadPinned)

  const panelItems: PanelResolution[] = []
  for (const { label, component } of config.panel?.items ?? []) {
    const built = loadPinned(component)
    if (built) panelItems.push({ ...built, label })
    else warnings.push(`panel item "${label}" component "${component}" could not be resolved`)
  }

  const logoRef = config.logo && isComponentRef(config.logo) ? config.logo : null
  const logo = logoRef ? loadPinned(logoRef) : null
  if (logoRef && !logo) warnings.push(`logo "${logoRef}" could not be resolved`)

  const slots: SlotResolution[] = [
    shell.Button,
    shell.Link,
    shell.Code,
    shell.Select,
    shell.Icon,
    shell.Sidebar.Root,
    shell.Sidebar.Item,
    shell.Sidebar.Section,
  ]
  const cssFiles = [...(logo ? [logo] : []), ...slots, ...panelItems].flatMap(s =>
    s.source === 'fallback' ? [] : s.cssFiles,
  )
  return { build: { shell, panelItems, logo, cssFiles }, warnings }
}

function shellModule(build: ShellBuild, plainModule: string): string {
  const { shell, panelItems, logo } = build
  const slots = Object.entries({
    __Button: shell.Button,
    __Link: shell.Link,
    __Code: shell.Code,
    __Select: shell.Select,
    __Icon: shell.Icon,
    __SidebarRoot: shell.Sidebar.Root,
    __SidebarItem: shell.Sidebar.Item,
    __SidebarSection: shell.Sidebar.Section,
  })
  const built: Array<[string, BuiltSlot]> = [
    ...slots.filter((s): s is [string, BuiltSlot] => s[1].source !== 'fallback'),
    ...panelItems.map((it, i): [string, BuiltSlot] => [`__PanelItem${i}`, it]),
    ...(logo ? [['__Logo', logo] as [string, BuiltSlot]] : []),
  ]
  return [
    ...slots.flatMap(([name, s]) =>
      s.source === 'fallback' ? [`import { ${s.fallbackName} as ${name} } from ${plainModule};`] : [],
    ),
    ...built.flatMap(([name, s]) => [
      `import * as ${name}_mod from ${JSON.stringify(s.bundlePath)};`,
      `const ${name} = ${name}_mod[${JSON.stringify(s.exportName)}];`,
    ]),
    `export const shell = {`,
    `  Button: __Button,`,
    `  Link: __Link,`,
    `  Code: __Code,`,
    `  Select: __Select,`,
    `  Icon: __Icon,`,
    `  Sidebar: { Root: __SidebarRoot, Item: __SidebarRoot.Item ?? __SidebarItem, Section: __SidebarRoot.Section ?? __SidebarSection },`,
    `};`,
    `export const panelItems = [${panelItems.map((it, i) => `{ label: ${JSON.stringify(it.label)}, Component: __PanelItem${i} }`).join(', ')}];`,
    `export const Logo = ${logo ? '__Logo' : 'null'};`,
  ].join('\n')
}

export function shellPlugin(options: Options): Plugin {
  const modules = virtualModules('shell')
  const report = createReporter('shell')
  // An absolute path: a virtual module's relative import would resolve from the process cwd.
  const plainModule = JSON.stringify(resolve(options.libDir, 'src/runtime/shell/plain.tsx'))
  // Per build result: a rebuild (bundler.invalidate) yields a new one.
  let cache: { result: BundleResult; build: ShellBuild } | null = null

  async function current(): Promise<ShellBuild> {
    const result = await options.bundler.get()
    if (cache?.result !== result) {
      const { build, warnings } = resolveShell(result)
      report({ warnings })
      cache = { result, build }
    }
    return cache.build
  }

  return {
    name: 'modo:shell',
    enforce: 'pre',
    resolveId: modules.resolveId,
    async load(id) {
      if (id === modules.id) return shellModule(await current(), plainModule)
      if (id === modules.css) return cssModule((await current()).cssFiles)
      return null
    },
  }
}

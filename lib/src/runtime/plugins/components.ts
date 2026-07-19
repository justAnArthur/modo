// exposes user-provided components to the lib chrome as a virtual module.
// `modo.config.ts` can map slot names to user component paths, e.g.
//   components: { Select: './components/my-select', Link: './components/my-link' }
// missing slots resolve to null; the lib's +Layout.tsx falls back to native.

import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { stat } from 'node:fs/promises'
import { loadModoConfig } from '../../exports/modo-config'
import { bundleUserItem } from './_helpers'

export interface ComponentsPluginOptions {
  root: string  // the user's project root
}

const SLOTS = ['Select', 'Link', 'Button', 'Theme', 'Density', 'Radius'] as const
type Slot = (typeof SLOTS)[number]

// strip a known extension so callers can use either
//   './components/select' (directory; esbuild will find index.tsx)
//   './components/select/index.tsx'
function resolveSlot(componentPath: string, root: string): string {
  return resolve(root, componentPath).replace(/\.(tsx|ts|jsx|js)$/, '')
}

async function pickExisting(candidates: string[]): Promise<string | null> {
  for (const c of candidates) {
    try {
      const s = await stat(c)
      if (s.isFile()) return c
    } catch { /* keep looking */ }
  }
  return null
}

export function componentsPlugin(opts: ComponentsPluginOptions): Plugin {
  return {
    name: 'modo-components',
    async resolveId(id) {
      if (id === 'virtual:modo-components') return '\0virtual:modo-components'
      return null
    },
    async load(id) {
      if (id !== '\0virtual:modo-components') return null
      const config = (await loadModoConfig(opts.root)) as { components?: Record<string, string> } | null
      const map = config?.components ?? {}
      // we pre-resolve each slot using esbuild so the user's component
      // becomes a static import in this virtual module. that keeps the
      // build synchronous and lets the consumer treat slots as plain
      // values rather than Promises.
      const imports: string[] = []
      const bindings: string[] = []
      let i = 0
      for (const slot of SLOTS) {
        const p = map[slot]
        if (!p) {
          bindings.push(`export const ${slot} = null;`)
          continue
        }
        const abs = resolveSlot(p, opts.root)
        const candidates = [
          abs,
          `${abs}.tsx`,
          `${abs}.ts`,
          `${abs}.jsx`,
          `${abs}.js`,
          resolve(abs, 'index.tsx'),
          resolve(abs, 'index.ts'),
        ]
        const entry = await pickExisting(candidates)
        if (!entry) {
          bindings.push(`export const ${slot} = null;`)
          continue
        }
        const bundled = await bundleUserItem(entry, { prefix: `modo-cmp-${slot}-${i++}` })
        if (!bundled?.path) {
          bindings.push(`export const ${slot} = null;`)
          continue
        }
        imports.push(`import * as __ns_${slot} from '${bundled.path}';`)
        // default export OR named export matching the slot
        bindings.push(`export const ${slot} = __ns_${slot}.default ?? __ns_${slot}['${slot}'] ?? null;`)
      }
      return [...imports, ...bindings].join('\n')
    },

    configureServer(s) {
      // chrome slot components (Select, Link, Button, etc.) live in the
      // user's project — same caveat as source.ts: vite's default
      // chokidar doesn't watch them. add the project root so edits fire
      // handleHotUpdate.
      s.watcher.add(opts.root)
    },

    async handleHotUpdate(ctx) {
      const dsRoot = resolve(opts.root)
      if (!ctx.file.startsWith(dsRoot)) return
      // re-bundle user chrome slot components and refresh the page.
      const mod = ctx.server.moduleGraph.getModuleById('\0virtual:modo-components')
      if (!mod) return
      ctx.server.moduleGraph.invalidateModule(mod)
      // virtual module is server-side only — force a full page reload via
      // the HMR WebSocket so the client picks up the new chrome.
      ctx.server.environments.client.hot.send({
        type: 'full-reload',
        path: '*',
        triggeredBy: ctx.file,
      })
      return []
    },
  }
}

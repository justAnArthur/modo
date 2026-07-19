// scans the user's project for primitive/component/block items, parses each
// one's default export with the TSDoc parser, and exposes:
//   - virtual:modo-items       : { items, byId, components, examples, dsRoot }
//                                 for the per-item page renderers
//   - virtual:modo-items-css   : a side-effect import of each item's CSS
//                                 file. Vite injects them as real CSS.
//
// each user item is bundled into a tmp .mjs (via the shared bundleUserItem
// helper) so the runtime can statically import it. the CSS loader is
// 'empty' so the user's `import './foo.css'` in their index.tsx is
// stripped — CSS is loaded separately via the virtual CSS module, no
// string concat, no <style dangerouslySetInnerHTML>.

import type { Plugin } from 'vite'
import { readFile, readdir, stat, rm } from 'node:fs/promises'
import { readFileSync as readFileSyncFs } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { parseItemSource } from '../../exports/tsdoc'
import { compileExampleBody } from '../components/example-compiler'
import { bundleUserItem } from './_helpers'

export interface SourcePluginOptions {
  root: string
}

interface DiscoveredItem {
  id: string
  category: 'primitives' | 'components' | 'blocks'
  cssPath: string | null
  filePath: string
  hasMdx: boolean
  errors: string[]
}

async function discoverDir(dir: string, category: DiscoveredItem['category']): Promise<DiscoveredItem[]> {
  const out: DiscoveredItem[] = []
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch {
    return out
  }

  for (const entry of entries) {
    const fullDir = join(dir, entry)
    const s = await stat(fullDir)
    if (!s.isDirectory()) continue

    const indexPath = join(fullDir, 'index.tsx')
    const errors: string[] = []
    let raw = ''
    try {
      raw = await readFile(indexPath, 'utf-8')
    } catch {
      out.push({
        id: entry,
        category,
        cssPath: null,
        filePath: fullDir,
        hasMdx: false,
        errors: [`missing ${indexPath}`],
      })
      continue
    }

    const mdxPath = join(fullDir, `${entry}.mdx`)
    let hasMdx = false
    try {
      await stat(mdxPath)
      hasMdx = true
    } catch {
      hasMdx = false
    }

    // convention: one CSS file per item, named `<item>.css`. if the
    // user has more than one, we import all of them (alphabetical).
    let cssPath: string | null = null
    const cssFiles = (await readdir(fullDir).catch(() => [])).filter((f) => f.endsWith('.css'))
    if (cssFiles.length > 0) {
      cssFiles.sort()
      cssPath = join(fullDir, cssFiles[0]!)
    }

    const parsed = parseItemSource(raw, indexPath)
    if (parsed.errors.length > 0) errors.push(...parsed.errors)
    if (!parsed.name) errors.push('no default-exported function with a name')

    out.push({
      id: entry,
      category,
      cssPath,
      filePath: indexPath,
      hasMdx,
      errors,
    })
  }
  return out
}

const VIRTUAL_DATA = 'virtual:modo-items'
const VIRTUAL_CSS = 'virtual:modo-items-css'
const RESOLVED_DATA = '\0' + VIRTUAL_DATA
const RESOLVED_CSS = '\0' + VIRTUAL_CSS

export function sourcePlugin(options: SourcePluginOptions): Plugin {
  return {
    name: 'modo-atomic-ui:source',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_DATA) return RESOLVED_DATA
      if (id === VIRTUAL_CSS) return RESOLVED_CSS
      return null
    },

    configureServer(s) {
      // the user's items live in a directory that vite's default chokidar
      // doesn't watch (they're not in the import graph — we bundle them
      // into tmp .mjs files via esbuild, so vite never imports them
      // directly). without this, edits to `demo/components/foo/index.tsx`
      // never fire handleHotUpdate and the page never refreshes.
      s.watcher.add(options.root)
    },

    async load(id) {
      if (id !== RESOLVED_DATA && id !== RESOLVED_CSS) return null

      const dsRoot = options.root
      const [primitives, components, blocks] = await Promise.all([
        discoverDir(join(dsRoot, 'primitives'), 'primitives'),
        discoverDir(join(dsRoot, 'components'), 'components'),
        discoverDir(join(dsRoot, 'blocks'), 'blocks'),
      ])
      const all = [...primitives, ...components, ...blocks]

      if (id === RESOLVED_CSS) {
        // side-effect imports of each item's CSS file, sorted by
        // tier+id for stable output. Vite injects them in order.
        const lines: string[] = []
        const sorted = [...all].sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category)
          return a.id.localeCompare(b.id)
        })
        for (const item of sorted) {
          if (item.cssPath) lines.push(`import ${JSON.stringify(item.cssPath)};`)
        }
        return lines.join('\n') + '\n'
      }

      // RESOLVED_DATA: build the static import map + examples.
      const byId: Record<string, ReturnType<typeof parseItemSource>> = {}
      const imports: string[] = []
      const compBindings: string[] = []
      const exampleBindings: string[] = []
      let i = 0
      for (const item of all) {
        const key = `${item.category}/${item.id}`
        try {
          const raw = readFileSyncFs(item.filePath, 'utf-8')
          byId[key] = parseItemSource(raw, item.filePath)
        } catch {
          byId[key] = { name: item.id, description: '', props: [], examples: [], errors: [] }
        }
        const bundled = await bundleUserItem(item.filePath, { prefix: `modo-items-${i++}` })
        if (bundled?.path) {
          imports.push(`import * as __ns_${i} from '${bundled.path}';`)
          compBindings.push(`  '${key}': __ns_${i}.default ?? null,`)
        } else {
          compBindings.push(`  '${key}': null,`)
        }
        const parsed = byId[key]!
        const exMap: Record<number, string> = {}
        const componentName = parsed.name ?? item.id
        if (parsed.examples) {
          for (let idx = 0; idx < parsed.examples.length; idx++) {
            const ex = parsed.examples[idx]!
            try {
              exMap[idx] = compileExampleBody(ex.code, componentName)
            } catch {
              exMap[idx] = ''
            }
          }
        }
        exampleBindings.push(`  '${key}': ${JSON.stringify(exMap)},`)
        i++
      }

      // best-effort cleanup of stale tmp dirs from previous vite sessions.
      try {
        for (const name of await readdir(tmpdir())) {
          if (!name.startsWith('modo-items-')) continue
          const p = join(tmpdir(), name)
          try {
            const s = await stat(p)
            if (s.isDirectory() && Date.now() - s.mtimeMs > 60_000) {
              await rm(p, { recursive: true, force: true }).catch(() => {})
            }
          } catch { /* gone */ }
        }
      } catch { /* noop */ }

      return [
        ...imports,
        `export const items = ${JSON.stringify(all, null, 2)};`,
        `export const byId = ${JSON.stringify(byId, null, 2)};`,
        `export const dsRoot = ${JSON.stringify(dsRoot)};`,
        `export const components = {\n${compBindings.join('\n')}\n};`,
        `export const examples = {\n${exampleBindings.join('\n')}\n};`,
      ].join('\n')
    },

    async handleHotUpdate(ctx) {
      const dsRoot = resolve(options.root)
      if (!ctx.file.startsWith(dsRoot)) return
      // invalidate the virtual modules so the next request re-runs `load()`,
      // re-bundles user items (new tmp .mjs paths) and picks up new content.
      const invalidated: NonNullable<ReturnType<typeof ctx.server.moduleGraph.getModuleById>>[] = []
      for (const id of [RESOLVED_DATA, RESOLVED_CSS]) {
        const mod = ctx.server.moduleGraph.getModuleById(id)
        if (mod) { ctx.server.moduleGraph.invalidateModule(mod); invalidated.push(mod) }
      }
      // returning `[]` would tell Vite "no HMR needed" and silently swallow
      // the change — the page would never refresh. returning the modules
      // makes Vite send an HMR boundary update to the client, which forces
      // a full reload for the page (the virtual module is not a React
      // HMR-friendly boundary, so Vike reloads the route).
      return invalidated
    },
  }
}

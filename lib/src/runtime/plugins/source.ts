// scans the user's project for primitive/component/block items, parses each
// one's default export with the TSDoc parser, and exposes a `virtual:modo-items`
// module that the per-item page renderers consume.

import type { Plugin } from 'vite'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { parseItemSource } from '../../exports/tsdoc'

export interface SourcePluginOptions {
  root: string
}

interface DiscoveredItem {
  id: string
  category: 'primitives' | 'components' | 'blocks'
  importPath: string
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
        importPath: '',
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

    // TSDoc parse for the validation report (errors on this item).
    const parsed = parseItemSource(raw, indexPath)
    if (parsed.errors.length > 0) errors.push(...parsed.errors)
    if (!parsed.name) errors.push('no default-exported function with a name')

    out.push({
      id: entry,
      category,
      importPath: '/' + relative(resolve(process.cwd()), indexPath).replace(/\\/g, '/'),
      filePath: indexPath,
      hasMdx,
      errors,
    })
  }
  return out
}

const VIRTUAL_ID = 'virtual:modo-items'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

export function sourcePlugin(options: SourcePluginOptions): Plugin {
  return {
    name: 'modo-atomic-ui:source',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null

      const dsRoot = options.root
      const [primitives, components, blocks] = await Promise.all([
        discoverDir(join(dsRoot, 'primitives'), 'primitives'),
        discoverDir(join(dsRoot, 'components'), 'components'),
        discoverDir(join(dsRoot, 'blocks'), 'blocks'),
      ])
      const all = [...primitives, ...components, ...blocks]

      // second pass: read each item's source, parse TSDoc, and bundle the
      // parsed metadata into `byId`. the per-item page reads from byId.
      const byId: Record<string, ReturnType<typeof parseItemSource>> = {}
      for (const item of all) {
        try {
          const raw = await readFile(item.filePath, 'utf-8')
          byId[`${item.category}/${item.id}`] = parseItemSource(raw, item.filePath)
        } catch {
          // already reported as an error in the discovery pass
        }
      }

      return [
        `export const items = ${JSON.stringify(all, null, 2)};`,
        `export const byId = ${JSON.stringify(byId, null, 2)};`,
        `export const dsRoot = ${JSON.stringify(dsRoot)};`,
      ].join('\n')
    },

    async handleHotUpdate(ctx) {
      const dsRoot = resolve(options.root)
      if (ctx.file.startsWith(dsRoot)) {
        const mod = (this as any).environment?.moduleGraph?.getModuleById?.(RESOLVED_VIRTUAL_ID)
        if (mod) mod.invalidate?.()
        return []
      }
      return
    },
  }
}

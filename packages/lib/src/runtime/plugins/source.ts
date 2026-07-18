import type { Plugin } from 'vite'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

export interface SourcePluginOptions {
  root: string
}

interface DiscoveredItem {
  id: string                 // 'button'
  category: 'primitives' | 'components' | 'blocks'
  importPath: string         // relative to vite root, used for dynamic import
  filePath: string           // absolute
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

    const errors: string[] = []
    if (!/export\s+const\s+meta\b/.test(raw)) errors.push('missing `export const meta`')
    if (!/export\s+(?:const|function)\s+Component\b/.test(raw)) errors.push('missing `export const Component` (or `export function Component`)')
    if (!/export\s+const\s+examples\b/.test(raw)) errors.push('missing `export const examples`')
    if (!/export\s+const\s+props\b/.test(raw)) errors.push('missing `export const props`')

    const mdxPath = join(fullDir, `${entry}.mdx`)
    let hasMdx = false
    try {
      await stat(mdxPath)
      hasMdx = true
    } catch {
      hasMdx = false
    }

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
      return [
        `export const items = ${JSON.stringify(all, null, 2)};`,
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

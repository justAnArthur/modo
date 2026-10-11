import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { ORDER_PREFIX } from './order'

export interface DiscoveredPage {
  /** The url path: the file's path in the pages folder, without `.mdx` and ordering prefixes (`02-guides/01-setup.mdx` → `guides/setup`). */
  slug: string
  /** The folders the page sits in, prefixes kept so they sort (`02-guides`), if any. */
  group?: string
  file: string
}

/**
 * The `.mdx` pages under `dir`, in file-name order; folders nest. A slug under
 * `docs/` would shadow the lib's routes, and a repeated slug its first page,
 * so both are skipped and reported in `skipped`.
 */
export function discoverPages(dir: string): { pages: DiscoveredPage[]; skipped: string[] } {
  const pages: DiscoveredPage[] = []
  const skipped: string[] = []
  const seen = new Set<string>()
  const walk = (folder: string, group?: string) => {
    for (const name of readdirSync(folder).sort()) {
      const file = resolve(folder, name)
      const path = group ? `${group}/${name}` : name
      if (statSync(file).isDirectory()) {
        walk(file, path)
        continue
      }
      if (!name.endsWith('.mdx')) continue
      const slug = path
        .slice(0, -'.mdx'.length)
        .split('/')
        .map(part => part.replace(ORDER_PREFIX, ''))
        .join('/')
      if (slug === 'docs' || slug.startsWith('docs/') || seen.has(slug)) {
        skipped.push(path)
        continue
      }
      seen.add(slug)
      pages.push({ slug, group, file })
    }
  }
  if (existsSync(dir)) walk(dir)
  return { pages, skipped }
}

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { nameTitle, ORDER_PREFIX } from '../lib/text'

export interface DiscoveredGuide {
  /**
   * The path under `/guides/`: the file's path in `guides/` without `.mdx` and ordering prefixes, NFC
   * (`02-theming/01-tokens.mdx` → `theming/tokens`). A folder's `index.mdx` is the folder; the root one is `''`.
   */
  slug: string
  /** The folders the guide sits in, prefixes kept so they sort (`02-theming`), if any. */
  group?: string
  /** The frontmatter `title`, else the file (or, for an `index.mdx`, the folder) name: `getting-started` → `Getting started`. */
  title: string
  /** The frontmatter `description`. */
  description?: string
  file: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * The `.mdx` guides under `dir`, in file-name order, a folder's `index.mdx` first; folders nest.
 * A slug another guide already took is an error and skipped; broken frontmatter, a warning.
 */
export function discoverGuides(dir: string): { guides: DiscoveredGuide[]; errors: string[]; warnings: string[] } {
  const guides: DiscoveredGuide[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  const walk = (folder: string, group?: string) => {
    // Stable: the index leads, the rest keep file-name order.
    const names = readdirSync(folder)
      .sort()
      .sort((a, b) => Number(b === 'index.mdx') - Number(a === 'index.mdx'))
    for (const name of names) {
      const file = resolve(folder, name)
      const path = group ? `${group}/${name}` : name
      if (statSync(file).isDirectory()) {
        walk(file, path)
        continue
      }
      if (!name.endsWith('.mdx')) continue

      const parts = path
        .normalize('NFC')
        .slice(0, -'.mdx'.length)
        .split('/')
        .map(part => part.replace(ORDER_PREFIX, ''))
      const index = name === 'index.mdx'
      if (index) parts.pop()
      const slug = parts.join('/')
      if (seen.has(slug)) {
        errors.push(`guides/${path}: another guide already has the url /guides/${slug}; skipped`)
        continue
      }
      seen.add(slug)

      const meta = frontmatter(readFileSync(file, 'utf8'), message => warnings.push(`guides/${path}: ${message}`))
      const named = index ? group?.split('/').at(-1) : name.slice(0, -'.mdx'.length)
      guides.push({
        slug,
        group,
        title: text(meta.title) ?? (named ? nameTitle(named.normalize('NFC')) : 'Guides'),
        description: text(meta.description),
        file,
      })
    }
  }

  if (existsSync(dir)) walk(dir)
  return { guides, errors, warnings }
}

function frontmatter(source: string, warn: (message: string) => void): Record<string, unknown> {
  const yaml = FRONTMATTER.exec(source)?.[1]
  if (yaml === undefined) return {}
  try {
    const data: unknown = parse(yaml)
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>
    if (data !== null) warn('frontmatter is not a mapping; ignored')
  } catch (err) {
    warn(`frontmatter: ${(err as Error).message.split('\n')[0]}`)
  }
  return {}
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

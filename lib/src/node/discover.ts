import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { TIERS, type Tier } from '../lib/tiers'
import { type ParsedItem, parseItemSource } from '../lib/tsdoc'

export interface DiscoveredItem {
  id: string
  /** The group folders the item sits in, as a path (`inputs/date-time`), if any. */
  group?: string
  dir: string
}

/**
 * The items of one tier dir: `<id>/index.tsx`, or down in group folders,
 * `<group>/[<group>/…]<id>/index.tsx`. A folder without an `index.tsx` is a
 * group; an item's own folders are not searched.
 */
export function discoverItems(tierDir: string, group?: string): DiscoveredItem[] {
  const found: DiscoveredItem[] = []
  for (const name of subdirs(tierDir)) {
    const dir = resolve(tierDir, name)
    if (existsSync(resolve(dir, 'index.tsx'))) found.push({ id: name, group, dir })
    else found.push(...discoverItems(dir, group ? `${group}/${name}` : name))
  }
  return found
}

function subdirs(dir: string): string[] {
  return readdirSync(dir)
    .filter(name => statSync(resolve(dir, name)).isDirectory())
    .sort()
}

/** The stylesheets beside a file, sorted: injection order is cascade order. */
export function discoverCssForFile(file: string): string[] {
  const dir = resolve(file, '..')
  return readdirSync(dir)
    .sort()
    .filter(f => f.endsWith('.css'))
    .map(f => resolve(dir, f))
}

/** An item as its source declares it, before the build. */
export interface SourceItem extends Omit<ParsedItem, 'errors'> {
  id: string
  tier: Tier
  /** The group folders as a path: `<tier>/<group>/[<group>/…]<id>/index.tsx` → `<group>[/<group>…]`. */
  group?: string
  /** The `@example {@include ./x.mdx}` files that exist, absolute. */
  mdxExamples: string[]
  cssFiles: string[]
  /** The item's `index.tsx`, absolute. */
  file: string
  /** `file` relative to the project root, with `/` separators. */
  path: string
}

/** Every item of the project, parsed. A repeated id is an error; a parse problem or missing include, a warning. */
export function parseItems(userRoot: string): { items: SourceItem[]; errors: string[]; warnings: string[] } {
  const items: SourceItem[] = []
  const errors: string[] = []
  const warnings: string[] = []
  for (const tier of TIERS) {
    const tierDir = resolve(userRoot, tier)
    if (!existsSync(tierDir)) continue
    const seen = new Set<string>()
    for (const { id, group, dir } of discoverItems(tierDir)) {
      // Ids key urls and bundle entries per tier, so a group can't repeat one.
      if (seen.has(id)) {
        errors.push(`${relative(userRoot, dir)}: another ${tier} item is already named "${id}"; skipped`)
        continue
      }
      seen.add(id)
      const file = resolve(dir, 'index.tsx')
      const { errors: parseErrors, ...parsed } = parseItemSource(readFileSync(file, 'utf8'), {
        readFile: path => {
          try {
            return readFileSync(resolve(dir, path), 'utf8')
          } catch {
            return null
          }
        },
      })
      if (parseErrors.length > 0) warnings.push(`${tier}/${id}: ${parseErrors.join('; ')}`)
      const mdxExamples = parsed.mdxExamples.map(path => resolve(dir, path))
      for (const doc of mdxExamples.filter(d => !existsSync(d))) {
        warnings.push(`${tier}/${id}: @example include not found: ${relative(dir, doc)}`)
      }
      items.push({
        ...parsed,
        id,
        tier,
        group,
        // Anonymous: the item is named after its folder.
        name: parsed.name || id,
        mdxExamples: mdxExamples.filter(d => existsSync(d)),
        cssFiles: discoverCssForFile(file),
        file,
        path: relative(userRoot, file).split(sep).join('/'),
      })
    }
  }
  return { items, errors, warnings }
}

/** A module reference: `./x` → x (a file), x/index.{tsx,ts,jsx,js} (a folder) or x.{tsx,ts,jsx,js}. */
export function resolveUserFile(userRoot: string, ref: string): string | null {
  const abs = resolve(userRoot, ref)
  const exts = ['.tsx', '.ts', '.jsx', '.js']
  if (!existsSync(abs)) return exts.map(ext => abs + ext).find(f => existsSync(f)) ?? null
  if (statSync(abs).isFile()) return abs
  return exts.map(ext => resolve(abs, `index${ext}`)).find(f => existsSync(f)) ?? null
}

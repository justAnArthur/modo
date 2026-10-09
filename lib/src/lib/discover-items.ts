import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

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
    if (isItem(dir)) found.push({ id: name, group, dir })
    else found.push(...discoverItems(dir, group ? `${group}/${name}` : name))
  }
  return found
}

function subdirs(dir: string): string[] {
  return readdirSync(dir)
    .filter(name => statSync(resolve(dir, name)).isDirectory())
    .sort()
}

function isItem(dir: string): boolean {
  return existsSync(resolve(dir, 'index.tsx'))
}

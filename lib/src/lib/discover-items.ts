import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export interface DiscoveredItem {
  id: string
  /** The group folder the item sits in, if any. */
  group?: string
  dir: string
}

/**
 * The items of one tier dir: `<id>/index.tsx`, or one level down in a group
 * folder, `<group>/<id>/index.tsx`. A folder without an `index.tsx` is a group.
 */
export function discoverItems(tierDir: string): DiscoveredItem[] {
  const found: DiscoveredItem[] = []
  for (const name of subdirs(tierDir)) {
    const dir = resolve(tierDir, name)
    if (isItem(dir)) {
      found.push({ id: name, dir })
      continue
    }
    for (const id of subdirs(dir)) {
      if (isItem(resolve(dir, id))) found.push({ id, group: name, dir: resolve(dir, id) })
    }
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

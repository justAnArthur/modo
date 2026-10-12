import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { TIERS, type Tier } from './tiers'

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

export interface TierItem extends DiscoveredItem {
  tier: Tier
}

/**
 * Every item under `root`, tier by tier (`<root>/<tier>/…`, the tiers in docs
 * order). A tier's ids key urls and bundle entries, so one that repeats within a
 * tier (the same name in two groups) is left out of `items` and listed in
 * `duplicates`, the first by path order standing.
 */
export function discoverTiers(root: string): { items: TierItem[]; duplicates: TierItem[] } {
  const items: TierItem[] = []
  const duplicates: TierItem[] = []
  for (const tier of TIERS) {
    const tierDir = resolve(root, tier)
    if (!existsSync(tierDir)) continue
    const seen = new Set<string>()
    for (const item of discoverItems(tierDir)) {
      if (seen.has(item.id)) duplicates.push({ ...item, tier })
      else {
        seen.add(item.id)
        items.push({ ...item, tier })
      }
    }
  }
  return { items, duplicates }
}

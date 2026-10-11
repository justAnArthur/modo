import { ORDER_PREFIX } from '../lib/order'
import { cap } from './text'

interface Group<T> {
  title: string
  items: T[]
  groups: Group<T>[]
}

/** A group folder's title: `form-controls` → `Form controls`; a `02-` ordering prefix is dropped. */
export function groupTitle(folder: string): string {
  return cap(folder.replace(ORDER_PREFIX, '').replaceAll('-', ' '))
}

/**
 * Items as a tree of their group folders (`group` is the folder path,
 * `inputs/date-time`): each level lists its own items first, then its groups
 * in folder-name order; items keep their order.
 */
export function groupTree<T extends { group?: string }>(
  list: readonly T[],
  depth = 0,
): { items: T[]; groups: Group<T>[] } {
  const folder = (it: T) => it.group?.split('/')[depth]
  const keys = [...new Set(list.map(folder))].filter((key): key is string => key !== undefined).sort()
  return {
    items: list.filter(it => folder(it) === undefined),
    groups: keys.map(key => ({
      title: groupTitle(key),
      ...groupTree(
        list.filter(it => folder(it) === key),
        depth + 1,
      ),
    })),
  }
}

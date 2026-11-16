import { nameTitle, ORDER_PREFIX } from '../lib/text'

interface Group<T> {
  title: string
  items: T[]
  groups: Group<T>[]
}

/** A group folder's title: `titles` names it by its bare name, else `02-form-controls` → `Form controls`. */
export function groupTitle(folder: string, titles: Readonly<Record<string, string>> = {}): string {
  return titles[folder.replace(ORDER_PREFIX, '')] ?? nameTitle(folder)
}

/**
 * Items as a tree of their group folders (`group` is the folder path,
 * `inputs/date-time`): each level lists its own items first, then its groups
 * in folder-name order (a `02-` prefix sorts them); items keep their order.
 */
export function groupTree<T extends { group?: string }>(
  list: readonly T[],
  titles: Readonly<Record<string, string>> = {},
  depth = 0,
): { items: T[]; groups: Group<T>[] } {
  const folder = (it: T) => it.group?.split('/')[depth]
  const keys = [...new Set(list.map(folder))].filter((key): key is string => key !== undefined).sort()
  return {
    items: list.filter(it => folder(it) === undefined),
    groups: keys.map(key => ({
      title: groupTitle(key, titles),
      ...groupTree(
        list.filter(it => folder(it) === key),
        titles,
        depth + 1,
      ),
    })),
  }
}

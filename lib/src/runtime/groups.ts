import { cap } from './text'

/**
 * Ungrouped items first, then one entry per group folder in name order; items
 * keep their order. `form-controls` → `Form controls`.
 */
export function byGroup<T extends { group?: string }>(list: readonly T[]): Array<{ title?: string; items: T[] }> {
  const keys = [...new Set(list.map(it => it.group ?? ''))].sort()
  return keys.map(key => ({
    title: key ? cap(key.replaceAll('-', ' ')) : undefined,
    items: list.filter(it => (it.group ?? '') === key),
  }))
}

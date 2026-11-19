import type { SessionGroup } from './types'

/** A group's identity: its folder's path, else its kind and label; two folders of one name stay two groups. */
export function groupKey(group: SessionGroup) {
  return group.path ?? `${group.kind}:${group.label}`
}

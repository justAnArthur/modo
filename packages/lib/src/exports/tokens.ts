import type { ColorGroup, GenericTokenGroup } from './schema'

/**
 * defines a color token group. the lib validates the object against the zod
 * schema at dev/build time. design tokens are the lib's data; values come
 * from the user.
 */
export function defineTokens<T extends ColorGroup | GenericTokenGroup>(group: T): T {
  return group
}

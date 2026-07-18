import type { ItemMeta, PropSchema, ExampleSchema } from './schema'

/**
 * the `define` helper for item meta. type-only at runtime.
 *
 * ```ts
 * export const meta = define({
 *   name: 'Button',
 *   description: 'Triggers an action or event.',
 *   category: 'primitives',
 * })
 * ```
 */
export function define<T extends ItemMeta>(meta: T): T {
  return meta
}

export type { PropSchema, ExampleSchema }

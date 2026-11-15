declare module 'virtual:modo-items' {
  export type ItemEntry = {
    id: string
    tier: import('../../lib/tiers').Tier
    /** The group folders as a path: `<tier>/<group>/[<group>/…]<id>/index.tsx` → `<group>[/<group>…]`. */
    group?: string
    name: string
    description: string
    props: import('../../lib/tsdoc').ParsedProp[]
    /** Block tags other than `@example` (`@since`, `@license`, `@source`, …), in source order. */
    tags: import('../../lib/tsdoc').ParsedTag[]
    /** The item's `index.tsx`, relative to the project root. */
    path: string
    /** Inline `@example` blocks, compiled in the browser. */
    examples: import('../../lib/tsdoc').ParsedExample[]
    /** Compiled `@example {@include ./x.mdx}` files. */
    mdxExamples: import('react').ComponentType<{ components?: Record<string, unknown> }>[]
  }
  export const items: ItemEntry[]
  /** The items keyed `tier:id`. */
  export const byId: Record<string, ItemEntry>
  /** Item components by name, as examples bind them. */
  export const byName: Record<string, ModoHostComponent>
  /** Named exports of the `examples` config module; `{}` when unset. */
  export const exampleScope: Record<string, unknown>
}

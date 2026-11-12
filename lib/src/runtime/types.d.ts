// Import types throughout: a relative import declaration isn't allowed in an
// ambient module and, under skipLibCheck, silently types as any.

// biome-ignore lint/suspicious/noExplicitAny: a host component's props are whatever its design system declares
type ModoHostComponent = import('react').ComponentType<any>

/** The chrome's icon names, plus any `socials` key. */
// biome-ignore lint/complexity/noBannedTypes: `string & {}` keeps the literal names in autocomplete
type ModoIconName = 'code' | 'copy' | 'check' | 'link' | 'external' | 'menu' | 'sun' | 'moon' | (string & {})

declare module 'virtual:modo-config' {
  export const config: import('../lib/schema').SiteConfig
  /** The built URL of an image `logo`; null when there is none or it is a component. */
  export const logoUrl: string | null
}

declare module 'virtual:modo-tokens' {
  export const tokens: import('../lib/css').Group[]
}

declare module 'virtual:modo-items' {
  export type ItemEntry = {
    id: string
    tier: import('../lib/tiers').Tier
    /** The group folders as a path: `<tier>/<group>/[<group>/…]<id>/index.tsx` → `<group>[/<group>…]`. */
    group?: string
    name: string
    description: string
    props: import('../lib/tsdoc').ParsedProp[]
  }
  export const items: ItemEntry[]
  /** The items keyed `tier:id`. */
  export const byId: Record<string, ItemEntry>
  /** Item components by name, as examples bind them. */
  export const byName: Record<string, ModoHostComponent>
  export const examples: Record<string, import('../lib/tsdoc').ParsedExample[]>
  /** Compiled `@example {@include ./x.mdx}` files per `tier:id`. */
  export const exampleDocs: Record<string, import('react').ComponentType<{ components?: Record<string, unknown> }>[]>
  /** Named exports of the `examples` config module; `{}` when unset. */
  export const exampleScope: Record<string, unknown>
}

declare module 'virtual:modo-shell' {
  export type PanelItemExport = {
    label: string
    bundlePath: string
    Component: ModoHostComponent
    cssPaths: string[]
  }
  export type ResolvedShellExport = {
    Button: ModoHostComponent
    Link: ModoHostComponent
    Code: ModoHostComponent
    Select: ModoHostComponent
    Icon: import('react').ComponentType<{ name: ModoIconName; label: string }>
    Sidebar: { Root: ModoHostComponent; Item: ModoHostComponent; Section: ModoHostComponent }
  }
  export const shell: ResolvedShellExport
  export const panelItems: PanelItemExport[]
  /** A component `logo` from modo.config.ts; null when there is none or it is an image. */
  export const Logo: ModoHostComponent | null
}

// Stylesheet-only modules.
declare module 'virtual:modo-config-css' {}
declare module 'virtual:modo-tokens-css' {}
declare module 'virtual:modo-items-css' {}
declare module 'virtual:modo-shell-css' {}

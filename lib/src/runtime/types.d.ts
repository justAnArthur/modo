declare module 'virtual:modo-config' {
  import type { SiteConfig } from '../lib/schema'
  export const config: SiteConfig
  export default config
}

declare module 'virtual:modo-config-css' {
  const css: string
  export default css
}

declare module 'virtual:modo-tokens' {
  import type { ParsedVar, Swatch } from '../lib/css'
  export const tokens: Array<{ name: string; vars: Array<ParsedVar & { swatch?: Swatch }> }>
  export const errors: string[]
}

declare module 'virtual:modo-tokens-css' {
  const css: string
  export default css
}

declare module 'virtual:modo-items' {
  import type { ComponentType } from 'react'
  export type ItemProp = { name: string; type: string; optional: boolean; default?: string; description?: string }
  export type ItemEntry = {
    id: string
    tier: 'primitives' | 'components' | 'blocks'
    name: string
    description: string
    props: ItemProp[]
    Component: ComponentType<any>
  }
  export const items: ItemEntry[]
  export const byId: Record<string, ItemEntry>
  export const components: Record<string, ComponentType<any>>
  export const byName: Record<string, ComponentType<any>>
  export const primitives: Record<string, ComponentType<any>>
  export const examples: Record<string, Array<{ title?: string; description?: string; code: string }>>
  export const props: Record<string, ItemProp[]>
}

declare module 'virtual:modo-items-css' {
  const css: string
  export default css
}

declare module 'virtual:modo-shell' {
  import type { ComponentType } from 'react'
  export type PanelItemExport = {
    label: string
    bundlePath: string
    Component: ComponentType<any>
    cssPaths: string[]
  }
  export type ResolvedShellExport = {
    Button: ComponentType<any>
    Link: ComponentType<any>
    Code: ComponentType<any>
    Select: ComponentType<any>
    Sidebar: { Root: ComponentType<any>; Item: ComponentType<any>; Section: ComponentType<any> }
    Panel: ComponentType<any>
    primitives: Record<string, ComponentType<any>>
  }
  export const shell: ResolvedShellExport
  export const panelItems: PanelItemExport[]
  export const shellCSS: string
}

declare module 'virtual:modo-shell-css' {
  const css: string
  export default css
}

declare module 'virtual:modo-warnings' {
  export const warnings: string[]
}

declare module 'virtual:modo-tokens' {
  export const tokens: Record<string, any>
  export const errors: string[]
}

declare module 'virtual:modo-tokens-css'

declare module 'virtual:modo-config' {
  export const config: Record<string, any>
  export const name: string
  export const description: string
}

declare module 'virtual:modo-user-css'

declare module 'virtual:modo-items' {
  import type { ComponentType } from 'react'
  export interface DiscoveredItem {
    id: string
    category: 'primitives' | 'components' | 'blocks'
    cssPath: string | null
    filePath: string
    hasMdx: boolean
    errors: string[]
  }
  export interface ParsedItemShape {
    name: string
    description: string
    props: Array<{
      name: string
      type: 'enum' | 'boolean' | 'string' | 'number' | 'react-node'
      values?: string[]
      default?: string | number | boolean
      description?: string
      required?: boolean
    }>
    examples: Array<{
      name: string
      description?: string
      code: string
      language: string
    }>
    errors: string[]
  }
  export const items: DiscoveredItem[]
  export const byId: Record<string, ParsedItemShape>
  export const components: Record<string, React.ComponentType<any> | null>
  // pre-compiled example function bodies, keyed by `category/id` then
  // by the example's index in `byId[key].examples`. each body is a
  // string the client uses with `new Function(...)` to construct the
  // renderer. empty string = compile failed.
  export const examples: Record<string, Record<number, string>>
  export const dsRoot: string
}

declare module 'virtual:modo-items-css'

declare module 'virtual:modo-components' {
  import type { ComponentType } from 'react'
  export const Select: ComponentType<any> | null
  export const Link: ComponentType<any> | null
  export const Button: ComponentType<any> | null
  // per-control overrides for the docs site's right-side view panel.
  // each receives { current, options, set } (the ViewControlState shape
  // from exports/view.tsx). unset = lib's default <select> for that control.
  export const Theme: ComponentType<any> | null
  export const Density: ComponentType<any> | null
  export const Radius: ComponentType<any> | null
}

declare module 'virtual:modo-tokens' {
  export const tokens: Record<string, any>
  export const errors: string[]
  export const css: string
}

declare module 'virtual:modo-items' {
  export interface DiscoveredItem {
    id: string
    category: 'primitives' | 'components' | 'blocks'
    importPath: string
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
}

declare module 'virtual:modo-components' {
  import type { ComponentType } from 'react'
  export const Select: ComponentType<any> | null
  export const Link: ComponentType<any> | null
  export const Button: ComponentType<any> | null
}

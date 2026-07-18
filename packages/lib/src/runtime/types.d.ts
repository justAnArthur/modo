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
  export const items: DiscoveredItem[]
}

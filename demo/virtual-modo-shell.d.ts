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
  export default shell
}

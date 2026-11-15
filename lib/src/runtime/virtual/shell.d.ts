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

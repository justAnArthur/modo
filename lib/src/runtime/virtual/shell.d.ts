declare module 'virtual:modo-shell' {
  export const shell: import('../../lib/contract').ShellComponents
  /** The `panel.items` of modo.config.ts, in order. */
  export const panelItems: Array<{
    label: string
    Component: import('react').ComponentType<import('../../lib/contract').PanelItemProps>
  }>
  /** A component `logo` from modo.config.ts; null when there is none or it is an image. */
  export const Logo: import('react').ComponentType | null
}

declare module 'virtual:modo-config' {
  export const config: import('../../lib/schema').SiteConfig
  /** The built URL of an image `logo`; null when there is none or it is a component. */
  export const logoUrl: string | null
}

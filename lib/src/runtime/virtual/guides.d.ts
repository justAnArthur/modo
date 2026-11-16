declare module 'virtual:modo-guides' {
  export type GuideEntry = {
    /** The path under `/guides/`, ordering prefixes dropped (`theming/tokens`); `''` is `guides/index.mdx`. */
    slug: string
    /** The folders the guide sits in, ordering prefixes kept (`02-theming`). */
    group?: string
    /** The frontmatter `title`, else the file name: `getting-started` → `Getting started`. */
    title: string
    /** The frontmatter `description`. */
    description?: string
    Component: import('react').ComponentType<{ components?: Record<string, unknown> }>
  }
  /** The `guides/` folder's `.mdx` pages, in file-name order. */
  export const guides: GuideEntry[]
}

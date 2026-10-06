import { z } from 'zod'

/**
 * Pins docs-chrome slots to components. A value is a path relative to the
 * project root, optionally naming an export (`./modo.components.tsx#Select`).
 * An unpinned slot uses the item whose name and props match, else a plain
 * HTML fallback.
 */
export interface ShellConfig {
  /** The chrome's icon buttons. Gets `variant="ghost"`, `size="icon-sm"`, `aria-label`, `aria-pressed`. */
  Button?: string
  /** Every chrome and Markdown link. Gets `href`, and `aria-label` or `title` where there is one. */
  Link?: string
  /** A design-system switcher or similar. Gets `value`, `onChange(value)` and `options`. */
  Select?: string
  /** Both side navs. Its `Item` (`href`, `active`) and `Section` (`title`) render the entries. */
  Sidebar?: string
  /** Code blocks. Gets `language` and the code as a string child. */
  Code?: string
  /** The chrome's icons. Gets `name` (`code`, `copy`, `check`, `link`) and `label`. */
  Icon?: string
}

/** A design system's modo.config.ts. */
export interface SiteConfig {
  /** The design system's name: the home page title and the sidebar's first section. */
  name: string
  /** One line under the name on the home page. */
  description?: string
  /** Components the docs chrome renders with, by slot. */
  shell?: ShellConfig
  /** The side panel: each entry is a labelled component, such as a theme switcher. */
  panel?: { items: Array<{ label: string; component: string }> }
  /** A stylesheet loaded right after the chrome's structural CSS and before tokens: global styles and chrome restyling. */
  css?: string
  /** A module default-exporting `(config: UserConfig) => UserConfig | Promise<UserConfig>`, applied to modo's Vite config (e.g. to add @tailwindcss/vite). */
  vite?: string
  /** A module whose named exports are in scope in every example (icons, helpers). Item names win on collision. */
  examples?: string
}

const ref = z.string().optional()

export const shellSchema = z
  .object({ Button: ref, Link: ref, Select: ref, Sidebar: ref, Code: ref, Icon: ref })
  .strict() satisfies z.ZodType<ShellConfig>

export const siteConfigSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    shell: shellSchema.optional(),
    panel: z
      .object({ items: z.array(z.object({ label: z.string(), component: z.string() }).strict()) })
      .strict()
      .optional(),
    css: z.string().optional(),
    vite: z.string().optional(),
    examples: z.string().optional(),
  })
  .strict() satisfies z.ZodType<SiteConfig>

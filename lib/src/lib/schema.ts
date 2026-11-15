import { z } from 'zod'

/**
 * Pins docs-chrome slots to components. A value is a path relative to the
 * project root, optionally naming an export (`./modo.components.tsx#Select`).
 * An unpinned slot uses the item in its tier whose name and props match, else
 * a plain HTML fallback. The props each slot gets are in the `*SlotProps` types.
 */
export interface ShellConfig {
  /** The chrome's icon buttons. Matched in `primitives/` by `children`. Gets `variant="ghost"`, `size="icon-sm"`, `aria-label`, `aria-pressed`. */
  Button?: string
  /** Every chrome and Markdown link. Matched in `primitives/` by `href`, `children`. Gets `aria-label` or `title` where there is one. */
  Link?: string
  /** Handed to panel items as `shell.Select`; the chrome renders none. Matched in `components/` by `value`, `onValueChange`, `options`. */
  Select?: string
  /** Both side navs. Matched in `components/` by `children`; its `Item` (`href`, `active`) and `Section` (`title`) render the entries. */
  Sidebar?: string
  /** Code blocks. Matched in `primitives/` by `children`. Gets `language` and the code as a string child. */
  Code?: string
  /**
   * The chrome's icons. Matched in `primitives/` by `name`. Gets `name` and `label`: one of `code`, `copy`,
   * `check`, `link`, `menu`, `sun`, `moon`, or a `socials` key (`github`, `npm`, …). Draw the label for a name
   * you have no glyph for.
   */
  Icon?: string
}

/** The built-in light / dark toggle: how a theme is written on `<html>`. */
export interface ThemeConfig {
  /** `class` toggles the theme's value as a class; any other name is set as that attribute. @default 'class' */
  attribute?: string
  /** The dark theme's value. @default 'dark' */
  dark?: string
  /** The light theme's value. Unset, the light theme removes the class or attribute. */
  light?: string
}

/** The repository the design system lives in: each item page links to its source there. */
export interface RepoConfig {
  /** The repository's web URL (`https://github.com/me/my-ds`). */
  url: string
  /** The branch Source links point at. @default 'main' */
  branch?: string
  /** The project root's folder inside the repository (`packages/ui`), when it isn't the repository root. */
  dir?: string
}

/** One entry of the side panel. */
export interface PanelItem {
  /** The section title it renders under. */
  label: string
  /** A module path (`./modo.components.tsx#ThemeSwitch`) whose component gets `shell` (`PanelItemProps`). */
  component: string
}

/** The side panel, under the table of contents. */
export interface PanelConfig {
  items: PanelItem[]
}

/** A design system's modo.config.ts. */
export interface SiteConfig {
  /** The design system's name: the header brand, the home page title and every page's `<title>`. */
  name: string
  /** One line under the name on the home page, and the pages' meta description where they have none. */
  description?: string
  /** The header mark: an image file (`./logo.svg`) or a component (`./modo.components.tsx#Logo`), shown beside the name. */
  logo?: string
  /** The tab icon: an image file (`./favicon.svg`). */
  favicon?: string
  /** The public path the site is served under (`/my-ds/`). `modo build --base` overrides it. @default '/' */
  base?: string
  /** The site's public URL (`https://me.github.io/my-ds/`): pages get `og:url` and a canonical link from it. */
  url?: string
  /** Links in the header, keyed by network: `{ github: 'https://github.com/…', npm: '…' }`. The key names the icon. */
  socials?: Record<string, string>
  /** Markdown at the foot of every page: copyright, license, links. */
  footer?: string
  /** Where the source lives: each item page gets a Source link to its `index.tsx`. */
  repo?: RepoConfig
  /** Adds a light / dark toggle to the header that writes the theme on `<html>`. */
  theme?: ThemeConfig
  /** Components the docs chrome renders with, by slot. */
  shell?: ShellConfig
  /** The side panel: each entry is a labelled component, such as a theme switcher. */
  panel?: PanelConfig
  /** A stylesheet loaded right after the chrome's structural CSS and before tokens: global styles and chrome restyling. */
  css?: string
  /** A module default-exporting `(config: UserConfig) => UserConfig | Promise<UserConfig>`, applied to modo's Vite config (e.g. to add @tailwindcss/vite). */
  vite?: string
  /** A module whose named exports are in scope in every example (icons, helpers). Item names win on collision. */
  examples?: string
}

const ref = z.string().optional()

const shellSchema = z
  .object({ Button: ref, Link: ref, Select: ref, Sidebar: ref, Code: ref, Icon: ref })
  .strict() satisfies z.ZodType<ShellConfig>

const themeSchema = z
  .object({ attribute: z.string().optional(), dark: z.string().optional(), light: z.string().optional() })
  .strict() satisfies z.ZodType<ThemeConfig>

const repoSchema = z
  .object({ url: z.string().url(), branch: z.string().optional(), dir: z.string().optional() })
  .strict() satisfies z.ZodType<RepoConfig>

export const siteConfigSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
    base: z
      .string()
      .regex(/^\/(?:.*\/)?$/, 'base starts and ends with `/`')
      .optional(),
    url: z.string().url().optional(),
    socials: z.record(z.string().url()).optional(),
    footer: z.string().optional(),
    repo: repoSchema.optional(),
    theme: themeSchema.optional(),
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

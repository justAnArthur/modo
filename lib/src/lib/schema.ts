import { z } from 'zod'

/**
 * Pins docs-chrome slots to components. A value is a path relative to the
 * project root or a package specifier resolved through the package's `exports`
 * (`@scope/ds/docs`), optionally naming an export (`./modo.components.tsx#Select`,
 * `@scope/ds/docs#Select`).
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
   * `check`, `link`, `maximize`, `menu`, `close`, `sun`, `moon`, or a `socials` key (`github`, `npm`, …). Draw the label for a name
   * you have no glyph for.
   */
  Icon?: string
  /**
   * The site view's page switcher: the trigger and the menu it opens. Matched in `components/` by `pages`, `sections`.
   * Gets `name`, `logo`, `pages`, `current`, `sections` (the panel items), `links` and `corner`; the lib keeps it in
   * its corner and drags it.
   */
  SiteSwitcher?: string
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
  /** A module path or package specifier (`./modo.components.tsx#ThemeSwitch`, `@scope/ds/docs#ThemeSwitch`) whose component gets `shell` (`PanelItemProps`). */
  component: string
}

/** The side panel, under the table of contents. */
export interface PanelConfig {
  items: PanelItem[]
}

/**
 * The site view (`/site`): the `pages/` tier full screen, as a real website, without the docs
 * chrome; a floating badge switches pages and holds the panel items. It exists whenever there are
 * pages; this only orders it and decides the landing.
 */
export interface PagesConfig {
  /**
   * Page ids (an item's folder name under `pages/`) the switcher lists, in this order; the first is
   * the one `/site` opens. Unset or empty: every page, in nav order.
   */
  primary?: string[]
  /** `/` opens the site view's first page; the overview moves to `/docs`. @default false */
  home?: boolean
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
  /** The site view of the `pages/` tier: which pages its switcher lists, and whether it is the landing. */
  pages?: PagesConfig
  /** A stylesheet loaded right after the chrome's structural CSS and before tokens: global styles and chrome restyling. */
  css?: string
  /** A module default-exporting `(config: UserConfig) => UserConfig | Promise<UserConfig>`, applied to modo's Vite config (e.g. to add @tailwindcss/vite). */
  vite?: string
  /** A module (a path or package specifier) whose named exports are in scope in every example (icons, helpers). Item names win on collision. */
  examples?: string
  /**
   * The folder holding the item tiers (`primitives/`, `components/`, `blocks/`, `pages/`) and `tokens/`, relative
   * to the project root: `root: 'src'` reads `src/components/…` and `src/tokens/…`. Every other path the config
   * names stays relative to the project root. @default '.'
   */
  root?: string
  /** Group folder titles by folder name, for names that don't capitalize well (`{ ui: 'UI' }`). Others read `form-controls` → `Form controls`. */
  groups?: Record<string, string>
}

const ref = z.string().optional()

const shellSchema = z
  .object({ Button: ref, Link: ref, Select: ref, Sidebar: ref, Code: ref, Icon: ref, SiteSwitcher: ref })
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
    pages: z
      .object({ primary: z.array(z.string()).optional(), home: z.boolean().optional() })
      .strict()
      .optional(),
    css: z.string().optional(),
    vite: z.string().optional(),
    examples: z.string().optional(),
    root: z.string().optional(),
    groups: z.record(z.string(), z.string()).optional(),
  })
  .strict() satisfies z.ZodType<SiteConfig>

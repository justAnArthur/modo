# modo.config.ts

The CLI reads `modo.config.ts` from the project root. Pass `--config <file>` to `dev`, `build`, `preview`, `add` or `check` to use another file. `modo check` validates it and exits non-zero on an error.

```ts
import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'my-ds',
  description: 'my-ds design system',
  css: './global.css',
})
```

`defineConfig` only types the object. The config is bundled with esbuild before it runs, so it can import other modules. CSS imports in it are ignored.

The schema is strict: an unknown key is an error. Paths are relative to the project root: the folder you run `modo` in, which usually holds the config. A module reference (`shell`, `panel`, `examples`, `vite`) may instead be a [package specifier](#package-specifiers).

| Field | Type | Default |
| --- | --- | --- |
| [`name`](#name) | `string` | required |
| [`description`](#description) | `string` | none |
| [`logo`](#logo) | `string` (image or component path) | none |
| [`favicon`](#favicon) | `string` (image path) | none |
| [`base`](#base) | `string` | `'/'` |
| [`url`](#url) | `string` (URL) | none |
| [`socials`](#socials) | `Record<string, string>` (URLs) | none |
| [`footer`](#footer) | `string` (Markdown) | none |
| [`theme`](#theme) | `{ attribute?, dark?, light? }` | no toggle |
| [`repo`](#repo) | `{ url, branch?, dir? }` | none |
| [`shell`](#shell) | `{ Button?, Link?, Code?, Icon?, Select?, Sidebar? }` | matched by name |
| [`panel`](#panel) | `{ items: { label, component }[] }` | none |
| [`css`](#css) | `string` (stylesheet path) | none |
| [`vite`](#vite) | `string` (module path) | none |
| [`examples`](#examples) | `string` (module path) | none |
| [`root`](#root) | `string` (folder path) | `'.'` |
| [`groups`](#groups) | `Record<string, string>` (titles) | from folder names |

## name

The design system's name. It is the home page title, the header's brand text and the suffix of every page title (`Button · my-ds`).

```ts
name: 'MUI',
```

## description

One line under the name on the home page. It is also the meta description of any page that has none of its own (an item page uses the first paragraph of its TSDoc).

```ts
description: 'Material UI v9 — components from @mui/material, default theme extracted into modo tokens.',
```

## logo

The header mark, shown beside the name. Either an image file, which goes through Vite's asset pipeline, or a component module. A path ending in `.js`, `.jsx`, `.ts`, `.tsx` (optionally with `#Export`) is a component; anything else is an image.

```ts
logo: './logo.svg',
// or a component, built with your items:
logo: './modo.components.tsx#Logo',
```

## favicon

The tab icon. `modo build` copies it to `favicon.<ext>` at the site root.

```ts
favicon: './favicon.svg',
```

## base

The public path the site is served under. It must start and end with `/`. `modo build --base <path>` overrides it. See [deploy.md](./deploy.md).

```ts
base: '/my-ds/',
```

## url

The site's public URL. With it, every page gets an `og:url` and a `<link rel="canonical">`.

```ts
url: 'https://justanarthur.github.io/modo/ui/',
```

## socials

Links in the header, keyed by network. Each value must be a URL. The key is the `name` the [Icon slot](./shell.md#icon) gets, and the link's accessible label (`github` → "GitHub", `npm` → "npm"; an unknown key is capitalized).

```ts
socials: {
  github: 'https://github.com/justAnArthur/modo',
  npm: 'https://www.npmjs.com/package/@justanarthur/modo-ui',
},
```

## footer

Markdown rendered at the foot of every page, in `data-modo="footer"`.

```ts
footer:
  'MIT © 2026 justAnArthur. Ported from [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism), MIT © 2026 Micka Touillaud.',
```

## theme

Adds a light / dark toggle to the header. Without `theme` there is no toggle. See [theming.md](./theming.md#dark-mode).

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `attribute` | `string` | `'class'` | `'class'` toggles a class on `<html>`; any other value is the attribute name set on `<html>`. |
| `dark` | `string` | `'dark'` | The value for the dark theme. |
| `light` | `string` | none | The value for the light theme. None means the class or attribute is removed. |

```ts
// toggles `class="dark"` on <html>
theme: {},

// sets data-theme="dark" / data-theme="light"
theme: { attribute: 'data-theme', dark: 'dark', light: 'light' },
```

## repo

The repository the design system lives in. Each item page gets a Source link to its `index.tsx` there (`<url>/blob/<branch>/<dir>/<tier>/…/index.tsx`).

| Key | Type | Default |
| --- | --- | --- |
| `url` | `string` (URL) | required |
| `branch` | `string` | `'main'` |
| `dir` | `string` | the repository root |

```ts
repo: { url: 'https://github.com/justAnArthur/modo', dir: 'ui' },
```

## shell

Pins docs-chrome slots to your components. A value is a path relative to the project root (a file, or a folder with an `index.tsx`) or a [package specifier](#package-specifiers). Add `#Name` to use a named export instead of the default one. An unpinned slot uses the item that matches it by name and props, else a plain HTML fallback. See [shell.md](./shell.md).

```ts
shell: {
  Button: './components/button',
  Select: './modo.components.tsx#Select',
  Icon: './modo.components.tsx#Icon',
  Sidebar: './modo.components.tsx#DocsNav',
},
```

### Package specifiers

A `shell`, `panel` or `examples` reference (and `vite`) that is not a file in the project resolves as a package specifier, looked up in `node_modules` from the project root upwards. A design system can publish its docs adapters once and every docs site that uses it names them:

```ts
shell: { Sidebar: '@acme/ds/docs#DocsNav', Select: '@acme/ds/docs#Select' },
panel: { items: [{ label: 'Theme', component: '@acme/ds/docs#ThemeSwitcher' }] },
```

The package's `exports` map the subpath, `*` patterns included. Of its conditions, `source` wins, then `import`, then `default`, whatever their order in `package.json`, so a package that maps its TypeScript sources under `source` is bundled from them; built JavaScript works too. A package without `exports` resolves the subpath as a file or folder under it. Stylesheets beside the resolved file load with it, as for a local module. A linked workspace package resolves to its real path.

```json
{
  "name": "@acme/ds",
  "exports": {
    "./docs": { "source": "./docs/index.ts", "default": "./dist/docs/index.js" }
  }
}
```

A project path wins over a package of the same name, so `./` makes a local reference unambiguous.

## panel

The right-hand panel. Each entry renders as a `Sidebar.Section` titled `label`, holding `component`. `component` takes the same paths as `shell`. The component receives the resolved chrome as a `shell` prop (`shell.Select`, `shell.Button`, …); type it with `PanelItemProps` from `@justanarthur/modo`.

```ts
panel: { items: [{ label: 'Theme', component: './modo.components.tsx#ThemeSwitcher' }] },
```

```tsx
// demo/components/demo-switcher/index.tsx, trimmed
import type { PanelItemProps } from '@justanarthur/modo'

export default function DemoSwitcher({ shell }: PanelItemProps) {
  return <shell.Select value={current} onValueChange={go} options={options} />
}
```

## css

A stylesheet loaded right after the chrome's structural CSS and before your tokens. Use it for global styles, wiring the [generic token contract](./tokens.md#the-generic-contract) and [restyling the chrome](./theming.md).

The cascade order is: chrome structure, `css`, `tokens/*.css`, item CSS, shell component CSS.

```ts
css: './global.css',
```

## vite

A module that default-exports a function receiving modo's Vite config and returning it (or a promise of it). Use it to add Vite plugins such as Tailwind or UnoCSS. You write no Vite config of your own. The path resolves like every other module path here: the extension is optional (`./vite` finds `vite.ts`), and a folder resolves to its `index`. CLI flags (`--port`, `--host`, `--base`, `--out`) apply over what it returns.

```ts
vite: './vite.ts',
```

```ts
// demo/design-systems/shadcn/vite.ts
import tailwindcss from '@tailwindcss/vite'

interface UserConfig {
  plugins?: unknown[]
}

export default (config: UserConfig): UserConfig => {
  config.plugins = [...(config.plugins ?? []), tailwindcss()]
  return config
}
```

The module is imported natively, not bundled, so plugins with native binaries work. That also means:

- Under Bun any TypeScript works. Under Node, a `.ts` file needs a Node with built-in type stripping (22.18+ or 23.6+), may use only erasable syntax, and can't import relative `.ts` modules. Write it as `.mjs` to avoid the question.
- Vite's root is modo's runtime folder, not your project. Pass absolute paths to plugins that look for their own config (`UnoCSS({ configFile: resolve(import.meta.dirname, 'uno.config.ts') })`).
- A scanning CSS tool must include `.mdx` files, since example classes live there (Tailwind `@source`, UnoCSS `content`).

## examples

A module whose named exports are in scope in every example, next to your items. Use it for icons and helpers.

```ts
examples: './examples.ts',
```

```ts
// examples.ts
export { Plus, Search } from 'lucide-react'
```

If an export has the same name as an item, the item wins and the build warns. Alias the export (`export { Search as SearchIcon }`). A path that doesn't resolve is a build error.

## root

The folder holding the item tiers (`primitives/`, `components/`, `blocks/`, `pages/`), `tokens/` and [`guides/`](./guides.md), relative to the project root. Use it when a library keeps its sources in a subfolder:

```ts
root: './src', // reads src/components/…, src/tokens/…
```

It moves only the tiers, tokens and guides: `css`, `vite`, `examples`, `logo`, `favicon` and the `shell` and `panel` modules stay relative to the project root, as does `.modo-tmp`. Item pages' Source links and paths are relative to the project root too (`src/components/button/index.tsx`), so [`repo.dir`](#repo) still names the project root's folder. `modo add` creates items and tokens under it, and `modo check` and the build fail when it doesn't exist. Restart `modo dev` after changing it.

## groups

Titles for group folders whose name doesn't capitalize well, by folder name without its ordering prefix (`03-ui` is `ui`). They apply to the sidebar, the tier overviews and the guides' folders. Other folders read as their name, capitalized, with a leading `01-` dropped: `02-form-controls` becomes "Form controls".

```ts
groups: { ui: 'UI', 'date-time': 'Dates and times' },
```

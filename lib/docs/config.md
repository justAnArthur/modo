# modo.config.ts

The CLI reads `modo.config.ts` from the project root. Pass `--config <file>` to `dev`, `build`, `preview` or `check` to use another file. `modo check` validates it and exits non-zero on an error.

```ts
import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'my-ds',
  description: 'my-ds design system',
  css: './global.css',
})
```

`defineConfig` only types the object. The config is bundled with esbuild before it runs, so it can import other modules. CSS imports in it are ignored.

The schema is strict: an unknown key is an error. Paths are relative to the project root (the folder holding the config).

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

Pins docs-chrome slots to your components. A value is a path relative to the project root: a file, or a folder with an `index.tsx`. Add `#Name` to use a named export instead of the default one. An unpinned slot uses the item that matches it by name and props, else a plain HTML fallback. See [shell.md](./shell.md).

```ts
shell: {
  Button: './components/button',
  Select: './modo.components.tsx#Select',
  Icon: './modo.components.tsx#Icon',
  Sidebar: './modo.components.tsx#DocsNav',
},
```

## panel

The right-hand panel. Each entry renders as a `Sidebar.Section` titled `label`, holding `component`. `component` takes the same paths as `shell`. The component receives the resolved chrome as a `shell` prop (`shell.Select`, `shell.Button`, …).

```ts
panel: { items: [{ label: 'Theme', component: './modo.components.tsx#ThemeSwitcher' }] },
```

```tsx
// demo/components/demo-switcher/index.tsx, trimmed
import type { ResolvedShellExport } from 'virtual:modo-shell'

export default function DemoSwitcher({ shell }: { shell: ResolvedShellExport }) {
  return <shell.Select value={current} onChange={go} options={options} />
}
```

## css

A stylesheet loaded right after the chrome's structural CSS and before your tokens. Use it for global styles, wiring the [generic token contract](./tokens.md#the-generic-contract) and [restyling the chrome](./theming.md).

The cascade order is: chrome structure, `css`, `tokens/*.css`, item CSS, shell component CSS.

```ts
css: './global.css',
```

## vite

A module that default-exports a function receiving modo's Vite config and returning it (or a promise of it). Use it to add Vite plugins such as Tailwind or UnoCSS. You write no Vite config of your own.

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

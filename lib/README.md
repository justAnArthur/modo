# `@justanarthur/modo`

> Atomic design system renderer — reads tokens / primitives / components / blocks and produces a docs site that uses the user's components in the chrome.

**Live demo:** https://justanarthur.github.io/modo/ — five design systems documented by modo.

`modo` enforces the structure of an atomic design system (`tokens → primitives → components → blocks`) and auto-renders its documentation site. The lib ships the renderer and a CLI; the design system itself is **zero content** — you bring your own tokens, components, and blocks.

## Install

```sh
bun add -D @justanarthur/modo
# or
npm install --save-dev @justanarthur/modo
```

## CLI

```sh
# scaffold a design system in ./my-ds (or `init <dir> my-ds`)
npx @justanarthur/modo init my-ds

# inside the project
modo dev                    # dev server
modo add primitive badge    # primitives/badge/index.tsx + examples.mdx (also component, block, token)
modo add component overlays/dialog  # components/overlays/dialog/: a group folder (groups nest: inputs/date-time/calendar)
modo check                  # validate modo.config.ts
modo build                  # static site in ./dist, every route its own page
modo build --base /my-ds/   # …served under a sub-path, e.g. a GitHub Pages project site
modo build --out docs-dist  # …into another dir, when ./dist holds your package build
```

Run `npx @justanarthur/modo`, not `npx modo`: the unscoped `modo` on npm is someone else's package. The CLI reads `modo.config.ts` from the project root (`--config <file>` for another); the [scaffolded config](https://github.com/justAnArthur/modo/blob/main/lib/templates/default/modo.config.ts) is a starting point.

## Programmatic API

```ts
import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'My DS',
  css: './global.css',
  examples: './examples.ts',
})
```

Tokens, primitives, components and blocks are discovered by directory (`tokens/`, `primitives/`, `components/`, `blocks/`), free-form pages from `pages/` (see [Pages](#pages)). An item folder may sit down in group folders (`components/overlays/dialog/`, nested `components/inputs/date-time/calendar/`); each group becomes a sidebar sub-section and a heading on the tier overview. `examples` points at a module whose named exports (e.g. `export { Plus, Search } from 'lucide-react'`) are in scope in every `@example`, next to your items.

The CLI accepts any user content — `modo` ships no design tokens, no React components, and no copy. You own the visual layer end-to-end.

## How it works

`modo` discovers your design system files at the configured paths, parses each via a TSDoc-aware extractor, and renders an interactive docs site where the chrome (sidebar, page headers, prop tables, example cards) is structural-only. The example content is your components — `modo` doesn't generate fake components to fill the chrome.

## Writing docs

An item's JSDoc is Markdown: the first paragraph is the page lead, the rest renders below it; prop and example descriptions are Markdown too. Links and fenced code go through your shell `Link` / `Code`.

Prose lives in the comment; examples live in an `.mdx` file the comment includes:

```tsx
/**
 * Three spring speeds, exits a little faster than entrances.
 *
 * Every component picks one of three springs…
 *
 * @example {@include ./examples.mdx}
 */
export default function Motion(/* … */) {}
```

```mdx
import Motion from './index'

# Three speeds

Toggle each to feel the pace.

<Motion tier="fast">…</Motion>
```

An `@example` that is only `{@include ./x.mdx}` is compiled into the same build as your items (real imports, shared contexts). Each `# Title` names an example and the JSX block below it becomes a live example with Show code / Copy. For prose too long for the comment, `{@include ./x.md}` inlines a Markdown file; `{@includeCode ./x}` inlines a file as a code block. Includes are not recursive; a missing file is a build warning.

### Props

Props are read with the TypeScript compiler, from the render function's parameter annotation, a `forwardRef<El, Props>(…)`, or the component's type. Inherited members count (`extends`, `Omit` / `Pick` / `Partial`, intersections, across files and packages) when they are declared in your sources, in a package documented with modo, or in the package the docs came from; React's DOM attributes and other libraries' typings (Base UI, react-day-picker) stay out unless you re-declare them. Each member's JSDoc is its description. The Default column takes the destructured default, else `@default x`, else a closing ``Defaults to `x`.`` sentence.

### Re-exported items

An item file may re-export a component instead of declaring one: `export { default } from 'pkg/button'`, `export { Button as default } from './button'`, `import Button from 'pkg/button'; export default Button`, or a relative path. modo follows the default export to its declaration and reads the TSDoc, the props and `@example {@include ./examples.mdx}` there (includes resolve relative to that file). A package specifier resolves through its `source` export condition, else its `types` (`.d.ts`); the bundle uses `source` too, so the component exists once. The page is named after the name the item file binds, else the target's.

```tsx
// components/button/index.tsx — documents the package's Button as this DS's item
export { default } from '@acme/ui/components/button'
```

To add to a component's docs rather than take them as they are, write your own TSDoc with `{@inheritDoc <ref>}`, where `<ref>` is a module specifier (its default export) or a name in the file's scope. The base's description and examples come first, then your prose and examples; inherited examples render the base component, and the props table lists your item's full props.

```tsx
import Base from '@acme/ui/components/button'

/**
 * {@inheritDoc @acme/ui/components/button}
 *
 * In this product, one primary button per view.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button(props: ButtonProps) { return <Base {...props} /> }
```

## Pages

Free-form pages (an introduction, installation, a changelog, a migration guide, a playground) are `.mdx` files in `pages/` (`pages: './docs'` in the config moves the folder):

```
pages/
  index.mdx              → /           replaces the generated overview
  01-introduction.mdx    → /introduction
  changelog.mdx          → /changelog
  02-guides/
    index.mdx            → /guides      the folder's landing page
    01-migration.mdx     → /guides/migration
  03-návody/
    začíname.mdx         → /návody/začíname
```

- **Routes** are the file's path without `.mdx`: `/<slug>`, beside the lib's own `/docs/…` routes. A folder's `index.mdx` is the folder itself (`/guides`), listed first in its sidebar section; the top-level one is the home page. Non-ASCII letters and spaces work: links are escaped, urls decoded. A `docs` slug, or one another file already took (`setup.mdx` beside `01-setup.mdx`), is skipped with a warning. `modo build` writes each one as `<slug>/index.html`, so deep links work on a static host.
- **Sidebar:** pages are listed under the design system's name, above Foundations and the tiers, in file-name order; a folder is a nested section (`02-guides` → "Guides"), listed after the pages beside it. A leading `01-` orders a file or folder and is dropped from its url and title.
- **Frontmatter:** `title` names the page (else the file name: `getting-started` → "Getting started") and `description` is its lead.

  ```mdx
  ---
  title: Migrating to 2.0
  description: What changed and how to update.
  ---
  ```

- **Content** compiles in the same build as your items (`remark-gfm`), so imports are real and contexts are shared: import an item (`../primitives/button`), any module in the project, or a package. Items and the `examples` scope also resolve as JSX tags without an import.
- Every top-level JSX block is live, in an example card with Show code / Copy, like in `examples.mdx`; JSX inside a sentence renders inline. A CSS scanner (UnoCSS `content`, Tailwind `@source`) must include `pages/`. Fenced code goes through your shell `Code`, links through `Link`.
- `#` and `##` are the page's sections (the title is its only `h1`), `###` and `####` sub-sections; all get anchors and feed "On this page".

## Compatibility

- React 18+, as a peer: modo renders with your project's own React.
- Vite comes with modo, which runs its own Vite app; you don't install or configure it.
- Node 18+ (or Bun 1.x). A `vite: './vite.ts'` extension is imported natively, which needs Node 22.18+ for TypeScript (type stripping); on older Node, write it as `vite.mjs` / `vite.js`.
- Bun 1.x recommended for development; npm-compatible for publishing

## License

MIT © justAnArthur

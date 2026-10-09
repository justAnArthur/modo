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
modo add component overlays/dialog  # components/overlays/dialog/: a group folder
modo check                  # validate modo.config.ts
modo build                  # static site in ./dist, every route its own page
modo build --base /my-ds/   # …served under a sub-path, e.g. a GitHub Pages project site
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

Tokens, primitives, components and blocks are discovered by directory (`tokens/`, `primitives/`, `components/`, `blocks/`). An item folder may sit one level down in a group folder (`components/overlays/dialog/`); the group becomes a sidebar sub-section and a heading on the tier overview. `examples` points at a module whose named exports (e.g. `export { Plus, Search } from 'lucide-react'`) are in scope in every `@example`, next to your items.

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

## Compatibility

- React 18+, as a peer: modo renders with your project's own React.
- Vite comes with modo, which runs its own Vite app; you don't install or configure it.
- Bun 1.x recommended for development; npm-compatible for publishing

## License

MIT © justAnArthur

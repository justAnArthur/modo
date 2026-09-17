# `@justanarthur/modo`

> Atomic design system renderer — reads tokens / primitives / components / blocks and produces a docs site that uses the user's components in the chrome.

`modo` enforces the structure of an atomic design system (`tokens → primitives → components → blocks`) and auto-renders its documentation site. The lib ships the renderer and a CLI; the design system itself is **zero content** — you bring your own tokens, components, and blocks.

## Install

```sh
bun add -D @justanarthur/modo
# or
npm install --save-dev @justanarthur/modo
```

## CLI

```sh
# scaffold a starter design system in the current directory
modo init

# build the docs site for production
modo build

# run the dev server
modo dev
```

The CLI reads `modo.config.ts` from your project root. See the [scaffolded config reference](https://github.com/justAnArthur/modo/blob/main/lib/templates/default/modo.config.ts) for the full schema.

## Programmatic API

```ts
import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  tokens: './tokens',
  primitives: './primitives',
  components: './components',
  blocks: './blocks',
})
```

The CLI accepts any user content — `modo` ships no design tokens, no React components, and no copy. You own the visual layer end-to-end.

## How it works

`modo` discovers your design system files at the configured paths, parses each via a TSDoc-aware extractor, and renders an interactive docs site where the chrome (sidebar, page headers, prop tables, example cards) is structural-only. The example content is your components — `modo` doesn't generate fake components to fill the chrome.

## Compatibility

- React 18+
- Vite 5+ (bundled as a peer via the CLI's dev runtime)
- Bun 1.x recommended for development; npm-compatible for publishing

## License

MIT © justAnArthur

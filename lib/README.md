# `@justanarthur/modo`

modo turns your design system into its own docs site. You bring the tokens, components and prose; modo discovers them by folder and renders a site whose chrome is built from your own components.

**Live demo:** https://justanarthur.github.io/modo/ (five design systems documented by modo, switchable from the panel).

- **No content of its own.** Every token, visual, component and line of docs comes from your project. The chrome adds only its labels.
- **Discovered by folder.** `tokens/`, `primitives/`, `components/`, `blocks/`, `pages/`. No registry, no Vite config.
- **TSDoc is the docs.** An item's comment is its page; its props table comes from the source; its examples are live.
- **Shell inheritance.** When your Button, Link, Code, Icon, Select or Sidebar fit the chrome's slots, the chrome renders with them.
- **Canvas.** `/canvas` shows every token group and item live on one pan-and-zoom surface.
- **Static output.** `modo build` writes a page per route, ready for GitHub Pages, Netlify or Vercel.

## Install

Scaffold a new project:

```sh
bunx @justanarthur/modo init my-ds
cd my-ds
bun install
bun dev
```

With npm:

```sh
npx @justanarthur/modo init my-ds
cd my-ds
npm install
npm run dev
```

Or add it to an existing design system:

```sh
bun add -D @justanarthur/modo
# or
npm install --save-dev @justanarthur/modo
```

Then create a `modo.config.ts` at the project root:

```ts
import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'my-ds',
  css: './global.css',
})
```

Run `npx @justanarthur/modo`, not `npx modo`, outside a project: the unscoped `modo` on npm is someone else's package. Inside a project with modo installed, `npx modo` and `bunx modo` run the local CLI.

Requires React 18+ as a peer. Vite comes with modo; you don't install or configure it.

## Quickstart

`modo init my-ds` creates:

```
my-ds/
├── modo.config.ts          site config
├── global.css              global styles and chrome restyling
├── package.json            scripts: dev, build, check
├── tsconfig.json
├── tokens/
│   └── colors.css, radius.css, spacing.css, typography.css
└── primitives/
    └── button/
        ├── index.tsx       the item: default export + TSDoc block
        ├── examples.mdx    its live examples
        └── button.css      co-located CSS, injected automatically
```

`modo init` writes a `.gitignore` that skips `.modo-tmp/` (modo's build cache) and `dist/`.

An item is a folder with an `index.tsx`. Its TSDoc block is the page; its examples sit beside it:

```tsx
// primitives/badge/index.tsx
/**
 * Badge — a short status label.
 *
 * @example {@include ./examples.mdx}
 */
export default function Badge({ tone = 'neutral', children }: {
  /** How loud the badge is. */
  tone?: 'neutral' | 'accent'
  children?: React.ReactNode
}) {
  return <span data-tone={tone}>{children}</span>
}
```

`primitives/badge/examples.mdx`:

```mdx
import Badge from './index'

# Neutral

<Badge>Draft</Badge>

# Accent

<Badge tone="accent">New</Badge>
```

`modo add primitive badge` writes both files from a stub.

## CLI

```sh
modo init <name>                  # scaffold ./<name>
modo init <dir> <name>            # scaffold <dir>/<name>
modo dev                          # dev server at http://127.0.0.1:5173 (--port, --host to change)
modo preview                      # serve the built site
modo build                        # static site in ./dist
modo build --base /my-ds/         # served under a sub-path
modo build --out docs-dist        # into another dir
modo add primitive badge          # primitives/badge/index.tsx + examples.mdx
modo add component overlays/dialog  # in a group folder (groups nest)
modo add page dashboard           # also: block, token
modo check                        # validate modo.config.ts
```

`dev`, `build` and `check` take `--config <file>` for a config other than `modo.config.ts`.

## Docs

- [Configuration](https://github.com/justAnArthur/modo/blob/main/lib/docs/config.md): every `modo.config.ts` field.
- [Items](https://github.com/justAnArthur/modo/blob/main/lib/docs/items.md): tiers, groups, TSDoc, props, examples, block tags.
- [Tokens](https://github.com/justAnArthur/modo/blob/main/lib/docs/tokens.md): `tokens/*.css` and the token contract the chrome reads.
- [Shell inheritance](https://github.com/justAnArthur/modo/blob/main/lib/docs/shell.md): the chrome's slots and how your components fill them.
- [Theming](https://github.com/justAnArthur/modo/blob/main/lib/docs/theming.md): restyling the chrome through `data-modo` hooks, dark mode.
- [Deploying](https://github.com/justAnArthur/modo/blob/main/lib/docs/deploy.md): `--base`, GitHub Pages, Netlify, Vercel.
- [Troubleshooting](https://github.com/justAnArthur/modo/blob/main/lib/docs/troubleshooting.md): what `[modo:bundle]` and `[modo:shell]` messages mean.

The same files ship in the package under `node_modules/@justanarthur/modo/docs/`.

## License

MIT © justAnArthur

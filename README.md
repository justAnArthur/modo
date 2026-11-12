<a href="https://justanarthur.github.io/modo/"><img src=".github/banner.svg" alt="Docs for your design system: Point it at tokens, primitives, components, blocks and pages. It renders a docs site whose chrome is built from your own components." width="100%"></a>

# modo

[![npm](https://img.shields.io/npm/v/@justanarthur/modo?label=%40justanarthur%2Fmodo)](https://www.npmjs.com/package/@justanarthur/modo) [![npm](https://img.shields.io/npm/v/@justanarthur/modo-ui?label=%40justanarthur%2Fmodo-ui)](https://www.npmjs.com/package/@justanarthur/modo-ui) [![CI](https://github.com/justAnArthur/modo/actions/workflows/ci.yml/badge.svg)](https://github.com/justAnArthur/modo/actions/workflows/ci.yml) [![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

a CLI that turns a design system into its own docs site. point it at `tokens/ → primitives/ → components/ → blocks/ → pages/` and it renders foundations, live examples, prop tables and a pan-and-zoom **canvas**; the chrome itself is built from **your** components wherever they match its slots (Button, Link, Select, Sidebar…).

**[Live demo →](https://justanarthur.github.io/modo/)**

```bash
bunx @justanarthur/modo init my-ds
```

proven against real-world design systems — see `demo/design-systems/` and `ui/`:

- **filled** — minimal reference DS
- **shadcn/ui** — pulled with the real shadcn CLI (Tailwind v4), reorganized into modo structure
- **fluid-functionalism** — the `@fluid` registry layer (motion springs, fluid hover) on its own shadcn foundation
- **ui** — Fluid Functionalism (Base UI) on UnoCSS: springs, fluid hover, size ladder, surface elevation, plus a morph layer (overlays grow out of their trigger, indicators melt between items). Published as [`@justanarthur/modo-ui`](./ui#install). it ships its design language as [`DESIGN.md`](ui/DESIGN.md), an agent guide in [`AGENTS.md`](ui/AGENTS.md) with the [`modo-ui` skill](.claude/skills/modo-ui/SKILL.md), and a Craft page of bad / good pairs
- **MUI** — adapters over `@mui/material`, default theme extracted into token files

## use

modo is published as [`@justanarthur/modo`](https://www.npmjs.com/package/@justanarthur/modo). scaffold a new design-system workspace and run it:

```bash
# with bun (recommended)
bunx @justanarthur/modo init my-ds
cd my-ds && bun install
bun dev          # docs site at a local port (modo dev / modo build / modo check)

# with npm/pnpm it works the same
npx @justanarthur/modo init my-ds
cd my-ds && npm install && npm run dev
```

`modo init` creates a self-contained workspace with **zero lib files you need to touch** — modo owns its own internal Vite app; your project only contains the design system:

```
my-ds/
├── modo.config.ts          — site config (name, css, vite, shell, panel)
├── global.css              — your global styles and chrome restyling
├── package.json            — depends on @justanarthur/modo, react, react-dom
├── tsconfig.json
├── tokens/                 — design tokens as plain CSS custom properties
│   └── colors.css, radius.css, spacing.css, typography.css
└── primitives/             — tier 1: atoms (Button, Surface, …)
    └── button/
        ├── index.tsx       — the item: default export + TSDoc contract
        ├── examples.mdx    — its live examples
        └── button.css      — co-located CSS is auto-injected
```

the other tiers are folders you add when you need them: `components/` (composites: Dialog, Select, …), `blocks/` (page-level patterns) and `pages/` (full screens assembled from blocks). `tokens/`, `primitives/`, `components/`, `blocks/`, `pages/` are auto-discovered by directory; any of them can be omitted, and tiers render in that order. add items with `bunx modo add primitive my-thing` (or `component`, `block`, `page`, `token`) inside the project; it writes `index.tsx` and `examples.mdx` from `lib/templates/stubs`. `modo init` writes a `.gitignore` that skips `.modo-tmp/` (modo's build cache) and `dist/`.

## docs

the user guide ships with the package, in [`lib/docs/`](lib/docs):

- [configuration](lib/docs/config.md) — every `modo.config.ts` field
- [items](lib/docs/items.md) — tiers, groups, TSDoc, props, `examples.mdx`, block tags
- [tokens](lib/docs/tokens.md) — `tokens/*.css` and the token contract the chrome reads
- [shell inheritance](lib/docs/shell.md) — the chrome's slots and how your components fill them
- [theming](lib/docs/theming.md) — `data-modo` hooks, dark mode
- [deploying](lib/docs/deploy.md) — `--base`, GitHub Pages, Netlify, Vercel
- [troubleshooting](lib/docs/troubleshooting.md) — `[modo:bundle]` and `[modo:shell]` messages

## how it works

modo discovers the tiers by directory, reads each item's TSDoc contract and its `examples.mdx`, and renders everything in its own internal Vite app. the docs chrome is matched slot by slot against your components, so the site is styled by the design system it documents.

```mermaid
flowchart LR
  T[tokens/] --> P[primitives/] --> C[components/] --> B[blocks/] --> PG[pages/]
  CFG[modo.config.ts] --> M[modo dev / modo build]
  PG --> M
  M --> S[Docs site and playground]
  C -. matching slots: Button, Link, Select, Sidebar .-> S
```

## canvas

`/canvas` (in the sidebar, under Overview) lays out every token group and every item as a live, interactive frame: a column per tier, in sidebar order. new items show up on their own.

- scroll pans; pinch or ⌘/Ctrl+scroll zooms toward the cursor; drag the background (or hold Space) to pan; Shift+0 is 100%, Shift+1 fits everything.
- built to stay fast with hundreds of items: gestures move one transform without re-rendering React, frames mount only near the view and above 25% zoom (a few per frame), and off-screen frames skip layout and paint. a mounted frame keeps its state.
- restyle it like the rest of the chrome through `data-modo="canvas-*"` attributes.

## authoring items

an item is a default-exported function in `<tier>/<name>/index.tsx` whose TSDoc is the docs contract, with its examples beside it:

```tsx
/**
 * Button — the primary interaction primitive.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button({ variant = 'primary', children }: {
  /** Visual style. */
  variant?: 'primary' | 'secondary'
  /** Button content. */
  children?: React.ReactNode
}) { … }
```

```mdx
# Primary

<Button>Click me</Button>
```

- **name / description** — from the TSDoc block right above the default export's declaration (plain `function` or `forwardRef` const both work).
- **props** — extracted from the destructured params + inline type literal (or a same-file interface/type alias), with per-prop JSDoc (`@default`, `@values`). rendered as the item's prop table and used for shell slot matching.
- **examples** — `examples.mdx` holds `# Title` + a JSX block per example; it goes through the same build as your items, so imports are real and providers are shared. a short inline `@example` (`# Title` and a ` ```tsx ` fence) also works; that one compiles in the browser with items bound by name.
- **compound items** — attach sub-components as static attributes on the default export (`Card.Header = …`); `<Card.Header>` works in examples too.
- **CSS** — any `.css` file co-located in the item dir is injected automatically.

tokens are plain CSS, one file per group (`colors.css`, `typography.css`, `spacing.css`, `radius.css`, `motion.css`) — or a single file using var prefixes (`--space-*`, `--motion-*`, …). the tokens page renders each group as swatches.

## integrating into your project (`modo.config.ts`)

the common fields; every field is in [config.md](lib/docs/config.md).

```ts
import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'my-ds',
  description: 'My design system',

  // global stylesheet, injected right after the lib's structural CSS
  // (before your items' CSS) — the canonical place for resets, fonts, base rules
  css: './global.css',

  // extend modo's internal Vite config — e.g. Tailwind:
  // vite: './vite.config.extend.ts'   // default export: (config) => newConfig
  // (that module is imported natively, never bundled)

  // pin docs-chrome slots to your components explicitly
  // (otherwise slots are matched by name + required props, see below)
  shell: {
    Button: 'primitives/button',
    Link: 'primitives/link',
    Select: 'components/select',
    Sidebar: 'components/sidebar',
    Code: 'primitives/code',
    Icon: './modo.components.tsx#Icon', // a path may name an export
  },

  // entries rendered in the right panel, each as a Sidebar.Section
  panel: {
    items: [
      { label: 'Colors', component: 'blocks/color-palette' },
    ],
  },
})
```

### shell inheritance

the docs chrome looks for your components per slot (`Button`, `Link`, `Code`, `Icon` in primitives; `Select`, `Sidebar Root/Item/Section` in components) matched by parsed name + required props — `children` must be visible in the parsed type (`href` for `Link`). unmatched slots fall back to the lib's structural Plain components. to style the chrome itself, target the `data-modo` attributes (`data-modo="sidebar"`, `"example-card"`, `"swatch"`, …) from your `css` — the lib ships structure, you ship the look. details in [shell.md](lib/docs/shell.md) and [theming.md](lib/docs/theming.md).

## what the lib ships

- discovery + parsing: `tokens/*.css` (file-per-group or var prefixes), `<tier>/<name>/index.tsx` items with TSDoc-extracted name/description/props, and their live examples from `examples.mdx`
- the docs site chrome (sidebar / content / panel / example cards / prop tables / foundation pages / canvas) as **structural CSS only** — every visual reads your tokens; the chrome brings only its own labels
- shell inheritance with graceful Plain fallbacks for unmatched slots
- user hooks: `modo.config.ts` → `css` (global stylesheet), `vite` (extend the internal Vite config — e.g. add `@tailwindcss/vite`), `shell` (pin slots explicitly), `panel`, `examples` (names in scope in every example)

## structure

```mermaid
flowchart LR
  lib["lib · @justanarthur/modo"]
  ui["ui · @justanarthur/modo-ui"]
  demo["demo · runner + landing"]
  ds["demo/design-systems/*"]
  ui -- documented with --> lib
  ds -- documented with --> lib
  demo -- builds every DS --> ui
  demo -- builds every DS --> ds
```

```
modo/
├── lib/                          — the npm package `@justanarthur/modo` (bin `modo`)
│   ├── src/runtime/              — internal renderer (plain Vite SPA) + structural CSS
│   ├── src/plugins/              — Vite plugins: the shared item build, tokens, shell
│   ├── src/lib/                  — schemas, TSDoc parser, token/css parsing, slot matching
│   ├── templates/                — `modo init` scaffold and `modo add` stubs
│   ├── docs/                     — the user guide, shipped in the package
│   └── test/                     — parser tests
├── ui/                           — the npm package `@justanarthur/modo-ui`, documented with modo
├── demo/                         — harness: multi-DS runner + demo-switcher
│   └── design-systems/<name>/    — one workspace package per design system showcase
└── package.json
```

## develop

```bash
git clone https://github.com/justAnArthur/modo && cd modo
bun install

# run all design-system showcases (one dev server each + switcher, ports 5173+i); builds the lib's CLI first if needed
bun dev            # from repo root (or: cd demo && bun dev)

# a single showcase
cd demo && bun dev shadcn

# what CI runs
bun run lint
bun run build && bun run check
bun run test
```

## releases

Versioning, npm publishing and GitHub releases run via
[just-github-actions-n-workflows](https://github.com/justAnArthur/just-github-actions-n-workflows). A conventional commit on `main` scoped `lib` (or `modo`, `@justanarthur/modo`) releases `@justanarthur/modo`; scoped `ui` (or `modo-ui`, `@justanarthur/modo-ui`) releases `@justanarthur/modo-ui`; `[skip bump]` releases nothing. Tags are `@justanarthur/<package>@<version>`, published to npmjs.com (the repo needs the `NPM_TOKEN` secret). The full scope list and the 1.0 steps are in [CONTRIBUTING.md](CONTRIBUTING.md) and [.github/AGENTS.md](.github/AGENTS.md).

## license

[MIT](LICENSE)

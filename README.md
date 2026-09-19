# modo

a lightweight CLI that renders a **docs site / playground for your design system**. zero config: the lib enforces a simple folder structure (`tokens/ → primitives/ → components/ → blocks/`), discovers it, and produces the site — including **shell inheritance**: when your components match the docs chrome's slots (Button, Link, Select, Sidebar…), the chrome itself renders with *your* components. one Sidebar drives both the left nav and the right panel.

proven against real-world design systems — see `demo/design-systems/`:

- **filled** — minimal reference DS
- **shadcn/ui** — pulled with the real shadcn CLI (Tailwind v4), reorganized into modo structure
- **fluid-functionalism** — the `@fluid` registry layer (motion springs, fluid hover) on its own shadcn foundation
- **MUI** — adapters over `@mui/material`, default theme extracted into token files

## monorepo

```
modo/
├── lib/                          — the npm package: `modo`
│   ├── src/runtime/              — internal renderer (plain Vite SPA) + vite plugins
│   ├── src/lib/                  — schemas, TSDoc parser, token/css parsing, slot matching
│   └── templates/                — `modo init` scaffold
├── demo/                         — harness: multi-DS runner + demo-switcher
│   └── design-systems/<name>/    — one workspace package per design system showcase
├── bun-workspace.toml
└── package.json
```

## what the lib ships

- discovery + parsing: `tokens/*.css` (file-per-group or var prefixes), `<tier>/<name>/index.tsx` items with TSDoc-extracted name/description/props/examples (in-browser compiled `@example` playground)
- the docs site chrome (sidebar / content / panel / example cards / prop tables / swatches) as **structural CSS only** — zero design tokens, zero visuals, zero copy
- shell inheritance with graceful Plain fallbacks for unmatched slots
- user hooks: `modo.config.ts` → `css` (global stylesheet), `vite` (extend the internal Vite config — e.g. add `@tailwindcss/vite`), `shell` (pin slots explicitly), `panel`

## development

```bash
bun install

# run all design-system showcases (one modo dev server each + switcher)
bun dev            # from repo root (or: cd demo && bun dev)

# a single showcase
cd demo && bun run samples:shadcn   # or samples:filled | samples:fluid-functionalism | samples:mui

# typecheck
bun run check
```

## getting started

modo is published as [`@justanarthur/modo`](https://www.npmjs.com/package/@justanarthur/modo). scaffold a new design-system workspace and run it:

```bash
# with bun (recommended)
bunx modo init my-ds
cd my-ds && bun install
bun dev          # docs site at a local port (modo dev / modo build / modo check)

# with npm/pnpm it works the same
npx modo init my-ds
cd my-ds && npm install && npm run dev
```

`modo init` creates a self-contained workspace with **zero lib files you need to touch** — modo owns its own internal Vite app; your project only contains the design system:

```
my-ds/
├── modo.config.ts          — site config (name, css, vite, shell, panel)
├── package.json            — depends on @justanarthur/modo, react, react-dom
├── tsconfig.json
├── tokens/                 — design tokens as plain CSS custom properties
│   └── colors.css
├── primitives/             — tier 1: atoms (Button, Surface, …)
│   └── button/
│       ├── index.tsx       — the item: default export + TSDoc contract
│       └── button.css      — co-located CSS is auto-injected
├── components/             — tier 2: composites (Dialog, Select, …)
└── blocks/                 — tier 3: page-level patterns
```

`tokens/`, `primitives/`, `components/`, `blocks/` are auto-discovered by directory. any of them can be omitted; tiers render in that order. add more items later with `bunx modo add <tier>/<name>` (scaffolds from `lib/templates/stubs`).

## authoring items

an item is a default-exported function in `<tier>/<name>/index.tsx` whose TSDoc is the docs contract:

```tsx
/**
 * Button — the primary interaction primitive.
 *
 * @example Primary
 * ```tsx
 * <Button onClick={() => alert('hi')}>Click me</Button>
 * ```
 */
export default function Button({ variant = 'primary', children }) { … }
```

- **name / description** — from the TSDoc block anchored to the default export (plain `function` or `forwardRef` const both work).
- **props** — extracted from the destructured params + inline type literal (or a same-file interface/type alias). rendered as the item's prop table and used for shell slot matching.
- **examples** — `@example` blocks with an optional `# Heading` line and a ` ```tsx ` fence. examples compile **in the browser** (babel standalone): every capitalized JSX tag auto-binds to your item registry, so examples are self-contained JSX with **no imports and no hooks**.
- **compound items** — attach sub-components as static attributes on the default export (`Card.Header`), typed via interface merging; `<Card.Header>` auto-binds in examples too.
- **CSS** — any `.css` file co-located in the item dir is injected automatically.

tokens are plain CSS, one file per group (`colors.css`, `typography.css`, `spacing.css`, `radius.css`, `motion.css`) — or a single file using var prefixes (`--space-*`, `--motion-*`, …). the tokens page renders each group as swatches.

## integrating into your project (`modo.config.ts`)

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

the docs chrome looks for your components per slot (`Button`, `Link`, `Code` in primitives; `Select`, `Sidebar Root/Item/Section` in components) matched by parsed name + required props — `children` must be visible in the parsed type (`href` for `Link`). unmatched slots fall back to the lib's structural Plain components. to style the chrome itself, target the `data-modo` attributes (`data-modo="sidebar"`, `"example-card"`, `"swatch"`, …) from your `css` — the lib ships structure, you ship the look.

## installing the lib locally (monorepo development)

```bash
git clone https://github.com/justAnArthur/modo && cd modo
bun install
cd lib && bun run build          # build dist/ before CLI tests
bun dev                          # run every demo showcase (ports 5173+i)
cd ../demo && bun run samples:shadcn   # a single showcase
```

## license

MIT

## Release

Published to **npmjs.com only** (the package name `modo` is taken on npmjs.com by another user; this repo publishes under the `@justanarthur/modo` scope).

The bump + publish + release pipeline is driven by [`just-github-actions-n-workflows`](https://github.com/justAnArthur/just-github-actions-n-workflows) (`v1.0.1`, stock workflows installed via the toolkit CLI).

### Required secret on the GitHub repo

- `NPM_TOKEN` — npm automation token (publishes to npmjs.com).

### Pipeline

1. Conventional commit to `main` → `bump-version.yml` reads the scope (`lib` or `modo` or `justanarthur` or `@justanarthur/modo`), bumps `lib/package.json`, creates annotated tag `@justanarthur/modo@<version>` with JSON `{"deployTargets":["npm"]}`, pushes the tag.
2. Tag push → `publish-npm-on-tag.yml` resolves metadata, installs deps, builds, runs `bun publish -p --access public --tag <dist-tag>` to npmjs.com.
3. `publish-npm-on-tag.yml` creates the GitHub Release with conventional-commit notes.

### First tag (manual)

The toolkit's tag annotation must be a JSON object. The first tag has to be created manually because there is no prior commit for `bump-version.yml` to derive it from:

```sh
git tag -a @justanarthur/modo@0.1.0 -m '{"deployTargets":["npm"]}'
git push origin @justanarthur/modo@0.1.0
```

From the second release onward, `bump-version.yml` generates the annotation automatically.

### Local publish

```sh
cd lib
NPM_TOKEN=… bun publish -p --access public
```

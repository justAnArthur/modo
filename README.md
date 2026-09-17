# modo

a lightweight CLI that renders a **docs site / playground for your design system**. zero config: the lib enforces a simple folder structure (`tokens/ → primitives/ → components/ → blocks/`), discovers it, and produces the site — including **shell inheritance**: when your components match the docs chrome's slots (Button, Link, Select, Sidebar, Panel…), the chrome itself renders with *your* components.

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

## how it works (user-facing)

1. `bunx modo init my-ds` — scaffolds the folder structure
2. `cd my-ds && bun install && bunx modo dev` — modo reads `modo.config.ts`, starts its own internal Vite, renders your tokens + items in the docs site
3. your project keeps **zero lib files** (no vite config, no pages) — just the design system

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

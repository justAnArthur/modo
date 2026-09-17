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

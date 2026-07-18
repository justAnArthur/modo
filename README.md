# modo-atomic-ui

atomic design system renderer. a library that **enforces the structure of an atomic design system** (tokens → primitives → components → blocks) and **auto-renders its docs site**, modeled on the [fluidfunctionalism](https://www.fluidfunctionalism.com/) aesthetic.

## monorepo

```
modo-atomic-ui/
├── packages/
│   ├── lib/    — the npm package: `modo-atomic-ui`
│   └── demo/   — the example DS: `@modo-atomic-ui/demo`
├── bun-workspace.toml
├── tsconfig.base.json
└── package.json
```

## packages

### `modo-atomic-ui` (the lib)

ships:
- the public API (`modo-atomic-ui/config`, `/tokens`, `/surfaces`, `/define`)
- zod-validated schemas for tokens, surfaces, items, props, examples
- a lib-internal Vite + Vike renderer (no leakage to the user's project)
- 3 Vite plugins: `tokens` (reads user tokens, generates `:root` CSS), `source` (discovers user primitives/components/blocks), `graph` (import analysis for "depends on" / "used in")
- structural CSS (layout, grid, motion, focus, hover) — uses design tokens via CSS variables
- the surfaces elevation model (`<Elevated>`, `<SurfaceProvider>`, `useSurface`)
- 8-level shadow recipes for the surface ladder
- the `init` scaffold template (`packages/lib/templates/default/`)

ships **zero design tokens**. all colors, spacing values, font families, radii, shadows, and motion values come from the user's `tokens/`.

### `@modo-atomic-ui/demo` (the example)

a real working design system project. the reference impl, the proof, the testing ground.

ships tokens (colors, surfaces, typography, spacing, radius, shadows, motion), primitives (button, input, badge), components (popover, tooltip — both use `<Elevated>`), and a block (login-form).

## development

```bash
# install (bun workspaces hoists)
bun install

# dev server (lib's CLI starts vite, renders the demo's tokens + primitives)
bun run dev

# typecheck both packages
bun run check
```

## how it works (user-facing)

1. user runs `npx modo-atomic-ui init my-ds` — `packages/lib/templates/default/*` is copied to a new `my-ds/` folder
2. user `cd my-ds && bun install && bunx modo dev` — lib's CLI reads `modo.config.ts`, starts internal Vite, vite reads the user's tokens + primitives, renders the showcase
3. the user's `my-ds/` has **zero lib files** (no vite.config, no pages/, no src/runtime). just the DS.

## license

MIT

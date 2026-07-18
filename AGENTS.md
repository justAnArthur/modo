# AGENTS.md — modo-atomic-ui monorepo

## layout

- `packages/lib/` — the npm package `modo-atomic-ui`. public API, schemas, internal Vike renderer, vite plugins, structural CSS, scaffold templates.
- `packages/demo/` — the example DS `@modo-atomic-ui/demo`. tokens, primitives, components, blocks. the reference impl + the dev test.

## conventions

- **workspaces**: bun (matches `payload-www` convention). root `bun-workspace.toml` lists `packages/*`.
- **lib package**: ESM, `react-jsx`, `jsxImportSource: 'react'`. bunup builds `dist/` from `src/exports/*`. dts inferred.
- **structural CSS, no design tokens**: the lib ships layout, grid, motion, focus, hover — all colors/spacing/values come from the user's `tokens/` via CSS variables.
- **schema is the moat**: `defineConfig`, `defineTokens`, `defineSurfaces`, `define` are type-only at runtime; the lib validates with zod at dev/build time. wrong shape = lib fails loud.
- **atomic design tiers**: `primitives/` (atoms), `components/` (molecules/organisms), `blocks/` (composed). the lib auto-discovers and renders each.
- **surfaces (elevation model)**: the lib ships `<Elevated offset={n}>`, `<SurfaceProvider>`, `useSurface`. the user's `tokens/surfaces.ts` declares 8 levels with paired shadows. conventional offsets live in the schema.
- **no Next.js, no Vite config in user project**: the lib owns its own Vite + Vike app. user sees only the lib's output (the docs site).
- **bunup pattern**: `defineConfig` + `exports` plugin + ESM + `dts: { inferTypes: true }` + JSX automatic + `react` importSource. mirrors `~/Projects/utegsk/payload-www/plugins/translate/bunup.config.ts` exactly.

## file naming

- `tokens/*.ts` — `defineTokens({ group: 'colors' | 'surfaces' | 'shadows' | 'spacing' | 'radius' | 'motion' | 'typography', ... })`
- `primitives/<name>/index.tsx` — exports `meta`, `Component`, `examples`, `props`
- `primitives/<name>/<name>.mdx` — long-form docs (auto-bound via MDX components)
- `components/`, `blocks/` — same shape as primitives/

## chrome hooks (data-aui attrs)

`data-aui="sidebar"`, `"panel"`, `"content"`, `"card"`, `"row"`, `"cell"`, `"grid"`, `"swatch"`, `"surface-level"`, `"example-card"`, `"prop-table"`, `"search"`, `"control"`. user styles via their CSS targeting these.

# AGENTS.md — modo-atomic-ui monorepo

## layout

- `lib/` — the npm package `modo-atomic-ui`. public API, schemas, internal Vike renderer, vite plugins, structural CSS, scaffold templates, `modo` CLI.
- `demo/` — the reference design system. tokens, primitives, components, blocks, `overrides.css`. the lib's user; everything the demo ships is "host content" that proves the lib is zero-content.

## conventions

- **workspaces**: bun. root `bun-workspace.toml` lists the workspaces.
- **lib package**: ESM, `react-jsx`, `jsxImportSource: 'react'`. bunup builds `dist/` from `src/exports/*`. dts inferred.
- **structural CSS only**: the lib ships layout, grid, motion keyframes, focus rings, the docs chrome (sidebar / content / panel). NO design tokens, NO component visuals, NO copy, NO chrome content. all of that comes from the user's project.
- **tokens as plain CSS** (in `tokens/*.css`). one file per group is recommended (`colors.css`, `spacing.css`, `radius.css`, `motion.css`, `shadows.css`, `typography.css`). each file maps to a token group by filename. var prefixes (`--space-*`, `--motion-*`) are an alternative to file-per-group.
- **item metadata via TSDoc** (default export + JSDoc). the parser extracts `name`, `description`, `props` (from the function's TS type signature + per-prop JSDoc), and `examples` (from `@example` blocks with optional `# Title` heading and ` ```tsx ` code fences).
- **user CSS via `modo.config.ts: css`**. the lib injects this CSS as a global `<style>` tag at the top of the layout, after the lib's structural CSS. the demo's `overrides.css` is the canonical example.
- **atomic design tiers**: `primitives/`, `components/`, `blocks/`. the lib auto-discovers by directory and renders each.
- **surfaces (elevation model)**: NOT shipped by the lib. the elevation primitives (`<Elevated offset={n}>` / `<SurfaceProvider>` / `useSurface`) are host content — the demo defines its own copy in `demo/components/surface/elevated.tsx`. any `--surface-N` / `--shadow-N` values the user wants must be declared in their own `tokens/*.css` (typically `colors.css`).
- **no Next.js, no Vite config in user project**: the lib owns its own Vite + Vike app. the user sees only the lib's output (the docs site).

## file naming

- `tokens/<group>.css` — custom properties for that group. groups are: `colors`, `typography`, `spacing`, `radius`, `shadows`, `motion`.
- `primitives/<name>/index.tsx` — default-exported function with TSDoc.
- `primitives/<name>/<name>.mdx` — long-form docs (reserved for future MDX routing; not yet consumed by the lib).
- `components/`, `blocks/` — same shape as primitives/.

## chrome hooks (data-aui attrs)

`data-aui="app"`, `"sidebar"`, `"content"`, `"header"`, `"section"`, `"section-title"`, `"page-title"`, `"page-lead"`, `"swatch"`, `"example-card"`, `"example-card-meta"`, `"example-card-stage"`, `"example-toggle"`, `"example-code"`, `"prop-table"`, `"raw-json"`. the lib sets structural styles for all of these; the user styles their own components via the same attrs. `data-aui="elevated"` is the contract the elevation primitives set on their root div — the host owns any visual styling for it.

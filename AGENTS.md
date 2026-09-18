# AGENTS.md — modo monorepo

## layout

- `lib/` — the npm package `modo`. public API, schemas, internal renderer (plain Vite SPA), vite plugins, structural CSS, scaffold templates, `modo` CLI.
- `demo/` — the harness: `scripts/run-design-systems.ts` (spawns one `modo dev` per design system, assigns ports, splices the demo-switcher panel item) and `components/demo-switcher/` (renders `shell.Select`, navigates between peers).
- `demo/design-systems/<name>/` — one workspace package per design system, each with its own `package.json` and deps:
  - `filled/` — the minimal reference DS.
  - `shadcn/` — shadcn/ui pulled with the real CLI, reorganized into modo structure (Tailwind v4).
  - `fluid-functionalism/` — the @fluid shadcn-registry layer (motion springs, fluid hover) on its own shadcn foundation.
  - `mui/` — adapters over `@mui/material`; the default theme extracted into token files by `scripts/extract-tokens.ts`.
- everything a DS ships is "host content" that proves the lib is zero-content.

## conventions

- **workspaces**: bun. root `package.json` `workspaces` (+ mirrored `bun-workspace.toml`) lists `lib`, `demo`, and `demo/design-systems/*`.
- **lib package**: ESM, `react-jsx`, `jsxImportSource: 'react'`. bunup builds `dist/` from `src/exports/*`. the runtime/plugins ship as source and run unbundled.
- **structural CSS only**: the lib ships layout, grid, motion keyframes, focus rings, the docs chrome (sidebar / content / panel). NO design tokens, NO component visuals, NO copy, NO chrome content. all of that comes from the user's project.
- **tokens as plain CSS** (in `tokens/*.css`). one file per group is recommended (`colors.css`, `spacing.css`, `radius.css`, `motion.css`, `typography.css`). each file maps to a token group by filename; var prefixes (`--space-*`, `--motion-*`, …) are an alternative to file-per-group. known cosmetic limitation: a bare `--radius` (no dash-suffix) groups under colors, not radius.
- **item metadata via TSDoc** (default export + JSDoc). the parser extracts `name`, `description`, `props` (from the function's destructured params + inline object type literal + per-prop JSDoc; a bare identifier param type resolves to a same-file interface/type alias; `const X = forwardRef<…, XProps>` items resolve `XProps` in the same file), and `examples` (from `@example` blocks with optional `# Title` heading and ` ```tsx ` code fences). the JSDoc block anchors to the default-exported component's declaration (function or const), wherever `export default` sits. parser gotchas: a literal `@example` inside example code breaks the splitter; `https://` URLs inside JSDoc get truncated by the comment stripper. shell slot interface-matching reads the same parsed props — a converted component must keep `children` (and `href` for Link) visible in its parsed type.
- **examples compile in-browser** (babel standalone). every capitalized JSX tag in an example auto-binds to the item registry — examples are self-contained JSX with no imports/hooks.
- **user CSS via `modo.config.ts: css`**. injected right after the lib's structural CSS (before tokens). each DS's `global.css` is the canonical example.
- **vite extension via `modo.config.ts: vite`**. path to a module default-exporting `(config: UserConfig) => UserConfig`, applied to the lib's Vite config — how Tailwind DSs add `@tailwindcss/vite`. the module is imported natively (never esbuild-bundled).
- **atomic design tiers**: `primitives/`, `components/`, `blocks/`. the lib auto-discovers by directory and renders each. items are esbuild-bundled with `platform: 'browser'` (react/react-dom external) — bare imports incl. CJS transitive deps resolve.
- **shell inheritance**: the docs chrome looks for user components per slot (Button, Link, Code in primitives; Select, Sidebar Root/Item/Section in components), matched by name + required props; unmatched slots fall back to the lib's Plain components. `modo.config.ts: shell` can pin slots explicitly. one Sidebar drives both sides: the right panel renders each `panel.items` entry as a `Sidebar.Section` inside `Sidebar.Root` (no separate Panel slot).
- **no Next.js, no Vite config in user project** (beyond the `vite` hook): the lib owns its own Vite app. the user sees only the lib's output (the docs site).

## file naming

- `tokens/<group>.css` — custom properties for that group. groups are: `colors`, `typography`, `spacing`, `radius`, `motion`.
- `<tier>/<name>/index.tsx` — default-exported function with TSDoc (the modo item). compound items attach sub-components as static attributes on the default export (`Card.Header`), typed via interface declaration merging (function components) or `Object.assign` (forwardRef consts); examples may use compound JSX (`<Card.Header>` auto-binds `Card`).
- `<tier>/<name>/<name>.tsx` — vendored upstream source (shadcn/FF pattern) imported by the adapter. when the upstream component itself is the item, rename the vendored file to `index.tsx` (noting local modifications in its header comment) instead of adding an adapter; adapters remain for real API transforms (shell contracts, options→children, prop narrowing).
- co-located `.css` files in an item dir are auto-injected.

## running

- all DSs: `bun dev` in `demo/` (ports 5173+i, one per DS, demo-switcher spliced in).
- one DS: `bun run samples:<name>` in `demo/`, or `cd demo/design-systems/<name> && MODO_PORT=<n> bunx modo dev`.
- typecheck a DS: `cd demo/design-systems/<name> && bunx tsc -p . --noEmit` (each has its own tsconfig).

## chrome hooks (data-modo attrs)

`data-modo="app"`, `"sidebar"`, `"sidebar-nav"`, `"sidebar-section"`, `"sidebar-section-title"`, `"sidebar-section-items"`, `"sidebar-item"`, `"content"`, `"panel"`, `"header"`, `"section"`, `"section-title"`, `"page-title"`, `"page-lead"`, `"swatch"`, `"example-card"`, `"example-card-meta"`, `"example-card-stage"`, `"example-toggle"`, `"example-code"`, `"prop-table"`, `"raw-json"`. the lib sets structural styles for all of these; the user styles their own components via the same attrs.

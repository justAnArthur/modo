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
- **tokens as plain CSS** (in `tokens/*.css`). one file per group is recommended (`colors.css`, `spacing.css`, `radius.css`, `motion.css`, `typography.css`). each file maps to a token group by filename; var prefixes (`--space-*`, `--motion-*`, …) are an alternative to file-per-group; single-token shorthands like shadcn's bare `--radius` group with their prefix family (radius).
- **item metadata via TSDoc** (default export + JSDoc). the parser extracts `name`, `description`, `props` (from the function's destructured params + inline object type literal + per-prop JSDoc; a bare identifier param type resolves to a same-file interface/type alias; `const X = forwardRef<…, XProps>` items resolve `XProps` in the same file), and `examples` (from `@example` blocks with optional `# Title` heading and ` ```tsx ` code fences). the JSDoc block anchors to the default-exported component's declaration (function or const), wherever `export default` sits. parser rules: `@example` only counts at the start of a JSDoc line (`@example # Title` on that line is fine; `you@example.com` elsewhere is just text); `//` is treated as a line comment only after start-of-line, whitespace or punctuation, so `https://…` URLs survive; example code must not contain `*/` (it ends the JSDoc block) — so no JSX `{/* … */}` comments in examples. shell slot interface-matching reads the same parsed props — a converted component must keep `children` (and `href` for Link) visible in its parsed type.
- **examples compile in-browser** (babel standalone) as `return (<>…</>)` inside `new Function` — one JSX expression or several siblings, no hooks. leading `import … from '…'` lines and a trailing `;` are stripped (imports are for copy-paste only). an identifier binds only if it appears in the code and is an item name or an `examples` scope export (items win on collision); nothing is written to globals, so `Map`/`Set`/`Math` etc. stay the real globals unless an example uses a same-named scope export. each example stage has an error boundary (failures log to the console).
- **user CSS via `modo.config.ts: css`**. injected right after the lib's structural CSS (before tokens). each DS's `global.css` is the canonical example.
- **example scope via `modo.config.ts: examples`**. path to a module whose named exports are in scope in every example (e.g. curated `export { Plus, Search } from 'lucide-react'`). it is an entry of the shared build, so it shares chunks/providers with the items and tree-shakes. the bundler warns when an export collides with an item name — alias it (`export { Badge as BadgeIcon }`). an unresolvable path is reported, not fatal (scope is `{}`).
- **vite extension via `modo.config.ts: vite`**. path to a module default-exporting `(config: UserConfig) => UserConfig`, applied to the lib's Vite config — how Tailwind DSs add `@tailwindcss/vite`. the module is imported natively (never esbuild-bundled).
- **atomic design tiers**: `primitives/`, `components/`, `blocks/`. the lib auto-discovers by directory and renders each.
- **one shared build** (`lib/src/plugins/bundle.ts`): every item (`items/<tier>/<id>`), every `shell.*` / `panel.items[].component` module (`usr/<name>`, or the item's key when the path is an item) and the `examples` module (`scope/examples`) are entry points of ONE esbuild build with `splitting: true`, `platform: 'browser'`, react/react-dom external → `<DS>/.modo-tmp/build/{items,usr,scope,chunks}/*.mjs`. a module imported by several items (a React context, a provider) lands in one chunk and exists once at runtime, so contexts cross items and the chrome. bare imports incl. CJS transitive deps resolve. nothing is imported node-side. stale outputs are swept after each build. a failing entry is isolated (probed alone, dropped, build retried) and reported once on stderr as `[modo:bundle]` grouped by message; TSDoc parse errors print as `[modo:bundle] warning:`. in dev, a source change under the DS root invalidates the build and reloads the page.
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

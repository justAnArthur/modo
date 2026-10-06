# AGENTS.md — modo monorepo

modo turns a design system (DS) into its own docs site. The lib is zero-content: every token, visual, component and word comes from the host DS.

## layout

- `lib/` — the npm package `modo`: public API, schemas, renderer (plain Vite SPA), vite plugins, structural CSS, scaffold templates, the `modo` CLI.
- `demo/` — the harness. `scripts/run-design-systems.ts` spawns one `modo dev` per DS, assigns ports and splices in the demo-switcher. `components/demo-switcher/` renders `shell.Select` to navigate between peers.
- `demo/design-systems/<name>/` — one workspace package per DS, each with its own deps:
  - `filled/` — the minimal reference.
  - `shadcn/` — shadcn/ui pulled with the real CLI (Tailwind v4).
  - `fluid-functionalism/` — the @fluid registry layer on its own shadcn foundation.
  - `ui/` — Fluid Functionalism (Base UI) on UnoCSS: springs, fluid hover, size ladder, surface elevation.
  - `mui/` — adapters over `@mui/material`; `scripts/extract-tokens.ts` extracts the default theme into token files.

## code style (sparse)

From the `sparse` skill: how code reads. ponytail decides whether to write it.

- **Ladder** — stop at the first rung that holds:
  1. Does it need to exist?
  2. Is it already in the repo?
  3. Stdlib.
  4. Native platform.
  5. An installed dep.
  6. One line.
  7. The minimum code.
- **Trust the types.**
  - No `=== true`, no `!== undefined` on a non-optional value, no `Boolean(x)` on a boolean.
  - Guard at runtime only what the type can't encode. A guard you "need" means the type is wrong: fix the type.
- **Flags:** write the positive form (`x === 'the-one-value'`), so a new enum member can't silently fall into it.
- **Functions:**
  - One concept per function.
  - Early returns instead of nested `if`s.
- **Whitespace:** a blank line separates phases (sibling branches in a loop, distinct groups in a literal). If deleting it loses nothing, delete it.
- **Env:** read `process.env` once at module load. Required vars throw; optional ones take an explicit `?? default`.
- **Comments:**
  - None by default.
  - Keep a non-obvious *why*, a platform constraint, or a footgun the types can't show.
  - No restating, no banners.
  - TSDoc on items and lib public types is documentation, not comments: keep it (see **docs**).
- **The surrounding file wins where sparse disagrees.**
  - Items are default exports.
  - The lib uses `interface` and `function` components.
  - Match the existing comment case.
- **Reporting:** code first, then at most three "skipped" lines.

## styling: tokens, never custom values

**No custom visuals.** Everything you can see (color, font, size, weight, radius, border, shadow, opacity, motion) comes from the theme: a token, or a DS utility mapped to one. Custom CSS is structural only: `display`, flex and grid, position, sizing, overflow, and gaps or padding through `--space-*`. When the look you need has no token, add the token (see **Missing step** below); never write the value.

Two vocabularies:

- **Generic tokens** — the shadcn-named contract the lib reads from any host:
  - colors: `--background`, `--foreground`, `--muted-foreground`, `--border`, `--accent`;
  - radius and spacing: `--radius-sm|md|lg`, `--space-1…6`;
  - type: `--font-sans`, `--font-mono`, `--font-size-h1|h2|h3|lead|eyebrow`;
  - motion: `--duration-fast`;
  - layout: `--modo-measure`.
- **Theme tokens** — a DS's own, defined in its `tokens/*.css` and exposed as its utilities. In ui:
  - `bg-surface-N` / `shadow-surface-N`;
  - `text-display|title|subtitle|body|caption`;
  - `bg-hover`, `bg-active`, `text-muted-foreground`, `border-border`;
  - `text-syntax-*` (code highlighting), `font-mono`;
  - `spring.*` and `--duration-*`.

Rules:

- **Lib (runtime TSX, `shell.css`):**
  - Structure only (layout, grid, spacing rhythm, measure). Every visual reads a generic token, or the host's own token when that token is what the page shows (a radius specimen applies `var(--radius-box)`).
  - No literal colors and no color fallbacks. Leave the fallback off so an undefined token inherits, or derive it from `currentColor`.
  - Borders and muted text read `--modo-border` / `--modo-muted`. `tokens/host-colors.ts` sets them at startup from the host's `--border` / `--muted-foreground` (wrapped when the token holds bare channels, e.g. `hsl(var(--border))`), else from `currentColor`.
  - Size fallbacks may be literal (`var(--space-2, 8px)`).
- **DS code** (items, examples, `modo.components.tsx`):
  - Use theme tokens through the DS's utilities.
  - No arbitrary values for color, type, radius, shadow or motion (`text-[15px]`, `bg-[#…]`, `rounded-[10px]`, `duration-[…]`).
  - No inline `style` for them, and no raw hex/oklch outside `tokens/*.css`.
  - Arbitrary values are fine for one-off layout geometry (a demo frame's width).
  - The same holds for the DS's own CSS (`global.css`, an item's `.css`): structure is free, visuals go through tokens.
- **Missing step on the scale:** add a token (the `tokens/*.css` var plus its utility mapping), then use it. Don't hard-code it.
- **Chrome restyling:** the host restyles the chrome through `data-modo` attrs in its `global.css`; never fork lib CSS.
- **Vendored upstream code** keeps upstream values; note any local changes in its header comment.

## docs (TSDoc)

- An item is `<tier>/<name>/index.tsx`: a default-exported component plus a JSDoc block.
  - The block anchors to the default export's declaration (function or const), wherever `export default` sits.
  - The parser extracts `name`, `description`, `props` and `examples`.
- **One place per kind:** the TSDoc comment is the item's only prose (summary paragraph = page lead, the rest = body). Examples live in a co-located `examples.mdx`, included with `@example {@include ./examples.mdx}`. Reserve inline `@example` code for a few short cases.
- **Includes** are TypeDoc inline tags. Paths are relative to `index.tsx`; they are not recursive; a missing file prints `[modo:bundle] warning:`; `.md`/`.mdx` edits reload dev. A `.mdx` include belongs under `@example` (below).
  - `{@include ./x.md}` inlines the file into the description as Markdown (for prose too long for the comment).
  - `{@includeCode ./x}` inlines a file as a fenced block.
- **`@example {@include ./x.mdx}`** (the whole `@example` is the tag) compiles the file into live examples instead of inlining it. The file holds examples only:
  - Each example is a `# Title`, an optional one-line caption, and a JSX block (a live demo) or a fenced code block (code to read; it renders through the shell's Code). Never wrap code in `<Code>{`…`}</Code>`: fence it. It renders in the Examples section, after any `@example` cards.
  - It is an entry of the shared build (`@mdx-js/esbuild` + `remark-gfm`). Every top-level JSX block is a live example: `lib/src/plugins/mdx-examples.ts` wraps it in `ModoExample`, the example card, and keeps its source for Show code / Copy.
  - Imports are real: the item is `./index`, other items are `../../<tier>/<id>`, packages are imported by name. Items and `examples` scope exports also resolve as JSX tags without an import, but an identifier used in an expression (`icon={Plus}`) needs one.
  - Expressions are plain JS (acorn): no TS syntax such as `as const`. MDX isn't typechecked.
  - `#`/`##` become example titles (`example-<slug>` ids); `###` is a sub-heading. All get anchors and feed the TOC.
  - Prose typography is `@scope`d down to the example cards, so it never leaks into a live example.
  - A CSS scanner (UnoCSS `content`, Tailwind `@source`) must include `.mdx`, since example classes live there.
- **Markdown** renders everywhere: item, example and prop descriptions.
  - `marked` lexer → React. Links and fences go through the shell's `Link` / `Code`; raw HTML shows as text.
  - The first paragraph is the lead; the rest renders in `data-modo="prose"`.
- **Props** come from the destructured params plus the inline object type and per-prop JSDoc.
  - A bare identifier type resolves to a same-file interface or type alias.
  - `const X = forwardRef<…, XProps>` resolves `XProps`.
  - Shell slot matching reads these props, so a converted component must keep `children` (and `href` for Link) visible.
- **Parser rules:**
  - `@example` counts only at the start of a JSDoc line.
  - `//` is a comment only after start-of-line, whitespace or punctuation, so `https://` survives.
  - Inline example code can't contain `*/` (no JSX `{/* … */}`). Move it to `examples.mdx` instead.
- **Examples compile in-browser** (babel standalone) as `return (<>…</>)` inside `new Function`.
  - One JSX expression or several siblings; no hooks.
  - Leading imports and a trailing `;` are stripped.
  - An identifier binds only if it is an item name or an `examples` scope export (items win on collision). Nothing touches globals.
  - Each stage has an error boundary.

## lib conventions

- **Workspaces:** bun. The root `package.json` `workspaces` (mirrored in `bun-workspace.toml`) lists `lib`, `demo` and `demo/design-systems/*`.
- **Lib package:**
  - ESM, `react-jsx`, `jsxImportSource: 'react'`.
  - bunup builds `dist/` from `src/exports/*`; the runtime and plugins ship as source, unbundled.
  - Structural CSS only: no tokens, no component visuals, no copy.
- **One shared build** (`lib/src/plugins/bundle.ts`):
  - Entries in ONE esbuild build (`splitting: true`, react external): every item (`items/<tier>/<id>`), every `shell.*` / `panel.items[].component` module (`usr/<name>`) and the `examples` module (`scope/examples`).
  - Output goes to `<DS>/.modo-tmp/build/`. Shared modules (contexts, providers) land in one chunk, so they cross items and the chrome.
  - A failing entry is isolated, dropped and reported once as `[modo:bundle]`. Stale outputs are swept.
  - In dev, a source change under the DS root rebuilds and reloads.
- **Shell inheritance:**
  - The chrome looks for user components per slot, matched by name plus required props. Primitives: Button, Link, Code, Icon. Components: Select, Sidebar Root/Item/Section.
  - Unmatched slots fall back to the lib's Plain components; `modo.config.ts: shell` pins slots.
  - A `shell` / `panel.items[].component` reference may name an export: `./modo.components.tsx#Select` (else the default export). Several refs into one file share its build entry, so a DS can keep all its docs-only components in one `modo.components.tsx`.
  - Contracts beyond the matched props:
    - Button gets `variant="ghost"`, `size="sm" | "icon-sm"`, `aria-label`, `aria-pressed`.
    - Code gets `language` and a string child.
    - Icon gets `name` (`code` | `copy` | `check` | `link`) and `label`. The host draws its own glyph; `PlainIcon` shows the label as text.
  - A host Link needn't forward data attributes: the chrome puts its hooks on wrappers.
  - One Sidebar drives both sides: each `panel.items` entry is a `Sidebar.Section`.
- **`modo.config.ts` hooks:**
  - `css` — injected right after the lib's structural CSS, before tokens.
  - `examples` — a module whose named exports are in scope in every example. Alias any export that collides with an item name; an unresolvable path yields scope `{}`.
  - `vite` — default-exports `(config) => config`, imported natively. This is how Tailwind/Uno get added.
- **Users write no Vite config and no Next.js:** the lib owns the app.

## file naming

- `tokens/<group>.css` — one group per file: `colors`, `typography`, `spacing`, `radius`, `motion`.
  - Var prefixes (`--space-*`) work as an alternative to one file per group.
  - A bare shorthand like `--radius` joins its prefix family.
  - In a group file, an unprefixed var belongs to that group (`--sm` in `spacing.css`); a var whose prefix names another group goes there (`--radius-sm` in `colors.css`).
- `<tier>/<name>/index.tsx` — the item. Tiers are `primitives/`, `components/` and `blocks/`, auto-discovered.
  - Compound parts hang off the default export (`Card.Header`). Type them with interface merging, or with `Object.assign` for forwardRef consts.
  - Examples may use compound JSX.
- `<tier>/<name>/examples.mdx` — the item's examples; `<name>.md` for prose. Both are `{@include}`d from the TSDoc.
- `<tier>/<name>/<name>.tsx` — vendored upstream source, imported by an adapter.
  - When the upstream component is the item, rename it to `index.tsx` instead (with a local-modifications header).
  - Adapters only for real API transforms: shell contracts, options→children, prop narrowing.
- Co-located `.css` files in an item dir are auto-injected.

## running

- All DSs: `bun dev` in `demo/` (ports 5173+i).
- One DS: `bun scripts/run-design-systems.ts <name>` in `demo/`, or `cd demo/design-systems/<name> && MODO_PORT=<n> bunx modo dev`.
- The site: `bun run build` in `demo/` builds every DS into `demo/dist/<name>/` (`SITE_BASE` sets the public path). `.github/workflows/pages.yml` deploys it to GitHub Pages on push to `main`.
- Typecheck:
  - a DS: `cd demo/design-systems/<name> && bunx tsc -p . --noEmit`;
  - the lib: `cd lib && bun run check`.

## chrome hooks (data-modo attrs)

- layout: `app`, `sidebar`, `content`, `panel`, `header`.
- nav: `sidebar-nav`, `sidebar-section`, `sidebar-section-title`, `sidebar-section-items`, `sidebar-item` (`aria-current="page"` when active), `toc`, `toc-label` (`data-level`).
- page: `page-eyebrow`, `page-title`, `page-lead`, `prose`, `section`, `section-title`, `anchor`, `hero`, `hero-stats`.
- overviews: `bento`, `bento-card` (`data-span="wide|full"`), `bento-stage`, `bento-meta`, `bento-title`, `bento-count`, `bento-desc`, `bento-empty`, `token-preview`, `token-chip`.
- examples: `example-card`, `example-card-title`, `example-card-frame`, `example-card-stage`, `example-actions`, `example-code`, `code-block`, `code-actions`, `icon-label`.
- tables and tokens: `prop-table`, `token-list`, `token-row`, `token-name`, `token-meta`, `swatch` (`data-kind`), `raw-json`.
- colors: `color-grid`, `color-stack`, `color-tile` (`data-flush` when it matches the page), `color-tile-name`, `color-tile-value`, `color-tile-pair`.
- foundations: `token-label`; typography `type-families`, `type-family`, `type-family-sample`, `type-glyph`, `type-scale`, `type-step`, `type-sample`, `type-weights`, `type-weight`, `type-preview`; radius `radius-grid`, `radius-tile`, `radius-shape`; spacing `space-scale`, `space-step`, `space-bar`, `space-preview`; motion `motion-list`, `motion-row`, `motion-track`, `motion-dot`, `motion-curve`, `motion-preview`, `motion-bar`.

The lib styles their structure, including the hover reveal of `example-actions`, `code-actions` and `anchor` (shown on hover or focus-within, always shown on touch) and the responsive grid (panel strip below 1280px, stacked below 768px). The host styles everything else through the same attrs, e.g. ui's `global.css` chrome section.

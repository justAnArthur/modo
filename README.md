# modo

atomic design system renderer. a library that **enforces the structure of an atomic design system** (tokens → primitives → components → blocks) and **auto-renders its docs site**, modeled on the [fluidfunctionalism](https://www.fluidfunctionalism.com/) aesthetic.

## monorepo

```
modo/
├── packages/
│   ├── lib/    — the npm package: `modo`
│   └── demo/   — the example DS: `@modo/demo`
├── bun-workspace.toml
├── tsconfig.base.json
└── package.json
```

## packages

### `modo` (the lib)

ships:
- the public API (`modo/config`, `/tokens`, `/surfaces`, `/define`)
- zod-validated schemas for tokens, surfaces, items, props, examples
- a lib-internal Vite + Vike renderer (no leakage to the user's project)
- 3 Vite plugins: `tokens` (reads user tokens, generates `:root` CSS), `source` (discovers user primitives/components/blocks), `graph` (import analysis for "depends on" / "used in")
- structural CSS (layout, grid, motion, focus, hover) — uses design tokens via CSS variables
- the surfaces elevation model (`<Elevated>`, `<SurfaceProvider>`, `useSurface`)
- 8-level shadow recipes for the surface ladder
- the `init` scaffold template (`packages/lib/templates/default/`)

ships **zero design tokens**. all colors, spacing values, font families, radii, shadows, and motion values come from the user's `tokens/`.

### `@modo/demo` (the example)

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

1. user runs `npx modo init my-ds` — `packages/lib/templates/default/*` is copied to a new `my-ds/` folder
2. user `cd my-ds && bun install && bunx modo dev` — lib's CLI reads `modo.config.ts`, starts internal Vite, vite reads the user's tokens + primitives, renders the showcase
3. the user's `my-ds/` has **zero lib files** (no vite.config, no pages/, no src/runtime). just the DS.

## license

MIT

## Release

This package is published to two registries automatically when a tag is pushed:

- npmjs.com (primary)
- npm.pkg.github.com (mirror)

The bump + release + dual-publish pipeline is driven by [`just-github-actions-n-workflows`](https://github.com/justAnArthur/just-github-actions-n-workflows) (`v1.0.1`, stock workflows installed via the toolkit CLI).

### Required secrets on the GitHub repo

- `NPM_TOKEN` — npm automation token (publishes to npmjs.com).
- `GH_TOKEN` — Personal Access Token with `write:packages` scope (publishes to npm.pkg.github.com).

### Pipeline

1. Conventional commit to `main` → `bump-version.yml` reads the scope (`lib` or `modo`), bumps `lib/package.json`, creates annotated tag `modo@<version>` with JSON `{"deployTargets":["npm"]}`, pushes the tag.
2. Tag push → `publish-npm-on-tag.yml` resolves metadata, installs deps, builds, runs `bun publish -p --access public --tag <dist-tag>` to npmjs.com.
3. Bun's `postpublish` lifecycle runs `lib/scripts/publish-to-github-packages.mjs`, which swaps `.npmrc` to `https://npm.pkg.github.com/`, re-runs `bun publish --ignore-scripts --access public`, then restores the original `.npmrc`.
4. `publish-npm-on-tag.yml` creates the GitHub Release with conventional-commit notes.

### First tag (manual)

The toolkit's tag annotation must be a JSON object. The first tag has to be created manually because there is no prior commit for `bump-version.yml` to derive it from:

```sh
git tag -a modo@0.1.0 -m '{"deployTargets":["npm"]}'
git push origin modo@0.1.0
```

From the second release onward, `bump-version.yml` generates the annotation automatically.

### Local dual-publish

```sh
cd lib
NPM_TOKEN=… GH_TOKEN=… bun publish -p --access public
```

The `postpublish` hook fires the same way it does in CI.

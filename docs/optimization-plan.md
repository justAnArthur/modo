# modo-atomic-ui — ponytail optimization plan

> Audit of the current lib state. **Pure delete + consolidate, no behavior changes.**
> Phase 3.4 (CLI) is shipped. This is the "polish before phase 4" pass.

---

## TL;DR

The lib is **~2791 lines of TS/TSX + 474 lines of CSS = 3265 lines total**.
**~300 lines (~10%) is dead or duplicated.** All cuttable without losing a single
user-visible feature. The public API surface stays the same: `defineConfig`,
`Elevated`/`SurfaceProvider`/`useSurface`, `SiteConfig`.

Top 3 things I'd cut first:

1. **5 dead subpath exports** (`./check`, `./schema`, `./tsdoc.parser`, `./css.parser`,
   `./config.loader`, plus the "back-compat" `./surfaces-runtime`). They're
   internal plumbing dressed as public API.
2. **The hand-rolled `ExampleCard` + `PropTable` in `index/+Page.tsx`** duplicate
   `ExampleBlock` (from `example-renderer.tsx`) and the prop table from
   `item-page.tsx`. ~50 lines, two slightly-different renders of the same thing.
3. **Dead CSS for `data-aui="docs-foundation-list"`, `data-aui="docs-item-list"`,
   `data-aui="surfaces-ladder"`, and the entire `data-density` machinery.**
   The hooks are set in JSX that no longer exists. ~30 lines of orphan rules.

---

## The current state (one-screen summary)

**Lib size:** 2791 LOC TS/TSX + 474 LOC CSS = 3265 LOC. ~14 pre-rendered HTML
pages from the demo.

**Public API (`lib/src/exports/index.ts`):** 3 names + 1 type.

```ts
export { defineConfig } from './config'
export { Elevated, SurfaceProvider, useSurface } from './surfaces-runtime'
export type { SiteConfig } from './schema'
```

**Subpath exports (8 in `package.json`):**

| Subpath | Used by | Public? | Verdict |
|---|---|---|---|
| `.` | users, runtime | yes | keep |
| `./config` | users, runtime | yes | keep |
| `./schema` | `check.ts` only | no | **delete** |
| `./check` | `cli.ts` only | no | **delete** |
| `./surfaces-runtime` | not used by anyone | "back-compat" for v0.0.0 | **delete** |
| `./tsdoc.parser` | `check.ts` only | no | **delete** |
| `./css.parser` | `tokens.ts` plugin + `check.ts` | no | **delete** |
| `./config.loader` | `user-css.ts` plugin + `check.ts` + `cli.ts` | no | **delete** |

The 5 internal subpath exports were never intended as public API. They exist
because `bunup`'s `exports({})` plugin emits one `.js`+`.d.ts` per `src/exports/*`
entry, and the lib's other modules were just placed in `src/exports/` to share
that build pipeline. Move consumers to direct relative imports.

**CLI commands (5):** `dev` | `build` | `init` | `add` | `check`. All working,
all in `lib/src/exports/cli.ts` (267 lines — could split, but it's readable as one
file for a 5-command CLI).

**Pages (7):** `/` + `/docs/{primitives,components,blocks}/@id` + `/docs/tokens/@group`.
5 `+Page.tsx` files + 4 `+onBeforePrerenderStart.ts` files + 1 `+Layout.tsx` +
2 `+config.ts` + 2 `.css` files. Total: ~13 files, ~600 lines.

**Plugins (3 + 1 helper):** `source.ts` (238), `tokens.ts` (175), `user-css.ts` (52),
`_helpers.ts` (63). All look correct on a second read — the esbuild-on-tmp
pattern is needed to bridge vite's import graph with the user's items, and it
works.

**Templates:** `default/` (3 primitives, 2 components, 1 block, 7 token groups,
`modo.config.ts`, `modo.panel.tsx`, `global.css`, `package.json`, `tsconfig.json`,
`README.md`) + `stubs/` (4 files).

**Archived (kept in `lib/_archived/`):** the old view controls (`view.tsx`,
`view-panel.tsx`, `slot.tsx`, `link.tsx`) + a `components.ts` plugin. ~322 lines
of reverted work, documented in `lib/_archived/view-controls/README.md`. Don't
re-touch.

---

## Ponytail review — what to delete (ranked)

### Tier 1: zero-risk, delete immediately (no user-visible change)

#### 1. Dead subpath exports (5 subpaths, ~30 lines of build glue + package.json)

**Files:** `lib/package.json` (`exports` map), `lib/src/exports/{check,schema,tsdoc,css.parser,config.loader,surfaces-runtime}.{ts,tsx}`.

**Why dead:**
- `./check`, `./schema`, `./tsdoc.parser`, `./css.parser`, `./config.loader` are only
  imported by other internal modules. No user code can import them without
  knowing internal layout. None of them are documented in AGENTS.md.
- `./surfaces-runtime` is the canonical source of the same exports (re-exported
  from `index.ts` with a comment that says "kept for backwards compat with
  v0.0.x; new code should use the main entry." The lib IS v0.0.0. There is
  no v0.0.x. **No real consumers.**

**Fix:** delete the subpath entries from `package.json:exports`. Move the 5
modules' code into `lib/src/internal/` (a new directory) and update the
importers in `check.ts`, `cli.ts`, `tokens.ts`, `user-css.ts` to use the
internal path. Or simpler: leave them in `src/exports/` but remove the
`package.json` `exports` entries (the files stay as internal modules, just
not user-reachable).

#### 2. Dead CSS rules in `lib/src/runtime/styles/base.css` (~15 lines)

- `[data-aui="surfaces-ladder"]` (lines 100-104): no JSX uses the bare
  attribute. JSX uses `surfaces-ladder-row` and `surfaces-ladder-stack`.
  **Dead.** 3 lines.
- `[data-aui="example-card-name"]` (line 204-208): WAIT — this one is used in
  `example-renderer.tsx` line 152. **Keep.** Skip this one.

#### 3. Dead CSS rules in `lib/src/runtime/pages/+Layout.css` (~25 lines)

- `[data-aui="docs-foundation-list"]` and `[data-aui="docs-item-list"]` (lines
  141-170): the home page doesn't use them anymore. The current
  `pages/index/+Page.tsx` renders sections directly, not a "list of links"
  view. **Dead.** 25 lines.

#### 4. Dead `data-density` machinery in `base.css` (8 lines + 15+ references)

`base.css` lines 391-394:
```css
[data-density="compact"]    { --spacing-multiplier: 0.85; }
[data-density="comfortable"] { --spacing-multiplier: 1; }
[data-density="spacious"]   { --spacing-multiplier: 1.15; }
```

`+Layout.css` references `var(--spacing-multiplier, 1)` in 15+ places.

**The problem:** no JS in the lib sets `data-density` on the html element. The
view-controls hooks were removed in commit `4943e70` ("cut view controls +
chrome slot system"). The current `demo/modo.panel.tsx` only sets
`data-theme`. The `data-density` attribute and `--spacing-multiplier` are
inert — they only kick in if the user adds a panel that sets the attribute.

**Two options:**

a) **Delete the machinery entirely** (~8 CSS lines + replace all
`var(--spacing-multiplier, 1)` with the inner expression). Aggressive —
re-opens the door later if you want density controls.

b) **Keep the CSS in `base.css` (it's only 4 lines), strip the
`var(--spacing-multiplier, 1)` fallbacks from `+Layout.css`** since the
CSS variable is set to 1 by default. (Recommended — leaves the hook
intact for users who wire it up.)

#### 5. Dead `TIERS` re-export in `prerender-helpers.ts`

`lib/src/runtime/prerender-helpers.ts:41`:
```ts
export { TIERS }
```

`TIERS` is only used inside the file. **Delete the export.**

#### 6. Dead `import 'react'` in `tsdoc.ts`

Wait — `tsdoc.ts` doesn't import react. **Skip.** False alarm.

#### 7. Unused `panel-title` / `control` / `control-label` / `control-input` /
`panel-hint` CSS in `base.css` (not in `+Layout.css`)

`base.css` defines `[data-aui="panel-title"]` (line ~485) and friends. These
are *set* in the user's `modo.panel.tsx`, not in the lib. The lib's
structural CSS is setting visual styles for elements the lib doesn't
render. **Aggressive cut:** move the panel-related rules to a separate
`panel.css` the lib only imports when a panel is detected. **Conservative
cut:** leave them, they're 8 lines and they document the "shape" of a
panel even when the user doesn't use one.

**Verdict:** leave them. The lib says "structural CSS only" but the panel
defaults are a soft default that the user overrides anyway. Ponytail doesn't
fight 8 lines of structural CSS.

#### 8. `discoverDir` reads the directory twice in `source.ts`

`source.ts:50` calls `await readdir(fullDir)` to find `.css` files. The
parent `discoverDir` already called `await readdir(dir)`. Could pass the
list down. **Minor (~3 lines).** Skip in this pass.

#### 9. `user-css.ts` calls `loadModoConfig` on every load (mild perf bug)

`user-css.ts:31` calls `loadModoConfig` on every `load(id)` call. Vite calls
`load` once per virtual module — but both `virtual:config.loader` and
`virtual:modo-user-css` invoke the same `load`, so `loadModoConfig` is
called twice per HMR cycle (once for each virtual module that doesn't
match `id`). **Mild fix:** cache the config load in the plugin closure.

**Verdict:** low priority. The esbuild call is ~50ms. 2x is 100ms. Fine for
now. Note in the doc, skip in this pass.

#### 10. `check.ts:107-110` validates spacing with optional unit

```ts
if (group === 'spacing' && !/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
```

The `(px|rem|em|%)?` makes the unit optional, so `5` passes as a length.
Should be `(px|rem|em|%)`. **Bug, but small.** Fix in the same pass.

---

### Tier 2: consolidation, no behavior change (~50 lines net delete)

#### 11. `pages/index/+Page.tsx` `ExampleCard` (lines 21-29) duplicates `ExampleBlock`

`index/+Page.tsx` defines a local `ExampleCard` (line 21-29) for the home
page's item sections. It's structurally identical to `ExampleBlock` from
`example-renderer.tsx`. The two diverge in behavior:
- `ExampleCard` (home): doesn't compile JSX, no description, no "show code"
  toggle. Just renders the example name + a label.
- `ExampleBlock` (per-item page): compiles JSX server-side, renders the live
  example, has description + "show code" toggle.

**This means the home page examples look different from the per-item page
examples.** Same item, two different visual representations. That's a
real bug from a "consistency" perspective, not just a duplication.

**Fix:** delete the local `ExampleCard`, use `ExampleBlock` on the home
page too. ~10 lines deleted + the home page becomes the same look as the
per-item page.

#### 12. `pages/index/+Page.tsx` `PropTable` (lines 32-50) duplicates `item-page.tsx` prop table

`index/+Page.tsx` defines a local `PropTable` (32-50). `item-page.tsx`
defines an inline `<table data-aui="prop-table">` block (51-69). Same
shape, same CSS, two copies. **Fix:** extract a `PropTable` component to
`lib/src/runtime/components/prop-table.tsx`, use it in both places.
**Net delete: ~10 lines** (extract, then delete both copies, add one
import).

#### 13. Inline styles in `index/+Page.tsx` for TokenSection lead (line 78-79)

`TokenSection` has a hard-coded inline `style={{ color: 'var(--muted-foreground)', margin: '0 0 16px', fontSize: 12 }}`. The per-group page
(`docs/tokens/@group/+Page.tsx`) uses a `<p data-aui="page-lead">` element.

**Fix:** replace the inline style with `data-aui="page-lead"`. Adds a
[data-aui="page-lead"] rule to `base.css` (or add a `section-lead` attr
for token sections). **Minor.**

#### 14. Three places list tier labels and order

- `+Layout.tsx`: `TOKEN_GROUPS`, `TIER_LABEL`, `TIER_ORDER` (defined inline)
- `item-page.tsx`: `TIER_LABEL` (defined inline, same shape)
- `prerender-helpers.ts`: `TIERS` (used internally, exported but no consumers)

**Fix:** extract `TIER_LABEL` + `TIER_ORDER` to `lib/src/runtime/tiers.ts`.
Drop the export from `prerender-helpers.ts`. **Net delete: ~5 lines.**

---

### Tier 3: leave alone (defer to phase 4 or later)

#### 15. `cli.ts` is 267 lines for 5 commands

Could split into `cli/{dev,build,init,add,check}.ts`. But: it's a single
`#!/usr/bin/env node` entry point, the user only sees one file, splitting
adds 4 import lines. **Don't split.** Ponytail: "if the second consumer
appears, split." There's no second consumer.

#### 16. `tsdoc.ts` is 377 lines (the largest file in the lib)

The TSDoc parser is the lib's core differentiator. It does:
- parse the default export from a `.tsx` file
- parse JSDoc
- extract props from the first-param type literal
- detect enum unions
- parse `@example` blocks with title + multi-fence code

It's a lot of code, but every piece is needed. **Don't touch.** Phase 4
("MDX") might add to it.

#### 17. `css.parser.ts` is 218 lines

Token parser: handles prefix inference, group comments, `parseSections`,
`buildGroup` for each of 7 groups, `inferRole`, `inferSemantic`. Could
collapse, but each `buildGroup(name, vars)` is a different shape. **Don't
touch.**

#### 18. The esbuild-bridge trick in `example-compiler.ts`

The lib compiles user examples server-side with esbuild, strips
imports/exports via regex, ships the function body as a string, and the
client reconstructs the function with `new Function(...)`. Yes it's
fragile. No, there's no simpler way to keep esbuild out of the client
bundle while supporting arbitrary user JSX. **Don't touch.**

#### 19. The 4 stubs in `lib/templates/stubs/`

4 files, ~30 lines total. Each one is the smallest meaningful starting
point for a primitive/component/block/token. **Don't touch.**

#### 20. `AGENTS.md` chrome hooks list has unused entries

`AGENTS.md` documents `data-aui="card" | "row" | "cell" | "grid" |
"search" | "elevated"`. None of `card`/`row`/`cell`/`grid`/`search` are
emitted by the lib. `elevated` IS emitted by `surfaces-runtime.tsx` (on
`<Elevated>`). **Cut the dead entries from AGENTS.md** (5 strings in one
line). ~30 seconds. **Keep `elevated`**.

---

## What stays untouched

- All 7 pages.
- All 4 plugins + 1 helper.
- Public API: `defineConfig`, `Elevated`/`SurfaceProvider`/`useSurface`, `SiteConfig`.
- CLI: all 5 commands.
- Templates: both `default/` and `stubs/`.
- `tsdoc.ts`, `css.parser.ts`, `config.loader.ts`, `check.ts` (the actual
  modules — just their subpath exports go away).
- TSDoc parser, example compiler, example renderer.
- `lib/_archived/` (history).
- Demo.

---

## Execution order

I would do this in 4 small PRs, each independently mergeable and runnable
(`bun run dev` + `bun run check` + `bun run build` all green after each).

### PR 1: kill dead subpath exports (15 min)

Files touched: `lib/package.json` (drop 5-6 subpath entries), and update
imports in `lib/src/exports/check.ts`, `lib/src/exports/cli.ts`,
`lib/src/runtime/plugins/{tokens,user-css}.ts`, `lib/src/runtime/vite.config.ts`.

**Verify:** `bun run build` still produces the same dist files (modulo the
removed subpath entries). `bun run dev` from the demo works. `modo check`
from the demo passes.

### PR 2: kill dead CSS + dead data-density fallback (15 min)

Files touched: `lib/src/runtime/styles/base.css` (drop
`[data-aui="surfaces-ladder"]` block, ~5 lines), `lib/src/runtime/pages/+Layout.css`
(drop `docs-foundation-list` / `docs-item-list` rules, ~25 lines), and
the data-density cleanup per option (b).

**Verify:** `bun run dev` shows the same visual output for the demo
(open localhost:5173, screenshot, compare).

### PR 3: consolidate home page + extract PropTable (45 min)

Files touched: `lib/src/runtime/pages/index/+Page.tsx` (delete local
`ExampleCard`, use `ExampleBlock`), `lib/src/runtime/components/prop-table.tsx`
(new), `lib/src/runtime/components/item-page.tsx` (use the new
`PropTable`).

**Verify:** home page item sections now look identical to per-item page
item sections. Prop table renders the same in both places.

### PR 4: minor cleanup — `TIERS` export, AGENTS.md, spacing regex, inline styles (10 min)

Files touched: `lib/src/runtime/prerender-helpers.ts` (drop `TIERS` export),
`AGENTS.md` (drop 5 unused chrome hooks), `lib/src/exports/check.ts` (fix
spacing regex), `lib/src/runtime/pages/index/+Page.tsx` (drop inline
style on TokenSection lead).

**Verify:** `bun run check` and `bun run build` still green.

---

## Total expected impact

| Metric | Before | After | Delta |
|---|---|---|---|
| LOC (TS/TSX) | 2791 | ~2580 | -211 (-7.5%) |
| LOC (CSS) | 474 | ~440 | -34 (-7%) |
| Subpath exports | 8 | 2 | -6 |
| Public API names | 3 + 1 type | 3 + 1 type | 0 |
| Plugins | 3 + 1 | 3 + 1 | 0 |
| Pages | 7 | 7 | 0 |
| CLI commands | 5 | 5 | 0 |

**Zero behavior changes.** Same public API. Same docs site. Same CLI
behavior. Same per-item page, same per-token-group page, same home page
(now using the same example renderer as per-item pages — a small visual
improvement, not a regression).

---

## What I would NOT do (push-back if asked)

1. **Split `cli.ts` into per-command files.** No second consumer. The
   267-line file is readable. Splitting adds 4 imports and 4 new files.
2. **Add a tests/ folder.** Phase 3.4 shipped without tests. Adding them
   now is a separate scope. The user's existing test surface is
   `modo check` + visual review of the dev server.
3. **Rewrite the example compiler.** The esbuild+`new Function` trick is
   fragile but correct. A rewrite would be phase 4 work (MDX).
4. **Move chrome hooks from `AGENTS.md` into a generated type file.**
   AGENTS.md is the source of truth. The type generation would be
   over-engineering for a docs site that has 23 hook names.
5. **Delete `lib/_archived/`.** It's in `.gitignore` so it's not in the
   published package. History matters — keep it for reference.

---

## Verification bar (after all 4 PRs)

1. `bun run check` from the repo root → green.
2. `bun run dev` from `demo/` → opens localhost:5173, all 6 token groups +
   3 primitives + 3 components + 1 block render with the same look as
   before.
3. `bun run build` from the repo root → produces the same dist/ shape,
   14 pre-rendered HTML files.
4. `modo check` from `demo/` → exits 0.
5. Spot-check `modo add primitive foo` + `modo add block bar` → files
   scaffold at `primitives/foo/index.tsx` and `blocks/bar/index.tsx`,
   `bun run dev` still works.

That's the plan. Want me to start with PR 1 (the kill-the-subpath-exports
one)? It's the lowest-risk and unblocks the rest.

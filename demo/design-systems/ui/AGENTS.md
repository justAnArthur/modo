# AGENTS.md — the ui design system

Fluid Functionalism (Base UI flavor) on UnoCSS + `cn`, with a local morph layer: overlays grow out of
whatever opened them, and anything that travels between items melts like a drop of liquid. The repo
root `AGENTS.md` applies here too (tokens only, TSDoc, file naming, sparse code); this file adds what
is specific to this package.

## read first

| File | What it holds |
|---|---|
| `DESIGN.md` | The design language: every token (front matter) and the rules (prose), in Google's DESIGN.md format. |
| `.claude/skills/modo-ui/` (repo root) | The `modo-ui` skill: the systems as code, a new-item workflow, recipes, the catalog, upstream's craft notes. Load it before writing UI here. |
| `primitives/craft` | The rules made visible: bad / good pairs (weight shift, blinking hover, warping press, copy target, overlay origin, snapping indicator, flat surfaces, click ring). Open it in the dev server. |
| `README.md` | The port: upstream → local file map, every local modification, the UnoCSS translation. |

## where things live

- `tokens/*.css` — colors (`light-dark()`), typography (`--text-*`, `--leading-*`, `--weight-*`), motion
  (`--duration-*`), radius, spacing. The surface ladder and shadows are in `primitives/surface/surface.css`.
- `uno.config.ts` — the utilities over the tokens (`text-<role>`, `weight-*`, `duration-<tier>`,
  `bg-surface-N`, `shadow-surface-N`, `rounded-box|glyph`). `lib/utils.ts` — `cn`, which knows them.
- `lib/` — the shared systems: `springs`, `size-context`, `shape-context`, `surface-*`,
  `use-fluid-hover` + `fluid-hover-highlight`, `goo-indicator`, `use-morph` + `morph-layers` +
  `morph-part`, `reduced-motion`, `use-controllable-state`, `slot`, `icon-context`.
- `primitives/` — the systems as documented items (Surface, Sizes, FluidHover, Motion, Morph,
  ScrollArea, Code, Craft). `components/[inputs|navigation|overlays]/` — controls. `blocks/` —
  compositions.
- `modo.components.tsx` — docs-only adapters for the chrome's slots (`Select`, `Icon`, `DocsNav`) and the
  Theme panel item. `global.css` — base styles and the chrome's look through `data-modo` attributes.

## rules that matter most

- **Compose before you create.** Most asks are an existing item or a composition of them; wrap a shipped
  item instead of forking it.
- **Behavior from Base UI, look from the systems.** Never hand-roll focus, dismissal or positioning.
- **Tokens only.** `text-<role>`, `weight-*`, `bg-surface-N` via `SURFACE_BG[level]`, `bg-hover` /
  `bg-active`, `useShape()`, `useSize()`, `spring.*` / `duration-<tier>`. Two text colors. No `font-*`
  weights, no uppercase, no letter-spacing, no arbitrary visual values.
- **Motion has a source.** One fluid hover highlight per list; a `GooIndicator` for anything that
  travels; `useMorph` + `MorphSurface` for any new overlay; `useReduceMotion()` wherever you drive motion.
- **Lift relative to the substrate** (`useSurface() + offset`) and re-provide the level.
- **Both ways.** `value` / `defaultValue` / `onValueChange` through `useControllableState`, so examples
  stay hook-free.
- **Vendored files** keep upstream formatting and list every change in their header and in `README.md`.

## checks

```bash
bunx tsc -p . --noEmit
```

```bash
cd ../../.. && bun run lint
```

```bash
cd ../.. && bun scripts/run-design-systems.ts ui
```

Then look at the page in light, dark, a compact region, by keyboard and with reduced motion. modo
reports parser and build problems as `[modo:bundle]` lines in the server output. The skill's
`references/authoring.md` has the full list and a style grep for what Biome doesn't catch.

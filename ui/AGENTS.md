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
| `primitives/systems/craft` | The rules made visible: bad / good pairs (weight shift, blinking hover, warping press, copy target, overlay origin, snapping indicator, flat surfaces, click ring). Open it in the dev server. |
| `README.md` | The consumer docs: install, the three CSS setups, theming, the component API conventions, Server Components, the exported hooks, credits. |
| `PORTING.md` | The port: upstream → local file map, every local modification per file, the UnoCSS translation. |

## where things live

- `tokens/*.css` — colors (`light-dark()`), typography (`--text-*`, `--leading-*`, `--weight-*`), motion
  (`--duration-*`), radius, spacing. The surface ladder and shadows are in `primitives/systems/surface/surface.css`.
- `uno.config.ts` — the utilities over the tokens (`text-<role>`, `weight-*`, `duration-<tier>`,
  `bg-surface-N`, `shadow-surface-N`, `rounded-box|glyph|pill|focus-ring|pill-focus-ring|shell|pill-shell`). `lib/utils.ts` — `cn`, which knows them.
- `lib/` — the shared systems: `springs` (+ `springEnter`), `size-context` (+ the pure `size-scale`),
  `shape-context` (+ the pure `shape-classes`), `surface-*` (+ `useLift`), `use-fluid-hover` +
  `fluid-hover-highlight`, `goo-indicator`, `use-morph` + `morph-layers` + `morph-part`,
  `reduced-motion`, `use-controllable-state`, `slot`, `icon-context`, `field-classes` (the classes) +
  `field-box` (`useFieldBox`, `useFieldState`), `spinner-glyph`, `date-locale` (+ `monthRange`),
  `date-mask`, `popup` (`POPUP_SHAPE`), and the helpers listed in `lib/README.md` (refs, rects, focus
  ring, `WeightLabel`, row groups that skip `aria-disabled` rows, overlay roots and surfaces, popup
  rows). Use them before writing the pattern by hand.
- `primitives/` — in group folders (the docs' sidebar sections): `systems/` (the systems as
  documented items: Craft, Sizes, Surface, Motion, Morph, FluidHover), `layout/` (ScrollArea,
  Separator, Resizable, VirtualList, Sortable) and `content/` (Code, Skeleton).
  `components/` — `actions/` (Button, Copy), `inputs/`, `navigation/`, `overlays/`, `data-display/`
  (Avatar, Badge, Kbd, List, Table, Diff, LogView, Markdown, Sparkline), `feedback/` (Progress, Meter,
  StatusDot, EmptyState) and `containers/` (Accordion, Card). `blocks/` — compositions (SidebarApp,
  ShellCard, DesktopShell), ungrouped. Package subpaths follow the folders
  (`@justanarthur/modo-ui/components/actions/button`).
- `docs/` — the docs chrome, shipped (`@justanarthur/modo-ui/docs`, `/docs/chrome.css`, `/docs/vite`):
  `chrome.tsx` adapts the chrome's slots (`Button`, `Link`, `Select`, `Icon`, `DocsNav`, `SiteSwitcher`: the site view's Popover) and the Theme panel
  item, `chrome.css` is its look through `data-modo` / `data-modo-ui` attributes (no utilities, so a host
  scans nothing), `vite.ts` holds `docsTheme` (the theme script) and `withUno(configFile)` (UnoCSS plus
  the theme script, the extension kits use). `global.css` imports `base.css` and `docs/chrome.css`; `vite.ts`
  at the root is `withUno` over ui's uno config; `modo.components.tsx` holds the site's `Logo`.
- `guides/` — the docs' Getting started and Theming pages (not shipped). `test/` — `bun test` for the
  pure helpers (`date-mask`, FileDropzone's `variants`) and the shape radii against their tokens.

## rules that matter most

- **Compose before you create.** Most asks are an existing item or a composition of them; wrap a shipped
  item instead of forking it.
- **Behavior from Base UI, look from the systems.** Never hand-roll focus, dismissal or positioning.
- **Tokens only.** `text-<role>`, `weight-*`, `bg-surface-N` via `SURFACE_BG[level]`, `bg-hover` /
  `bg-active`, `useShape()`, `useSize()`, `spring.*` / `duration-<tier>`. Two text colors. No `font-*`
  weights, no uppercase, no letter-spacing, no arbitrary visual values.
- **Motion has a source.** One fluid hover highlight per list; a `GooIndicator` for anything that
  travels; `useMorph` + `MorphSurface` for any new overlay; `useReduceMotion()` wherever you drive motion.
- **Lift relative to the substrate** (`useLift(offset)`, or `PopupSurface` for an overlay) and
  re-provide the level.
- **Both ways.** `value` / `defaultValue` / `onValueChange` through `useControllableState`, so examples
  stay hook-free. `onValueChange` gets the value, never an event; form controls take `name`.
- **Sizes on the ladder.** `size` is `SizeVariant` (`default` | `compact`; Button adds `icon` /
  `icon-compact`). `icon-sm` exists only for modo's shell contract.
- **Popups behave alike** (DESIGN.md › Components): lists open 6px below their trigger
  (`sideOffset` 6); text fields signal focus by their fill, button fields (Select's trigger, the
  pickers, ColorPicker.Popover's trigger) also ring on `:focus-visible`; Select keeps a keyboard
  focus ring in its list, Combobox none (its input keeps focus); only Dropdown focuses its first row
  on open; only Select holds a pick for its 300ms acknowledgment.
- **Vendored files** open with a `/*!` provenance header (a legal comment, so the build keeps it in
  `dist/`) ending in "Local changes: see PORTING.md". Record every local change in `PORTING.md`'s
  file map, not in the header.
- **Client modules.** A module with hooks, context, handlers or browser APIs puts `'use client'` right
  after its header; `bunup.config.ts` hoists it to the top of each output chunk for RSC hosts. Pure
  tables live in their own module without the directive (`size-scale`, `shape-classes`,
  `field-classes`, a component's `variants.ts`), so a Server Component can import them. Every lib
  module is its own chunk; `bun run check:dist` proves it after a build.
- **Fields.** A control takes `invalid` / `disabled` / `readOnly` / `required` from an enclosing `Field`
  (`useFieldBox`, or `useFieldState` when its root isn't the box); its own prop wins.

## checks

```bash
bunx tsc -p . --noEmit
```

```bash
cd .. && bun run lint
```

```bash
bun run build && bun run check:dist && bun test
```

```bash
cd ../demo && bun scripts/run-design-systems.ts ui
```

Then look at the page in light, dark, a compact region, by keyboard and with reduced motion. modo
reports parser and build problems as `[modo:bundle]` lines in the server output. The skill's
`references/authoring.md` has the full list and a style grep for what Biome doesn't catch.

# Porting notes — Fluid Functionalism to modo

How `@justanarthur/modo-ui` was ported from
[Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) (FF):
the upstream → local file map, every local modification, the Tailwind → UnoCSS
translation. For using the package, see [`README.md`](./README.md); for the
upstreams and their licenses, its [Credits](./README.md#credits).

The port differs from the upstream registry in three ways:
- It uses the **Base UI** flavor.
- **UnoCSS** (`presetWind4`) replaces Tailwind CSS v4.
- **[`cn`](https://github.com/shadcn-ui/cn)** replaces clsx + tailwind-merge.

The sibling `../demo/design-systems/fluid-functionalism` package is a different
project: a Radix flavor pulled with the shadcn CLI, still on Tailwind.

## Source

- Repository: `github.com/mickadesign/fluid-functionalism`
- Commit: `b3587bdbd83fc66c2a6aae3817ffb856cb09260b`
- License: MIT © 2026 Micka Touillaud. The full text is in
  [`LICENSE.fluid-functionalism`](./LICENSE.fluid-functionalism), copied
  verbatim.
- Flavor: `registry/base/*` wherever upstream ships a flavored file, and
  `registry/default/*` otherwise. The Base UI flavor is pinned to
  `@base-ui/react@1.4.1`, the version upstream was tested with.

Every vendored file opens with a `/*! */` header (a legal comment, so the build
keeps it in `dist/`). The header names the upstream path and commit, carries
the MIT notice and ends with "Local changes: see PORTING.md": this file is the
one record of what changed, per file, in the map below. Every file is formatted
in the repo style (single quotes, no semicolons); a vendored file whose code
trips the linter opens with a `biome-ignore-all` line instead of being
rewritten. Files written for this port open with a plain "Local addition (not
part of Fluid Functionalism)" comment, or with their own credits when they
follow another project.

## Layout

| Path | What it holds |
|---|---|
| `README.md` | The consumer docs: install, setup per CSS path, theming, the component API conventions, Server Components, the exported hooks, credits. Shipped in the package. |
| `PORTING.md` | This file: the port notes. Repo-only. |
| `AGENTS.md` | The ui-specific guide for coding agents (where things live, the rules that matter most, the checks); `CLAUDE.md` imports it. |
| `DESIGN.md` | The design language in Google's [DESIGN.md](https://github.com/google-labs-code/design.md) format: the tokens as front matter, the rules as prose. Agents building here follow the `modo-ui` skill (`.claude/skills/modo-ui` at the repo root). |
| `tokens/*.css` | Colors, typography (`--font-sans`, `--text-*`), motion (`--duration-*`), radius and spacing. |
| `base.css` | Theme switching, base styles, focus fallback, scrollbars, spinner keyframes and `.scroll-fade`. Shipped in the package. |
| `global.css` | The docs site's stylesheet (`modo.config.ts` `css`): imports `base.css`, then `docs/chrome.css` (the modo-only focus revert and the docs chrome). |
| `preset.ts` | The UnoCSS preset (theme and token utilities), shipped as `@justanarthur/modo-ui/unocss`. |
| `uno.config.ts`, `vite.ts` | The UnoCSS setup of the docs site and the prebuilt CSS (see below); `vite.ts` is `withUno` from `docs/vite.ts` over this package's uno config. |
| `index.ts`, `bunup.config.ts`, `scripts/build-css.ts` | The package build: `bun run build` writes the components, their types and the stylesheets to `dist/`. The docs site builds with `bun run build:docs` into `docs-dist/`. |
| `lib/` | FF's shared system files (upstream `lib/`, `hooks/` and the fluid-hover highlight, flat, upstream names), imported relatively by items. modo only scans the tier folders, so it never mistakes them for items. |
| `docs/` | The docs chrome, shipped: `chrome.tsx` (the `Button`, `Link`, `Icon`, `Select` and `DocsNav` shell-slot adapters and the `ThemeSwitcher` panel item, picked by export name: `./docs/chrome.tsx#Select` here, `@justanarthur/modo-ui/docs#Select` from another package), `chrome.css` (the chrome's look, its own elements keyed on `data-modo-ui`, so nothing needs scanning; `@justanarthur/modo-ui/docs/chrome.css`) and `vite.ts` (`docsTheme`, the pre-paint theme controller, and `withUno`, the whole extension for a UnoCSS host; built to JS, `@justanarthur/modo-ui/docs/vite`). |
| `modo.components.tsx` | The docs site's own `Logo`. |
| `primitives/<group>/<id>/` | FF's "System" pages: `index.tsx` (component + TSDoc prose) and `examples.mdx`, pulled in by `@example {@include ./examples.mdx}`. Groups: `systems/`, `layout/`, `content/`. |
| `components/<group>/<id>/` | FF's "Components" pages, same shape, in group folders: `actions/`, `inputs/` (with `inputs/date-time/`), `navigation/`, `overlays/`, `data-display/`, `feedback/` and `containers/`. A group is a sidebar sub-group and an overview section; the id stays `<id>`, so docs URLs ignore the group, package subpaths follow it. |
| `blocks/<id>/` | Compositions of several items, same shape: `sidebar-app`, FF's sidebar preset `sa1FQfCxH6` as an app shell, with the header and footer blocks it is built from beside it. |

## Upstream → local file map

### Shared system (`lib/`)

| Upstream (`registry/default/…`) | Local | Modifications |
|---|---|---|
| `lib/utils.ts` | `lib/utils.ts` | `extendTailwindMerge` → `createCn` from `cn/config`, with the same font-size group extension; the local token utilities join their groups too (compact and `micro` type roles as font-size, `weight-*`, the `duration-*` / `delay-*` motion tiers, `rounded-box\|glyph`, and `text-trim` in a group of its own so it never reads as a text color) |
| `lib/springs.ts` | `lib/springs.ts` | `goo` tier added (the morph engine's goo: 250ms to land, bounce 0.15, a 200ms spring back, so the neck reforms on the way back); `exitFallbackMs` also reads a spring exit's `visualDuration`; `springEnter(tier)`, a tier without its `exit` |
| `lib/font-weight.ts` | — | not ported: its `fontWeights` became the `--weight-*` tokens in `tokens/typography.css` (the `weight-*` utilities) |
| `lib/popup.ts` | `lib/popup.ts` | `popupMotionClass` dropped (the popups morph); `POPUP_SHAPE` (`shapeMap.rounded`), the one shape every popup list reads (Select, Combobox, Dropdown, Command, Search, ColorPicker's format menu) |
| `lib/shape-context.tsx` | `lib/shape-context.tsx` + `lib/shape-classes.ts` | the pure `shapeMap` and its types moved to `shape-classes.ts` (no `'use client'`, so a Server Component can read them), re-exported here; the off-scale radii (`rounded-[20px]`, `[22px]`, `[10px]`) are tokens (`--radius-pill`, `--radius-pill-focus-ring`, `--radius-focus-ring` in `tokens/radius.css`, `rounded-*` in `preset.ts`), and `test/shape-radii.test.ts` holds `bgRadius` / `mergedRadius` to the classes; `useShapeContext` (read and set the provider's shape) |
| `lib/size-context.tsx` | `lib/size-context.tsx` | `SizeProvider` moved to `primitives/systems/sizes` (the documented item), with `SizeContext` exported for it; `sizeMap` text classes → `text-body` / `text-body-compact`; the pure `sizeMap`, `typeScale` and their types moved to `lib/size-scale.ts` (no `'use client'`), re-exported here |
| `lib/icon-context.tsx` | `lib/icon-context.tsx` | `size`/`strokeWidth` widened to `number \| string` for lucide v1 + React 18 types; glyphs added: `panel-left-dashed` / `panel-right-dashed` (the sidebar trigger while it opens on hover), `circle-alert` and `info` (Toast), `minus` (Checkbox's indeterminate mark), `arrow-up-down` (Table's sortable heads), `chevron-left`, `chevrons-left` and `chevrons-right` (Pagination), `circle-check`, `file` and `upload` (FileDropzone and its rows), `eye` / `eye-off` (KeyValue's secret reveal), `grip-vertical` (Sortable's handle), `file-diff` (Diff's header), `square` (DesktopShell's maximize stand-in); `defaultIcons` un-exported (`useIcons` returns the map, which `@justanarthur/modo-ui-ai` extends). Glyphs for utegsk: `chevron-up`, `triangle-alert`, `circle-question-mark`, `trash` (`Trash2`), `timer`, `funnel-x`, `flag`. |
| `lib/surface-context.tsx` | `lib/surface-context.tsx` | `useLift(offset)` added (the substrate plus `offset`, capped at 8) |
| `lib/surface-classes.ts` | `lib/surface-classes.ts` | `SURFACE_HOVER_*` and `surfaceHoverClasses` dropped (only the omitted Sidebar callouts used them); the literal-table rationale holds for UnoCSS's extractor too |
| `hooks/use-fluid-hover.ts` | `lib/use-fluid-hover.ts` | `sessionRef` typed `MutableRefObject<number>` (React 18); `pickNearest`, `PickNearestInput`, `ACTIVE_ATTR` and `ACTIVE_INDEX_ATTR` un-exported |
| `hooks/use-merge-split.tsx` | `lib/use-merge-split.tsx` | the merge/split choreography (boundaries, converge/commit/split phases, resolve timers, `bridgePair`) replaced by per-row blocks melted through `GooLayer`: a block grows out of its row's center or shrinks back into it, squared where it meets a checked neighbour; exports and `SelBlock`'s `key`/rect/`radii`/`instant` kept |
| `hooks/use-keyboard-nav-gate.ts` | `lib/use-keyboard-nav-gate.ts` | Unchanged |
| `hooks/use-touch-primary.tsx` | `lib/use-touch-primary.tsx` | Unchanged |
| `sidebar-core.tsx` (`useIsMobile`) | `lib/use-is-mobile.ts` | Moved out of the sidebar and exported, so the date and time pickers share it |
| `fluid-hover-highlight.tsx` | `lib/fluid-hover-highlight.tsx` | the fill is a `GooIndicator` (melts from row to row; a square highlight still slides), props unchanged; the unused `toTarget` and `resolveHighlightTransition` dropped, the source helper un-exported; no reduced-motion read of its own (`GooIndicator` applies `useReduceMotion`) |
| — (new) | `lib/use-controllable-state.ts` | Local addition: controlled + uncontrolled state, Base UI style; an overload for an optional default (state `T \| undefined`, `onChange` and the setter take `NonNullable<T>`) |
| — (new) | `lib/use-morph.ts` | Local addition: the morph engine (source rect → popup box on a spring tier, exit hold for Base UI's unmount), geometry after beUI's popover; goo runs on its own `spring.goo` with a blur of at least 8px that eases to nothing as the surface lands, so the neck pinches off; a close-only `exit` override, an `instant` predicate that ends a run at once, press points from clicks, context menus and long presses (a droplet source for `from="pointer"`), cleanup when the popup unmounts mid-run; focus goes back to the trigger when a closed popup that held it is gone and Base UI skipped the return (the exit hold makes a menu read the pointer leaving the inert popup as a hover close); `returnFocus: false` leaves focus to an owner that places it (Popover's `finalFocus`); `MorphProps`, the `from` / `effect` / `hideSource` / `tier` props documented once |
| — (new) | `lib/reduced-motion.ts` | Local addition: `useReduceMotion`, the one reduced-motion read for the morph layer and the liquid indicators — the OS setting, or a `MotionConfig` asking for it (motion's `useReducedMotionConfig` alone ignores the OS without `<MotionConfig reducedMotion="user">`) |
| — (new) | `lib/field-classes.ts` | Local addition: the field ladder FF repeats per text field (rest → muted fill on hover or a group's `data-active` → card fill on focus; `data-invalid` keeps a destructive ring; `data-readonly` rings when lit or focused but never lifts the fill), as `fieldVariants` + `fieldIconClasses`, shared by Input, Textarea, Combobox and Sidebar's input; `fieldAdornmentClasses` + `FIELD_ADORNMENT_ICON` (content beside the text); `FIELD_ACTION` / `FIELD_ACTION_BOX` / `FIELD_ACTION_END` / `FIELD_ACTION_RADIUS` + `fieldActionClasses` (an icon button 4px inside the ring, alone or side by side; dims on `data-[disabled]`); `fieldTextInset` (the text inset, for a label or message that lines up with it). Pure class tables, no `'use client'` |
| — (new) | `lib/field-box.ts` | Local addition, split out of `field-classes.ts`: `useFieldBox` (variant, state attributes, radius, inset), the box Input, Textarea, NumberInput, Combobox's fields, Select's trigger, ColorPicker.Popover's trigger and the date/time pickers' field build on, so each takes `variant`; `focusControlOnPress` (ignores presses from a portal inside the box); `FieldStateContext` (a field's active, invalid, disabled, read-only and required state, from Field or InputGroup.Field) and `useFieldState` (a control's own props resolved against it, own prop wins, for a root that is not the box) |
| — (new) | `lib/date-locale.ts` | Local addition: what the date and time pickers read off a react-day-picker (date-fns) locale — the hour cycle (Intl), typed dates, times and months in the locale's formats (date-fns `parse` with `P`…`PPPP`), field names for column labels (`Intl.DisplayNames`); `monthRange`, the month span Calendar and MonthPicker list |
| — (new) | `lib/scroll-column.tsx` | Local addition: `ScrollColumn`, the scrolling option list beside a calendar (months, years, hours, minutes) or a strip above it: the pick gets a dot, a run of `inView` options one band, the followed option stays centred; fluid hover, listbox semantics, arrow keys; `dividedColumns` puts a hairline between neighbours |
| — (new) | `lib/slot.tsx` | Local addition: Dialog's `render` / `asChild` slot shape (`SlotProps`, `slotRender`), shared by every overlay part that wraps a control; `slotPart` wraps a Base UI trigger or close part in it; `resolveSlotTemplate` / `slotElement` copied from FF's `sidebar-core.tsx` (the slot for plain elements: classes, styles and handlers chain, refs merge through `mergeRefs`), used by Button and Sidebar; `cloneSlot(child, props, ref)`, Radix Slot semantics over `slotElement` |
| — (new) | `lib/morph-part.tsx` | Local addition: `MorphPart` (shared parts over a motion `layoutId`, after motion-primitives' morphing dialog) and the scope contexts overlays provide |
| — (new) | `lib/goo-indicator.tsx` | Local addition: `GooIndicator` (melts between items, a lingering blob follows it) and `GooLayer` (goo over the shapes' coverage, filled with their own token, on only while moving), on the engine's `GOO_MATRIX` / `GOO_BLUR_RATIO` |
| — (new) | `lib/morph-layers.tsx` | Local addition: `MorphSurface`, the renderer (shapes layer with beUI's goo filter plus a `--shadow-color` hairline around the melted shape, surface background and shadow, clipped content), and `GooFilter` for opaque shapes |
| — (new) | `lib/merge-refs.ts` | Local addition: `mergeRefs` / `useMergeRefs`, the ref merge FF writes by hand per component |
| — (new) | `lib/use-iso-layout-effect.ts` | Local addition: `useIsoLayoutEffect`, FF's per-file SSR-safe layout effect, once |
| — (new) | `lib/rect.ts` | Local addition: `Rect`, `lerpRect`, `clampRect`, `placeRect`, `lerp`, moved out of `lib/use-morph.ts` for the other shapes that grow between boxes (the accordion panel, Copy's disc) |
| — (new) | `lib/focus-ring.tsx` | Local addition: `FocusRing`, FF's travelling keyboard ring (per list in upstream), jumping under reduced motion |
| — (new) | `lib/weight-label.tsx` | Local addition: `WeightLabel`, FF's ghost-span label (an invisible heavy copy holds the width): forwards its ref and HTML props; `emphasized`, `lit`, `weight`, `trim`, `truncate` (`'line'` or `'inherit'`) |
| — (new) | `lib/row-group.tsx` | Local addition: `useRowFocus`, `useRowGroup`, `focusRowOnPress`, `rowIndexOf`, the focus and keyboard wiring of FF's checkbox and radio groups and popup lists; arrows, Home and End skip `aria-disabled` rows |
| — (new) | `lib/use-autosize-textarea.ts` | Local addition: `useAutosizeTextarea`, Textarea's (and the ai kit composer's) grow-with-text, with a fallback for `line-height: normal` |
| — (new) | `lib/overlay.tsx` | Local addition: `useOverlayRoot` / `useOverlay` / `OverlayContext` (an overlay root's open state both ways and its morph origin), `AnchorProps`, `positionerProps`, `PortalContainer` / `usePortalContainer` |
| — (new) | `lib/popup-surface.tsx` | Local addition: `PopupSurface`, an overlay's lifted, re-provided level on `MorphSurface` (`lift="popup"`: +2 with `shadow-surface-3`; `"panel"`: +4, shadow at the level) |
| — (new) | `lib/popup-rows.tsx` | Local addition: `rowClasses`, `rowLabelClass`, `RowIcon`, `CheckMark`, `PopupLabel`, `PopupSeparator`, FF's popup row (Select, Combobox, Command, Dropdown menu item) once; the check fades under reduced motion and erases on `spring.fast.exit`; `isTextLabel` / `rowLabelBoxClass`: a node label (an avatar and a name) keeps its own box, only text trims and truncates |
| — (new) | `lib/row-index.tsx` | Local addition: `IndexedRows` + `useRowIndex`, and `useRowPosition` (`undefined` outside `IndexedRows`); `isRow` picks which children take a position (Dropdown's labels and separators don't) |
| — (new) | `lib/row-order.tsx` | Local addition, after the utegsk canary: `RowOrderContext`, `useRowOrder`, `useRowSlot` number rows in document order wherever they sit below a panel (groups, fragments, conditions); an explicit `index` wins, `RowOrderContext.Provider value={null}` takes rows out. Dropdown's panels and Table use it. Labels and separators take no number (the canary gave them one), so main's positional selection still skips them. |
| `registry/base/button.tsx` (the loading spinner) | `lib/spinner-glyph.tsx` | Button's figure-eight loading glyph as one module for Button and `Progress.Spinner`; the animation is CSS (`.spinner-glyph` in `base.css`) on `--duration-loop`, breathing in place under reduced motion |
| — (new) | `lib/date-mask.ts` | Local addition after utegsk/ui's `MaskedDateInput`: the locale's numeric date mask an editable DatePicker types into (`dateMask`, `layoutMask` / `formatMask` / `parseMask`, `editMask`, `localeDigits`, `maskGhost`); pure, tested in `test/date-mask.test.ts` |

### Styles

| Upstream | Local |
|---|---|
| `app/globals.css` §1 tokens | `tokens/colors.css`, with HEX converted to oklch. The surface ladder and shadows live in `primitives/systems/surface/surface.css`. Local additions: the `--status-*` roles (toast states), by reference to the badge palette, `--destructive` and `--brand`; ColorPicker's thumb and cursor tokens (`--picker-*`, `--shadow-picker-*`) and the composer's edge states (`--composer-edge-focus`, `--composer-edge-drop`, read by the ai kit's `Composer.Draft`), upstream's inline literals; Button's status washes (`--destructive-strong` / `--success-strong` text on `--*-wash`, `-hover`, `-active` mixes), the outline frame (`--shadow-button-outline`, `-pressed`), the Skeleton fill (`--skeleton`) and ShellCard's tray (`--sunken`, with `--radius-shell` / `--radius-pill-shell` in `tokens/radius.css`). |
| `app/globals.css` §2 theme switching | `base.css` (`color-scheme`, `--overlay`) and `surface.css` (`--shadow-N` per scheme) |
| `app/globals.css` §3 `@theme inline` | `preset.ts` `theme` |
| `app/globals.css` `--fs-*` + `@utility text-*` | `tokens/typography.css` `--text-*` and `preset.ts` `utilities` |
| `app/globals.css` §4–6 | `base.css` (plus the `.spinner-glyph` / `.spinner-breathe` classes over the spinner keyframes) |
| `registry/default/lib/springs.ts` (as CSS) | `tokens/motion.css` (plus `--duration-goo` / `--duration-goo-exit`, and `--duration-loop`, the period of pending-state loops) |

### Items

Every item goes through the same mechanical pass, so the tables below list
only what is specific to it:

- Imports rewritten: `@/lib/*` → `../../lib/*`, `@/hooks/*` →
  `../../lib/*`, `SizeProvider` from `@/lib/size-context` →
  `../../primitives/systems/sizes`, `@/lib/elevated` → `../../primitives/systems/surface`,
  `@/components/ui/scroll-area` → `../../primitives/layout/scroll-area`,
  `@/components/ui/fluid-hover-highlight` → `../../lib/fluid-hover-highlight`,
  `@/registry/radix/*` → the Base-flavor sibling, `framer-motion` →
  `motion/react`, `next/link` → a plain anchor.
- A local `interface <Item>Props` whose members are each declared on one line
  with the FF docs API-table text (modo leaves out members inherited from
  another package's typings, Base UI's included), modo TSDoc written from the FF docs page, and
  `export default <Item>`. Upstream's named exports are kept.
- Styling through tokens (root `AGENTS.md` › styling): `text-[Npx]` →
  `text-<role>[-compact]`, inline `fontVariationSettings` and `font-*` →
  `weight-*`, the hex focus-ring fallback → `ring-focus-ring` /
  `border-focus-ring`, `rounded-[Npx]` → radius tokens, literal colors →
  color tokens, `duration-80|120|160|240` and tier-length JS durations →
  `duration-<tier>` / `spring.*`, `[text-box:trim-both_cap_alphabetic]` →
  `text-trim`.
- React 18 types (`MutableRefObject` where a ref is written,
  `useRef<T | null>(null)`) and `noUncheckedIndexedAccess` guards on indexed
  reads, with no behavior change.
- FF's per-file copies of a pattern replaced by the shared helper in `lib/`:
  `useIsoLayoutEffect`, `mergeRefs` / `useMergeRefs`, `FocusRing`,
  `WeightLabel`, `useRowFocus` / `useRowGroup`, `springEnter`, `useLift`,
  `SizeScope` (`primitives/systems/sizes`) for a component's own `size`.
- Sizes on the ladder only: `size` takes `'default' | 'compact'`
  (`SizeVariant`; Button adds `icon` / `icon-compact`); upstream's legacy
  aliases are gone.

#### primitives

| Item | Upstream | Local | Specific modifications |
|---|---|---|---|
| `Elevated` | `registry/default/lib/elevated.tsx` (+ `lib/surface-context.tsx`; docs "Surfaces") | `primitives/systems/surface/index.tsx` | `.Provider` static (= `SurfaceProvider`); `useSurface`, `useLift` and `surfaceClasses` re-exported; `className`/`children` re-declared; the level through `useLift`; `surface.css` co-located (modo injects it) |
| `ScrollArea` | `registry/base/scroll-area.tsx` (docs "Scrollbars") | `primitives/layout/scroll-area/index.tsx` | the root's forwardRef element type written out as `HTMLDivElement` (the parser needs a first type argument without `<`/`,`); `viewportClassName` documented; `.Bar` static (= `ScrollBar`, still exported by name); the viewport carries `data-scroll-edges`, so `scroll-fade` reads Base UI's `--scroll-area-overflow-*` vars (scroll-aware without scroll-driven animations, e.g. Firefox) |
| `SizeProvider` | `registry/default/lib/size-context.tsx` + `app/docs/sizes/page.tsx` | `primitives/systems/sizes/index.tsx` | upstream's `SizeProvider`, moved here from the vendored context so modo documents it (sized components import it from here), its state through `useControllableState` (a controlled provider still ignores `setSize`), with the hooks, maps and types re-exported; `SizeScope` added (pins a subtree only when a `size` is given); the live demos become static examples (Select/TabsSubtle/InputGroup/CheckboxGroup/Dropdown swapped for Button/Badge/Switch/Tabs, token-inspector overlay dropped); the token table and type scale are written out rather than rendered from `sizeMap` / `typeScale` |
| `FluidHover` | `app/docs/fluid-hover/{page,demos}.tsx` over `registry/default/hooks/use-fluid-hover.ts` + `fluid-hover-highlight.tsx` | `primitives/systems/fluid-hover/index.tsx` | new container (`FluidHover` + `FluidHover.Item`) around the hook/highlight pair so examples need no hooks; `items`, `renderItem`, `disabledIndices`, `columns`, `highlightClassName` are the container's own API, `axis` and `gapClick` pass through to the hook; rows numbered through `IndexedRows`; row classes are upstream's `rowClass` with per-axis variants, the highlight on `shape.bg`; the prose describes the melting highlight; the two scripted-cursor demos are dropped |
| `Motion` | `registry/default/lib/springs.ts` + `app/docs/motion/page.tsx` | `primitives/systems/motion/index.tsx` | `Motion` is local demo code (FF ships none): it plays one tier's enter spring and exit tween on its children, adding `defaultShow`, `sameExit` and `reducedMotion`; `spring` / `exitFallbackMs` re-exported from the vendored `springs.ts`; the page names the `goo` tier and lists this port's components per tier; the ball-on-track and fake-modal visuals become show/hide of arbitrary children, the component chips plain text |
| `Morph` | — (local; see [Credits](./README.md#credits)) | `primitives/systems/morph/index.tsx` | a docs stage like `Motion`: a trigger and a panel playing one `from` × `effect` pair over `lib/use-morph.ts`; static `.Part` (= `MorphPart`); also documents the liquid indicators (`lib/goo-indicator.tsx`) |
| `Code` | — (local; FF has no code item) | `primitives/content/code/index.tsx` | sugar-high tokens colored by the `--syntax-*` tokens, one surface step above its substrate; also the docs chrome's Code slot |
| `Separator` | — (local) | `primitives/layout/separator/index.tsx` | Base UI Separator as a 1px `bg-border` hairline; `orientation` |
| `Skeleton` | — (local) | `primitives/content/skeleton/index.tsx` (+ `skeleton.css`) | a `bg-skeleton` block pulsing in opacity on `--duration-loop` (reduced motion dips half as far), on the item radius; `rows` on the control height of the size ladder, `bordered` frames them; `aria-hidden` |
| `Sortable` | — (local) | `primitives/layout/sortable/index.tsx` | motion's `Reorder`: drag by pointer (the whole item, or `Sortable.Handle` with `handle`), or by keyboard (Space lifts, arrows move, Space drops, Escape restores), announced in a live region; the held item lifts two surface steps (`useLift(2)`); `useSortableHandle(label?)` for a host's own button; `as="none"` renders role-less boxes for a host list's rows, with the live region inside the box |
| `VirtualList` | — (local) | `primitives/layout/virtual-list/index.tsx` (+ `jump-demo.tsx`, docs only) | a windowed `ul`: rows at a fixed `itemHeight` or measured by one shared ResizeObserver (`estimateHeight` until then), `overscan`; scrolls itself or follows a surrounding ScrollArea's viewport; a ref's `scrollToIndex(index, align)` and `scrollToEnd()`; `follow` re-pins a reader at the end whenever the rows or their heights change (`onFollowChange` reports letting go); `contentWidth` widens the rows for sideways scrolling |
| `Resizable` | — (local) | `primitives/layout/resizable/index.tsx` | split panes as flex-grow percentages; `Resizable.Panel` (`defaultSize`, `minSize`, `maxSize`, `collapsible`) and `Resizable.Handle`, a focusable `role="separator"` (arrows, Home / End, double-click resets) whose hairline thickens on the fast spring while held; `sizes` / `onSizesChange`; a panel tweens `flex-grow` (`duration-moderate`) to any size not set by a drag; nests |
| `Craft` | — (local; after the before/after pairs on fluidfunctionalism.com/docs/skill) | `primitives/systems/craft/index.tsx` (+ `demos.tsx`) | a docs stage: a bad and a good version side by side with a one-line verdict each; the bad sides live in `demos.tsx` and break one rule each on purpose, the good sides are this package's items; named and default export |

#### components

| Item | Upstream | Local | Specific modifications |
|---|---|---|---|
| `Accordion` | `registry/base/accordion.tsx` | `components/containers/accordion/index.tsx` | root, `Accordion.Item`, `Accordion.Trigger`; open state through `useAccordionValue` (below), so `value` alone controls (see [Behavior additions](#behavior-additions)) and `collapsible={false}` keeps one item open; standalone `Accordion` takes `highlight` and hands it to its items as their default; `AccordionItem` hands its ref to Base UI's `Item` instead of overriding the render ref (the arrow keys, Home and End threw without it); statics `.Group/.Item/.Trigger/.Content` through an `AccordionComponent` cast; prop types exported; the fixed width moved to the examples; a standalone root clears the group context, so one nested in an `Accordion.Group`'s panel keeps its own open state. `Accordion.Content` `contentClassName` (the inner row); `Accordion.Trigger` `render` / `asChild` / `nativeButton` through `slotRender` (the slot element's `id` is the one registered), `icon` (or `false`), `weightShift`; the value union takes a runtime `type`, on one controllable state. |
| — | `registry/base/accordion.tsx` | `components/containers/accordion/accordion-context.tsx` | `useAccordionValue`, one discriminated union of single and multiple values shared by the root and the group; the group, standalone and item contexts |
| — | `registry/base/accordion.tsx` | `components/containers/accordion/accordion-group.tsx` | `Accordion.Group`: the fluid hover, the `"trigger"` tint and the `FocusRing`; the highlight and ring snap with rows a morph pushes around until the pointer or focus moves |
| — | `registry/base/accordion.tsx` | `components/containers/accordion/accordion-content.tsx` | the panel morphs out of its row instead of springing its height: one progress value grows a shape (`lib/rect`) from the press point (the row's middle for a keyboard open) to the whole item, the content clips to it and the layout height follows its bottom edge; under `highlight="item"` the open tint is that shape melted into the row through `GooFilter`; `effect` / `tier`; reduced motion snaps |
| `AlertDialog` | — (local) | `components/overlays/alert-dialog/index.tsx` | Base UI AlertDialog root (always modal, no outside-press dismissal) over Dialog's own parts and `DialogState` on `useOverlayRoot`, so it morphs like Dialog; `AlertDialog.Content` takes Dialog's `width` and drops the ✕ by default; statics as Dialog's plus `.Action` (a confirm whose returned promise, or `pending`, keeps the dialog open, the button loading and every way out locked until it settles; `onError`) and `.Cancel`. `onOpenChange(open, details)` (`AlertDialogOpenChangeDetails`); the confirm closes through Base UI's `actionsRef` (reason `imperative-action`). |
| `Avatar` | — (local) | `components/data-display/avatar/index.tsx` | Base UI Avatar (the image's loading status, the fallback's delay); `.Image` fades in on the fast tier, `.Fallback`; `shape` `circle` \| `square`, `size` on the ladder; FF's 1px inset media edge |
| `Badge` | `registry/default/badge.tsx` | `components/data-display/badge/index.tsx` (+ `variants.ts`) | the cva tables in `variants.ts` (no `'use client'`, exported as `./components/data-display/badge/variants`); local `outline` variant; `variant` re-declared (it came from cva's `VariantProps` upstream); `size` is `SizeVariant` only (`sm`/`md`/`lg` gone), resolved by `useSizeVariant`; changes animate: a new label or variant springs the width (inner content span, `spring.moderate` via `springEnter`) while the label blur-crossfades, a new color fades, the dot scales in and out; "Changes" example over a local `change-demo.tsx` stage. `BadgeVariant` and `BadgeSize` live in `variants.ts` too. |
| `Breadcrumb` | — (local) | `components/navigation/breadcrumb/index.tsx` | `items` or `Breadcrumb.Item` children; one fluid hover along the crumbs; the last is `aria-current="page"`; middle crumbs that don't fit (measured in a hidden copy) fold into a Dropdown behind an ellipsis |
| `Button` | `registry/base/button.tsx` | `components/actions/button/index.tsx` (+ `variants.ts`) | the cva tables in `variants.ts` (no `'use client'`, exported as `./components/actions/button/variants`); local `outline` (a `--control-border` frame), ghost's transparent rest ring as `shadow-button-ghost` (`--shadow-button-ghost`), `destructive` and `success` (the hue's `-strong` text on a wash of itself) and `link` variants on tokens, with per-variant transition compounds; `ButtonVariant` exported; a loading button stays focusable (Base UI's `focusableWhenDisabled`, `aria-disabled` styles) and swallows clicks in the capture phase; the spinner is `lib/spinner-glyph.tsx`; `variant`/`disabled`/`children` re-declared; sizes `default`, `compact`, `icon`, `icon-compact`, plus `icon-sm` (= `icon-compact`) for modo's shell contract (`sm`/`md`/`lg`/`icon-lg` gone); `render` added beside `asChild`, both through `resolveSlotTemplate` / `slotElement` (a child's handlers chain, refs merge) instead of a private `cloneElement`; `loading` folds the surface into a circle around the spinner and back (`spring.moderate`, box unchanged), label and spinner crossfade, `aria-busy`, the disabled dim fades (`transition-[color,opacity]`); the surface's transitions read `--duration-moderate` / `--duration-fast` (upstream's easing kept); extra Sizes / Active / As-child / Loading morph examples, the last over a local `loading-demo.tsx` stage; also modo's chrome Button (`shell.Button`). The primary fill and label read the `--primary*` hooks and `--shadow-button-primary` (tokens/colors.css). `variants.ts` holds `ButtonVariant`, `ButtonSize`, `ButtonSizeCanonical` and `ButtonVariantsOptions`; `buttonVariants` is a function over the cva recipe (it resolves `icon-sm`) and takes `surface: true`, the fill, frame, hover and press as root classes for a host that is not a Button. |
| `Calendar` | — (local, on react-day-picker) | `components/inputs/date-time/calendar/index.tsx` (+ `use-month-window.ts`) | DayPicker props pass through (as shadcn's Calendar); styled through `classNames` and custom `Month` / `Day` / `DayButton` (no react-day-picker stylesheet); one scrolling list of months rendered as a 25-month window that moves as you scroll, spanning `monthRange`; a pinned weekday row, muted weekends, today's dot; FF's fills (the pick `bg-foreground text-background` like the primary button, a range `bg-active`, its preview `bg-hover`); month and year columns that mark the month being read and jump on click, before or after the days (`columnsSide`), turning into strips when narrow; `extraColumns` / `extraColumnsSide` for the date picker's time |
| `Card` | `registry/default/card.tsx` | `components/containers/card/index.tsx` | `next/link` → plain anchors (the stretched card link, `Card.Button`'s `href` form); `CardProps` documented from the FF API table (`children` re-declared); statics `.Group/.Header/.Title/.Description/.Action/.Content/.Footer/.Media/.Image/.Eyebrow/.Feature/.Button` through a `CardComponent` cast; a card with a `value` selects itself inside a selecting group; local `Card.Divider` (an `<hr>` hairline) and `border` (`outlined` frames a card outside a group). `Card.Title` `as` wraps the label in a heading or tag (the ref stays on the label span; `CardTitleProps`, `CardTitleTag`); `Card.Divider` is the Separator primitive (a `div`, `orientation`). |
| — | `registry/default/card.tsx` | `components/containers/card/card-group.tsx` | `Card.Group`: selection both ways (`value` / `defaultValue` / `onValueChange`), cards numbered through `IndexedRows`, the hairlines next to a selected card dropped |
| — | `registry/default/card.tsx` | `components/containers/card/card-parts.tsx` | the header, title, description, action, content, footer and eyebrow; `CardTitle` on `WeightLabel`; the eyebrow drops `uppercase tracking-wide` (no case or letter-spacing in the DS: the caption role, semibold, muted) |
| — | `registry/default/card.tsx` | `components/containers/card/card-media.tsx` | `Card.Media`, `Card.Image`, `Card.Feature`; `Card.Button` is a compact `Button` (Button's variants, `ghost` by default; upstream's `link` variant and `CardButtonVariant` gone) raised above the stretched overlay, `external` ending it in an outward arrow |
| `Checkbox` (upstream `CheckboxItem`), `Checkbox.Group` (upstream `CheckboxGroup`) | `registry/base/checkbox-group.tsx` | `components/inputs/checkbox/index.tsx` | renamed; the row stands alone too (own state from `defaultChecked`, `onCheckedChange`, own hover and focus ring, `size`); `disabled`, `name` and `value` on the row; rows numbered by the group (`lib/row-index.tsx`), so `index` is optional, and a disabled row keeps its index; local `indeterminate` (a minus mark, `aria-checked="mixed"`); without a `label` the row is the bare box on Base UI's root; uncontrolled mode + group-level callback, item `checked`/`onToggle` falling back to group context; the group's keys, focus ring, press focus and label from `lib/row-group.tsx`, `FocusRing`, `WeightLabel`; the unchecked border → `border-control`; shared `useSelectionRuns`, picks melt and split through the goo. `checked` takes `'indeterminate'` (`CheckboxCheckedState`). |
| `ChoiceList` | — (local) | `components/inputs/choice-list/index.tsx` | Radio.Group's row systems (fluid hover, a `GooIndicator` pick, `useRowGroup` + `FocusRing`, `focusRowOnPress`) on rows of any content and no circle; `options` (`value`, `content`, `label`, `disabled`, `actions`), `value` / `defaultValue` / `onValueChange`, `name` |
| `ColorPicker` | `registry/default/color-picker.tsx` | `components/inputs/color-picker/index.tsx` | the picker split into the modules below; `@/registry/radix/{slider,tooltip}` → the Base siblings `../slider` / `../../overlays/tooltip`; value and format through `useControllableState`; `name` submits the value through a hidden input; prop docs from the FF API tables (`className` re-declared); static `.Popover` through a `ColorPickerComponent` cast; the thumb rings, shadows and scrub cursor → `--picker-*` tokens (the colors it shows and the canvas parse sentinels stay literal: color data); `ColorPickerPortalContainer` dropped (the shared `PortalContainer` scopes it). `color-math.ts` is `variants.ts`: the server-safe `components/inputs/color-picker/variants` subpath. `ColorPicker.Popover` `disabled` / `readOnly` / `removeLabel`; its `id` and `aria-*` reach the trigger. |
| — | `registry/default/color-picker.tsx` | `components/inputs/color-picker/color-math.ts` | the color math as pure functions: parsing (hex, `rgb()`/`hsl()`/`oklch()`, any CSS color through a canvas), conversions, formatting per format; regex captures and channel parts guarded |
| — | `registry/default/color-picker.tsx` | `components/inputs/color-picker/popover.tsx` (+ `context.ts`) | `ColorPicker.Popover`: open state on `useOverlayRoot`; the trigger a bordered field box (`useFieldBox`) with the remove button beside it instead of a `role="button"` span inside it; the panel on `PopupSurface`, portalled through `usePortalContainer`, painting no surface of its own (`PanelSurfaceContext`); it morphs out of its trigger (goo on `spring.goo`; `from` / `effect` / `hideSource` / `tier`; in place with `effect="morph"` + `hideSource`), replacing the motion wrapper and the ignored `actionsRef` |
| — | `registry/default/color-picker.tsx` | `components/inputs/color-picker/format-menu.tsx` | the format menu: open state both ways (`formatOpen` / `defaultFormatOpen` / `onFormatOpenChange`), rows on `useRowFocus` / `FocusRing` / `WeightLabel`, a plain morph out of its trigger on `spring.moderate`, sideOffset 6 |
| — | `registry/default/color-picker.tsx` | `components/inputs/color-picker/{saturation-square,channel-sliders,inputs-row,color-input,swatches}.tsx` | the saturation square, hue and alpha sliders (`v[0] ?? 0` on the Slider's array value), the channel inputs row, the text and scrub inputs, the swatches and eyedropper; `itemRects[i]` reads fall back to `null` |
| `Combobox` | `registry/base/combobox.tsx` | `components/inputs/combobox/index.tsx` | root de-generified (the parser needs a plain function plus a same-file `interface ComboboxProps`): items gained an index signature, `value`/`defaultValue` are `string \| string[]` and `onValueChange` is a union of the two handler shapes; `ComboboxValue<Multiple>` still exported; `creatable` added; open state on `useOverlayRoot` (`open` / `defaultOpen` / `onOpenChange`); `name`; local `query` / `defaultQuery` / `onQueryChange` (a controlled query), `filter={null}` (the host filters, e.g. a remote search), `loading` / `loadingLabel`, `readOnly`, and `disabled` / `readOnly` / `required` from an enclosing Field (`useFieldState`); `React.*` type refs replaced by named type imports; statics `.Input/.Chips/.Content/.List/.Item/.Empty`. `labels` (`ComboboxLabels`); object items take a node `label` with `textValue`; `hideTrigger` on `Combobox.Input` / `.Chips`; `onQueryChange` gets Base UI's details. |
| — | `registry/base/combobox.tsx` | `components/inputs/combobox/context.ts` | the item helpers, the create row's sentinel and the combobox, highlight, list and row-index contexts |
| — | `registry/base/combobox.tsx` | `components/inputs/combobox/fields.tsx` | `Combobox.Input` and `Combobox.Chips` on `useFieldBox` (the ladder in the variant, `bordered` here; `error` stamps `data-invalid`, `disabled` reaches the box), the leading icon on `fieldIconClasses`; the local `fieldVariants` cva moved to `lib/field-classes.ts` and its `comboboxFieldVariants` alias dropped; the wrappers cap at their container's width |
| — | `registry/base/combobox.tsx` | `components/inputs/combobox/list.tsx` | `Combobox.Content` morphs out of the field (goo on `spring.goo`; `from` / `effect` / `hideSource` / `tier`, `side` / `align` / `sideOffset` (6) / `container`; in place with `effect="morph"` + `hideSource`) on `PopupSurface`, replacing the `scaleY` wrapper and the `actionsRef` deferred unmount; rows, check and checked background (a `GooIndicator`) match Select's, node row labels included; `footer` (a node or a function of `{ query, close }`) under the list, where a press keeps focus in the input and Tab from the open field steps in and back; the `loading` status row pinned between the list and the footer, outside the scroll; no focus ring (the input keeps focus) |
| `Command` | — (local) | `components/overlays/command/index.tsx` | Base UI Autocomplete rendered inline in Dialog's panel (`width="lg"`, `position="top"`, no ✕), morphing from its trigger with goo; grouped/flat command data filtered by label + keywords; rows on `rowClasses` / `RowIcon`; one fluid highlight follows Base UI's highlight; ⌘K/Ctrl+K `hotkey` (one palette answers a press); fresh palette per open; `Command.Content` takes `container` and rest props; statics `.Trigger/.Content/.Palette/.Shortcut`; `CommandList`/`CommandListRoot` exported for Search |
| `ContextMenu` | — (local; see [Credits](./README.md#credits)) | `components/overlays/context-menu/index.tsx` | Base UI ContextMenu (right click, long press) on Dropdown's `MenuPopup`, so its radio rows are real radio items and it has Dropdown's selection and search; the morph grows from the press point (`from="pointer"` default, goo on `spring.goo`); `ContextMenu.Item` is Dropdown's `MenuItem` (`shortcut` included), `.Label` / `.Separator` Dropdown's; `size` on the root; submenus are Dropdown's (`.Sub/.SubTrigger/.SubContent` from `dropdown/submenu.tsx`; Base UI's ContextMenu reuses `Menu.SubmenuRoot`) and `.Content keepMounted`; statics `.Trigger/.Content/.Item/.Label/.Separator/.Sub/.SubTrigger/.SubContent`. `ContextMenuItem` / `ContextMenuItemProps` alias Dropdown's row; `.Content` `initialFocus` / `finalFocus`. |
| `Dialog` | `registry/base/dialog.tsx` | `components/overlays/dialog/index.tsx` | `DialogProps` and `DialogContentProps` fully re-declared; open state (`DialogState`) on `useOverlayRoot`, also scoping `Morph.Part` pairs; `Dialog.Trigger` / `Dialog.Close` from `slotPart`; `Dialog.Content`'s `width` (`sm` / `lg` / `xl`, one notch narrower in a compact region; upstream's `size`) and `container` (`usePortalContainer`); the panel on `PopupSurface` (`lift="panel"`), morphing out of its trigger (goo on `spring.goo`; `from` / `effect` / `hideSource` / `tier`), the backdrop (`bg-scrim`) fading with the morph's progress; refs through `useMergeRefs`; statics attached by `Object.assign` on the root function, so `<Dialog.Content>` types without a cast, in `dist` too; FF's "With a sidebar" example replaced by "Surfaces inside a dialog" (written before the Sidebar was ported). `onOpenChange(open, details)` hears Base UI's details before the state changes, so `details.cancel()` keeps it (`DialogState` is generic over the details, for AlertDialog, Sheet and Command; `DialogOpenChangeDetails`); `disablePointerDismissal`; `Dialog.Content` `initialFocus` / `finalFocus` (a custom `finalFocus` turns off the morph's focus return) and `popupClassName`. |
| `Dropdown` | `registry/base/dropdown.tsx` | `components/overlays/dropdown/index.tsx` | root, `Dropdown.Menu` (open state on `useOverlayRoot`), `.Trigger` (`slotPart`), `.Content`, `.Label` / `.Separator` (`PopupLabel` / `PopupSeparator`); uncontrolled selection and search filtering (below); `.Content` takes `side` / `align` / `sideOffset` (6) through `positionerProps`; statics `.Menu/.Trigger/.Content/.Item/.Label/.Separator/.Search/.Empty/.Sub/.SubTrigger/.SubContent` through a `DropdownComponent` cast; `.Content` numbers its rows (`IndexedRows` with `isRow`), so `Dropdown.Item`'s `index` is optional, and takes `keepMounted`; `useDropdownMaybe` dropped; FF's "Create from the query" section skipped (adding a row is real consumer state). Rows number themselves through `lib/row-order` (document order, inside groups) instead of `IndexedRows`; `MenuItem` takes `children` (`label` optional), `textValue`, `inset`, `render` / `asChild`, a cancelable `onSelect(event)` and a node `shortcut`; `menu-parts.tsx` (local) adds `.Group`, `.Label` `inset`, `.CheckboxItem`, `.RadioGroup` / `.RadioItem` (string values), and value-checked rows join the merged selection background; `.Shortcut`; `.Menu` / `.Sub` `onOpenChange(open, details)` (`DropdownOpenChangeDetails`); `.Content` / `.SubContent` `initialFocus` / `finalFocus`; `.SubTrigger` takes a row's props. |
| — | `registry/base/dropdown.tsx` | `components/overlays/dropdown/panel-state.ts` | the panel's selection (`usePanelSelection`, `defaultCheckedIndex` / `defaultCheckedIndices` through `useControllableState`) and its rows under a filter (`usePanelRows`) |
| — | `registry/base/dropdown.tsx` | `components/overlays/dropdown/menu-popup.tsx` | `MenuPopup`, the popup body Dropdown and ContextMenu share: `PopupSurface`, the morph out of the trigger (goo on `spring.goo`; `from` / `effect` / `hideSource` / `tier`; in place with `effect="morph"` + `hideSource`), replacing the `scaleY` wrapper and the ignored `actionsRef`; keys and ring from `useRowGroup` / `FocusRing`; the checked background a `GooIndicator`; the first enabled row focused on open (`focusFirstRow`, Dropdown only); refs through `useMergeRefs`; rows hand activation to the Menu item's `onClick`, so Enter / Space pick; ignores events from portalled submenus, keeps an open submenu's trigger lit and passes `keepMounted` down |
| — | — (local) | `components/overlays/dropdown/submenu.tsx` | `Dropdown.Sub` / `.SubTrigger` / `.SubContent` on Base UI's `Menu.SubmenuRoot` / `Menu.SubmenuTrigger`: the trigger a `MenuItem` with a trailing chevron, the panel the shared `MenuPopup` (same rows, selection, fluid hover and morph) |
| `DatePicker`, `DateRangePicker`, `TimePicker`, `DurationPicker`, `MonthPicker` | — (local; props after shadcn's date picker and utegsk/ui's pickers) | `components/inputs/date-time/<id>/index.tsx` (+ the group's `picker-shell.tsx`, `time-columns.tsx`, `day-rules.ts`) | a field on the field ladder whose panel morphs out of it with Combobox's options (goo by default; `from` / `effect` / `hideSource` / `tier`, in place with `effect="morph"` + `hideSource`), or a bottom `Sheet` under 640px; the shell controlled, on `useOverlayRoot` and `PopupSurface`; one hour column with AM/PM on a 12-hour clock; `columnsSide` / `timeColumnsSide`; the panel header types the value in the locale's formats, blank text clears it; `value` / `defaultValue` / `onValueChange` with `null` for empty — a `Date`, react-day-picker's `DateRange`, `"HH:mm"`, a date-fns `Duration`, a month's first day; `disabled` (the field) and `disabledDays` (a react-day-picker matcher); the field reads the box's resolved invalid and disabled state, so it follows `InputGroup.Field`; `name` submits through a hidden input; the other props reach the shell; `locale` is a react-day-picker locale throughout; DatePicker's `editable` types into the field over the locale's numeric mask (`date-picker/masked-date-input.tsx`, after utegsk/ui's `MaskedDateInput`, on `lib/date-mask.ts`); DatePicker and DateRangePicker take `valueType="string"` for ISO-string values (`date-value.ts`) and `labels` for their texts; the pickers take `disabled` / `readOnly` / `required` from an enclosing Field. `locale` also takes a BCP 47 tag (`resolveLocale`). The form props (`required`, `onBlur`, `aria-*`, `controlProps`) reach the field's control; `formatDate` / `formatTime` / `formatValue` and per-picker `labels` (`TimePickerLabels`, `MonthPickerLabels`, `DurationPickerLabels`, `labels.invalid`); DateRangePicker `editable`, `withTime`, `startName` / `endName`, `startInputProps` / `endInputProps`. |
| — | `registry/default/menu-item.tsx` | `components/overlays/dropdown/menu-item.tsx` | a row with no `checked` derives it from a self-managed panel and toggles the panel's state; `sourceIndex` carries the authored index so selection survives filter re-indexing; inside a popup the activation travels as the primitive's `onClick` (Base UI's Enter / Space call only that); `shortcut` (display only); the row on `rowClasses` / `RowIcon` / `WeightLabel` / `CheckMark` and `POPUP_SHAPE` (`menuShape` dropped) |
| — | `registry/default/dropdown-search.tsx` | `components/overlays/dropdown/dropdown-search.tsx` | `filter` mode: `value`/`onValueChange` optional, the field reads and writes the query held by the panel (`DropdownFilterContext`), which filters the rows itself; `Dropdown.Empty`; the narration became TSDoc |
| `Copy` (upstream `InputCopy`) | `registry/default/input-copy.tsx` | `components/actions/copy/index.tsx` | renamed (`InputCopy*` → `Copy*`), out of the inputs group; `@/registry/radix/tooltip` → `../overlays/tooltip`, held open through its `open`; defaults spelled into the prop prose, `className` re-declared; the tooltip comment's "Radix" reads "Base UI"; the copied state morphs: the glyph's two sheets melt through `GooFilter` into a status-tinted disc behind the check (✕ on failure) and split back, its geometry through `lib/rect`, the glyphs crossfading in one slot. `chip` and `glyph` variants (a live region announces the result), `labels` (`CopyLabels`); `CopyProps` is a union on `variant`. |
| `EmptyState` | — (local) | `components/feedback/empty-state/index.tsx` | icon tile, title, description and actions, centered; `size` on the ladder, the actions follow it |
| `Input`, `InputGroup` | `registry/default/input-group.tsx` | `components/inputs/input/index.tsx` | `InputField` split into `Input` (the box, standalone: own hover outside a group, `invalid`, `size`, ref on the `<input>`) and `Label` (its own item below, imported from `../label` and re-exported), composed back by `InputGroup.Field`; local `readOnly`, `required`, `startAdornment` / `endAdornment` (`fieldAdornmentClasses`), `InputAction` (an icon button inside the box on `FIELD_ACTION`) and `InputAdornment`; a `type` swap (a password reveal) keeps the caret and selection; item renamed `input`, `Input` the default export; `value` / `defaultValue` / `onValueChange` through `useControllableState` (the native `onChange` / `defaultValue` omitted); the box is `useFieldBox` + `focusControlOnPress` (`variant`: `borderless` default, `bordered`), an invalid field keeps its ring at rest; the field's state (`FieldStateContext`) carries error and disabled, so `InputGroup.Field` takes children in place of its Input (a Textarea, a picker); `InputGroup` numbers its fields (`IndexedRows`), so `index` is optional; static `.Field` |
| `Kbd` | — (local) | `components/data-display/kbd/index.tsx` | `outline` (a keycap chip in `text-micro`) or `plain` (Dropdown's row-shortcut text); `size` on the ladder |
| `KeyValue` | — (local) | `components/inputs/key-value/index.tsx` | rows of two monospace `Input`s; a `secret` value masks behind an `InputAction` reveal; a key used twice turns both keys invalid and is named under the list; `value` / `defaultValue` / `onValueChange` hand back the whole array |
| `Label` | `registry/default/input-group.tsx` (inside `InputField`) | `components/inputs/label/index.tsx` | split out as a plain `<label>`, its own item (through `Field.Label` in a field); lined up by `fieldTextInset`; `invalid`, `size`; dims under `data-disabled` |
| `Field` | — (local) | `components/inputs/field/index.tsx` | Base UI Field, no form library: `.Label`, `.Description`, `.Error` (`match`), `.Control` lined up by `fieldTextInset`; hands `invalid` / `disabled` / `readOnly` / `required` to the control inside through `FieldStateContext` (Input, Textarea, NumberInput, Select, Combobox, the pickers, FileDropzone; the control's own prop wins); `validationMode`, `name`, `size` |
| `FileDropzone`, `FileRow` | — (local) | `components/inputs/file-dropzone/index.tsx` (+ `file-row.tsx`, `variants.ts`) | a label around a visually hidden file input joined to Base UI's Field; hands picked files over and keeps none; drag verdicts (`dragVerdict`) restyle the dashed zone; rejections (`accept`, `maxSize`, `maxFiles`) reported through `onFilesRejected` and announced; `FileDropzone.Row` (`FileRow`) for a picked or uploading file, its progress on `Progress` / `Progress.Spinner`; the pure helpers (`acceptsFile`, `dragVerdict`, `formatFileSize`, `sortFiles`) in `variants.ts` without `'use client'`, tested in `test/file-dropzone.test.ts`; reads an enclosing Field. `style` on the root. |
| `InputMessage` | `registry/default/input-message.tsx` | moved to the ai kit: `kits/ai/blocks/conversation/composer/draft.tsx` (`Composer.Draft`) | renamed `ComposerDraft` (types `ComposerDraftProps`, `DraftStatus`, `DraftSlotContext`), documented by Composer, its data attributes `data-composer-draft` / `data-draft-queue`; imports modo-ui through its package exports; uncontrolled twins for value, files, queue and status (below); the hover, focus and drag edges drawn in `draft.css` (folded into the kit's `styles.css`) from data attributes (tokens `--composer-edge-*`) instead of an inline `box-shadow`; on `useAutosizeTextarea`, `useReduceMotion`, `useTouchPrimary`, `SizeScope`; guards on `queue[0]`, `history[i]`, `suggestions[i]` and the `moveQueued` swap; a History example; FF's Playground section skipped and the transcript around the Attachments / Send Handler demos dropped (`ChatMessage` is not ported); upstream narration trimmed |
| — | `registry/default/input-message.tsx` | `kits/ai/blocks/conversation/composer/{file-preview-tile,queued-row,suggestion-row}.tsx` | the composer's rows; `FilePreviewTile` is a `forwardRef` (it exits inside `<AnimatePresence mode="popLayout">`, which measures through a ref; React 18 drops a plain `ref` prop) |
| — | `registry/default/input-message.tsx` | `kits/ai/blocks/conversation/composer/{use-composer-files,use-message-queue,use-history-nav,use-region-height}.ts`, `shared.ts` | the composer's file list, queue, history navigation and region height as hooks; `caretToEnd` |
| — | `registry/default/file-thumbnail.tsx` | `kits/ai/blocks/conversation/composer/file-thumbnail.tsx` (exported by Composer) | `pdfjs-dist` is an optional peer (of the ai kit): a failed lazy import warns once and the thumbnail falls back to the file icon; the worker still comes from jsDelivr; the pdfjs helpers are module-private; the `@next/next/no-img-element` eslint-disable dropped |
| `List` | — (local) | `components/data-display/list/index.tsx` | a settings list: `List.Section` (`title`, `aside`) over `List.Row`s (`label`, `description`, the control as children) on one control height; `LIST_POPOVER`, `LIST_SWITCH` class strings |
| `Meter` | — (local) | `components/feedback/meter/index.tsx` | Base UI Meter; `bar` / `line` / `ring`; the bar's fill slides with `translateX` like Progress's; `warnAt` / `errorAt` or `tone` pick the status hue; `marker` ticks a share; the ring's SVG fills its root (a size class scales it), `children` centred over it (a string one is `getAriaValueText`), `animate={false}` drops the spring (+ `timer-demo.tsx`, docs only) |
| `NavigationMenu` | — (local) | `components/navigation/navigation-menu/index.tsx` (+ `list.tsx`, `item.tsx`, `trigger.tsx`, `content.tsx`, `link.tsx`, `context.ts`, `use-dom-rows.ts`) | Base UI NavigationMenu: one shared panel morphs out of the open trigger and springs between panels' sizes while content slides in from that side; one fluid hover highlight and a liquid marker under the open item or the active link; panel rows follow popup rows (`POPUP_SHAPE`, one ring, keyboard only); 6px below the strip; open item `value` / `defaultValue` / `onValueChange`; `Link` takes `icon` / `description` in a panel and a router link as `render`; statics `.List/.Item/.Trigger/.Content/.Link`. `NavigationMenu.Indicator` (`indicator.tsx`) claims the list's liquid marker through `ListMarkerContext` and fills it with `className`. |
| `NumberInput` | — (local) | `components/inputs/number-input/index.tsx` | Base UI NumberField on `useFieldBox`; the steppers are field actions side by side (`FIELD_ACTION_BOX` / `FIELD_ACTION_END`); `format` / `locale` (Intl), `min` / `max` / `step` (+ `smallStep` / `largeStep`), `scrub`, `wheel`, adornments; `value` is `number \| null`, kept by Base UI; reads an enclosing Field. `onValueChange` gets Base UI's details. |
| `Pagination` | — (local; the Pagination template in the `modo-ui` skill) | `components/navigation/pagination/index.tsx` | the current page a `GooIndicator`, one fluid hover highlight along the strip; `count` and `value` / `defaultValue` / `onValueChange`; `siblings`, `edges` (first / last), `variant="input"` (a jump-to-page field, for tables), `disabled`, every label as a prop |
| `Popover` | — (local; after beUI's gooey popover and motion-primitives' morphing popover, see [Credits](./README.md#credits)) | `components/overlays/popover/index.tsx` | Base UI Popover on `useOverlayRoot`, `positionerProps` and `PopupSurface`, with the morph layer (goo by default); `.Content` takes `anchor` (also the morph's source), `alignOffset`, `collisionPadding` / `collisionBoundary` / `collisionAvoidance`, `initialFocus` / `finalFocus`; `onOpenChange` gets Base UI's details (`cancel()`); `openOnHover` on the trigger; statics `.Trigger/.Content/.Title/.Description/.Close` |
| `PreviewCard` | — (local; after beUI's gooey popover, see [Credits](./README.md#credits)) | `components/overlays/preview-card/index.tsx` | Base UI PreviewCard on `useOverlayRoot`, `positionerProps` and `PopupSurface`, with the morph layer (goo from the link on `spring.goo`); `delay` / `closeDelay` / `render` on the trigger, a token-styled link by default; `from` without `'pointer'`; statics `.Trigger/.Content` |
| `Progress` | — (local) | `components/feedback/progress/index.tsx` (+ `progress.css`) | Base UI Progress: the determinate fill a full-width bar slid in with `translateX` on `spring.moderate` (after FF's CarouselDots fill); `value={null}` sweeps a segment on `--duration-loop`; `label`, `showValue`, `format`; `.Spinner` (`Spinner`) is `lib/spinner-glyph.tsx` |
| `Radio` (upstream `RadioItem`), `Radio.Group` (upstream `RadioGroup`) | `registry/base/radio-group.tsx` | `components/inputs/radio/index.tsx` | renamed; rows numbered by the group (`lib/row-index.tsx`), so `index` is optional, and a disabled row keeps its index; uncontrolled index and value modes, value mode decided from the props and the rows' values (so `onValueChange` alone reports picks); group context carries a `selectIndex` setter every item calls, so items need no `selected`/`onSelect`; `name` and `disabled` on the group, `size` and `disabled` on the rows; without a `label` a row is the bare radio, and a group with no labelled rows renders Base UI's RadioGroup alone, for a layout of your own; keys, ring and label from `lib/row-group.tsx`, `FocusRing`, `WeightLabel`; the unchecked border → `border-control`; selected background is a `GooIndicator`. `label` takes any node (named through `aria-labelledby`). |
| `Search` | — (local; after beUI's morphing search, see [Credits](./README.md#credits)) | `components/inputs/search/index.tsx` | pill or icon button springing its own width in place (`spring.slow`), growing over its neighbors (`align`); with `items`, Autocomplete suggestions ooze out of the field via the morph layer (goo on `spring.goo`, `effect`/`tier`) on `PopupSurface` 6px below, with Command's rows; Escape closes → clears → collapses; blur collapses when empty; `shortcut`, `size`, `container`; `<search>` landmark + form, `onSubmit` |
| `Select` | `registry/base/select.tsx` | `components/inputs/select/index.tsx` | members re-declared one per line; value through `useControllableState`, open state on `useOverlayRoot` (`open` / `defaultOpen` / `onOpenChange`; a pick holds it open for a 300ms acknowledgment); `name`; Base UI's `items` collected from the children, so the trigger labels an initial value before the popup mounts; the trigger on `useFieldBox` (`triggerVariants` dropped) with its own `:focus-visible` ring; `Select.Content` takes `side` / `align` / `sideOffset` (6) / `container` and morphs out of the trigger (goo on `spring.goo`; `from` / `effect` / `hideSource` / `tier`; in place with `effect="morph"` + `hideSource`) on `PopupSurface`, replacing the `scaleY` wrapper and the `actionsRef` deferred unmount; rows from `lib/popup-rows.tsx` with `useRowFocus` + `FocusRing`; the checked background a `GooIndicator` placed from the rows (no DOM scan); `Select.Group` is Base UI's; rows number themselves in document order, so `index` is optional; local `Select.Value` (trigger children), node row labels with `textValue`, `readOnly`, and `disabled` / `readOnly` / `required` from an enclosing Field; statics `.Trigger/.Value/.Content/.Item/.Group/.Label/.Separator` through `Object.assign` (the root moved below its parts). `onOpenChange(open, details)` (`SelectOpenChangeDetails`, `cancel()`; after a pick it is reported once the acknowledgment ends); `Select.Trigger` `render` / `asChild` (the element brings its own look) and `wrapperClassName`; `Select.Value` forwards its ref; `Select.Content` `finalFocus`. |
| `Sheet` | — (local; replaces beUI's bottom sheet and drawer, see [Credits](./README.md#credits)) | `components/overlays/sheet/index.tsx` | Base UI Drawer (swipe to dismiss, snap points, `Drawer.Viewport` for the swipe) with the morph growing from the sheet's own edge; a swipe-dismissed sheet slides on off its edge from the release point (the morph's `exit`); `side`, `snapPoints`, `defaultSnapPoint`; Dialog's parts and `DialogState` on `useOverlayRoot` (Base UI's Drawer parts are Dialog's), the panel on `PopupSurface`; statics as Dialog's plus `.Provider` / `.Indent`. `onOpenChange(open, details)` (`SheetOpenChangeDetails`); `disablePointerDismissal`; `Sheet.Content` `side`, `initialFocus` / `finalFocus`, `popupClassName`. |
| `Sidebar` | `registry/base/sidebar.tsx` | `components/navigation/sidebar/index.tsx` | the root and `Sidebar.Content`; the mobile sheet is the DS's `Sheet` (goo from its edge, swipe to dismiss) instead of a Dialog with a framer slide, its held-open exit and its `bg-black` scrim; `SidebarProps` one member per line; uncontrolled selection: `value` / `defaultValue` / `onValueChange` hold the row a menu button's `value` selects (`SidebarSelection`); statics `.Provider/.Trigger/.Rail/.Inset/.Input/.Header/.Content/.Footer/.Separator/.Group/.GroupLabel/.GroupAction/.GroupActions/.GroupContent/.Menu/.MenuItem/.MenuButton/.MenuAction/.MenuActions/.MenuBadge/.MenuSkeleton/.MenuSub/.MenuSubItem/.MenuSubButton` through a `SidebarComponent` cast; upstream's named re-exports kept |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-context.tsx` | the constants, `SidebarContext` / `useSidebar` and the default toggle key per side |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-provider.tsx` | `Sidebar.Provider`: open state through `useControllableState` (a provider with only `onOpenChange` opens and closes); no collapsed peek: `openOnHover` opens the sidebar in flow while the pointer is between its edge and the far side of a trigger beside it; `shortcutScope` |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-shortcut.tsx` | the bare `[` / `]` toggle: one mounted provider answers a key, keyed and deterministic (`shortcutScope` `'nearest'` or `'page'`); `ShortcutKbd` |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-shell.tsx` | the panel, its width springs and drag resize; a collapsed rail panel is `inert` (its rows stayed tab stops while clipped away) |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-rail.tsx` | `Sidebar.Trigger` (a ghost `Button`; with `openOnHover` it switches between open and on hover, the `panel-*-dashed` glyph) and `Sidebar.Rail` (collapses or resizes the hover without keeping it open; its tooltip held through `open`) |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-group.tsx` | `Sidebar.Group` (collapsible, open state through `useControllableState`, a folded group `inert`), `.GroupLabel`, `.GroupAction(s)`, `.GroupContent`; parts on the shared slot |
| — | `registry/default/sidebar-core.tsx` | `components/navigation/sidebar/sidebar-parts.tsx` | `Sidebar.Inset`, `.Header`, `.Footer`, `.Separator`; `Sidebar.Input` on the shared field ladder (`lib/field-classes.ts`) |
| — | `registry/default/sidebar-core.tsx` + `sidebar-menu.tsx` | `components/navigation/sidebar/use-measured-collapse.ts` | the fold of a group or sub-menu to its measured height, never `auto` (motion measures wrong under a scaled ancestor) |
| — | `registry/default/sidebar-menu.tsx` | `components/navigation/sidebar/menu-scope.tsx` | a menu's scope: the fluid hover (the liquid `FluidHoverHighlight`), the `FocusRing`, the active row backgrounds as `GooIndicator`s (a new selection melts across), `SidebarSelection`, the action gutter |
| — | `registry/default/sidebar-menu.tsx` | `components/navigation/sidebar/sidebar-menu-item.tsx` | `Sidebar.Menu`, `.MenuItem` (`collapsible`: its sub-menu's `open` / `defaultOpen` / `onOpenChange`, so its button toggles it with `aria-expanded` and the docs' chevron; FF's docs held that state in the page), `.MenuSubItem` |
| — | `registry/default/sidebar-menu.tsx` | `components/navigation/sidebar/sidebar-menu-button.tsx` | `Sidebar.MenuButton`: a button with a `value` is active while it matches the selection, and pressing it selects it (`status="active"` then keeps only its dot); `size` on the ladder (upstream's `sm` / `lg` gone); the shared slot |
| — | `registry/default/sidebar-menu.tsx` | `components/navigation/sidebar/sidebar-menu-sub.tsx` | `Sidebar.MenuSub` (follows a collapsible item without its own `open`; `inert` while folded) and `.MenuSubButton` (`size` on the ladder, upstream's `sm` / `md` gone) |
| — | `registry/default/sidebar-menu.tsx` | `components/navigation/sidebar/sidebar-menu-actions.tsx` | `Sidebar.MenuAction(s)`, `.MenuBadge`, `.MenuSkeleton` |
| — | `registry/default/sidebar-menu.tsx` | `components/navigation/sidebar/row-label.tsx` | a row's label on `WeightLabel`, its element children (dots, counts) outside the trimmed text box |
| — | `app/globals.css` `.scroll-divider` | `components/navigation/sidebar/sidebar.css` | unchanged; modo injects it beside the Sidebar |
| `Slider` | `registry/base/slider.tsx` | `components/inputs/slider/index.tsx` | the public wrapper over two engines (modules below): `value` / `defaultValue` / `onValueChange` through `useControllableState` (fallback: the lowest of `steps`, else `min`, else 0), the engines still fully controlled; `name` forwarded to Base UI; a prop only the compact engine implements (`COMPACT_ONLY`) selects it; `SliderProps extends Omit<SliderEngineProps, "value" \| "onValueChange">`, the track-styling props still inherited; the `SliderComfortable` export dropped |
| — | `registry/base/slider.tsx` | `components/inputs/slider/{compact,comfortable}.tsx` | the two engines; `var(--color-accent)` → `var(--accent)` (no `--color-*` aliases here); indexed reads of the value/step/pip arrays and the ResizeObserver entry asserted |
| — | `registry/base/slider.tsx` | `components/inputs/slider/value-display.tsx`, `geometry.ts` | the value bubble, display and tooltips; `snapValue`, `layoutX`, `useDelayedFlag` and the track constants |
| `StatusDot` | — (local) | `components/feedback/status-dot/index.tsx` | six run states: `running` is `lib/spinner-glyph.tsx`, the rest dots in their hue; `statusGlyph(status)` (`StatusDot.glyph`) for an icon slot |
| `Diff` | — (local) | `components/data-display/diff/index.tsx` | `parsePatch` reads a unified patch (file headers skipped); add / remove rows on `bg-status-*/16`, hunks on `bg-hover`; `path` header with counts and `actions`; `lineNumbers`, `wrap` (else a horizontal ScrollArea); `useLift(1)` like Code |
| `Markdown` | — (local) | `components/data-display/markdown/index.tsx` | marked's `Lexer` → React, as the lib's `runtime/markdown.tsx` (no raw HTML); fences on Code, tables on Table, task boxes; `streaming` settles an odd fence, a marker-only last line and an open code span or bold run; `Markdown.Prose` is the column alone |
| `LogView` | — (local) | `components/data-display/log-view/index.tsx` (+ `stream-demo.tsx`, docs only) | `parseAnsi`: SGR 0–4, 22–24, 39 and the 16 colors onto syntax / status classes, other CSI dropped; prompt lines; rows on `VirtualList` (`itemHeight` from a probe unless `wrap`, `follow`, `contentWidth` for the widest line); sticky line-number gutter; jump-to-latest through `scrollToEnd()` |
| `Tree` | — (local) | `components/navigation/tree/index.tsx` | a WAI-ARIA tree (arrows, Home / End, Enter / Space, typeahead); one `useFluidHover` across levels (rows in closed branches disabled), the selection a `GooIndicator` and the ring `lib/focus-ring`, both snapping when a fold reflows them; branches fold on a measured height (a nested fold snaps); labels are `WeightLabel`s |
| `EditableText` | — (local) | `components/inputs/editable-text/index.tsx` | a borderless `useFieldBox` around a button that becomes an input (double-click, Enter / F2, the hover pencil); an invisible copy sizes the box to the draft; Enter / blur commit, Escape restores |
| `Lightbox` | — (local) | `components/overlays/lightbox/index.tsx` | Base UI Dialog; `useMorph` (`effect: 'morph'`, `hideSource`) on the image box, the image scaled from the thumbnail's box on the morph's progress; stepping swaps the thumbnail it closes into; swipe, arrow keys, click-to-zoom; `value` (the open index, `null` closed) |
| `ShellCard` | — (local) | `blocks/shell-card/index.tsx` | a `bg-sunken` tray (`ring-inset ring-border`) or, `variant="elevated"`, `useLift(2)` with `shadow-surface-3`; `ShellCard.Inner` (+2, `shadow-surface-2`), `ShellCard.Footer`; corners `rounded-shell|pill-shell` |
| `DesktopShell` | — (local) | `blocks/desktop-shell/index.tsx` | a `data-tauri-drag-region` title bar (traffic-light room on `mac`, stand-in controls with `showControls`) or `titleBar="card"`; the left `Sidebar.Provider` (`mobileBreakpoint={0}`, `persist={false}`); the main card and the side pane on `Resizable` (controlled sizes: the toggle, `]` via `useSidebarShortcut`, a drag below half its minimum folds); the pane takes the card's place under 768px of window width |
| `Switch` | `registry/base/switch.tsx` | `components/inputs/switch/index.tsx` | `checked` / `defaultChecked` / `onCheckedChange` through `useControllableState`, `onToggle` optional and fired as upstream; every in-body read goes through the resolved `isChecked` and a `toggle()`; the Root's `onCheckedChange` dropped (Base UI's keyboard activation re-clicks the hidden input, which already reaches the row, so both toggled twice); `name` and `value` forwarded; the thumb is a `GooIndicator` in Base UI's Thumb (stretches as it travels), dragged x held in state; local `description` (muted line, `aria-describedby`) and `trackSide`; without a `label` the bare track; local `Switch.Group`: switches as settings rows (track at the end) in one outlined fieldset, after an outlined `Card.Group` (shared hairlines dropped around the fluid hover highlight), rows numbered by the group; `SizeScope` |
| `Table` | `registry/default/table.tsx` | `components/data-display/table/index.tsx` (+ `context.ts`, `parts.tsx`, `head.tsx`) | split into the root, its context, the parts and the head; local `Table.Footer`, `.Caption`, `.Empty` (one row across `colSpan`); a `Table.Head` with a `value` sorts through the root's `sort` / `defaultSort` / `onSortChange` (the `arrow-up-down` glyph); `stacked` turns rows into container-query cards, each `Table.Cell` captioned by its `label`; the header's border melts away only on header rows; `Table.Body` numbers its rows (`IndexedRows`): a row outside it is a header row, `index` an optional override; handlers spread, `SizeScope`, refs merged, one cell-padding helper; the square highlight documented as deliberate; statics `.Header/.Body/.Footer/.Row/.Head/.Cell/.Caption/.Empty` through a `TableComponent` cast; `TableProps`, `TableRowProps`, `TableHeadProps`, `TableCellProps`, `TableEmptyProps`, `TableSort`, `SortDirection` exported. Body rows number through `lib/row-order` from the root, across bodies (header and footer opt out; `RowOrderContext value={null}` takes a row out); `containerClassName`; `stacked={false}` on `Table.Header` / `Table.Row` (`StackedContext`). |
| `Tabs` | `registry/base/tabs.tsx` + `registry/base/tabs-subtle.tsx` | `components/navigation/tabs/index.tsx` (+ `list.tsx`, `item.tsx`, `context.ts`) | FF's Tabs and TabsSubtle in one item: `variant="segmented"` (upstream Tabs) or `"subtle"` (upstream TabsSubtle: manual activation, `activeLabel`); one value API (`value` / `defaultValue` / `onValueChange` through `useControllableState`; upstream's `selectedIndex` / `defaultSelectedIndex` / `onSelect` and TabsSubtle's `idPrefix` dropped); one list engine: indicator and hover pill are `GooIndicator`s (the hover pill returns to the selected tab as it fades), the `FocusRing`, `IndexedRows`, `WeightLabel`; the list caps at its container's width and scrolls sideways past it; local link tabs (`Tabs.Item` `href`, or a router link as `render`; `activateOnFocus` off for them); statics `.List/.Item/.Panel`. `Tabs.Item` `label` takes any node. |
| `Textarea` | — (local; Input's multi-line twin) | `components/inputs/textarea/index.tsx` | Base UI `Field.Control` rendered as a `<textarea>`; the field ladder from `lib/field-classes.ts`; padding sized so one row matches the control height; grows from `minRows` to `maxRows` (`useAutosizeTextarea`), then scrolls; `value` / `defaultValue` / `onValueChange`; `readOnly`, `required` |
| `ThinkingIndicator` | `registry/default/thinking-indicator.tsx` | folded into the ai kit's `Message.Working`: `kits/ai/components/conversation/message/working.tsx` | only the local goo look survives (three dots merging and splitting through `GooFilter`, beside the cycling word in the muted color, at the compact step); upstream's shimmer look, its `.shimmer-text` rule and the `variant` / `showIcon` / `size` props dropped; the word swap, the reserved width of the longest word, the one static "Thinking…" announcement and the reduced-motion stills kept; the label sits flush (no `px-3 py-2`) |
| `Toast` | — (local; after Sileo, see [Credits](./README.md#credits)) | `components/overlays/toast/index.tsx` | Base UI Toast (queue, timers, swipe, announcements) with Sileo's pill melting into a body through the shared `GooFilter`; autopilot expand/collapse, six states on the `--status-*` tokens, promise toasts; every glyph from the icon context; the lift through `useLift`; `Toast` is the provider + viewport, `Toast.Trigger` shows one, `useToast()` the imperative API; `manager.ts`: `toastApi` shared by `useToast()` and a global `toast` that works outside React once a `Toast manager={toast}` is mounted (earlier calls queue, server calls drop). `Toast.Close` (`ToastClose`); node `title` / `description` / `action`, `icon`, `onClose`; `toast.dismiss` / `useToast().dismiss` alias `close`. |
| `Tooltip` | `registry/base/tooltip.tsx` | `components/overlays/tooltip/index.tsx` | `className`/`children` docs filled in; open state on `useOverlayRoot` (`open` / `defaultOpen`; upstream's `forceOpen`); `align` and `container` through `positionerProps` / `usePortalContainer`; statics `.Provider` / `.PortalContainer` (the shared `PortalContainer`, scoping every overlay); the slide + fade replaced by the morph layer (goo from the trigger on `spring.goo`, `from` / `effect` / `tier`; `followCursor` tooltips fade); a hand-off between grouped tooltips skips the morph (Base UI's `data-instant`); local compound parts `.Trigger` / `.Content` (`render` / `asChild`, the rest props reach the popup) beside the `content` prop. `delay` (Base UI's name) on `Tooltip` and `Tooltip.Provider`, over `delayDuration`. |

#### blocks

| Item | Upstream | Local | Specific modifications |
|---|---|---|---|
| `SidebarApp` | the app-sidebar.tsx and page.tsx FF's preset generator emits for `sa1FQfCxH6` (`lib/preset/sidebar-install.ts` @ `c367a0d066bc10e663b3d269bc40539ea8417b25`, later than the pin: the generator postdates it) | `blocks/sidebar-app/index.tsx` (+ `nav-data.ts`) | the selected thread rides `Sidebar`'s `value` and shows in the topbar; the switcher keeps its own pick (`defaultCheckedIndex`); the footer's raw icon buttons are the ghost `Button`; `variant`, `side`, `openOnHover`, `contained` props; `children` for the main area, else a placeholder thread page (`thread-page.tsx`, local); a named `SidebarApp` export beside the default, and `SidebarSearchField` / `SidebarInsetTopbar` exported for other shells (the ai kit) |
| — | `registry/blocks/sidebar-workspace-header.tsx` | `blocks/sidebar-app/workspace-header.tsx` | `defaultCheckedIndex` passed through, so the switcher keeps its own pick; the peek-only trigger over the tile dropped |
| — | `registry/blocks/sidebar-user-footer.tsx` | `blocks/sidebar-app/user-footer.tsx` | Mechanical only |
| — | `registry/blocks/sidebar-app/search-field.tsx` | `blocks/sidebar-app/search-field.tsx` | Mechanical only |
| — | `registry/blocks/sidebar-app/inset-topbar.tsx` | `blocks/sidebar-app/inset-topbar.tsx` | the trigger's peek-time fade dropped (the sidebar opens on hover in flow, so the trigger stays) |
| — | `registry/default/lib/sidebar-menu-grid.ts` | `blocks/sidebar-app/menu-grid.ts` | the width reads `--anchor-width` only; the `-ml-1` shift dropped (it would move the morph surface's content off its background) |

`Select` in `docs/chrome.tsx` is not an item: modo's docs chrome hands its
Select slot a flat `value` / `onValueChange` / `options` contract
(`SelectSlotProps` from `@justanarthur/modo`), and this adapter maps it onto
`Select.Trigger` / `Select.Content` / `Select.Item` (an option's `group` onto
`Select.Group` + `Select.Label`) so the chrome runs on the
design system's own Select. The `components/inputs/select` item keeps its
compound API. The file's other adapters take their props types from the same
package (`IconSlotProps`, `SidebarSlotProps`, `SidebarItemProps`, `SidebarSectionProps`).

`DocsNav` in `docs/chrome.tsx` is the chrome's Sidebar slot, pinned as
`shell.Sidebar` (by name alone modo would adopt the documented `Sidebar`, an
app shell that needs its provider). Each aside is an inset `Sidebar` with its
own provider, and `docs/chrome.css` turns the content between them into the inset
card (the lib's grid columns become `auto`, so they follow the sidebars' width
springs). Each provider has `openOnHover`, and its `Sidebar.Trigger` sits in
the card's corner: the trigger, `[` for the nav and `]` for the panel, switch
a side between open and on hover, and on hover it opens once the pointer is
in the column under the trigger (so a browser's own edge hover sidebar stays
out of the way). Its providers take `shortcutScope="page"`, so they answer
those keys from the page, and a demo sidebar in the content keeps them only
while it has focus. Below md each side is a drawer; the panel starts on hover
below xl. A section of links is a collapsible `Sidebar.Group` with one
`Sidebar.Menu`, so the current page, the TOC's current heading and the hover
highlight melt from link to link; a panel section (Theme) keeps its control
under the group label.

`ThemeSwitcher` in `docs/chrome.tsx` is not an item either: it is the `Theme` entry in
`modo.config.ts` `panel.items`, a `Select` of Light / Dark / System (each row
with its icon, the trigger showing the active one) that reads and sets
`window.__uiTheme` and re-reads it on `ui:themechange`. All switching logic lives in the pre-paint controller
described under **Tailwind → UnoCSS**, so the control holds no theme state of
its own. `demo/scripts/run-design-systems.ts` appends its own `Switcher` panel
item to whatever a design system declares, so both show up under the runner.

## Tier mapping

The tiers mirror the FF docs navigation. FF's "System" pages become
`primitives/`; its "Components" become `components/`. Its sidebar preset
becomes the one block.

| Tier | Item | Upstream source | FF docs page |
|---|---|---|---|
| primitives | `surface` (Elevated, `.Provider`, `useSurface`) | `lib/elevated.tsx` + `lib/surface-context.tsx` | surfaces |
| primitives | `scroll-area` (ScrollArea) | `base/scroll-area.tsx` | scrollbars |
| primitives | `sizes` (SizeProvider) | `lib/size-context.tsx` | sizes |
| primitives | `fluid-hover` (FluidHover) | `hooks/use-fluid-hover.ts` + `fluid-hover-highlight.tsx` | fluid-hover |
| primitives | `motion` (Motion) | `lib/springs.ts` | motion |
| primitives | `code` (Code) | — (local, sugar-high) | — |
| primitives | `morph` (Morph) | — (local, `lib/use-morph.ts`) | — |
| primitives | `separator` (Separator), `skeleton` (Skeleton) | — (local) | — |
| primitives | `sortable` (Sortable), `virtual-list` (VirtualList), `resizable` (Resizable) | — (local) | — |
| primitives | `craft` (Craft) | — (local, bad/good pairs) | skill (before/after) |
| components | accordion, button, combobox, dialog, dropdown, select, slider, switch, tooltip | `registry/base/<id>.tsx` | same slug |
| components | `tabs` (Tabs, `variant` `segmented` \| `subtle`) | `registry/base/tabs.tsx` + `tabs-subtle.tsx` | tabs, tabs-subtle |
| components | `checkbox` (Checkbox, `.Group`), `radio` (Radio, `.Group`) | `registry/base/checkbox-group.tsx`, `radio-group.tsx` | checkbox-group, radio-group |
| components | badge, card, color-picker, table | `registry/default/<id>.tsx` | same slug |
| ai kit | `blocks/composer` (input-message as `Composer.Draft`), `components/message` (thinking-indicator as `Message.Working`) | `registry/default/<id>.tsx` | input-message, thinking-indicator |
| components | `copy` (Copy) | `registry/default/input-copy.tsx` | input-copy |
| components | `input` (Input, InputGroup) | `registry/default/input-group.tsx` | input-group |
| components | alert-dialog, command, context-menu, popover, preview-card, search, sheet, toast | — (local, see [Credits](./README.md#credits)) | — |
| components | calendar, date-picker, date-range-picker, time-picker, duration-picker, month-picker (group `inputs/date-time`) | — (local, on react-day-picker) | — |
| components | avatar, field, file-dropzone, navigation-menu, number-input, pagination, progress | — (local) | — |
| components | breadcrumb, choice-list, empty-state, kbd, key-value, list, meter, status-dot | — (local) | — |
| components | diff, editable-text, lightbox, log-view, markdown, tree | — (local) | — |
| components | `label` (Label) | `registry/default/input-group.tsx` | input-group |
| components | sidebar | `base/sidebar.tsx` + `default/sidebar-core.tsx` + `default/sidebar-menu.tsx` | sidebar |
| blocks | `shell-card` (ShellCard), `desktop-shell` (DesktopShell) | — (local) | — |
| blocks | `sidebar-app` (SidebarApp) | the preset generator's output + `blocks/sidebar-*` | sidebar, preset `sa1FQfCxH6` |

Button lives in `components/` to mirror the FF docs, and `modo.config.ts`
points `shell.Button` at it explicitly (an explicit path skips modo's tier
check). The chrome renders its icon buttons as `<Button variant="ghost"
size="icon-sm">`: `icon-sm` is the one legacy size Button keeps, as the
shell contract's name for `icon-compact`. The package's own callers use
`icon-compact`.

Compound components export their root by default, with the parts attached
as statics (`Select.Item`, `Accordion.Trigger`, …). Upstream's named exports
are kept as well.

## Omitted

These are not ported: ThinkingSteps, CommandMenu, ChatMessage and
AskUserQuestions. CommandMenu is the FF docs site's own chrome, which modo's
shell already provides; ThinkingSteps, ChatMessage and
AskUserQuestions are the agent-chat composites, left out of this port's scope.
No ported file imports any of them.

The files only they, or the FF docs site's nav, use are left out too:
`mobile-drawer`, `nav-item`, `nav-menu`, `lib/theme-context.tsx` (the
`ThemeSwitcher` panel item and vite.ts's pre-paint controller take its
place) and the blocks other than the sidebar's (`queued-stack`,
`dialog-sidebar`). Inside kept files, the same rule removed
`SURFACE_HOVER_BG`, `SURFACE_HOVER_SHADOW` and `surfaceHoverClasses` from
`surface-classes.ts` (only the Sidebar docs' callout cards used them; the
callouts are not ported).

The same goes for the docs-site-only CSS in `app/globals.css`: `.xl-fade-*`,
`.inview-fade-block`, `.bento-*` and
`.shiki`, plus the Tailwind directives, the self-hosted Inter `@font-face`
and the Radix-only scroll-lock margin fix (`body[data-scroll-locked]`).

`surface.css` does keep the inset shadow variants (`--shadow-light-2-inset`,
`--shadow-light-3-inset` and the per-scheme `--shadow-2-inset` /
`--shadow-3-inset` aliases), but no ported item consumes them and
`preset.ts` maps no utility to them.

## Tailwind → UnoCSS

`uno.config.ts` uses `presetWind4` (UnoCSS's Tailwind v4 preset) and
`preset.ts` (the theme and token utilities the package ships) with
`outputToCssLayers`. `vite.ts` (`withUno` from `docs/vite.ts`) adds the UnoCSS
Vite plugin to modo's Vite config. `scripts/build-css.ts` runs the same config over `dist/` for the
prebuilt `styles.css`, and turns `preset.ts` into `tailwind.css`.

- **Dark mode.** `dark: 'class'` produces `.dark .dark\:x`, the same "inside a
  `.dark` ancestor" contract as FF's `@custom-variant dark (&:is(.dark *))`.
  modo ships no theme of its own, so `docsTheme` (`docs/vite.ts`) injects a small controller into
  `index.html` (`transformIndexHtml`, `head-prepend`). Before first paint it
  puts `light` or `dark` on `<html>` — the stored preference, or the OS one
  under `system` — which is also what flips every `light-dark()` token through
  `color-scheme`. It exposes `window.__uiTheme` (`get` / `set`), persists the
  choice in `localStorage` under `modo-ui-theme` (`storageKey`), and fires `ui:themechange`
  on every apply, including when the OS flips underneath `system`.
- **Load order.** The same plugin prepends `import 'virtual:uno.css'` to
  modo's `\0virtual:modo-config-css` module, so UnoCSS's
  `@layer properties, theme, base, default` statement lands before
  `global.css` (and the `base.css` it imports) and fixes the order of the
  layer its `@layer base` rules join.
  `vite.ts` is loaded by Node with type stripping, so it may only use erasable
  TypeScript and hands `uno.config.ts` to UnoCSS by absolute path.
  `docs/vite.ts` ships built (Node never strips types under `node_modules`)
  and imports `unocss/vite` only inside `withUno`, so a Tailwind host takes
  `docsTheme` without UnoCSS installed (`unocss` is an optional peer).
- **Colors.** Theme colors point at the CSS variables directly (for example
  `accent: 'var(--accent)'`, `surface.1..8`). wind4 applies opacity modifiers
  to `var()` colors with `color-mix(in srgb, …)`, so `bg-accent/12` works on
  the `light-dark()` tokens.
- **Shadows.** `shadow-surface-N` maps to `var(--shadow-N)`, which is
  re-pointed per scheme in `surface.css`.
- **Radius.** wind4's default scale stays (`rounded-lg` = 8px). shape-context
  pairs `rounded-lg` with 8px JS radii, so the scale must not follow
  `--radius`. Its off-scale steps are `rounded-pill|focus-ring|pill-focus-ring`
  over `tokens/radius.css`.
- **Font.** `font.sans` repeats the literal family from
  `tokens/typography.css` rather than `var(--font-sans)`: wind4 emits theme
  keys as same-named variables, and a self-reference would be a cycle.
- **Type roles.** `text-display|title|subtitle|body|caption` is a custom rule
  reading `var(--text-<role>)`.
- **Transitions.** wind4's arbitrary `transition-[a,b]` only accepts CSS
  properties it knows. `stroke-width` (icon stroke on hover) and
  `font-variation-settings` (the Inter weight ladder) are added through
  `theme.property`.
- **Layers.** UnoCSS declares `@layer properties, theme, base, default` and
  puts its reset in `base`. `base.css`'s `@layer base` rules join that layer
  after the reset, so utilities (in `default`) still win. This is the same
  arrangement as Tailwind's base/utilities split.
- **Content.** UnoCSS scans `{lib,primitives,components,blocks}/**/*.{ts,tsx,mdx}`
  and `modo.components.tsx` from disk (`content.filesystem`, and the same
  globs in `content.pipeline.include`, since the default pipeline skips
  `.ts`). Two reasons:
  - modo serves items pre-bundled, so the sources never pass through Vite's
    transform pipeline;
  - example code exists only in each item's `examples.mdx`.

  The class-name literal tables (`SURFACE_BG`, `sizeMap`, …) do the same job
  for UnoCSS's extractor that they do for Tailwind's scanner.
- **Focus.** modo's structural CSS (`lib/src/runtime/shell/css/layout.css`)
  draws an unlayered `:focus-visible` outline inside the chrome. `global.css` reverts it with `outline: revert-layer` (and
  `outline-offset: revert-layer`), handing focus styling back to `@layer base`
  and the utilities, so FF's ring (1px `--focus-ring`) is the only one drawn.

Every Tailwind idiom FF uses has a wind4 equivalent, among them:
- named groups (`group-[.is-active]/row:`)
- `has-data-[…]:`
- arbitrary variants (`[[data-side=top]_&]:`, `[&>div[style]]:!block`)
- `supports-[…]:`
- arbitrary properties (`[text-box:…]`, `[--popup-enter-y:-4px]`)
- typed arbitrary values (`ring-[color:…]`)
- `duration-80`, `!h-auto`
- `transition-[color,stroke-width]`, `transition-[font-variation-settings]`
- `bg-accent/12` → `color-mix`, `shadow-surface-3`, `dark:bg-surface-2`
- the type-role rule and wind4's unchanged `--radius-lg: 0.5rem`

No upstream class string had to change. The current run covers 45 files and
3299 class tokens (561 unique), and all of them generate.

## `cn`

`lib/utils.ts` exports `cn = createCn({ extend: { classGroups: {
'font-size': ['text-display', …] } } })` from `cn/config`. `cn` is a compiled
drop-in for clsx + tailwind-merge with the same `extend` shape.

The font-size extension keeps upstream's fix. Without it, `text-body` would
be read as a text *color*, and `cn('text-body', 'text-muted-foreground')`
would drop the size.

## Behavior additions

Base UI components work both controlled and uncontrolled. The FF wrappers
that were controlled-only gain a `default*` prop, backed by
`lib/use-controllable-state.ts`: a component is controlled while its
value prop is not `undefined`, and it reports every change through its
callback either way. Where FF only had per-item callbacks, a group-level one
was added and the item's own state props became optional. Values report
through `onValueChange` everywhere (the value, not an event), and form
controls take `name`.

| Item | Controlled prop | Added uncontrolled prop | Added change callback |
|---|---|---|---|
| Accordion, Accordion.Group | `value` | `defaultValue` (semantics fixed, below) | — (`onValueChange` now also fires uncontrolled) |
| Checkbox | `checked` (now optional) | `defaultChecked` (standalone) | `onCheckedChange` |
| Checkbox.Group | `checkedIndices` (now optional) | `defaultCheckedIndices` (`Set` or array) | `onCheckedIndicesChange` |
| Dropdown, Dropdown.Content | `checkedIndex`, `checkedIndices` | `defaultCheckedIndex`, `defaultCheckedIndices` | `onCheckedIndexChange`, `onCheckedIndicesChange` |
| Card.Group | `value` (new: the card whose `value` is selected) | `defaultValue` | `onValueChange` |
| Input, InputGroup.Field, Textarea | `value` | `defaultValue` | `onValueChange` (replaces `onChange`) |
| InputMessage (the ai kit's `Composer.Draft`) | `value`, `files`, `queue`, `status` | `defaultValue`, `defaultFiles`, `defaultQueue`, `defaultStatus` | `onValueChange` optional; `onStatusChange` added |
| Radio.Group | `selectedIndex`, `value` | `defaultSelectedIndex`, `defaultValue` | `onSelectedIndexChange` (`onValueChange` now also fires uncontrolled) |
| Slider | `value` | `defaultValue` | `onValueChange` (replaces `onChange`) |
| Switch | `checked`, `onToggle` (now optional) | `defaultChecked` | `onCheckedChange` |
| Select | `value`, `open` | `defaultValue`, `defaultOpen` | `onOpenChange` |
| Combobox | `open` | `defaultOpen` | `onOpenChange` |
| ColorPicker | `value`, `format`, `formatOpen` | `defaultValue`, `defaultFormat`, `defaultFormatOpen` | `onFormatOpenChange` |
| Tooltip | `open` (upstream `forceOpen`) | `defaultOpen` | — |
| Sidebar | `value` (new: the row whose `value` is selected) | `defaultValue` | `onValueChange` |
| Sidebar.MenuItem `collapsible` | `open` (new: its sub-menu; upstream's docs held it in page state) | `defaultOpen` | `onOpenChange` |
| Tabs (both variants) | `value` (upstream's index props removed) | `defaultValue` | — |
| Table | `sort` (new: the sorted head's `value` and direction) | `defaultSort` | `onSortChange` |
| Combobox query | `query` (new) | `defaultQuery` | `onQueryChange` |

Every overlay root holds its open state through `useOverlayRoot` (on
`useControllableState`), because the morph reads it: Dialog, AlertDialog,
Sheet, Popover, PreviewCard, Tooltip, Dropdown.Menu, ContextMenu, Select,
Combobox, ColorPicker.Popover and the pickers. Combobox's value stays on
Base UI's own state.

Notable local behavior changes beyond the `default*` props:

| Item | Change |
|---|---|
| Accordion | Upstream treated the presence of `onValueChange` as "controlled", so an uncontrolled accordion with a listener never opened. Now `value` alone controls, and `defaultValue` seeds an accordion that still reports changes. |
| Radio.Group | The group context carries a `selectIndex` setter that every item selection calls (after its own `onValueChange` / `onSelect`), so items need no `selected` / `onSelect` of their own. |
| Checkbox.Group | The group context carries the checked set plus a setter; an item's toggle always reports to the group as well. |
| Dropdown | `Dropdown.Search` with `filter` hands the query to the panel, which drops the `Dropdown.Item` rows whose `label` doesn't match, re-indexes the survivors for fluid hover, and shows `Dropdown.Empty` only when nothing matched — the work the controlled form asks the consumer to do. Selection stays keyed on the authored index (`sourceIndex`), so it survives re-indexing. |
| Combobox | `creatable` offers the create row with no callback and the component keeps the items it makes (merged into `items`, deduped by value), so a combobox can grow its own list; `onCreate` is unchanged and still wins when it returns an item. The root is also no longer generic — see the file map. |
| InputMessage (the ai kit's `Composer.Draft`) | Attachments are enabled by `onFilesChange` **or** `defaultFiles`; the queue by `onQueueChange` **or** `defaultQueue` (still only alongside a status). With the status uncontrolled the Stop control is offered even without `onStop` and flips the status to `"idle"` itself, which is the edge that auto-dispatches the head of the queue. An uncontrolled draft and file list clear themselves after `onSend`. |
| Card | `next/link` is gone: the stretched card link and `Card.Button`'s `href` form render plain anchors. Examples use inline `data:image/svg+xml` gradients instead of real image files. |
| Select | A pick holds the popup open for 300ms so the check and the selected background land before it closes; `onOpenChange` reports the close after it. |
| Pickers | `disabled` turns the field off; the days a pick can't land on are `disabledDays` (upstream shadcn overloaded `disabled` with a matcher). |
| Function roots (Dialog, Select, Combobox, …) | Statics are attached by `const X = Object.assign(function X(…) { … }, { Part })`, so TypeScript infers them without a cast. Expando properties (`X.Part = …`) typecheck in the source but bunup's `.d.ts` bundler drops them; `check:dist` type-checks every static from `dist`. |

## Dependency deltas (vs upstream `package.json`)

| Upstream | Here | Why |
|---|---|---|
| `tailwindcss`, `@tailwindcss/postcss` ^4 | `unocss` 66.10.5 (pinned) | UnoCSS instead of Tailwind |
| `clsx`, `tailwind-merge` | `cn` ^0.3.0 | Compiled drop-in |
| `framer-motion` ^12 + `motion` ^12 | `motion` ^13.4.0 | One package; imports use `motion/react` |
| `@base-ui/react` ^1.4.1 | `@base-ui/react` 1.4.1 (exact) | FF styling relies on its `--anchor-width`, `--available-height` and `data-side` hooks |
| `lucide-react` ^0.564 | `lucide-react` ^1.47.0 | Workspace version; `icon-context`'s `size`/`strokeWidth` widened to `number \| string` for it |
| `react` / `react-dom` ^19 | ^18.3 | The workspace pins React 18. React 19's ref typings are adapted per file: `MutableRefObject` casts where a forwarded ref is written, `useRef<T \| null>(null)` instead of the 1-arg null form, and `FilePreviewTile` turned into a `forwardRef` (React 19 passes `ref` as a plain prop; React 18 warns and drops it). |
| self-hosted `InterVariable.ttf` | `@fontsource-variable/inter` ^5.3.0 (`opsz.css`) | npm-distributed. The opsz axis is needed by the `--weight-*` ladder. |
| `pdfjs-dist` ^5.7.284 | optional peer of `@justanarthur/modo-ui-ai` (and its devDependency for the docs) | PDF thumbnails in the composer's draft. It bundles under modo's esbuild as a lazy ~790 kB chunk; the worker is loaded from `cdn.jsdelivr.net`, as upstream does. Absent, PDFs fall back to the file icon. |
| `class-variance-authority` ^0.7.1 | same | |
| `next` (`next/link`, `next/image` lint) | — | No Next.js here |
| — | `@justanarthur/modo` (workspace) | The design system's own host |
| — | `sugar-high` ^2.5.1 | Tokenizer for the local `primitives/content/code` item |
| — | `react-day-picker` ^10.0.2, `date-fns` ^4.4.0 | The calendar under the date pickers, and its date math, formats and locales (`react-day-picker/locale`); date-fns is declared because the pickers import it directly |
| — | `vite` ^8.3, `esbuild` ^0.28, `typescript` ^5.4, `@types/react(-dom)` ^18.3 (dev) | `vite` ^8.3 makes UnoCSS's peer reuse modo's Vite 8. The others serve the scripts and `tsc`. |

Every import is declared here, because bun's isolated linker only exposes
declared packages.

## Docs and examples

What modo's parser (`lib/src/lib/tsdoc.ts`) and example compiler
(`lib/src/runtime/items/compile.ts`) need, and how this package answers it:

- **The item is the file's `export default`** — either `function X(…)` or a
  `const X = forwardRef<HTMLXElement, XProps>(…)`. ScrollArea's spelled-out
  `HTMLDivElement` and Combobox's de-generified root date from modo's earlier
  plain parser, which still reads items when `typescript` is absent.
- **Props come from TypeScript's checker** (inherited, `Omit` / `Pick`, intersected and imported
  types too), but members inherited from another package's typings (React's DOM attributes,
  Base UI's props) stay out. Hence the FF API-table text re-declared on every prop that should
  show. Defaults come from the destructuring, else `@default`, else a closing "Defaults to
  `x`." in the prose.
- **Examples live in `examples.mdx`** next to the item, included by the
  TSDoc's `@example {@include ./examples.mdx}`: a `# <FF section title>`,
  an optional caption, then one JSX block (or a fenced code block for code to
  read). Expressions are plain JS (no `as const`), and multi-line JSX text
  stays inline (modo unwraps MDX's paragraphs inside examples).
- **Examples are hook-free JSX.** Nothing runs a component body, so
  interactivity in the docs comes from the `default*` props above instead of
  `useState`.
- **Imports are real**: the item is `./index`, other items are
  `../../<tier>/<id>` (one `../` more from or to a group folder), icons come from `lucide-react`. Every free identifier
  must be imported (or be an item name or a JS/DOM global), and every
  `Item.Part` used must really be attached to that item.

Each item follows its FF docs page: the TSDoc holds the one-liner, a concept
paragraph and the list of statics; `examples.mdx` holds one `# <FF section
title>` example per docs section. Playground and API Reference sections are never ported (the API
tables become the prop docs instead). Other per-item deviations:

| Item | Docs deviation |
|---|---|
| Button | Extra Sizes / Active / As-child examples, for API-table props the FF page has no section for. |
| Dialog | "With a sidebar" replaced by "Surfaces inside a dialog" (a Select popover lifting off the dialog's own level) — the same point about composing inside an `xl` panel, with items this port ships. |
| Sidebar | Layouts split into three examples; "Callouts" (docs-only cards), "Inside a dialog", the "No icon rail" prose (folded into the TSDoc) and "Functional and perfectly aligned" (an alignment-guides overlay) skipped; "Mobile drawer" added. Frames pass `mobileBreakpoint={0}` like FF's, so a rail stays a rail inside them. |
| SidebarApp | One block page for FF's preset playground: the preset itself (collapsed), open, open on hover, floating on the right. |
| Dropdown | "Create from the query" skipped: adding a row to the list is real consumer state, which an uncontrolled panel cannot stand in for. |
| InputMessage (the ai kit's Composer) | Playground skipped; the transcript around the Attachments / Send Handler demos dropped, since `ChatMessage` is not ported; a local History example (recalling sent messages with the arrow keys). |
| FluidHover | The two scripted-cursor demos are dropped — they exist only to film the mechanism. |
| SizeProvider | Live demos become static examples; the token-inspector overlay is dropped and the demo components are swapped for ones this port ships. |
| Motion | The ball-on-track and fake-modal visuals become a show/hide of arbitrary children; component chips are plain text. |
| Card | Images are inline `data:image/svg+xml` gradients. |
| Tabs | FF's TabsSubtle page becomes the Subtle examples of Tabs (`variant="subtle"`). |

## Known limitations

- The 22px mobile display size and the `html[data-size="compact"]` type-scale
  override are not carried over. Both are FF docs-site chrome. Compact type
  reaches components through `SizeProvider` / `useTypeScale()`.
- Theme switching is docs-site glue, not a ported `ThemeProvider`: vite.ts's
  pre-paint controller and the `ThemeSwitcher` panel item. A `.light` /
  `.dark` class on a subtree still forces that scheme, which is what the
  forced-theme previews use.
- `transition-[…]` with a CSS property outside wind4's list needs a
  `theme.property` entry in `preset.ts`.
- Cross-item context (a `SizeProvider` example shrinking a Button, a surface
  level crossing from Dialog into Dropdown) depends on modo bundling the whole
  design system in **one** esbuild build with `splitting: true`, so a shared
  module exists once at runtime. The output lives in this package's
  `.modo-tmp/build`, which is keyed on the package and not on the port: two
  `modo dev` servers started in this directory share it. `run-design-systems.ts`
  avoids that by killing stray `modo dev` processes before it starts.
- PDF thumbnails in the ai kit's composer need network access: the pdfjs worker is
  fetched from `cdn.jsdelivr.net` on the first PDF attachment.
- The inset shadow tokens in `surface.css` are dead weight today — they ship,
  but nothing in this package reads them.

## How to run

```sh
cd demo && bun scripts/run-design-systems.ts ui   # http://127.0.0.1:5173
```

The runner kills stray `modo dev` processes, splices a temporary
`.modo.config.ts` with the demo switcher panel, and assigns ports from 5173
upward. To run the package on its own, without the switcher:

```sh
cd ui && bunx modo dev --port 5180
```

## How to verify

```sh
cd ui && bunx tsc -p . --noEmit
```

modo reports parser and build problems itself, as `[modo:bundle]` lines in
the dev server's output.

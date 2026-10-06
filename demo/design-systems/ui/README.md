# UI — Fluid Functionalism for modo

The UI design system is a port of [Fluid Functionalism](https://www.fluidfunctionalism.com)
(FF) into modo's structure. FF is a shadcn-style component registry by Micka
Touillaud / mickadesign ([repo](https://github.com/mickadesign/fluid-functionalism),
MIT). It layers motion springs, a fluid hover highlight, a two-step size ladder,
an eight-level elevated surface system and Inter weight animation on top of
Radix or Base UI primitives.

This port differs from the upstream registry in three ways:
- It uses the **Base UI** flavor.
- **UnoCSS** (`presetWind4`) replaces Tailwind CSS v4.
- **[`cn`](https://github.com/shadcn-ui/cn)** replaces clsx + tailwind-merge.

The sibling `../fluid-functionalism` package is a different project: a Radix
flavor pulled with the shadcn CLI, still on Tailwind.

## Source

- Repository: `github.com/mickadesign/fluid-functionalism`
- Commit: `b3587bdbd83fc66c2a6aae3817ffb856cb09260b`
- License: MIT © 2026 Micka Touillaud. The full text is in
  [`LICENSE.fluid-functionalism`](./LICENSE.fluid-functionalism), copied
  verbatim.
- Flavor: `registry/base/*` wherever upstream ships a flavored file, and
  `registry/default/*` otherwise. The Base UI flavor is pinned to
  `@base-ui/react@1.4.1`, the version upstream was tested with.

Every vendored file opens with a plain `/* */` header. The header names the
upstream path and commit, carries the MIT notice, and lists every local
modification. The vendored code below the header keeps upstream's formatting.
Files written for this port (`uno.config.ts`, `vite.ts`, `modo.components.tsx`,
`lib/use-controllable-state.ts`, `primitives/code/index.tsx`) use this repo's
style: single quotes and no semicolons.

## Layout

| Path | What it holds |
|---|---|
| `tokens/*.css` | Colors, typography (`--font-sans`, `--text-*`), motion (`--duration-*`), radius and spacing. |
| `global.css` | Theme switching, base styles, focus fallback, scrollbars, shimmer/spinner keyframes and `.scroll-fade`. |
| `uno.config.ts`, `vite.ts` | The UnoCSS setup (see below). |
| `lib/` | FF's shared system files (upstream `lib/`, `hooks/` and the fluid-hover highlight, flat, upstream names), imported relatively by items. modo only scans the tier folders, so it never mistakes them for items. |
| `modo.components.tsx` | Components only the docs site uses: the `Icon` and `Select` shell-slot adapters and the `ThemeSwitcher` panel item, picked in `modo.config.ts` by export name (`./modo.components.tsx#Select`). |
| `primitives/<id>/` | FF's "System" pages: `index.tsx` (component + TSDoc prose) and `examples.mdx`, pulled in by `@example {@include ./examples.mdx}`. |
| `components/<id>/` | FF's "Components" pages, same shape. |

## Upstream → local file map

### Shared system (`lib/`)

| Upstream (`registry/default/…`) | Local | Modifications |
|---|---|---|
| `lib/utils.ts` | `lib/utils.ts` | `extendTailwindMerge` → `createCn` from `cn/config`, with the same font-size group extension; the local token utilities join their groups too (compact and `micro` type roles as font-size, `weight-*`, the `duration-*` / `delay-*` motion tiers, `rounded-box\|glyph`) |
| `lib/springs.ts` | `lib/springs.ts` | none |
| `lib/font-weight.ts` | — | not ported: its `fontWeights` became the `--weight-*` tokens in `tokens/typography.css` (the `weight-*` utilities) |
| `lib/popup.ts` | `lib/popup.ts` | none |
| `lib/shape-context.tsx` | `lib/shape-context.tsx` | `"use client"` dropped |
| `lib/size-context.tsx` | `lib/size-context.tsx` | `"use client"` dropped; `SizeProvider` moved to `primitives/sizes` (the documented item), with `SizeContext` exported for it; `sizeMap` text classes → `text-body` / `text-body-compact` |
| `lib/icon-context.tsx` | `lib/icon-context.tsx` | `"use client"` dropped; `size`/`strokeWidth` widened to `number \| string` for lucide v1 + React 18 types |
| `lib/surface-context.tsx` | `lib/surface-context.tsx` | `"use client"` dropped |
| `lib/surface-classes.ts` | `lib/surface-classes.ts` | `SURFACE_HOVER_*` and `surfaceHoverClasses` dropped (only Sidebar used them) |
| `hooks/use-fluid-hover.ts` | `lib/use-fluid-hover.ts` | `"use client"` dropped; `sessionRef` typed `MutableRefObject<number>` (React 18) |
| `hooks/use-merge-split.tsx` | `lib/use-merge-split.tsx` | `"use client"` dropped; `framer-motion` → `motion/react`; relative imports; `bridgePair` asserts its length-checked pair (`noUncheckedIndexedAccess`) |
| `hooks/use-keyboard-nav-gate.ts` | `lib/use-keyboard-nav-gate.ts` | `"use client"` dropped; relative imports |
| `hooks/use-touch-primary.tsx` | `lib/use-touch-primary.tsx` | `"use client"` dropped |
| `fluid-hover-highlight.tsx` | `lib/fluid-hover-highlight.tsx` | `"use client"` dropped; `framer-motion` → `motion/react`; relative imports |
| — (new) | `lib/use-controllable-state.ts` | Local addition: controlled + uncontrolled state, Base UI style |

### Styles

| Upstream | Local |
|---|---|
| `app/globals.css` §1 tokens | `tokens/colors.css`, with HEX converted to oklch. The surface ladder and shadows live in `primitives/surface/surface.css`. |
| `app/globals.css` §2 theme switching | `global.css` (`color-scheme`, `--overlay`) and `surface.css` (`--shadow-N` per scheme) |
| `app/globals.css` §3 `@theme inline` | `uno.config.ts` `theme` |
| `app/globals.css` `--fs-*` + `@utility text-*` | `tokens/typography.css` `--text-*` and a rule in `uno.config.ts` |
| `app/globals.css` §4–6 | `global.css` |
| `registry/default/lib/springs.ts` (as CSS) | `tokens/motion.css` |

### Items

Every item goes through the same mechanical pass, so the tables below list
only what is specific to it:

- `"use client"` dropped (no RSC here).
- Imports rewritten: `@/lib/*` → `../../lib/*`, `@/hooks/*` →
  `../../lib/*`, `SizeProvider` from `@/lib/size-context` →
  `../../primitives/sizes`, `@/lib/elevated` → `../../primitives/surface`,
  `@/components/ui/scroll-area` → `../../primitives/scroll-area`,
  `@/components/ui/fluid-hover-highlight` → `../../lib/fluid-hover-highlight`,
  `@/registry/radix/*` → the Base-flavor sibling, `framer-motion` →
  `motion/react`, `next/link` → a plain anchor.
- A local `interface <Item>Props` whose members are each declared on one line
  with the FF docs API-table text (modo's parser lists only members declared
  in the interface body), modo TSDoc written from the FF docs page, and
  `export default <Item>`. Upstream's named exports are kept.

#### primitives

| Item | Upstream | Local | Specific modifications |
|---|---|---|---|
| `Elevated` | `registry/default/lib/elevated.tsx` (+ `lib/surface-context.tsx`; docs "Surfaces") | `primitives/surface/index.tsx` | `.Provider` static (= `SurfaceProvider`); `useSurface` / `surfaceClasses` re-exported; `className`/`children` re-declared; `surface.css` co-located (modo injects it) |
| `ScrollArea` | `registry/base/scroll-area.tsx` (docs "Scrollbars") | `primitives/scroll-area/index.tsx` | the root's forwardRef element type written out as `HTMLDivElement` (the parser needs a first type argument without `<`/`,`); `viewportClassName` documented; `.Bar` static (= `ScrollBar`) |
| `SizeProvider` | `registry/default/lib/size-context.tsx` + `app/docs/sizes/page.tsx` | `primitives/sizes/index.tsx` | upstream's `SizeProvider`, moved here from the vendored context so modo documents it (sized components import it from here), with the hooks, maps and types re-exported; the live demos become static examples (Select/TabsSubtle/InputGroup/CheckboxGroup/Dropdown swapped for Button/Badge/Switch/Tabs, token-inspector overlay dropped); the token table and type scale are written out rather than rendered from `sizeMap` / `typeScale` |
| `FluidHover` | `app/docs/fluid-hover/{page,demos}.tsx` over `registry/default/hooks/use-fluid-hover.ts` + `fluid-hover-highlight.tsx` | `primitives/fluid-hover/index.tsx` | new container (`FluidHover` + `FluidHover.Item`) around the hook/highlight pair so examples need no hooks; `items`, `renderItem`, `disabledIndices`, `columns`, `highlightClassName` are the container's own API, `axis` and `gapClick` pass through to the hook; row classes are upstream's `rowClass` with per-axis variants; the two scripted-cursor demos are dropped |
| `Motion` | `registry/default/lib/springs.ts` + `app/docs/motion/page.tsx` | `primitives/motion/index.tsx` | `Motion` is local demo code (FF ships none): it plays one tier's enter spring and exit tween on its children, adding `defaultShow`, `sameExit` and `reducedMotion`; `spring` / `exitFallbackMs` re-exported from the vendored `springs.ts`; the ball-on-track and fake-modal visuals become show/hide of arbitrary children |
| `Code` | — (local; FF has no code item) | `primitives/code/index.tsx` | sugar-high tokens colored by the `--syntax-*` tokens, one surface step above its substrate; also the docs chrome's Code slot |

#### components

| Item | Upstream | Local | Specific modifications |
|---|---|---|---|
| `Accordion` | `registry/base/accordion.tsx` | `components/accordion/index.tsx` | open state runs through `useControllableState` (see [Behavior additions](#behavior-additions)); standalone `Accordion` accepts `highlight` and passes it to its items as their default; statics `.Group/.Item/.Trigger/.Content` |
| `Badge` | `registry/default/badge.tsx` | `components/badge/index.tsx` | `variant` re-declared (it came from cva's `VariantProps` upstream) |
| `Button` | `registry/base/button.tsx` | `components/button/index.tsx` | `variant`/`disabled`/`children` re-declared; extra Sizes / Active / As-child examples for API-table props the FF page has no section for; also serves modo's chrome Button (`shell.Button`) |
| `Card` | `registry/default/card.tsx` | `components/card/index.tsx` | `next/link` → plain anchors (stretched card link, `CardButton`'s `href` form); statics `.Group/.Header/.Title/.Description/.Action/.Content/.Footer/.Media/.Image/.Eyebrow/.Feature/.Button` |
| `CheckboxGroup` | `registry/base/checkbox-group.tsx` | `components/checkbox-group/index.tsx` | uncontrolled mode + group-level callback; item `checked`/`onToggle` optional, falling back to group context; arrow-key focus guarded for `noUncheckedIndexedAccess`; static `.Item` |
| `ColorPicker` | `registry/default/color-picker.tsx` | `components/color-picker/index.tsx` | `@/registry/radix/{slider,tooltip}` → the Base siblings `../slider` / `../tooltip`; `noUncheckedIndexedAccess` guards on regex captures, `rgb()`/`hsl()`/`oklch()` parts, `itemRects[i]` and the Slider's array value; static `.Popover`; uncontrolled support was already upstream (verified, kept) |
| `Combobox` | `registry/base/combobox.tsx` | `components/combobox/index.tsx` | root de-generified (the parser needs a plain function plus a same-file `interface ComboboxProps`): items gained an index signature, `value`/`defaultValue` are `string \| string[]` and `onValueChange` is a union of the two handler shapes; `ComboboxValue<Multiple>` still exported; `creatable` added; `React.*` type refs replaced by named type imports; statics `.Input/.Chips/.Content/.List/.Item/.Empty` |
| `Dialog` | `registry/base/dialog.tsx` | `components/dialog/index.tsx` | `DialogProps`, `DialogSlotProps` and `DialogContentProps` fully re-declared; statics attached as expando properties (`Dialog.Trigger = …`), so `<Dialog.Content>` types without a cast; FF's "With a sidebar" example replaced by "Surfaces inside a dialog" (Sidebar is not ported) |
| `Dropdown` | `registry/base/dropdown.tsx` | `components/dropdown/index.tsx` | uncontrolled selection and uncontrolled search filtering (below); `items[next].focus()` guarded; statics `.Menu/.Trigger/.Content/.Item/.Label/.Separator/.Search/.Empty`; FF's "Create from the query" section skipped — adding a row to the list is real consumer state |
| — | `registry/default/menu-item.tsx` | `components/dropdown/menu-item.tsx` | a row with no `checked` derives it from a self-managed panel and toggles the panel's state; `sourceIndex` carries the authored index so selection survives filter re-indexing |
| — | `registry/default/dropdown-search.tsx` | `components/dropdown/dropdown-search.tsx` | `filter` mode: `value`/`onValueChange` optional, the field reads and writes the query held by the panel (`DropdownFilterContext`) |
| `InputCopy` | `registry/default/input-copy.tsx` | `components/input-copy/index.tsx` | `@/registry/radix/tooltip` → `../tooltip`; `useRef<ReturnType<typeof setTimeout> \| null>(null)` (React 18 overloads); defaults spelled into the prop prose (modo reads defaults from the description); the tooltip comment's "Radix" reads "Base UI" |
| `InputGroup` | `registry/default/input-group.tsx` | `components/input-group/index.tsx` | `InputField` uncontrolled mode (`InputHTMLAttributes`' own `defaultValue` omitted in favour of the local one); static `.Field` |
| `InputMessage` | `registry/default/input-message.tsx` | `components/input-message/index.tsx` | uncontrolled twins for value, files, queue and status (below); `FilePreviewTile` turned into a `forwardRef` (it exits inside `<AnimatePresence mode="popLayout">`, which measures through a ref); guards on `queue[0]`, `history[i]`, `suggestions[i]` and the `moveQueued` swap; FF's Playground section skipped and the surrounding transcript dropped (`ChatMessage` is not ported) |
| — | `registry/default/file-thumbnail.tsx` | `components/input-message/file-thumbnail.tsx` | the lazy `import("pdfjs-dist")` is kept as-is — verified against modo's esbuild settings, it lands in a ~790 kB chunk fetched only when a PDF is attached; the worker still comes from jsDelivr, so no bundler-side worker config is needed; the `@next/next/no-img-element` eslint-disable dropped |
| `RadioGroup` | `registry/base/radio-group.tsx` | `components/radio-group/index.tsx` | uncontrolled index and value modes; group context carries a `selectIndex` setter every item calls, so items need no `selected`/`onSelect`; arrow-key focus guarded; static `.Item` |
| `Select` | `registry/base/select.tsx` | `components/select/index.tsx` | members re-declared one per line (the parser drops members whose type spans lines); upstream's uncontrolled `defaultValue` verified and kept rather than rerouted through `useControllableState`; expando statics `.Trigger/.Content/.Item/.Group/.Label/.Separator` |
| `Slider` | `registry/base/slider.tsx` | `components/slider/index.tsx` | `var(--color-accent)` → `var(--accent)` (no `--color-*` aliases here); uncontrolled support on the public wrapper, with both engines still fully controlled; `SliderProps extends Omit<SliderEngineProps, "value" \| "onChange">`; React 18 ref types (`MutableRefObject`); indexed reads of the value/step/pip arrays asserted |
| `Switch` | `registry/base/switch.tsx` | `components/switch/index.tsx` | uncontrolled support; every in-body read goes through the resolved `isChecked` and a `toggle()` that also calls `onToggle` |
| `Table` | `registry/default/table.tsx` | `components/table/index.tsx` | statics `.Header/.Body/.Row/.Head/.Cell`; `TableProps` / `TableRowProps` exported |
| `Tabs` | `registry/base/tabs.tsx` | `components/tabs/index.tsx` | `defaultSelectedIndex` added as the index-mode twin of the existing `defaultValue`; statics `.List/.Item/.Panel` |
| `TabsSubtle` | `registry/base/tabs-subtle.tsx` | `components/tabs-subtle/index.tsx` | uncontrolled mode; panels may be authored inside the root (below); the tab list's ref write goes through `MutableRefObject`; statics `.Item/.Panel` |
| `ThinkingIndicator` | `registry/default/thinking-indicator.tsx` | `components/thinking-indicator/index.tsx` | upstream prop JSDoc kept (it already matches the FF API table); the `.shimmer-text` rule it rides lives in `global.css` |
| `Tooltip` | `registry/base/tooltip.tsx` | `components/tooltip/index.tsx` | `className`/`children` docs filled in; statics `.Provider` / `.PortalContainer` |

`Select` in `modo.components.tsx` is not an item: modo's docs chrome renders its Select slot
with a flat `value` / `onChange` / `options` contract
(`lib/src/lib/slots.tsx`), and this adapter maps it onto
`Select.Trigger` / `Select.Content` / `Select.Item` so the chrome runs on the
design system's own Select. The
`components/select` item keeps the upstream API untouched.

`ThemeSwitcher` in `modo.components.tsx` is not an item either: it is the `Theme` entry in
`modo.config.ts` `panel.items`, a `Select` of Light / Dark / System (each row
with its icon, the trigger showing the active one) that reads and sets
`window.__uiTheme` and re-reads it on `ui:themechange`. All switching logic lives in the pre-paint controller
described under **Tailwind → UnoCSS**, so the control holds no theme state of
its own. `demo/scripts/run-design-systems.ts` appends its own `Switcher` panel
item to whatever a design system declares, so both show up under the runner.

## Tier mapping

The tiers mirror the FF docs navigation. FF's "System" pages become
`primitives/`; its "Components" become `components/`. There are no blocks.

| Tier | Item | Upstream source | FF docs page |
|---|---|---|---|
| primitives | `surface` (Elevated, `.Provider`, `useSurface`) | `lib/elevated.tsx` + `lib/surface-context.tsx` | surfaces |
| primitives | `scroll-area` (ScrollArea) | `base/scroll-area.tsx` | scrollbars |
| primitives | `sizes` (SizeProvider) | `lib/size-context.tsx` | sizes |
| primitives | `fluid-hover` (FluidHover) | `hooks/use-fluid-hover.ts` + `fluid-hover-highlight.tsx` | fluid-hover |
| primitives | `motion` (Motion) | `lib/springs.ts` | motion |
| primitives | `code` (Code) | — (local, sugar-high) | — |
| components | accordion, button, checkbox-group, combobox, dialog, dropdown, radio-group, select, slider, switch, tabs, tabs-subtle, tooltip | `registry/base/<id>.tsx` | same slug |
| components | badge, card, color-picker, input-copy, input-group, input-message, table, thinking-indicator | `registry/default/<id>.tsx` | same slug |

Button lives in `components/` to mirror the FF docs, and `modo.config.ts`
points `shell.Button` at it explicitly (an explicit path skips modo's tier
check). The chrome renders its icon buttons as `<Button variant="ghost"
size="icon-sm">`, which works because `icon-sm` is upstream's legacy alias for
`icon-compact`.

Compound components export their root by default, with the parts attached
as statics (`Select.Item`, `Accordion.Trigger`, …). Upstream's named exports
are kept as well.

## Omitted

These are not ported: ThinkingSteps, Sidebar, CommandMenu, ChatMessage and
AskUserQuestions. Sidebar and CommandMenu are the FF docs site's own chrome,
which modo's shell already provides; ThinkingSteps, ChatMessage and
AskUserQuestions are the agent-chat composites, left out of this port's scope.
No ported file imports any of them.

The files only they use are left out too: `sidebar-core`, `sidebar-menu`,
`mobile-drawer`, `nav-item`, `nav-menu`, `lib/sidebar-menu-grid.ts`,
`lib/theme-context.tsx` (the `ThemeSwitcher` panel item and vite.ts's
pre-paint controller take its place) and `registry/blocks/*`.
Inside kept files, the same rule removed `SURFACE_HOVER_BG`,
`SURFACE_HOVER_SHADOW` and `surfaceHoverClasses` from `surface-classes.ts`.

The same goes for the docs-site-only CSS in `app/globals.css`: `.xl-fade-*`,
`.inview-fade-block`, `.scroll-divider` (Sidebar only), `.bento-*` and
`.shiki`, plus the Tailwind directives, the self-hosted Inter `@font-face`
and the Radix-only scroll-lock margin fix (`body[data-scroll-locked]`).

`surface.css` does keep the inset shadow variants (`--shadow-light-2-inset`,
`--shadow-light-3-inset` and the per-scheme `--shadow-2-inset` /
`--shadow-3-inset` aliases), but no ported item consumes them and
`uno.config.ts` maps no utility to them.

## Tailwind → UnoCSS

`uno.config.ts` uses `presetWind4` (UnoCSS's Tailwind v4 preset) with
`outputToCssLayers`. `vite.ts` adds the UnoCSS Vite plugin to modo's Vite
config.

- **Dark mode.** `dark: 'class'` produces `.dark .dark\:x`, the same "inside a
  `.dark` ancestor" contract as FF's `@custom-variant dark (&:is(.dark *))`.
  modo ships no theme of its own, so `vite.ts` injects a small controller into
  `index.html` (`transformIndexHtml`, `head-prepend`). Before first paint it
  puts `light` or `dark` on `<html>` — the stored preference, or the OS one
  under `system` — which is also what flips every `light-dark()` token through
  `color-scheme`. It exposes `window.__uiTheme` (`get` / `set`), persists the
  choice in `localStorage` under `modo-ui-theme`, and fires `ui:themechange`
  on every apply, including when the OS flips underneath `system`.
- **Load order.** The same plugin prepends `import 'virtual:uno.css'` to
  modo's `\0virtual:modo-config-css` module, so UnoCSS's
  `@layer properties, theme, base, default` statement lands before
  `global.css` and fixes the order of the layer its `@layer base` rules join.
  `vite.ts` is loaded by Node with type stripping, so it may only use erasable
  TypeScript and hands `uno.config.ts` to UnoCSS by absolute path.
- **Colors.** Theme colors point at the CSS variables directly (for example
  `accent: 'var(--accent)'`, `surface.1..8`). wind4 applies opacity modifiers
  to `var()` colors with `color-mix(in srgb, …)`, so `bg-accent/12` works on
  the `light-dark()` tokens.
- **Shadows.** `shadow-surface-N` maps to `var(--shadow-N)`, which is
  re-pointed per scheme in `surface.css`.
- **Radius.** wind4's default scale stays (`rounded-lg` = 8px). shape-context
  pairs `rounded-lg` with 8px JS radii, so the scale must not follow
  `--radius`.
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
  puts its reset in `base`. `global.css`'s `@layer base` rules join that layer
  after the reset, so utilities (in `default`) still win. This is the same
  arrangement as Tailwind's base/utilities split.
- **Content.** UnoCSS scans `{lib,primitives,components}/**/*.{ts,tsx,mdx}`
  and `modo.components.tsx` from disk (`content.filesystem`, and the same
  globs in `content.pipeline.include`, since the default pipeline skips
  `.ts`). Two reasons:
  - modo serves items pre-bundled, so the sources never pass through Vite's
    transform pipeline;
  - example code exists only in each item's `examples.mdx`.

  The class-name literal tables (`SURFACE_BG`, `sizeMap`, …) do the same job
  for UnoCSS's extractor that they do for Tailwind's scanner.
- **Focus.** modo's structural `shell.css` draws an unlayered `*:focus-visible`
  outline. `global.css` reverts it with `outline: revert-layer` (and
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
was added and the item's own state props became optional.

| Item | Controlled prop | Added uncontrolled prop | Added change callback |
|---|---|---|---|
| Accordion, Accordion.Group | `value` | `defaultValue` (semantics fixed, below) | — (`onValueChange` now also fires uncontrolled) |
| CheckboxGroup | `checkedIndices` (now optional) | `defaultCheckedIndices` (`Set` or array) | `onCheckedIndicesChange` |
| Dropdown, Dropdown.Content | `checkedIndex`, `checkedIndices` | `defaultCheckedIndex`, `defaultCheckedIndices` | `onCheckedIndexChange`, `onCheckedIndicesChange` |
| InputGroup.Field | `value`, `onChange` (now optional) | `defaultValue` | — |
| InputMessage | `value`, `files`, `queue`, `status` | `defaultValue`, `defaultFiles`, `defaultQueue`, `defaultStatus` | `onValueChange` optional; `onStatusChange` added |
| RadioGroup | `selectedIndex`, `value` | `defaultSelectedIndex`, `defaultValue` | `onSelectedIndexChange` (`onValueChange` now also fires uncontrolled) |
| Slider | `value`, `onChange` (now optional) | `defaultValue` | — |
| Switch | `checked`, `onToggle` (now optional) | `defaultChecked` | `onCheckedChange` |
| Tabs | `value`, `selectedIndex` | `defaultSelectedIndex` (`defaultValue` is upstream's) | — |
| TabsSubtle | `selectedIndex`, `onSelect` (now optional) | `defaultSelectedIndex` | — |

Already uncontrolled upstream and left on their own internal state (none of
these go through `useControllableState`): Select `defaultValue` — checked
explicitly, see its file header — ColorPicker and ColorPicker.Popover
(`defaultValue`, `defaultFormat`, `defaultFormatOpen`, `defaultOpen`),
Combobox `defaultValue`, Tabs `defaultValue`, and the `defaultOpen` of Dialog
and Dropdown.Menu.

Notable local behavior changes beyond the `default*` props:

| Item | Change |
|---|---|
| Accordion | Upstream treated the presence of `onValueChange` as "controlled", so an uncontrolled accordion with a listener never opened. Now `value` alone controls, and `defaultValue` seeds an accordion that still reports changes. |
| RadioGroup | The group context carries a `selectIndex` setter that every item selection calls (after its own `onValueChange` / `onSelect`), so items need no `selected` / `onSelect` of their own. |
| CheckboxGroup | The group context carries the checked set plus a setter; an item's toggle always reports to the group as well. |
| TabsSubtle | Panels may now be written inside `<TabsSubtle>`: the root partitions its children, keeps the tabs inside the tab list and renders the panels as its siblings right after it (the root element *is* the `role="tablist"`, so panels cannot nest in it). A panel with no `selectedIndex` / `idPrefix` reads both from context, the prefix falling back to a `useId()` one; a panel rendered outside `<TabsSubtle>` still takes them as props. |
| Dropdown | `Dropdown.Search` with `filter` hands the query to the panel, which drops the `Dropdown.Item` rows whose `label` doesn't match, re-indexes the survivors for fluid hover, and shows `Dropdown.Empty` only when nothing matched — the work the controlled form asks the consumer to do. Selection stays keyed on the authored index (`sourceIndex`), so it survives re-indexing. |
| Combobox | `creatable` offers the create row with no callback and the component keeps the items it makes (merged into `items`, deduped by value), so a combobox can grow its own list; `onCreate` is unchanged and still wins when it returns an item. The root is also no longer generic — see the file map. |
| InputMessage | Attachments are enabled by `onFilesChange` **or** `defaultFiles`; the queue by `onQueueChange` **or** `defaultQueue` (still only alongside a status). With the status uncontrolled the Stop control is offered even without `onStop` and flips the status to `"idle"` itself, which is the edge that auto-dispatches the head of the queue. An uncontrolled draft and file list clear themselves after `onSend`. |
| Card | `next/link` is gone: the stretched card link and `CardButton`'s `href` form render plain anchors. Examples use inline `data:image/svg+xml` gradients instead of real image files. |
| Dialog, Select, Combobox | Statics are attached as expando properties (`Dialog.Trigger = …`) rather than through `Object.assign`, so TypeScript infers them without a cast and `check-items` can see them. |

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
| `pdfjs-dist` ^5.7.284 | same | InputMessage PDF thumbnails. It bundles under modo's esbuild as a lazy ~790 kB chunk; the worker is loaded from `cdn.jsdelivr.net`, as upstream does. |
| `class-variance-authority` ^0.7.1 | same | |
| `next` (`next/link`, `next/image` lint) | — | No Next.js here |
| — | `@justanarthur/modo` (workspace) | The design system's own host |
| — | `sugar-high` ^2.5.1 | Tokenizer for the local `primitives/code` item |
| — | `vite` ^5.4, `esbuild` ^0.20, `typescript` ^5.4, `@types/react(-dom)` ^18.3 (dev) | `vite` ^5.4 makes UnoCSS's peer reuse modo's Vite 5. The others serve the scripts and `tsc`. |

Every import is declared here, because bun's isolated linker only exposes
declared packages.

## Docs and examples

What modo's parser (`lib/src/lib/tsdoc.ts`) and example compiler
(`lib/src/lib/example.ts`) need, and how this package answers it:

- **The item is the file's `export default`** — either `function X(…)` or a
  `const X = forwardRef<HTMLXElement, XProps>(…)`. The forwardRef form's first
  type argument must contain no `<` or `,`, which is why ScrollArea spells out
  `HTMLDivElement` instead of `ComponentRef<typeof …>`, and why Combobox's
  root lost its generics.
- **Props come from a same-file `interface XProps`**, and only from members
  declared in its body — inherited members are invisible, and a member whose
  type spans several lines is dropped. Every member needs a description, and
  defaults are read from that prose (`Defaults to \`false\`.`), not from the
  destructuring. Hence the FF API-table text re-declared on every prop.
- **Examples live in `examples.mdx`** next to the item, included by the
  TSDoc's `@example {@include ./examples.mdx}`: a `# <FF section title>`,
  an optional caption, then one JSX block (or a fenced code block for code to
  read). Expressions are plain JS (no `as const`), and multi-line JSX text
  stays inline (modo unwraps MDX's paragraphs inside examples).
- **Examples are hook-free JSX.** Nothing runs a component body, so
  interactivity in the docs comes from the `default*` props above instead of
  `useState`.
- **Imports are real**: the item is `./index`, other items are
  `../../<tier>/<id>`, icons come from `lucide-react`. Every free identifier
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
| Dropdown | "Create from the query" skipped: adding a row to the list is real consumer state, which an uncontrolled panel cannot stand in for. |
| InputMessage | Playground skipped; the transcript around the Attachments / Send Handler demos dropped, since `ChatMessage` is not ported. |
| FluidHover | The two scripted-cursor demos are dropped — they exist only to film the mechanism. |
| SizeProvider | Live demos become static examples; the token-inspector overlay is dropped and the demo components are swapped for ones this port ships. |
| Motion | The ball-on-track and fake-modal visuals become a show/hide of arbitrary children; component chips are plain text. |
| Card | Images are inline `data:image/svg+xml` gradients. |

## Known limitations

- The 22px mobile display size and the `html[data-size="compact"]` type-scale
  override are not carried over. Both are FF docs-site chrome. Compact type
  reaches components through `SizeProvider` / `useTypeScale()`.
- Theme switching is docs-site glue, not a ported `ThemeProvider`: vite.ts's
  pre-paint controller and the `ThemeSwitcher` panel item. A `.light` /
  `.dark` class on a subtree still forces that scheme, which is what the
  forced-theme previews use.
- `transition-[…]` with a CSS property outside wind4's list needs a
  `theme.property` entry in `uno.config.ts`.
- Cross-item context (a `SizeProvider` example shrinking a Button, a surface
  level crossing from Dialog into Dropdown) depends on modo bundling the whole
  design system in **one** esbuild build with `splitting: true`, so a shared
  module exists once at runtime. The output lives in this package's
  `.modo-tmp/build`, which is keyed on the package and not on the port: two
  `modo dev` servers started in this directory share it. `run-design-systems.ts`
  avoids that by killing stray `modo dev` processes before it starts.
- PDF thumbnails in InputMessage need network access: the pdfjs worker is
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
cd demo/design-systems/ui && MODO_PORT=5180 bunx modo dev
```

## How to verify

```sh
cd demo/design-systems/ui && bunx tsc -p . --noEmit
```

modo reports parser and build problems itself, as `[modo:bundle]` lines in
the dev server's output.

---
name: modo-ui
description: >-
  Craft UI in this repo's `ui` design system (demo/design-systems/ui): Fluid Functionalism (Base UI
  flavor) on UnoCSS + cn, extended with a liquid morph layer (goo overlays, GooIndicator, fluid hover).
  Use whenever you create or change a component, primitive or block in demo/design-systems/ui, compose
  screens or demos from its items, write hover / selection / overlay / enter-exit animation there, add
  or change a token, or review UI against its design language (DESIGN.md). Also use when the user
  mentions Fluid Functionalism, fluidfunctionalism.com, @fluid, goo, morph, liquid indicator, fluid
  hover, surface levels or the size ladder in this repo. Extends the upstream fluid-functionalism skill:
  same craft, local APIs.
---

# modo ui — crafting in the Fluid Functionalism + morph language

This skill extends the upstream [Fluid Functionalism skill](https://www.fluidfunctionalism.com/docs/skill)
(`github.com/mickadesign/fluid-functionalism` `skills/fluid-functionalism`, MIT © 2026 Micka Touillaud)
for the port in `demo/design-systems/ui`. Upstream installs `@fluid` components into a shadcn app and
audits it; here the components *are* the source. The jobs are:

1. **Compose** the existing items into screens, demos and blocks.
2. **Build new items** that are indistinguishable from the shipped ones: same tokens, same ladder,
   same springs, same liquid motion, same docs shape.
3. **Review** a change against the language and keep it from drifting.

Read in this order and stop when you have what you need:

| Read | For |
|---|---|
| `demo/design-systems/ui/DESIGN.md` | The look: every token, the roles, elevation, shapes, motion, do's and don'ts. |
| `demo/design-systems/ui/primitives/craft` | The rules as bad / good pairs you can try in the dev server (`/docs/primitives/craft`). |
| This file | The systems as code, the workflow, the quality bar, gotchas. |
| [references/components.md](references/components.md) | What already exists (statics, key props, systems used) and which file to copy for a new kind of thing. |
| [references/motion.md](references/motion.md) | Recipes: springs, fluid hover, liquid indicators, morphing overlays, shared parts, ghost-span, icon swaps, state morphs. |
| [references/authoring.md](references/authoring.md) | A complete new-item template + examples.mdx, the doc parser's rules, verification. |
| [references/upstream-craft.md](references/upstream-craft.md) | Upstream's per-component craft: exact behaviors, values and why. Translate through the table below. |

Repo rules in `AGENTS.md` (tokens only, TSDoc, file naming, sparse code style) apply throughout. The
installed source and its header comments are the final word over every document, this one included:
read the item's `index.tsx` before wrapping, extending or imitating it.

## Upstream → here

Upstream's craft, docs and snippets assume a shadcn + Tailwind + Next app. Read them through this table.

| Upstream says | Here it is |
|---|---|
| `npx shadcn add @fluid/<x>` | Already in the repo. Import relatively: `../../../lib/springs`, `../../button`. |
| Radix or `base/` flavor | Base UI only, `@base-ui/react` pinned at 1.4.1 (styling relies on its `--anchor-width`, `--available-height`, `data-side`). |
| Tailwind v4, `@theme`, `@utility` | UnoCSS `presetWind4` (`uno.config.ts`): `theme` for colors/shadows, custom `rules` for `text-<role>`, `weight-*`, `duration-<tier>`, `rounded-box\|glyph`. |
| clsx + tailwind-merge | `cn` from `lib/utils.ts`; its class groups already know the local utilities, so `cn('text-body', 'text-muted-foreground')` keeps both. |
| `framer-motion` | `motion/react` (motion 13). |
| `typeClass(role)`, `useSize().type.<role>`, `--fs-*` / `--lh-*` | `text-<role>` / `text-<role>-compact` utilities over `--text-*` / `--leading-*`. Compact keeps the role's leading. |
| `fontWeights.semibold` + inline `fontVariationSettings` | `weight-normal\|medium\|semibold\|bold` utilities. |
| `duration-80\|160\|240`, a hex focus ring | `duration-fast\|moderate\|slow[-exit]`; `ring-focus-ring` / `border-focus-ring`. |
| `@/hooks/use-fluid-hover`, `@/components/fluid-hover-highlight` | `lib/use-fluid-hover.ts`, `lib/fluid-hover-highlight.tsx` (re-exported by `primitives/fluid-hover`). The fill is a `GooIndicator`: it melts from row to row. |
| `@/lib/elevated` (`Elevated`) | `primitives/surface`; tables in `lib/surface-classes.ts`, context in `lib/surface-context.tsx`. |
| `SizeProvider` from `@/lib/size-context` | `primitives/sizes`; the hooks stay in `lib/size-context.tsx`. |
| Popups enter with `scaleY`, tooltips slide + fade, indicators slide | The morph layer (`lib/use-morph.ts` + `lib/morph-layers.tsx`) and the liquid indicators (`lib/goo-indicator.tsx`). |
| `<MotionConfig reducedMotion="user">` at the root | No root wrapper here. Read `useReduceMotion()` (`lib/reduced-motion.ts`): the OS setting or a MotionConfig asking for it. |
| React 19 (`ref` as a prop, 1-arg `useRef(null)`) | React 18.3: `forwardRef`, `useRef<T \| null>(null)`, `MutableRefObject` casts where a forwarded ref is written. |
| `next/link`, `"use client"`, RSC | Plain anchors; no directive; no server components. |
| `nestedRadius()`, `useSize().field` / `fieldTouchClass`, `.typeset`, Banner, ChatMessage, AskUserQuestions, ThinkingSteps, CommandMenu, CarouselDots | Not in this port (pinned at `b3587bd`). Don't import them. Port one as its own item if you need it (authoring.md). |
| `scripts/stack.mjs`, audit files, decisions records | Not needed: the stack is fixed and documented in `README.md`. Verify with the checks in authoring.md. |

## Workflow: a new component

1. **Does it need to exist?** Search [references/components.md](references/components.md). Most asks are
   a composition (a settings panel is Dialog + TabsSubtle + InputGroup + Switch) or a prop on an
   existing item. Compose in an example or a block before adding an item; wrap a shipped item rather
   than forking it (AlertDialog is 77 lines over Dialog's parts).
2. **Pick the home.** `primitives/` for a system or building piece, `components/[inputs|navigation|overlays]/`
   for a control, `blocks/` for a composition. Folder name = id (kebab-case); default export =
   PascalCase.
3. **Behavior from Base UI.** Focus management, dismissal, positioning, typeahead, roving focus, ARIA
   and scroll lock come from `@base-ui/react/<part>`. The design system only draws on top of it.
4. **Look and motion from the systems** below. Each one is a checklist item, not an option.
5. **State both ways.** `value` / `defaultValue` / `onValueChange` (and `open` / `defaultOpen` /
   `onOpenChange`) through `useControllableState`, so examples run without hooks.
6. **Document.** Header comment, a `interface XProps` with one member per line, each described and
   ending in "Defaults to `x`." where it has one, then TSDoc (lead sentence, concept paragraph, Statics
   list) and `@example {@include ./examples.mdx}`.
7. **Verify** ([authoring.md](references/authoring.md#verify)): typecheck, lint, the style grep, then look
   at it in the dev server in light, dark, compact, by keyboard and with reduced motion.

## The systems, as code

Paths below are relative to `demo/design-systems/ui/`.

### Tokens → utilities

| Visual | Use | Never |
|---|---|---|
| Text color | `text-foreground`, `text-muted-foreground`, `text-background` (on ink), `text-destructive`, `text-status-*` | `text-foreground/60`, a third grey, `text-[#…]` |
| Fills | `bg-surface-N` via `SURFACE_BG[level]`, `bg-muted`, `bg-accent`, `bg-hover`, `bg-active`, `bg-brand`, `bg-status-*/16`, `bg-scrim` | `bg-white`, `bg-neutral-100`, a hard-coded surface |
| Lines | `border-border`, `ring-border`, 1px | thicker borders, colored borders |
| Type | `text-display\|title\|subtitle\|body\|caption\|micro[-compact]` | `text-sm`, `text-[13px]`, `leading-*` on a role (it ships its own) |
| Weight | `weight-normal\|medium\|semibold\|bold` | `font-medium`, `font-semibold`, `fontWeight` |
| Elevation | `SURFACE_BG[level]` + `SURFACE_SHADOW[n]` from `lib/surface-classes`, or `<Elevated offset>` | `shadow-md`, `shadow-[…]`, template strings `bg-surface-${n}` |
| Radius | `useShape()` slots; `rounded-box` / `rounded-glyph` / `rounded-full` for small boxes | `rounded-[10px]`, a radius that ignores pill mode |
| Motion | `spring.*` from `lib/springs`; `duration-<tier>` / `delay-<tier>` in CSS | `duration: 0.2`, `ease-in-out`, `duration-[200ms]` |
| Focus | `outline-none focus-visible:ring-1 focus-visible:ring-focus-ring` | `ring-2`, `ring-blue-*`, an outline offset of your own |

A step the scale lacks gets a token first: the var in `tokens/<group>.css` (or `surface.css`), its
mapping in `uno.config.ts` (`theme` for a color or shadow, a `rule` for a new utility family), and a
class group in `lib/utils.ts` when the utility's prefix could be mistaken for another group by `cn`.
Biome already rejects arbitrary token values and literal colors (`biome/*.grit`).

### Size ladder (`lib/size-context.tsx`, `primitives/sizes`)

```tsx
const size = useSize(sizeProp) // explicit prop > surrounding SizeProvider > 'default'
size.control      // 'h-9' | 'h-7' — bounded controls AND list rows
size.text         // 'text-body' | 'text-body-compact'
size.px / size.itemPx / size.gap / size.icon / size.segmentItem / size.segmentPad
size.variant      // 'default' | 'compact' — for `compact ? 'text-caption-compact' : 'text-caption'`
```

A compound that takes `size` wraps its subtree in `<SizeProvider size={size}>` so its parts and the
menus it opens follow (see `Tabs`). Never invent a third height.

### Shape (`lib/shape-context.tsx`)

`const shape = useShape()` → `shape.item`, `shape.bg`, `shape.button`, `shape.input` (8px rounded / 20px
pill), `shape.container` (12 / 24), `shape.focusRing` (10 / 22, for a ring drawn 2px outside),
`shape.mergedBg`, and the numbers `shape.bgRadius` / `shape.mergedRadius` for JS geometry.

### Surfaces (`primitives/surface`, `lib/surface-*`)

```tsx
const level = Math.min(useSurface() + 2, 8) // +1 code, +2 popups, +3 the tabs indicator, +4 dialogs
<SurfaceProvider value={level}>
  <div className={cn(SURFACE_BG[level], SURFACE_SHADOW[3], shape.container)}>…</div>
</SurfaceProvider>
```

Re-provide the level so anything nested lifts above you. Menus keep a fixed `SURFACE_SHADOW[3]`;
dialogs and sheets use `SURFACE_SHADOW[level]`. `<Elevated offset={2}>` does both for a plain div.

### Type and weight

Pick the role by purpose (DESIGN.md › Typography): body for controls and rows, caption for secondary
lines, subtitle for card/popover titles, title for dialog and section titles, display for the page
title only. Text that changes weight with state uses the ghost-span pattern
([motion.md](references/motion.md#weight-without-reflow)). Fixed-height labels add
`[text-box:trim-both_cap_alphabetic]`. Sentence case; no `uppercase`, no `tracking-*`.

### Motion (`lib/springs.ts`)

```tsx
transition={spring.moderate}                              // enter: spring
exit={{ opacity: 0, transition: spring.moderate.exit }}   // exit: tween, one tier quicker
const { exit: _exit, ...enter } = spring.moderate         // when a transition object must not carry `exit`
transition={open ? spring.fast : spring.fast.exit}        // a flipped target with no unmount
```

Tier by size of what moves: `fast` hover, rings, fades, strokes, weights; `moderate` indicators,
thumbs, small panels, widths; `slow` large surfaces and shared parts; `goo` only through the morph
engine. Animate `transform` / `opacity`; only the morph engine and `GooIndicator` write boxes. Respect
`useReduceMotion()`: drop travel, keep fades.

### Fluid hover (`primitives/fluid-hover`, `lib/use-fluid-hover.ts`)

Every list, menu, strip or grid with hover gets exactly one highlight. Simple lists use the
`FluidHover` container (`items` or `FluidHover.Item` children); anything custom uses
`useFluidHover(containerRef, { axis })` + `useRegisterFluidHoverItem` + `<FluidHoverHighlight hover>`.
Rows carry no `:hover` fill of their own. Only click targets register. Recipe:
[motion.md](references/motion.md#fluid-hover).

### Liquid indicators (`lib/goo-indicator.tsx`)

Anything that travels between items (an active pill, a thumb, a current-page marker) is a
`<GooIndicator rect={…} className={cn(fill, shape.bg)} shadow? transition? opacity? />` rendered beneath
the items in their `relative` container, positioned from `useFluidHover`'s `itemRects`. Runs of
contiguous selections use `useSelectionRuns` + `useMergeSplitBlocks` + `SelectionBackgrounds`
(`lib/use-merge-split.tsx`). Recipe: [motion.md](references/motion.md#liquid-indicators).

### Morphing overlays (`lib/use-morph.ts`, `lib/morph-layers.tsx`, `lib/morph-part.tsx`)

Every new floating surface grows out of its source. Root: `useMorphOrigin()` and call `capture(details)`
in Base UI's `onOpenChange` on open. Content: `useMorph(open, origin, { from, effect, hideSource,
tier })`, `popupRef` on the Base UI `Popup`, `<MorphSurface>` inside it with the level's bg and shadow
and `shape.container`. Expose `from` / `effect` / `hideSource` / `tier` with the standard prop docs.
Shared parts between trigger and panel are `MorphPart`s. Recipe and the copyable reference:
[motion.md](references/motion.md#morphing-overlays).

### Focus and keyboard

Controls: `outline-none focus-visible:ring-1 focus-visible:ring-focus-ring`. Lists and popups: one
ring rect (`border border-focus-ring`, `shape.focusRing`, 2px outside the row) that springs between
rows on `spring.fast`, shown only for keyboard focus (`useKeyboardNavGate` in popups; `:focus-visible`
elsewhere). Natively focusable things nothing styles get the global fallback ring from `global.css`.

### Icons (`lib/icon-context.tsx`)

Items take icons as `IconComponent` props or read `useIcon('<name>')` (Lucide by default, swappable via
`IconProvider`). A name the set lacks gets added to `IconName` and `defaultIcons` rather than imported
from `lucide-react` inside an item (examples may import Lucide directly). Size from `size.icon`;
`strokeWidth` 1.5 at rest, 2 when hovered or active, with `transition-[color,stroke-width] duration-fast`.
Icon-only controls need an `aria-label`.

## The quality bar

What makes it read as this system rather than "a component library":

- **Nothing moves that didn't change.** Labels hold their width through weight changes; a loading
  button keeps its box; a growing search covers its neighbours instead of pushing them.
- **What is lit is what a click hits.** One highlight per list, on the nearest row, gap clicks routed to
  it; disabled rows never light.
- **Things come from somewhere and go back there.** Overlays grow from their trigger, the press point
  or an edge, and close back into it. Indicators travel; they never jump or cross-fade between items.
- **Keyboard gets a ring, the pointer never does.**
- **Rows line up with their trigger** (one control height), and density changes the whole region.
- **Exits are quicker than entrances**, and nothing bounces except the slow tier and the goo.
- **States are complete:** hover, pressed, focus-visible, selected, disabled (`opacity-50
  pointer-events-none`, faded in step with `transition-[color,opacity]`), loading, empty, error, and
  touch (hover-only affordances are always shown under `pointer-coarse`; `useTouchPrimary` skips custom
  scroll machinery).
- **Text survives:** `min-w-0` + `truncate` in flex rows; balanced headings; trimmed fixed-height labels.
- **Light and dark are both designed**, and a menu inside a dialog still lifts.

## Gotchas

- **UnoCSS only sees literal class names**, scanned from disk (`{lib,primitives,components,blocks}/**`
  and `modo.components.tsx`). Pick dynamic classes from literal tables (`SURFACE_BG[level]`), never
  template strings. `transition-[x]` with a property wind4 doesn't know needs `theme.property` in
  `uno.config.ts`.
- **One shared esbuild build** makes contexts (size, shape, surface, morph scope) cross items. Import the
  `lib/*` module; never copy a context into an item.
- **The docs parser is strict** (authoring.md): props come only from members declared one per line in a
  same-file interface; a `forwardRef`'s first type argument has no `<` or `,`; statics are attached by
  assignment (`X.Part = …`) or `Object.assign` with a typed cast; examples are hook-free plain JS.
- **Base UI unmounts a closed popup when `getAnimations()` settles.** JS-driven exits need a hold
  (`holdExit` in `use-morph.ts`); `useMorph` already does it.
- **Vendored files keep upstream formatting** and list every local change in their header; local files
  use the repo style (single quotes, no semicolons). Don't restyle a vendored component in place:
  compose or wrap it. If its behavior must change, record the change in its header and in `README.md`'s
  file map.
- **Two `modo dev` servers in one DS share `.modo-tmp/build`.** Use the runner (it kills strays).
- **Chrome restyling** goes through `data-modo` attributes in `global.css`, never lib CSS.

## The Craft page

`primitives/craft` puts a naive version next to the system's item, one rule per pair: weight without
reflow, hover that never blinks, a press that keeps its shape, copy from anywhere, overlays that come
from somewhere, indicators that travel, surfaces that lift at any depth, a ring only for the keyboard.
When a review turns up a new rule worth teaching, add a pair: the bad side goes in
`primitives/craft/demos.tsx` (a small component breaking exactly that one rule and nothing else, on
tokens), the good side is the shipped item used in `examples.mdx`, and each side gets a one-line
`badNote` / `goodNote` written from what a user sees.

## Review checklist

Biome covers arbitrary token values and literal colors. This grep covers the rest of the language;
every hit is a question, not a verdict (a `hover:bg-hover` on a standalone control is fine, on a row
of a fluid-hover list it's a bug; `transition-colors` is fine unless the weight changes too):

```bash
rg -n -e 'font-(normal|medium|semibold|bold)\b' -e "from 'framer-motion'" -e '\b(uppercase|tracking-[a-z]+)\b' -e 'text-(foreground|muted-foreground)/[0-9]' -e '(duration|delay): ?[0-9.]+' -e 'useReducedMotion\(' -e 'hover:bg-' -e 'transition-colors' -e '"use client"' demo/design-systems/ui/<your files>
```

Then answer, for the change as a user sees it: does every list have one highlight? does every overlay
grow from its source? does every traveling marker melt? do light, dark, compact and reduced motion all
hold? would a row inside the popup line up with its trigger?

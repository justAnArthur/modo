# The ui catalog

Everything `ui` ships, what each item is for, and which systems it is built on.
Paths are relative to that folder. Before adding an item, find the closest one here: most asks are a
composition or a prop. For the full API read the item's `index.tsx` (its props interface and TSDoc);
for upstream's exact craft read the matching section of [upstream-craft.md](upstream-craft.md).

Legend for the systems column: **L** size ladder, **S** surface level, **H** fluid hover, **G** liquid
indicator (`GooIndicator` / selection runs), **M** morph layer, **W** weight ghost-span, **C**
controlled + uncontrolled.

## Need → item

| You need | Reach for |
|---|---|
| An action | `Button` (`primary` / `secondary` / `tertiary` / `ghost`; `icon` sizes; `loading`; `asChild` for links) |
| A status or category label | `Badge` (`solid` / `dot`, 17 colors; changes animate) |
| A text field, with label and error | `InputGroup` + `InputGroup.Field` |
| A read-only value to copy | `Copy` |
| A chat or prompt composer | `InputMessage` (attachments, queue, send/stop) |
| One of a few options, all visible | `Radio.Group`, or `TabsSubtle` for a view switch |
| Several of a few options | `Checkbox.Group` |
| One of many options | `Select`; typed filtering → `Combobox` (`multiple`, `creatable`) |
| An on/off setting | `Switch` |
| A number in a range | `Slider` (pips by default, compact = dense fill + range) |
| A color | `ColorPicker` (inline) or `ColorPicker.Popover` |
| Switching views | `Tabs` (segmented, elevated indicator) or `TabsSubtle` (pills) |
| Collapsible sections | `Accordion` / `Accordion.Group` |
| App navigation | `Sidebar` (+ the `SidebarApp` block for a full shell) |
| A menu of actions or choices | `Dropdown` (inline panel or popup; search, filter, single/multi check) |
| Right-click / long-press actions | `ContextMenu` |
| ⌘K palette | `Command` |
| A search box | `Search` (pill or icon that grows in place; suggestions) |
| A small floating panel | `Popover` (`openOnHover` for hover panels) |
| A preview behind a link | `PreviewCard` |
| A short hint | `Tooltip` |
| A blocking task | `Dialog` (`sm` / `lg` / `xl`) |
| A confirm that must be answered | `AlertDialog` |
| A panel on an edge, swipeable | `Sheet` (`side`, `snapPoints`) |
| A transient notice | `Toast` (`useToast()`, six states, promise toasts) |
| Grouped content, clickable tiles | `Card` / `Card.Group` (`columns` grid with xy hover) |
| Tabular data | `Table` |
| "Working…" | `ThinkingIndicator` (`shimmer` or `goo`) |
| A scroll region | `ScrollArea` (+ `scroll-fade`) |
| A raised container | `Elevated` (`offset`) |
| A dense region | `SizeProvider size="compact"` |
| A custom hover list | `FluidHover` (+ the re-exported hook for custom lists) |
| Source code | `Code` |
| A before / after comparison in the docs | `Craft` |

## primitives

| Item | Path | Statics / exports | What it is |
|---|---|---|---|
| `Elevated` | `primitives/surface` | `.Provider` (= `SurfaceProvider`); `useSurface`, `surfaceClasses` | The 8-level surface ladder: `min(substrate + offset, 8)`, re-provided. `surface.css` holds the levels and shadows. |
| `SizeProvider` | `primitives/sizes` | re-exports `useSize`, `useSizeVariant`, `useTypeScale`, `sizeMap`, `typeScale` | The 36 / 28 ladder for a region. |
| `FluidHover` | `primitives/fluid-hover` | `.Item`; re-exports `useFluidHover`, `useRegisterFluidHoverItem`, `FluidHoverHighlight` | One highlight per list on the nearest item; `axis`, `columns`, `items`, `disabledIndices`, `gapClick`. |
| `Motion` | `primitives/motion` | re-exports `spring`, `exitFallbackMs` | Docs stage for the spring tiers (plays one tier's enter and exit). |
| `Morph` | `primitives/morph` | `.Part` (= `MorphPart`) | Docs stage for the morph engine: `from` × `effect`, `hideSource`, `tier`; also documents the liquid indicators. |
| `ScrollArea` | `primitives/scroll-area` | `.Bar` | Hover-revealed thin thumb, native physics on touch, `viewportClassName` (pair with `scroll-fade`). |
| `Code` | `primitives/code` | — | sugar-high tokens in `--syntax-*`, one surface step up. Also the docs chrome's Code slot. |
| `Craft` | `primitives/craft` | `demos.tsx` (the bad sides) | Docs stage: a bad and a good version side by side (`bad`, `good`, `badNote`, `goodNote`). One rule per pair. |

## components (ungrouped)

| Item | Path | Statics | Systems | Notes |
|---|---|---|---|---|
| `Button` | `components/button` | — | L C | Press shrinks the fill 1px/side; icons thicken; `loading` folds into a circle (box unchanged); `active` forces pressed. Serves the chrome's Button slot. |
| `Badge` | `components/badge` | — | L | `variant` `solid` \| `dot`, `color`, `size`; a new label springs width and blur-crossfades. |
| `Card` | `components/card` | `.Group .Header .Title .Description .Action .Content .Footer .Media .Image .Eyebrow .Feature .Button` | L H W | Transparent and borderless; only clickable cards join the group's hover; stretched link. |
| `Table` | `components/table` | `.Header .Body .Row .Head .Cell` | L H | Row hover, semantic markup. |
| `ThinkingIndicator` | `components/thinking-indicator` | — | — | `variant` `shimmer` (default) \| `goo` (three dots melting). |

## components/inputs

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Checkbox` | `.Group` | L H G C | Contiguous checks melt into one run (`useSelectionRuns` + merge/split blocks). |
| `Radio` | `.Group` | L H G C | Selected background is a `GooIndicator`; index or value mode. |
| `Select` | `.Trigger .Content .Item .Group .Label .Separator` | L S H M | Popup morphs out of the trigger; the check draws itself as the pick lands. |
| `Combobox` | `.Input .Chips .Content .List .Item .Empty` | L S H M | `multiple`, chips, `creatable`. |
| `Switch` | — | L G C | Thumb is a `GooIndicator` that stretches as it travels; on = `bg-brand`. |
| `Slider` | — | L C | Default: pips + scrubber; compact: fill, range, value. |
| `InputGroup` | `.Field` | L H W C | Fields share one hover; error state on Base UI Field. |
| `Copy` | — | L M | Click anywhere to copy; the glyph melts into a status disc behind the check. |
| `InputMessage` | — | L S C | Composer: auto-resize, actions, attachments, queue, status. |
| `ColorPicker` | `.Popover` | L S M | HEX / RGB / HSL / OKLCH, alpha, swatches, eyedropper. |
| `Search` | — | L S M C | Grows its own width in place (`spring.slow`) over its neighbours; suggestions ooze out; Escape closes → clears → collapses. |

## components/navigation

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Tabs` | `.List .Item .Panel` | L S H G W | Segmented well (`bg-muted`), +3 elevated indicator, hover pill that drips back into it. |
| `TabsSubtle` | `.Item .Panel` | L H G W C | Pill tabs; panels may sit inside the root. |
| `Accordion` | `.Group .Item .Trigger .Content` | L H M W C | Panel morphs out of its row; `highlight` `item` \| `trigger`. |
| `Sidebar` | `.Provider .Trigger .Rail .Inset .Input .Header .Content .Footer .Separator .Group .GroupLabel .GroupAction .GroupActions .GroupContent .Menu .MenuItem .MenuButton .MenuAction .MenuActions .MenuBadge .MenuSkeleton .MenuSub .MenuSubItem .MenuSubButton` | L S H G C | Liquid active rows and hover; `openOnHover`; collapsible rows; mobile `Sheet`. |

## components/overlays

All morph (`from`, `effect`, `hideSource`, `tier` on the content part) and lift +2 with
`shadow-surface-3`, except Dialog, AlertDialog and Sheet (+4, shadow at level) and Tooltip (inverted).

| Item | Statics | Notes |
|---|---|---|
| `Popover` | `.Trigger .Content .Title .Description .Close` | The reference morphing overlay. `openOnHover`, `side`, `align`, `sideOffset` (= the neck, 12). |
| `PreviewCard` | `.Trigger .Content` | Hover card from a link; `delay`, `closeDelay`. |
| `Tooltip` | `.Provider .PortalContainer` | Inverted; grouped hand-off is instant; `followCursor` fades. |
| `Dropdown` | `.Menu .Trigger .Content .Item .Label .Separator .Search .Empty` | Inline or popup; `filter` search; checked index / indices. |
| `ContextMenu` | `.Trigger .Content .Item .Label .Separator` | Grows from the press point; rows are Dropdown's `MenuItem`. |
| `Command` | `.Trigger .Content .Palette .Shortcut` | ⌘K; grouped commands; one fluid highlight follows Base UI's. |
| `Dialog` | `.Trigger .Content .Header .Footer .Title .Description .Close` | `size` `sm` \| `lg` \| `xl`, `position`, `showCloseButton`; backdrop fades with the morph; scopes `Morph.Part`. |
| `AlertDialog` | as Dialog | Always modal, no outside dismissal, no ✕ by default. Built by composing Dialog's parts. |
| `Sheet` | Dialog's + `.Provider .Indent` | Base UI Drawer; grows from its edge; a swipe-dismiss slides on from the release point. |
| `Toast` | `.Trigger`; `useToast()` | Pill melts into a body; six `--status-*` states; promise toasts. |

## blocks

| Item | Path | Notes |
|---|---|---|
| `SidebarApp` | `blocks/sidebar-app` | A full app shell (FF preset `sa1FQfCxH6`): workspace header, search, nav, user footer, inset topbar. `variant`, `side`, `openOnHover`, `contained`. |

## Shared system files (`lib/`)

| File | Exports | Use it for |
|---|---|---|
| `springs.ts` | `spring.{fast,moderate,slow,goo}`, `exitFallbackMs` | Every transition. |
| `size-context.tsx` | `useSize`, `useSizeVariant`, `useTypeScale`, `SizeContext`, `sizeMap`, `typeScale` | The ladder. |
| `shape-context.tsx` | `useShape`, `ShapeProvider`, `shapeMap` | Radii (rounded / pill). |
| `surface-context.tsx`, `surface-classes.ts` | `useSurface`, `SurfaceProvider`; `SURFACE_BG`, `SURFACE_SHADOW`, `surfaceClasses` | Elevation. |
| `use-fluid-hover.ts`, `fluid-hover-highlight.tsx` | `useFluidHover`, `useRegisterFluidHoverItem`, `pickNearest`, `ItemRect`; `FluidHoverHighlight` | One highlight per list. |
| `goo-indicator.tsx` | `GooIndicator`, `GooLayer`, `union` | Anything that travels between items. |
| `use-merge-split.tsx` | `useSelectionRuns`, `useMergeSplitBlocks`, `SelectionBackgrounds` | Merged backgrounds for contiguous selections. |
| `use-morph.ts` | `useMorph`, `useMorphOrigin`, `opensInPlace`, `inPlaceOffset`, `holdExit`, `GOO_MATRIX`, `GOO_BLUR_RATIO` | The morph engine. |
| `morph-layers.tsx` | `MorphSurface`, `GooFilter` | The morph renderer; the goo filter for opaque shapes. |
| `morph-part.tsx` | `MorphPart`, `MorphPartScope`, `MorphPartInOverlay` | Shared trigger ↔ panel parts. |
| `reduced-motion.ts` | `useReduceMotion` | The one reduced-motion read. |
| `use-controllable-state.ts` | `useControllableState` | `value` / `defaultValue` / `onChange` in one line. |
| `slot.ts` | `SlotProps`, `slotRender` | `render={<Button/>}` / `asChild` on any part that wraps a control. |
| `popup.ts` | `popupScrollAreaClass`, `popupViewportClass`, `POPUP_NAV_KEYS`, `isDisabledRow` | Popup list scrolling and row rules. |
| `use-keyboard-nav-gate.ts` | `useKeyboardNavGate` | Show a popup's ring only after keyboard use. |
| `use-touch-primary.tsx` | `useTouchPrimary` | Skip pointer-only machinery on touch. |
| `icon-context.tsx` | `useIcon`, `useIcons`, `IconProvider`, `IconName`, `IconComponent` | Icons. |
| `utils.ts` | `cn` | Class merging that knows the local utilities. |

## Which file to copy

| Building | Start from |
|---|---|
| An anchored morphing overlay | `components/overlays/popover/index.tsx` (241 lines, local style) |
| A modal overlay | `components/overlays/dialog/index.tsx`; reuse its parts like `alert-dialog/index.tsx` does |
| A menu with rows | `components/overlays/context-menu/index.tsx` (rows from `dropdown/menu-item.tsx`) |
| A control that grows in place | `components/inputs/search/index.tsx` |
| A strip with a traveling indicator | `components/navigation/tabs-subtle/index.tsx`, `tabs/index.tsx`; or the template in [authoring.md](authoring.md) |
| Multi-select with merged runs | `components/inputs/checkbox/index.tsx` |
| A state morph inside a control | `components/button/index.tsx` (`useLoadingMorph`), `copy/index.tsx` (glyph goo) |
| A hook-free docs stage for an interactive example | `components/badge/change-demo.tsx`, `components/button/loading-demo.tsx` |
| A goo composition of opaque shapes | `components/overlays/toast/index.tsx`, `thinking-indicator` (`variant="goo"`) |

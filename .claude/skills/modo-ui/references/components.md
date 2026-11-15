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
| A multi-line text field | `Textarea` (+ `Label`) |
| A read-only value to copy | `Copy` |
| A chat or prompt composer | `InputMessage` (attachments, queue, send/stop) |
| One of a few options, all visible | `Radio.Group`, or `Tabs variant="subtle"` for a view switch |
| Several of a few options | `Checkbox.Group` |
| One of many options | `Select`; typed filtering → `Combobox` (`multiple`, `creatable`) |
| An on/off setting | `Switch` |
| A number in a range | `Slider` (pips by default, compact = dense fill + range) |
| A color | `ColorPicker` (inline) or `ColorPicker.Popover` |
| A date, range, time, duration or month | `DatePicker`, `DateRangePicker`, `TimePicker`, `DurationPicker`, `MonthPicker`; `Calendar` inline |
| Switching views | `Tabs` (`variant="segmented"`: elevated indicator; `"subtle"`: pills) |
| Collapsible sections | `Accordion` / `Accordion.Group` |
| App navigation | `Sidebar` (+ the `SidebarApp` block for a full shell) |
| A menu of actions or choices | `Dropdown` (inline panel or popup; search, filter, single/multi check) |
| Right-click / long-press actions | `ContextMenu` |
| ⌘K palette | `Command` |
| A search box | `Search` (pill or icon that grows in place; suggestions) |
| A small floating panel | `Popover` (`openOnHover` for hover panels) |
| A preview behind a link | `PreviewCard` |
| A short hint | `Tooltip` |
| A blocking task | `Dialog` (`Dialog.Content width`: `sm` / `lg` / `xl`) |
| A confirm that must be answered | `AlertDialog` |
| A panel on an edge, swipeable | `Sheet` (`side`, `snapPoints`) |
| A transient notice | `Toast` (`useToast()`, six states, promise toasts) |
| Grouped content, clickable tiles | `Card` / `Card.Group` (`columns` grid with xy hover; selection both ways) |
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
| `Card` | `components/card` | `.Group .Header .Title .Description .Action .Content .Footer .Media .Image .Eyebrow .Feature .Button` | L H W C | Transparent and borderless; only clickable cards join the group's hover; stretched link. A card with a `value` selects itself in `Card.Group` (`value` / `defaultValue` / `onValueChange`). `Card.Button` is a compact `Button`. |
| `Table` | `components/table` | `.Header .Body .Row .Head .Cell` | L H | Row hover, semantic markup. |
| `Copy` | `components/copy` | — | L M | Click anywhere to copy; the glyph melts into a status disc behind the check. |
| `ThinkingIndicator` | `components/AI/thinking-indicator` | — | — | `variant` `shimmer` (default) \| `goo` (three dots melting). |
| `InputMessage` | `components/AI/input-message` | — | L S C | Composer: auto-resize, actions, attachments, queue, status, history. |

## components/inputs

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Checkbox` | `.Group` | L H G C | Contiguous checks melt into one run (`useSelectionRuns` + merge/split blocks). Rows take `disabled`, `name`, `value`. |
| `Radio` | `.Group` | L H G C | Selected background is a `GooIndicator`; index or value mode; `name` / `disabled` on the group. |
| `Select` | `.Trigger .Content .Item .Group .Label .Separator` | L S H M C | Popup morphs out of the trigger; the check draws itself as the pick lands; a pick holds the popup 300ms; keyboard ring in the list; `name`. |
| `Combobox` | `.Input .Chips .Content .List .Item .Empty` | L S H M C | `multiple`, chips, `creatable`; no ring in the list (the input keeps focus); `name`. |
| `Switch` | `.Group` | L G C | Thumb is a `GooIndicator` that stretches as it travels; on = `bg-brand`; `description`, `trackSide`; `name` / `value`. |
| `Slider` | — | L C | Default: pips + scrubber; compact (or any compact-only prop): fill, range, value. `onValueChange`, `name`. |
| `Input`, `InputGroup` | `.Field` | L H W C | `Input` stands alone (`onValueChange`, `invalid`, `variant`); fields share one hover; error state on Base UI Field; a field takes a Textarea or picker as children. |
| `Textarea` | — | L C | Multi-line Input on the field ladder; grows from `minRows` to `maxRows`, then scrolls; `onValueChange`. |
| `ColorPicker` | `.Popover` | L S M C | HEX / RGB / HSL / OKLCH, alpha, swatches, eyedropper; `name`. |
| `Calendar` | — | L H | `inputs/date-time`. react-day-picker in one scrolling list of months, month and year columns (`columnsSide`); DayPicker props pass through. |
| `DatePicker`, `DateRangePicker`, `TimePicker`, `DurationPicker`, `MonthPicker` | — | L S M C | `inputs/date-time`. A field whose panel morphs out of it (a `Sheet` under 640px); `value` with `null` for empty; `disabled` (the field) and `disabledDays` (matchers); `name`; a react-day-picker `locale`. |
| `Search` | — | L S M C | Grows its own width in place (`spring.slow`) over its neighbours; suggestions ooze out; Escape closes → clears → collapses. |

## components/navigation

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Tabs` | `.List .Item .Panel` | L S H G W C | `variant="segmented"`: a well (`bg-muted`), +3 elevated indicator, hover pill that drips back into it. `"subtle"`: a borderless strip with a `bg-active` pill, manual activation, `activeLabel`. |
| `Accordion` | `.Group .Item .Trigger .Content` | L H M W C | Panel morphs out of its row; `highlight` `item` \| `trigger`. |
| `Sidebar` | `.Provider .Trigger .Rail .Inset .Input .Header .Content .Footer .Separator .Group .GroupLabel .GroupAction .GroupActions .GroupContent .Menu .MenuItem .MenuButton .MenuAction .MenuActions .MenuBadge .MenuSkeleton .MenuSub .MenuSubItem .MenuSubButton` | L S H G C | Liquid active rows and hover; `openOnHover`; collapsible rows; `[` / `]` toggles (`shortcutScope`); rows on the ladder; mobile `Sheet`. |

## components/overlays

All morph (`from`, `effect`, `hideSource`, `tier` on the content part) and lift +2 with
`shadow-surface-3`, except Dialog, AlertDialog and Sheet (+4, shadow at level) and Tooltip (inverted).

| Item | Statics | Notes |
|---|---|---|
| `Popover` | `.Trigger .Content .Title .Description .Close` | The reference morphing overlay. `openOnHover`, `side`, `align`, `sideOffset` (= the neck, 12). |
| `PreviewCard` | `.Trigger .Content` | Hover card from a link; `delay`, `closeDelay`. |
| `Tooltip` | `.Provider .PortalContainer` | Inverted; `open` / `defaultOpen`, `side`, `align`, `container`; grouped hand-off is instant; `followCursor` fades. `.PortalContainer` scopes every overlay's portal. |
| `Dropdown` | `.Menu .Trigger .Content .Item .Label .Separator .Search .Empty` | Inline or popup; `filter` search; checked index / indices; `shortcut` on `Dropdown.Item`; opens with its first row focused. |
| `ContextMenu` | `.Trigger .Content .Item .Label .Separator` | Grows from the press point; rows are Dropdown's `MenuItem` (`shortcut`), and it shares Dropdown's selection and search. |
| `Command` | `.Trigger .Content .Palette .Shortcut` | ⌘K; grouped commands; one fluid highlight follows Base UI's. |
| `Dialog` | `.Trigger .Content .Header .Footer .Title .Description .Close` | `width` `sm` \| `lg` \| `xl` on the content, `position`, `showCloseButton`, `container`; backdrop fades with the morph; scopes `Morph.Part`. |
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
| `springs.ts` | `spring.{fast,moderate,slow,goo}`, `springEnter`, `exitFallbackMs` | Every transition. |
| `size-context.tsx` | `useSize`, `useSizeVariant`, `useTypeScale`, `SizeContext`, `sizeMap`, `typeScale` | The ladder. |
| `shape-context.tsx` | `useShape`, `ShapeProvider`, `shapeMap` | Radii (rounded / pill). |
| `surface-context.tsx`, `surface-classes.ts` | `useSurface`, `useLift`, `SurfaceProvider`; `SURFACE_BG`, `SURFACE_SHADOW`, `surfaceClasses` | Elevation. |
| `use-fluid-hover.ts`, `fluid-hover-highlight.tsx` | `useFluidHover`, `useRegisterFluidHoverItem`, `ItemRect`; `FluidHoverHighlight` | One highlight per list. |
| `goo-indicator.tsx` | `GooIndicator`, `GooLayer`, `union` | Anything that travels between items. |
| `use-merge-split.tsx` | `useSelectionRuns`, `useMergeSplitBlocks`, `SelectionBackgrounds` | Merged backgrounds for contiguous selections. |
| `use-morph.ts` | `useMorph`, `useMorphOrigin`, `opensInPlace`, `inPlaceOffset`, `holdExit`, `GOO_MATRIX`, `GOO_BLUR_RATIO` | The morph engine. |
| `morph-layers.tsx` | `MorphSurface`, `GooFilter` | The morph renderer; the goo filter for opaque shapes. |
| `morph-part.tsx` | `MorphPart`, `MorphPartScope`, `MorphPartInOverlay` | Shared trigger ↔ panel parts. |
| `reduced-motion.ts` | `useReduceMotion` | The one reduced-motion read. |
| `use-controllable-state.ts` | `useControllableState` | `value` / `defaultValue` / `onValueChange` in one line. |
| `slot.tsx` | `SlotProps`, `slotPart`, `slotRender`, `resolveSlotTemplate`, `slotElement` | `render={<Button/>}` / `asChild` on any part that wraps a control, or on a plain element. |
| `popup.ts` | `POPUP_SHAPE`, `popupScrollAreaClass`, `popupViewportClass`, `POPUP_NAV_KEYS`, `isDisabledRow` | The popup shape, list scrolling and row rules. |
| `overlay.tsx`, `popup-surface.tsx` | `useOverlayRoot`, `useOverlay`, `OverlayContext`, `AnchorProps`, `positionerProps`, `PortalContainer`, `usePortalContainer`; `PopupSurface` | An overlay's root state, anchoring, portal and lifted surface. |
| `popup-rows.tsx` | `rowClasses`, `rowLabelClass`, `RowIcon`, `CheckMark`, `PopupLabel`, `PopupSeparator` | A popup list's rows. |
| `row-group.tsx`, `focus-ring.tsx`, `row-index.tsx` | `useRowFocus`, `useRowGroup`, `focusRowOnPress`, `rowIndexOf`; `FocusRing`; `IndexedRows`, `useRowIndex`, `useRowPosition` | A list's keyboard focus, its ring and its row numbers. |
| `weight-label.tsx` | `WeightLabel` | A label that changes weight without reflowing. |
| `field-classes.ts` | `useFieldBox`, `focusControlOnPress`, `fieldVariants`, `fieldIconClasses`, `fieldTextInset`, `FieldStateContext` | The field ladder. |
| `use-keyboard-nav-gate.ts` | `useKeyboardNavGate` | Show a popup's ring only after keyboard use. |
| `use-touch-primary.tsx` | `useTouchPrimary` | Skip pointer-only machinery on touch. |
| `icon-context.tsx` | `useIcon`, `IconProvider`, `IconName`, `IconComponent` | Icons. |
| `utils.ts` | `cn` | Class merging that knows the local utilities. |

The rest (refs, rects, dates, the autosizing textarea) is listed in `ui/lib/README.md`.

## Which file to copy

| Building | Start from |
|---|---|
| An anchored morphing overlay | `components/overlays/popover/index.tsx` (166 lines, on the shared overlay helpers) |
| A modal overlay | `components/overlays/dialog/index.tsx`; reuse its parts like `alert-dialog/index.tsx` does |
| A menu with rows | `components/overlays/context-menu/index.tsx` (rows from `dropdown/menu-item.tsx`) |
| A control that grows in place | `components/inputs/search/index.tsx` |
| A strip with a traveling indicator | `components/navigation/tabs/` (`list.tsx`, `item.tsx`); or the template in [authoring.md](authoring.md) |
| Multi-select with merged runs | `components/inputs/checkbox/index.tsx` |
| A state morph inside a control | `components/button/index.tsx` (`useLoadingMorph`), `copy/index.tsx` (glyph goo) |
| A hook-free docs stage for an interactive example | `components/badge/change-demo.tsx`, `components/button/loading-demo.tsx` |
| A goo composition of opaque shapes | `components/overlays/toast/index.tsx`, `thinking-indicator` (`variant="goo"`) |

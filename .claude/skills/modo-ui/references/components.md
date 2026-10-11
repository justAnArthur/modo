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
| An action | `Button` (`primary` / `secondary` / `tertiary` (= `outline`) / `ghost`; `destructive` / `success` washes; `link`; `icon` sizes; `loading`; `asChild` for links) |
| A status or category label | `Badge` (`solid` / `dot` / `outline`, 17 colors; changes animate) |
| A person's or a team's picture | `Avatar` (+ `.Image`, `.Fallback`) |
| A text field, with label and error | `InputGroup` + `InputGroup.Field` |
| A labelled field with help text or an error | `Field` (+ any field control) |
| A password reveal / unit / prefix | `Input` `endAdornment` + `InputAction` (`startAdornment` for a prefix) |
| A number with steppers or a format | `NumberInput` |
| File drop and picked-file list | `FileDropzone` + `FileDropzone.Row` |
| A multi-line text field | `Textarea` (+ `Label`) |
| A read-only value to copy | `Copy` |
| A chat or prompt composer | `InputMessage` (attachments, queue, send/stop) |
| One of a few options, all visible | `Radio.Group`, or `TabsSubtle` for a view switch |
| Several of a few options | `Checkbox.Group` |
| One of many options | `Select`; typed filtering → `Combobox` (`multiple`, `creatable`) |
| Remote options | `Combobox` `filter={null}` + `loading` + `Combobox.Content` `footer` |
| A typed date | `DatePicker` `editable` (masked input; the calendar still opens) |
| An on/off setting | `Switch` |
| A bare control beside your own label | `Checkbox` / `Radio` / `Switch` without `label` (a table cell, a hand-laid form) |
| A number in a range | `Slider` (pips by default, compact = dense fill + range) |
| A color | `ColorPicker` (inline) or `ColorPicker.Popover` |
| Switching views | `Tabs` (segmented, elevated indicator) or `TabsSubtle` (pills) |
| Collapsible sections | `Accordion` / `Accordion.Group` |
| App navigation | `Sidebar` (+ the `SidebarApp` block for a full shell) |
| Site navigation with flyouts | `NavigationMenu` |
| Paging through results | `Pagination` (`variant="input"` + page size for data tables) |
| A menu of actions or choices | `Dropdown` (inline panel or popup; search, filter, single/multi check) |
| Right-click / long-press actions | `ContextMenu` |
| ⌘K palette | `Command` |
| A search box | `Search` (pill or icon that grows in place; suggestions) |
| A small floating panel | `Popover` (`openOnHover` for hover panels; `anchor` + `--anchor-width` to sit under a field; `onOpenChange(open, details)` to tell or cancel the reason) |
| A preview behind a link | `PreviewCard` |
| A short hint | `Tooltip` |
| A blocking task | `Dialog` (`sm` / `lg` / `xl`) |
| A confirm that must be answered | `AlertDialog` |
| A panel on an edge, swipeable | `Sheet` (`side`, `snapPoints`) |
| A transient notice | `Toast` (`toast()` anywhere with `<Toast manager={toast}>`, or `useToast()`; six states, promise toasts) |
| Grouped content, clickable tiles | `Card` / `Card.Group` (`columns` grid with xy hover) |
| Tabular data | `Table` (sortable heads, `stacked` below md, `Table.Empty`) |
| Content still loading | `Skeleton` (one block sized like the content, or `rows`) |
| Progress of a task, or "still working" | `Progress` (`value`, none for indeterminate; `Progress.Spinner`) |
| A line between groups | `Separator` (`Card.Divider` inside a card) |
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
| `SizeProvider` | `primitives/sizes` | re-exports `useSize`, `useSizeVariant`, `useTypeScale`, `sizeMap`, `typeScale` (data in `lib/size-scale.ts`) | The 36 / 28 ladder for a region. |
| `FluidHover` | `primitives/fluid-hover` | `.Item`; re-exports `useFluidHover`, `useRegisterFluidHoverItem`, `FluidHoverHighlight` | One highlight per list on the nearest item; `axis`, `columns`, `items`, `disabledIndices`, `gapClick`. |
| `Motion` | `primitives/motion` | re-exports `spring`, `exitFallbackMs` | Docs stage for the spring tiers (plays one tier's enter and exit). |
| `Morph` | `primitives/morph` | `.Part` (= `MorphPart`) | Docs stage for the morph engine: `from` × `effect`, `hideSource`, `tier`; also documents the liquid indicators. |
| `ScrollArea` | `primitives/scroll-area` | `.Bar` | Hover-revealed thin thumb, native physics on touch, `viewportClassName` (pair with `scroll-fade`). |
| `Code` | `primitives/code` | — | sugar-high tokens in `--syntax-*`, one surface step up. Also the docs chrome's Code slot. |
| `Craft` | `primitives/craft` | `demos.tsx` (the bad sides) | Docs stage: a bad and a good version side by side (`bad`, `good`, `badNote`, `goodNote`). One rule per pair. |
| `Separator` | `primitives/separator` | — | The system's one 1px hairline (`border`), horizontal or vertical, on Base UI Separator. |
| `Skeleton` | `primitives/skeleton` | — | Loading placeholder: a `bg-skeleton` block pulsing in opacity on `--duration-loop`; `rows` on the size ladder, `bordered`. |

## components (ungrouped)

| Item | Path | Statics | Systems | Notes |
|---|---|---|---|---|
| `Button` | `components/button` | — | L C | Press shrinks the fill 1px/side; icons thicken; `loading` folds into a circle (box unchanged); `active` forces pressed. `outline` = `tertiary`; `destructive` / `success` are hue text on a wash, never solid; `link` is underlined text on the control height; `xs` → compact. `buttonVariants` in `variants.ts` (size aliases; `surface: true` styles an `<a>` as a button — static, prefer `asChild`); `loading` keeps focus. Serves the chrome's Button slot. |
| `Badge` | `components/badge` | — | L | `variant` `solid` \| `dot` \| `outline` (neutral hairline, no color), `color`, `size`; a new label springs width and blur-crossfades. `badgeVariants` in `variants.ts`. |
| `Card` | `components/card` | `.Group .Header .Title .Description .Action .Content .Footer .Media .Image .Eyebrow .Feature .Button .Divider` | L H W | Transparent and borderless (`border="outlined"` frames a standalone card); only clickable cards join the group's hover; stretched link; `.Divider` is a full-bleed hairline between parts. |
| `Avatar` | `components/avatar` | `.Image .Fallback` | L | One control tall; circle or square; fallback after a `delay`; 1px inset image edge; image fades in. |
| `Progress` | `components/progress` | `.Spinner` | L | Determinate fill slides on `spring.moderate`; no `value` sweeps a segment; `showValue`, Intl `format`; loops on `--duration-loop`. |
| `Table` | `components/table` | `.Header .Body .Footer .Row .Head .Cell .Caption .Empty` | L H | Row hover, semantic markup (body rows numbered in document order, no `index` needed); sortable heads (icon swap); `stacked` cards below md. |
| `ThinkingIndicator` | `components/thinking-indicator` | — | — | `variant` `shimmer` (default) \| `goo` (three dots melting). |

## components/inputs

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Checkbox` | `.Group` | L H G C | Contiguous checks melt into one run (`useSelectionRuns` + merge/split blocks); bare box when no label; `indeterminate`. |
| `Radio` | `.Group` | L H G C | Selected background is a `GooIndicator`; index or value mode; bare radios (by value) when no label. |
| `Select` | `.Trigger .Value .Content .Item .Group .Label .Separator` | L S H M | Popup morphs out of the trigger; the check draws itself as the pick lands; rows auto-numbered (`index` optional). |
| `Combobox` | `.Input .Chips .Content .List .Item .Empty` | L S H M | `multiple`, chips, `creatable`; `loading`, controlled `inputValue`, `filter={null}`, `readOnly`, `Content` `footer`. |
| `Switch` | — | L G C | Thumb is a `GooIndicator` that stretches as it travels; on = `bg-brand`; bare track when no label. |
| `Slider` | — | L C | Default: pips + scrubber; compact: fill, range, value. |
| `InputGroup` | `.Field` | L H W C | Fields share one hover; error state on Base UI Field. |
| `Input` | — | L C | The ringed box on its own; `startAdornment` / `endAdornment`, `readOnly`, `required`; `InputAction` (icon button inside the ring), `InputAdornment`. |
| `Label` | — | L | Field label inset to the field's text; invalid, size; Field.Label renders it. |
| `Field` | `.Label .Description .Error .Control` | L C | Base UI Field; no form library; state reaches field controls. |
| `NumberInput` | — | L C | NumberField; steppers inside the ring, Intl format, scrub. |
| `FileDropzone` | `.Row` | L C M | Drag accept / partial / reject state; files handed over, none kept; rows with status and progress. |
| `Textarea` | — | L C | Multi-line Input on the field ladder; grows from `minRows` to `maxRows`, then scrolls. |
| `Copy` | — | L M | Click anywhere to copy; the glyph melts into a status disc behind the check. |
| `InputMessage` | — | L S C | Composer: auto-resize, actions, attachments, queue, status. |
| `ColorPicker` | `.Popover` | L S M | HEX / RGB / HSL / OKLCH, alpha, swatches, eyedropper. |
| `Search` | — | L S M C | Grows its own width in place (`spring.slow`) over its neighbours; suggestions ooze out; Escape closes → clears → collapses. |
| `Calendar`, `DatePicker`, `DateRangePicker`, `TimePicker`, `DurationPicker`, `MonthPicker` (`inputs/date-time`) | — | L S H M C | A field on the field ladder whose panel morphs out of it (a bottom `Sheet` under 640px); one scrolling month list with month / year columns; `DatePicker` `editable` (masked input), `labels`, `formatDate`, string values. |

## components/navigation

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Tabs` | `.List .Item .Panel` | L S H G W | Segmented well (`bg-muted`), +3 elevated indicator, hover pill that drips back into it; node labels, `href` link tabs. |
| `TabsSubtle` | `.Item .Panel` | L H G W C | Pill tabs; panels may sit inside the root. |
| `Accordion` | `.Group .Item .Trigger .Content` | L H M W C | Panel morphs out of its row; `highlight` `item` \| `trigger`. |
| `Sidebar` | `.Provider .Trigger .Rail .Inset .Input .Header .Content .Footer .Separator .Group .GroupLabel .GroupAction .GroupActions .GroupContent .Menu .MenuItem .MenuButton .MenuAction .MenuActions .MenuBadge .MenuSkeleton .MenuSub .MenuSubItem .MenuSubButton` | L S H G C | Liquid active rows and hover; `openOnHover`; collapsible rows; mobile `Sheet`. |
| `NavigationMenu` | `.List .Item .Trigger .Content .Link .Indicator` | L S H G M W C | One flyout morphs from its trigger, springs between items' sizes. |
| `Pagination` | — | L H G W C | Template item: liquid current page, jump field, page-size Select, labels as props (`pageSizeAriaLabel` names the Select when the caption is empty). |

## components/overlays

All morph (`from`, `effect`, `hideSource`, `tier` on the content part) and lift +2 with
`shadow-surface-3`, except Dialog, AlertDialog and Sheet (+4, shadow at level) and Tooltip (inverted).

| Item | Statics | Notes |
|---|---|---|
| `Popover` | `.Trigger .Content .Title .Description .Close` | The reference morphing overlay. `openOnHover`, `side`, `align`, `sideOffset` (= the neck, 12), `anchor`, `alignOffset`, `collisionPadding`, `initialFocus`/`finalFocus`; `onOpenChange` details. |
| `PreviewCard` | `.Trigger .Content` | Hover card from a link; `delay`, `closeDelay`. |
| `Tooltip` | `.Root .Trigger .Content .Provider .PortalContainer` | Inverted; flat (`content`) or compound; grouped hand-off is instant; `followCursor` fades; provider takes Radix delay names. |
| `Dropdown` | `.Menu .Trigger .Content .Item .CheckboxItem .RadioGroup .RadioItem .Group .Label .Separator .Shortcut .Sub .SubTrigger .SubContent .Search .Empty` | Inline or popup; rows by `label` or children (optional `index`, `icon`, `inset`, `shortcut`, cancelable `onSelect(event)`); `filter` search; checked index / indices or value-keyed checkbox / radio rows, merged backgrounds; submenus morph from their row; keyboard ring; `asChild` trigger; `keepMounted`. |
| `ContextMenu` | `.Trigger .Content .Item .Label .Separator` | Grows from the press point; rows are Dropdown's `MenuItem`. |
| `Command` | `.Trigger .Content .Palette .Shortcut` | ⌘K; grouped commands; one fluid highlight follows Base UI's. |
| `Dialog` | `.Trigger .Content .Header .Footer .Title .Description .Close` | `size` `sm` \| `lg` \| `xl`, `position`, `showCloseButton`; backdrop fades with the morph; scopes `Morph.Part`. |
| `AlertDialog` | as Dialog + `.Action .Cancel` | Always modal, no outside dismissal, no ✕ by default; Action awaits a promise (loading, locked, stays open on reject). Built by composing Dialog's parts. |
| `Sheet` | Dialog's + `.Provider .Indent` | Base UI Drawer; grows from its edge; a swipe-dismiss slides on from the release point. |
| `Toast` | `.Trigger`; `useToast()`; global `toast()` | Pill melts into a body; six `--status-*` states; promise toasts; `<Toast manager={toast}>` renders `toast()` calls from anywhere. |

## blocks

| Item | Path | Notes |
|---|---|---|
| `SidebarApp` | `blocks/sidebar-app` | A full app shell (FF preset `sa1FQfCxH6`): workspace header, search, nav, user footer, inset topbar. `variant`, `side`, `openOnHover`, `contained`. |

## Shared system files (`lib/`)

| File | Exports | Use it for |
|---|---|---|
| `springs.ts` | `spring.{fast,moderate,slow,goo}`, `exitFallbackMs` | Every transition. |
| `size-context.tsx` | `useSize`, `useSizeVariant`, `useTypeScale`, `SizeContext`, `sizeMap`, `typeScale` | The ladder. |
| `size-scale.ts` | `sizeMap`, `typeScale`, `SizeVariant`, `SizeClasses` | The ladder's plain data, for server code (re-exported by `size-context.tsx`). |
| `field-classes.ts`, `field-variants.ts` | `useFieldBox`, `focusControlOnPress`, `FieldStateContext`, `useFieldState`; `fieldVariants`, `fieldIconClasses`, `fieldAdornmentClasses`, `FIELD_ACTION*`, `FIELD_PX` | The field ladder: a text control's box, state, adornments and actions (the tables are server-callable). |
| `shape-context.tsx` | `useShape`, `ShapeProvider`, `shapeMap` | Radii (rounded / pill). |
| `surface-context.tsx`, `surface-classes.ts` | `useSurface`, `SurfaceProvider`; `SURFACE_BG`, `SURFACE_SHADOW`, `surfaceClasses` | Elevation. |
| `use-fluid-hover.ts`, `fluid-hover-highlight.tsx` | `useFluidHover`, `useRegisterFluidHoverItem`, `pickNearest`, `ItemRect`; `FluidHoverHighlight` | One highlight per list. |
| `goo-indicator.tsx` | `GooIndicator`, `GooLayer`, `union` | Anything that travels between items. |
| `use-merge-split.tsx` | `useSelectionRuns`, `useMergeSplitBlocks`, `SelectionBackgrounds` | Merged backgrounds for contiguous selections. |
| `row-order.tsx` | `useRowOrder`, `useRowSlot`, `RowOrderContext` | Document-order numbering so rows need no `index`. |
| `use-morph.ts` | `useMorph`, `useMorphOrigin`, `opensInPlace`, `inPlaceOffset`, `holdExit`, `GOO_MATRIX`, `GOO_BLUR_RATIO` | The morph engine. |
| `morph-layers.tsx` | `MorphSurface`, `GooFilter` | The morph renderer; the goo filter for opaque shapes. |
| `morph-part.tsx` | `MorphPart`, `MorphPartScope`, `MorphPartInOverlay` | Shared trigger ↔ panel parts. |
| `reduced-motion.ts` | `useReduceMotion` | The one reduced-motion read. |
| `use-controllable-state.ts` | `useControllableState` | `value` / `defaultValue` / `onChange` in one line. |
| `slot.ts` | `SlotProps`, `slotRender` | `render={<Button/>}` / `asChild` on any part that wraps a control; children fill a `render` element that has none; `nativeButton={false}` for a non-button element. |
| `popup.ts` | `popupScrollAreaClass`, `popupViewportClass`, `POPUP_NAV_KEYS`, `isDisabledRow` | Popup list scrolling and row rules. |
| `use-keyboard-nav-gate.ts` | `useKeyboardNavGate` | Show a popup's ring only after keyboard use. |
| `focus-ring.tsx` | `FocusRing` | The keyboard ring of a list panel: one rect springing between rows (`shape` pins the radius). |
| `inert.ts` | `inertProps`, `markInert` | `inert` that works on React 18 and 19. |
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
| A masked text input | `components/inputs/date-time/date-picker/masked-date-input.tsx` |
| A control on the field box | `components/inputs/number-input/index.tsx` (`useFieldBox`, field actions) |
| A strip with a traveling indicator | `components/navigation/tabs-subtle/index.tsx`, `tabs/index.tsx`; or the template in [authoring.md](authoring.md) |
| Multi-select with merged runs | `components/inputs/checkbox/index.tsx` |
| A state morph inside a control | `components/button/index.tsx` (`useLoadingMorph`), `copy/index.tsx` (glyph goo) |
| A hook-free docs stage for an interactive example | `components/badge/change-demo.tsx`, `components/button/loading-demo.tsx` |
| A goo composition of opaque shapes | `components/overlays/toast/index.tsx`, `thinking-indicator` (`variant="goo"`) |

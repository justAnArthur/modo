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
| An action | `Button` (`primary` / `secondary` / `tertiary` / `outline` / `ghost` / `destructive` / `success` / `link`; `icon` sizes; `loading`; `asChild` for links) |
| A status or category label | `Badge` (`solid` / `dot` / `outline`, 17 colors; changes animate) |
| A person's or team's picture | `Avatar` (`.Image`, `.Fallback`; `shape` `circle` / `square`) |
| A text field, with label and error | `Field` (`.Label`, `.Description`, `.Error`) around any control, or `InputGroup` + `InputGroup.Field` for a stack of fields |
| Text or an icon button inside a field | `Input` `startAdornment` / `endAdornment` with `InputAdornment` / `InputAction` |
| A number, with steppers or a unit | `NumberInput` (`format`, `scrub`, adornments) |
| A file upload | `FileDropzone` + `FileDropzone.Row` (drag verdicts, rejections, upload progress) |
| A multi-line text field | `Textarea` (in a `Field`, or with `Label`) |
| A read-only value to copy | `Copy` |
| A chat or prompt composer | `InputMessage` (attachments, queue, send/stop) |
| One of a few options, all visible | `Radio.Group`, or `Tabs variant="subtle"` for a view switch |
| One of a few options, each row rich (two lines, meters, row actions) | `ChoiceList` |
| Several of a few options | `Checkbox.Group` |
| One of many options | `Select`; typed filtering → `Combobox` (`multiple`, `creatable`) |
| An on/off setting | `Switch` |
| A settings panel (label left, control right) | `List` (`.Section`, `.Row`; `LIST_POPOVER`, `LIST_SWITCH`) |
| Key / value pairs (env vars, headers) | `KeyValue` (secret reveal, duplicate keys) |
| A number in a range | `Slider` (pips by default, compact = dense fill + range) |
| A color | `ColorPicker` (inline) or `ColorPicker.Popover` |
| A date, range, time, duration or month | `DatePicker`, `DateRangePicker`, `TimePicker`, `DurationPicker`, `MonthPicker`; `Calendar` inline |
| Switching views | `Tabs` (`variant="segmented"`: elevated indicator; `"subtle"`: pills; `href` for link tabs) |
| A site header menu | `NavigationMenu` (one panel morphing between triggers) |
| Page navigation | `Pagination` (`count`; `variant="input"` for tables) |
| Where you are in a hierarchy | `Breadcrumb` (folds the middle into a menu) |
| Collapsible sections | `Accordion` / `Accordion.Group` |
| App navigation | `Sidebar` (+ the `SidebarApp` block for a full shell) |
| A menu of actions or choices | `Dropdown` (inline panel or popup; search, filter, single/multi check; submenus) |
| Right-click / long-press actions | `ContextMenu` |
| ⌘K palette | `Command` |
| A search box | `Search` (pill or icon that grows in place; suggestions) |
| A small floating panel | `Popover` (`openOnHover` for hover panels) |
| A preview behind a link | `PreviewCard` |
| A short hint | `Tooltip` |
| A blocking task | `Dialog` (`Dialog.Content width`: `sm` / `lg` / `xl`) |
| A confirm that must be answered | `AlertDialog` (`.Action` waits on a returned promise or `pending`) |
| A panel on an edge, swipeable | `Sheet` (`side`, `snapPoints`) |
| A transient notice | `Toast` (`useToast()`, or the global `toast` with `<Toast manager={toast} />`; six states, promise toasts) |
| Grouped content, clickable tiles | `Card` / `Card.Group` (`columns` grid with xy hover; selection both ways) |
| Tabular data | `Table` (sortable heads, footer, caption, empty row, `stacked` cards when narrow) |
| Progress or a spinner | `Progress` (`value={null}` sweeps), `Progress.Spinner` |
| A share of a budget (usage, a context window) | `Meter` (`bar` / `line` / `ring`, `marker`, `tone`) |
| A run state (running, waiting, failed…) | `StatusDot`, `statusGlyph(status)` for an icon slot |
| A keyboard shortcut | `Kbd` (`outline` chip or `plain`) |
| "Nothing here yet" | `EmptyState` |
| A loading placeholder | `Skeleton` (a block, or `rows`) |
| A divider between groups | `Separator` |
| "Working…" | `ThinkingIndicator` (`shimmer` or `goo`) |
| A scroll region | `ScrollArea` (+ `scroll-fade`) |
| A list of thousands of rows | `VirtualList` (fixed or measured rows, `scrollToIndex`) |
| Drag to reorder | `Sortable` (`handle`, keyboard, `as="none"` in a host list; `useSortableHandle`) |
| Split panes | `Resizable` (`.Panel`, `.Handle`; nests) |
| A growing list pinned to its end (a log, a chat) | `VirtualList follow` (`onFollowChange`, `scrollToEnd()`) |
| Terminal or log output | `LogView` (ANSI colors, `follow` + jump to latest, `wrap`, `lineNumbers`) |
| Rendered markdown (a reply, a README) | `Markdown` (`streaming`; `Markdown.Prose` for hand-built rich text) |
| A file's change | `Diff` (unified patch, `path`, `wrap`) |
| A file tree, an outline | `Tree` |
| Rename in place | `EditableText` |
| Images full-window | `Lightbox` (`.Trigger` thumbnails) |
| A card in a tray, with a meta row | `ShellCard` (`.Inner`, `.Footer`) |
| A desktop app's window frame | `DesktopShell` |
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
| `Separator` | `primitives/separator` | — | The one hairline on Base UI's Separator; `orientation`. |
| `Skeleton` | `primitives/skeleton` | — | A `bg-skeleton` block pulsing on `--duration-loop`, or `rows` on the control height (`bordered` frames them); `aria-hidden`. |
| `Sortable` | `primitives/sortable` | `.Handle`; `useSortableHandle` | motion's `Reorder` by pointer or keyboard (Space, arrows, Escape), announced; `items`, `order` / `defaultOrder` / `onOrderChange`, `orientation`, `handle`, `as` (`ul` \| `ol` \| `none`). The held item lifts +2. |
| `VirtualList` | `primitives/virtual-list` | ref: `scrollToIndex(index, align)`, `scrollToEnd()` | Mounts only the rows in view; `count`, `renderItem`, `itemHeight` or measured (`estimateHeight`), `overscan`; scrolls itself or a surrounding ScrollArea; `follow` (+ `onFollowChange`) stays at the end of a growing list; `contentWidth` for rows wider than the viewport. |
| `Resizable` | `primitives/resizable` | `.Panel .Handle` | Split panes in percent; `direction`, `sizes` / `onSizesChange`, `step`; panels take `defaultSize`, `minSize`, `maxSize`, `collapsible`; the handle is a keyboard separator; a size set other than by dragging glides (`duration-moderate`). |
| `Code` | `primitives/code` | — | sugar-high tokens in `--syntax-*`, one surface step up. Also the docs chrome's Code slot. |
| `Craft` | `primitives/craft` | `demos.tsx` (the bad sides) | Docs stage: a bad and a good version side by side (`bad`, `good`, `badNote`, `goodNote`). One rule per pair. |

## components (ungrouped)

| Item | Path | Statics | Systems | Notes |
|---|---|---|---|---|
| `Button` | `components/button` | — | L C | 8 variants: `primary`, `secondary`, `tertiary`, `outline` (control-border frame), `ghost`, `destructive` / `success` (`-strong` text on a wash), `link`. Press shrinks the fill 1px/side; icons thicken; `loading` folds into a circle (box unchanged) and keeps focus; `active` forces pressed. `buttonVariants` in `variants.ts` is server-safe. Serves the chrome's Button slot. |
| `Badge` | `components/badge` | — | L | `variant` `solid` \| `dot` \| `outline`, `color`, `size`; a new label springs width and blur-crossfades. |
| `Avatar` | `components/avatar` | `.Image .Fallback` | L | Base UI Avatar; the image fades in, the fallback shows while it loads or fails; `shape` `circle` \| `square`. |
| `Progress` | `components/progress` | `.Spinner` | L | Base UI Progress; the fill slides on `spring.moderate`; `value={null}` sweeps on `--duration-loop`; `label`, `showValue`, `format`. `.Spinner` is Button's loading glyph. |
| `Meter` | `components/meter` | — | L | Base UI Meter; `variant` `bar` \| `line` \| `ring`; the fill slides; `warnAt` / `errorAt` or `tone`; `marker`. |
| `StatusDot` | `components/status-dot` | `.glyph` (= `statusGlyph`) | L | `running` (the loading glyph), `waiting`, `unread`, `idle`, `success`, `error`; `label` for screen readers. |
| `Kbd` | `components/kbd` | — | L | `variant` `outline` (keycap, `micro`) \| `plain` (Dropdown's shortcut text). |
| `EmptyState` | `components/empty-state` | — | L | `icon`, `title`, `description`, `actions`; `size` steps the actions too. |
| `List` | `components/list` | `.Section .Row` | L | A settings list on one control height; controls end on the caption edge; `LIST_POPOVER`, `LIST_SWITCH` (a bare Switch). |
| `Diff` | `components/diff` | `parsePatch` | — | A unified patch; added / removed lines on the success / error hues over a 16% wash, hunks on `bg-hover`; `path` heads it with `+n −n`, `actions`; `lineNumbers`, `wrap`; lifts +1 like Code. |
| `Markdown` | `components/markdown` | `.Prose` | — | marked's lexer → elements (raw HTML stays text); fences on Code, tables on Table, task lists; `streaming` settles an open fence or a half-typed marker. |
| `LogView` | `components/log-view` | `parseAnsi` | — | ANSI SGR on the syntax / status hues, prompt lines, `lineNumbers` (sticky gutter), `wrap`, `follow` with a jump-to-latest button, `maxHeight`; rows are a `VirtualList`; lifts +1. |
| `Card` | `components/card` | `.Group .Header .Title .Description .Action .Content .Footer .Divider .Media .Image .Eyebrow .Feature .Button` | L H W C | Transparent and borderless (`border="outlined"` frames one on its own; `.Divider` a hairline inside); only clickable cards join the group's hover; stretched link. A card with a `value` selects itself in `Card.Group` (`value` / `defaultValue` / `onValueChange`). `Card.Button` is a compact `Button`. |
| `Table` | `components/table` | `.Header .Body .Footer .Row .Head .Cell .Caption .Empty` | L H C | Row hover, semantic markup; a `Table.Head` with a `value` sorts (`sort` / `defaultSort` / `onSortChange` on the root); `stacked` turns rows into cards in a narrow container (each Cell's `label` captions it). |
| `Copy` | `components/copy` | — | L M | Click anywhere to copy; the glyph melts into a status disc behind the check. |
| `ThinkingIndicator` | `components/AI/thinking-indicator` | — | — | `variant` `shimmer` (default) \| `goo` (three dots melting). |
| `InputMessage` | `components/AI/input-message` | — | L S C | Composer: auto-resize, actions, attachments, queue, status, history. |

## components/inputs

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Checkbox` | `.Group` | L H G C | Contiguous checks melt into one run (`useSelectionRuns` + merge/split blocks). Rows take `disabled`, `name`, `value`, `indeterminate`; without a `label`, the bare box. |
| `Radio` | `.Group` | L H G C | Selected background is a `GooIndicator`; index or value mode; `name` / `disabled` on the group; without a `label`, a bare radio for a layout of your own. |
| `ChoiceList` | — | L H G C | Radio.Group's rows over any `content` (no circle); `options` with `disabled` / `actions`; `value` / `defaultValue` / `onValueChange`, `name`. |
| `Select` | `.Trigger .Value .Content .Item .Group .Label .Separator` | L S H M C | Popup morphs out of the trigger; the check draws itself as the pick lands; a pick holds the popup 300ms; keyboard ring in the list; rows number themselves (`index` optional); node labels with `textValue`; `readOnly`, `required`, `name`. |
| `Combobox` | `.Input .Chips .Content .List .Item .Empty` | L S H M C | `multiple`, chips, `creatable`; `query` / `defaultQuery` / `onQueryChange`, `filter={null}` for remote results, `loading` (status row pinned under the rows), `Content footer` (a press keeps focus in the input, Tab steps into it); node row labels; `readOnly`, `name`; no ring in the list (the input keeps focus). |
| `Switch` | `.Group` | L G C | Thumb is a `GooIndicator` that stretches as it travels; on = `bg-brand`; `description`, `trackSide`; `name` / `value`; without a `label`, the bare track. |
| `Slider` | — | L C | Default: pips + scrubber; compact (or any compact-only prop): fill, range, value. `onValueChange`, `name`. |
| `Input`, `InputGroup` | `.Field` | L H W C | `Input` stands alone (`onValueChange`, `invalid`, `variant`, `readOnly`, `startAdornment` / `endAdornment`; `InputAction`, `InputAdornment`); a `type` swap keeps the caret; fields share one hover; error state on Base UI Field; a field takes a Textarea or picker as children. |
| `Label` | — | L | A plain `<label>` lined up with the field's text (`fieldTextInset`); `invalid`, `size`. Also exported from `inputs/input`. |
| `Field` | `.Label .Description .Error .Control` | L | Base UI Field: label, description and error on the text inset; hands `invalid` / `disabled` / `readOnly` / `required` to the control inside (own prop wins, via `useFieldState`); `validationMode`. |
| `KeyValue` | — | L C | Rows of two monospace Inputs; `secret` values behind an `InputAction` reveal; duplicate keys go invalid; the whole array through `onValueChange`. |
| `EditableText` | — | L | Text that becomes an input in one borderless field box (`useFieldBox`): double-click, Enter / F2 or the hover pencil; Enter or blur commits, Escape restores; `value` / `defaultValue` / `onValueChange`, `editButton`, `disabled`, `size`. |
| `NumberInput` | — | L C | Base UI NumberField on the field ladder; steppers are field actions; `format`, `min` / `max` / `step`, `scrub`, `wheel`, adornments; `value` is `number \| null`. |
| `FileDropzone` | `.Row` | L | A dashed drop zone around a hidden file input; `accept`, `maxSize`, `maxFiles`, `onFilesChange` / `onFilesRejected` (announced); drag verdicts restyle it; `FileDropzone.Row` (`FileRow`) shows a file with `status` / `progress`. Pure helpers in `variants.ts`. |
| `Textarea` | — | L C | Multi-line Input on the field ladder; grows from `minRows` to `maxRows`, then scrolls; `onValueChange`, `readOnly`, `required`. |
| `ColorPicker` | `.Popover` | L S M C | HEX / RGB / HSL / OKLCH, alpha, swatches, eyedropper; `name`. |
| `Calendar` | — | L H | `inputs/date-time`. react-day-picker in one scrolling list of months, month and year columns (`columnsSide`); DayPicker props pass through. |
| `DatePicker`, `DateRangePicker`, `TimePicker`, `DurationPicker`, `MonthPicker` | — | L S M C | `inputs/date-time`. A field whose panel morphs out of it (a `Sheet` under 640px); `value` with `null` for empty; `disabled` (the field) and `disabledDays` (matchers); `name`; a react-day-picker `locale`. DatePicker `editable` (type over the locale's numeric mask); DatePicker and DateRangePicker take `valueType="string"` (ISO strings) and `labels`. |
| `Search` | — | L S M C | Grows its own width in place (`spring.slow`) over its neighbours; suggestions ooze out; Escape closes → clears → collapses. |

## components/navigation

| Item | Statics | Systems | Notes |
|---|---|---|---|
| `Tabs` | `.List .Item .Panel` | L S H G W C | `variant="segmented"`: a well (`bg-muted`), +3 elevated indicator, hover pill that drips back into it. `"subtle"`: a borderless strip with a `bg-active` pill, manual activation, `activeLabel`. `Tabs.Item` `href` (or a router link as `render`) makes link tabs. |
| `NavigationMenu` | `.List .Item .Trigger .Content .Link` | L S H G M W C | Site header menu: one shared panel morphs out of its trigger and springs to each panel's size; liquid marker under the open item or the active link; `value` / `defaultValue` / `onValueChange` (the open item); `Link` takes `icon` / `description` in a panel, `render` for router links. |
| `Pagination` | — | L H G C | The current page is a `GooIndicator`; `count`, `value` / `defaultValue` / `onValueChange`, `siblings`, `edges`, `variant="input"` (a jump-to-page field); every label a prop. |
| `Breadcrumb` | `.Item` | L H | `items` or children; one fluid hover; the middle folds into a Dropdown when the trail doesn't fit. |
| `Tree` | — | L S H G W | `items` (`id`, `label`, `icon`, `children`); the selection is a `GooIndicator`, one fluid hover across levels, branches fold on a measured height under a guide; WAI-ARIA tree keys and typeahead; `value` / `defaultValue` / `onValueChange`, `expanded` / `defaultExpanded` / `onExpandedChange`. |
| `Accordion` | `.Group .Item .Trigger .Content` | L H M W C | Panel morphs out of its row; `highlight` `item` \| `trigger`. |
| `Sidebar` | `.Provider .Trigger .Rail .Inset .Input .Header .Content .Footer .Separator .Group .GroupLabel .GroupAction .GroupActions .GroupContent .Menu .MenuItem .MenuButton .MenuAction .MenuActions .MenuBadge .MenuSkeleton .MenuSub .MenuSubItem .MenuSubButton` | L S H G C | Liquid active rows and hover; `openOnHover`; collapsible rows; `[` / `]` toggles (`shortcutScope`); rows on the ladder; mobile `Sheet`. |

## components/overlays

All morph (`from`, `effect`, `hideSource`, `tier` on the content part) and lift +2 with
`shadow-surface-3`, except Dialog, AlertDialog and Sheet (+4, shadow at level) and Tooltip (inverted).

| Item | Statics | Notes |
|---|---|---|
| `Popover` | `.Trigger .Content .Title .Description .Close` | The reference morphing overlay. `openOnHover`, `side`, `align`, `sideOffset` (= the neck, 12); `.Content` `anchor` (also the morph's source), `alignOffset`, `collision*`, `initialFocus` / `finalFocus`; `onOpenChange` gets Base UI's details. |
| `PreviewCard` | `.Trigger .Content` | Hover card from a link; `delay`, `closeDelay`. |
| `Tooltip` | `.Trigger .Content .Provider .PortalContainer` | Inverted; the `content` prop, or `.Trigger` / `.Content` (`render` / `asChild`); `open` / `defaultOpen`, `side`, `align`, `container`; grouped hand-off is instant; `followCursor` fades. `.PortalContainer` scopes every overlay's portal. |
| `Dropdown` | `.Menu .Trigger .Content .Item .Label .Separator .Search .Empty .Sub .SubTrigger .SubContent` | Inline or popup; `filter` search; checked index / indices; rows number themselves (`index` optional); `shortcut` on `Dropdown.Item`; submenus; `.Content keepMounted`; opens with its first row focused. |
| `ContextMenu` | `.Trigger .Content .Item .Label .Separator .Sub .SubTrigger .SubContent` | Grows from the press point; rows are Dropdown's `MenuItem` (`shortcut`), and it shares Dropdown's selection, search and submenus; `.Content keepMounted`. |
| `Command` | `.Trigger .Content .Palette .Shortcut` | ⌘K; grouped commands; one fluid highlight follows Base UI's. |
| `Dialog` | `.Trigger .Content .Header .Footer .Title .Description .Close` | `width` `sm` \| `lg` \| `xl` on the content, `position`, `showCloseButton`, `container`; backdrop fades with the morph; scopes `Morph.Part`. |
| `AlertDialog` | as Dialog + `.Action .Cancel` | Always modal, no outside dismissal, no ✕ by default. `.Action` keeps the dialog open, loading and locked while a returned promise (or `pending`) settles; `onError`. Built by composing Dialog's parts. |
| `Sheet` | Dialog's + `.Provider .Indent` | Base UI Drawer; grows from its edge; a swipe-dismiss slides on from the release point. |
| `Lightbox` | `.Trigger` | Base UI Dialog; the image grows out of its thumbnail (`effect: 'morph'`, `hideSource`) and closes into the current one; arrows, swipe, click-to-zoom (`zoom`); `value` / `defaultValue` / `onValueChange` (the open index, `null` closed). |
| `Toast` | `.Trigger`; `useToast()`, `toast` | Pill melts into a body; six `--status-*` states; promise toasts. The global `toast` works anywhere once `<Toast manager={toast} />` is mounted. |

## blocks

| Item | Path | Notes |
|---|---|---|
| `ShellCard` | `blocks/shell-card` | A raised inner card (`.Inner`, +2) in a `bg-sunken` tray with a meta row (`.Footer`); corners `rounded-shell` / `rounded-pill-shell`; `variant="elevated"` lifts the tray instead. |
| `DesktopShell` | `blocks/desktop-shell` | A desktop window: a drag-region title bar (`platform`, `showControls`), a left `Sidebar`, the main card and a side pane split off it on `Resizable` (`]`, toggle, drag to fold); `titleBar="card"` drops the window-wide bar; the pane takes the card's place under 768px. |
| `SidebarApp` | `blocks/sidebar-app` | A full app shell (FF preset `sa1FQfCxH6`): workspace header, search, nav, user footer, inset topbar. `variant`, `side`, `openOnHover`, `contained`. |

## Shared system files (`lib/`)

| File | Exports | Use it for |
|---|---|---|
| `springs.ts` | `spring.{fast,moderate,slow,goo}`, `springEnter`, `exitFallbackMs` | Every transition. |
| `size-context.tsx`, `size-scale.ts` | `useSize`, `useSizeVariant`, `useTypeScale`, `SizeContext`; `sizeMap`, `typeScale` (pure, re-exported) | The ladder. |
| `shape-context.tsx`, `shape-classes.ts` | `useShape`, `ShapeProvider`; `shapeMap` (pure, re-exported) | Radii (rounded / pill). |
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
| `popup-rows.tsx` | `rowClasses`, `rowLabelClass`, `rowLabelBoxClass`, `isTextLabel`, `RowIcon`, `CheckMark`, `PopupLabel`, `PopupSeparator` | A popup list's rows. |
| `row-group.tsx`, `focus-ring.tsx`, `row-index.tsx` | `useRowFocus`, `useRowGroup`, `focusRowOnPress`, `rowIndexOf`; `FocusRing`; `IndexedRows` (`isRow`), `useRowIndex`, `useRowPosition` | A list's keyboard focus, its ring and its row numbers. |
| `weight-label.tsx` | `WeightLabel` | A label that changes weight without reflowing. |
| `field-classes.ts` | `fieldVariants`, `fieldIconClasses`, `fieldAdornmentClasses`, `FIELD_ADORNMENT_ICON`, `fieldActionClasses`, `FIELD_ACTION`, `FIELD_ACTION_BOX`, `FIELD_ACTION_END`, `FIELD_ACTION_RADIUS`, `fieldTextInset` | The field ladder's classes (pure). |
| `field-box.ts` | `useFieldBox`, `focusControlOnPress`, `FieldStateContext`, `useFieldState` | A field's box, and an enclosing `Field`'s state for a control. |
| `spinner-glyph.tsx` | `SpinnerGlyph` | The loading glyph (Button, `Progress.Spinner`). |
| `use-keyboard-nav-gate.ts` | `useKeyboardNavGate` | Show a popup's ring only after keyboard use. |
| `use-touch-primary.tsx` | `useTouchPrimary` | Skip pointer-only machinery on touch. |
| `icon-context.tsx` | `useIcon`, `useIcons`, `IconProvider`, `IconName`, `IconComponent` | Icons. `useIcons` returns the whole map (the ai kit's `AiIconProvider` extends it). |
| `utils.ts` | `cn` | Class merging that knows the local utilities. |

The rest (refs, rects, dates and the date mask, the autosizing textarea) is listed in `ui/lib/README.md`.

## Which file to copy

| Building | Start from |
|---|---|
| An anchored morphing overlay | `components/overlays/popover/index.tsx` (on the shared overlay helpers) |
| A modal overlay | `components/overlays/dialog/index.tsx`; reuse its parts like `alert-dialog/index.tsx` does |
| A menu with rows | `components/overlays/context-menu/index.tsx` (rows from `dropdown/menu-item.tsx`) |
| A control that grows in place | `components/inputs/search/index.tsx` |
| A strip with a traveling indicator | `components/navigation/tabs/` (`list.tsx`, `item.tsx`), `navigation/pagination/index.tsx`, or the template in [authoring.md](authoring.md) |
| A field with actions inside | `components/inputs/number-input/index.tsx` (`useFieldBox` + side-by-side field actions) |
| Multi-select with merged runs | `components/inputs/checkbox/index.tsx` |
| A state morph inside a control | `components/button/index.tsx` (`useLoadingMorph`), `copy/index.tsx` (glyph goo) |
| A hook-free docs stage for an interactive example | `components/badge/change-demo.tsx`, `components/button/loading-demo.tsx` |
| A goo composition of opaque shapes | `components/overlays/toast/index.tsx`, `thinking-indicator` (`variant="goo"`) |

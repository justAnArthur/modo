# Changelog

The packages are released from this repo by conventional commits (see [CONTRIBUTING.md](CONTRIBUTING.md)): `@justanarthur/modo` (`lib/`), `@justanarthur/modo-ui` (`ui/`), `@justanarthur/modo-ui-ai` (`kits/ai/`) and `@justanarthur/modo-ui-notch` (`kits/notch/`). Each release also gets GitHub release notes generated from its commits.

## 2026-11-17 — modo-ui 2.2.0

### @justanarthur/modo-ui 2.2.0

- `Slider` takes `onValueCommit` (once when an interaction ends: a pointer lifting, a keyboard step, a committed edit) and `orientation="vertical"` (the dense design stood upright).
- `Textarea` with neither `value` nor `onValueChange` keeps its text in the DOM: `ref.current.value = ''`, a native form reset and ref-reading form libraries work, and the box re-fits after each.
- `Dropdown.Content`, `Dropdown.SubContent`, `Select.Content` and `Tooltip` (root and content) take `alignOffset`, `collisionPadding`, `collisionBoundary` and `positionerClassName` (`CollisionProps` in `lib/overlay`); `Dropdown.Menu` takes `modal`; `Tooltip` and `Tooltip.Provider` take `closeDelay`, the provider also `timeout` (Base UI's name for `skipDelayDuration`).
- `required` on `Checkbox`, `Switch` and `Radio.Group`.
- `inertProps(on)` (`lib/inert`): an `inert` that holds on React 18 and 19.

Fixes:

- A `Combobox` with a picked value and no `defaultQuery` shows the item's label in its field instead of an empty one.
- A slot part's `children` fill a childless `render` element (`<Popover.Trigger render={<button/>}>Open</Popover.Trigger>`), on Popover, Dialog, Dropdown, Tooltip, Toast and AlertDialog parts, instead of rendering it empty.
- Folded `Sidebar` groups and subs, the collapsed sidebar, `Tree` branches and `DesktopShell`'s closed pane are inert on React 19 too (it read `inert=""` as false and warned), so their rows leave the tab order.

## 2026-11-17 — modo-ui 2.1.0, modo-ui-notch 0.2.0

### @justanarthur/modo-ui 2.1.0

- Token `--ink` (`bg-ink`, `fill-ink`, `text-ink`, `border-ink`): true black in both schemes, for surfaces that match hardware.
- `Meter`'s ring scales with a size class, centres its `children` (a countdown's time) and takes `animate={false}` for a value that ticks on a clock.
- New component `Sparkline` (an inline trend line: `values`, `secondary`, `max`, `area`, `tone`).
### @justanarthur/modo-ui-notch 0.2.0

- New kit (0.1.0): the UI of a macOS notch app on modo-ui (a peer, `^2.1.0`: it draws on Sparkline, the ring Meter's centre content and the ink token). Components `Island` (idle, compact, split, expanded and flash, on modo-ui's springs and goo), `IslandTabs` and `IslandFlash` under `components/island/`; `Equalizer`, `BatteryGlyph`, `MediaScrubber` and `Countdown` under `components/indicators/`; blocks `NowPlaying`, `Timer`, `Shelf` and `Agenda` (`blocks/activities/`), `PowerAlert`, `Controls`, `Devices` and `SystemStats` (`blocks/system/`), `ExpandedIsland` and `SettingsWindow` (`blocks/app/`); the island geometry and `useIsland()`. Docs at https://justanarthur.github.io/modo/notch/.

## 2026-11-17

### @justanarthur/modo 1.1.0

- **Open any example full screen.** Example cards get Open full screen beside Copy and Show code: the example alone on its item's route (`?example=<title slug>`, else its position), without the chrome, across the whole viewport. A modified or middle click opens a new tab; Escape, Back or the close button returns. The Icon contract gains `maximize`, the Button contract passes the click event and `onAuxClick`; new hooks `example-solo`, `example-solo-stage`, `example-solo-actions`.
- **Grouped Select options.** `SelectOption` takes an optional `group`: a Select lists the ungrouped options first, then each group under its heading, in first-seen order. Plain Select renders `<optgroup>`s; a host Select that ignores `group` keeps showing a flat list. The demo switcher uses it to list design systems and kits apart.

Fixes:

- An inline `@example` written as bare JSX (`@example <X />`, or JSX lines after `@example`) is an example instead of being dropped; one with no code at all is a warning.
- Without typescript installed, the plain parser reads an item written as `const X = Object.assign(function X(…) {…}, { Part })`: its doc block on the const, its props from the function.

### @justanarthur/modo-ui 2.0.0

- The docs Icon draws `maximize` (lucide `Maximize2`).
- New primitives: `Sortable` (drag or keyboard reorder, `Sortable.Handle`, `useSortableHandle`, `as="none"` inside a host list), `VirtualList` (windowed rows, fixed or measured, `scrollToIndex`) and `Resizable` (split panes with keyboard separators, collapsible panels, nesting).
- New components: `List` (settings rows), `ChoiceList` (Radio's rows over rich content), `KeyValue`, `Breadcrumb` (folds into a menu), `Meter` (bar, line, ring; `marker`, `tone`), `StatusDot` (+ `statusGlyph`), `Kbd` and `EmptyState`.
- Icons `eye`, `eye-off` and `grip-vertical`.
- New components: `Diff` (a unified patch), `Markdown` (+ `Markdown.Prose`, on `marked`, now a dependency), `LogView` (ANSI output on `VirtualList`), `Tree`, `EditableText` and `Lightbox`; blocks `ShellCard` and `DesktopShell`.
- `VirtualList` takes `follow` / `onFollowChange` (stay at the end of a growing list), `contentWidth` and a `scrollToEnd()` handle; `Resizable` panels glide to sizes set by key, reset or controlled `sizes`.
- Tokens `--sunken` (`bg-sunken`) and `--radius-shell` / `--radius-pill-shell` (`rounded-shell|pill-shell`); icons `file-diff` and `square`.
- `useIcons()` (`lib/icon-context`) returns the whole icon map, for a kit that extends the set; `lib/surface-classes` (`SURFACE_BG`, `SURFACE_SHADOW`) is a subpath; the `SidebarApp` block exports its `SidebarSearchField` and `SidebarInsetTopbar`.
- `VirtualList` and `LogView` measure in the element's own pixels, so a list inside a preview scaled with CSS `zoom` keeps its rows apart.
- Barrel exports `GooFilter`, `useAutosizeTextarea` and `useTouchPrimary`, for a kit and components of your own.
- **The docs chrome is a package export**, so a design system outside this repo wears ui's docs look: `@justanarthur/modo-ui/docs` (`Button`, `Link`, `Icon`, `Select`, `DocsNav`, `ThemeSwitcher` for `shell` / `panel`), `@justanarthur/modo-ui/docs/chrome.css` (the look, keyed on `data-modo-ui`, nothing to scan) and `@justanarthur/modo-ui/docs/vite` (`docsTheme({ storageKey })`, the pre-paint theme script, and `withUno(configFile)` for a UnoCSS host). `@justanarthur/modo` and `unocss` are optional peers. The ai kit's docs use them.
- `tokens/<group>.css` ships as `@justanarthur/modo-ui/tokens/*`; every `lib/` module is a subpath (new: `lib/row-order`, `lib/slot`, `lib/scroll-column`, `lib/surface-context`, `lib/reduced-motion`, `lib/use-fluid-hover`, `lib/fluid-hover-highlight`, …), and `check:dist` fails on one without its export.
- Theme hooks for the primary Button: `--primary`, `--primary-hover`, `--primary-active`, `--primary-foreground` and `--shadow-button-primary` (`bg-primary`, `text-primary-foreground`, `shadow-button-primary`), defaulting to what it always drew.
- `buttonVariants({ surface: true })` draws the fill, frame, hover and press on the element itself (an anchor styled as a button); `ButtonVariant`, `ButtonSize`, `ButtonSizeCanonical`, `ButtonVariantsOptions`, `BadgeVariant` and `BadgeSize` come from the server-safe `variants` subpaths too. ColorPicker's color math is the server-safe `components/inputs/color-picker/variants` (`parseColor`, `rgbToHexStr`).
- `lib/slot` `cloneSlot(child, props, ref)` (Radix Slot semantics); `lib/shape-context` `useShapeContext()` reads and sets the provider's shape; `lib/row-order` (`RowOrderContext`, `useRowOrder`, `useRowSlot`) numbers rows in document order wherever they sit below a panel, and `RowOrderContext.Provider value={null}` takes a row out.
- Dropdown: `Dropdown.Group`, `Dropdown.Shortcut`, `Dropdown.CheckboxItem` (`checked` / `defaultChecked` / `onCheckedChange`), `Dropdown.RadioGroup` / `Dropdown.RadioItem` (string `value` / `defaultValue` / `onValueChange`); `Dropdown.Label` `inset` names a surrounding group; value-checked rows join the merged selection background. Rows take their content as `children` (`label` optional, `Dropdown.SubTrigger` too), `textValue`, `inset`, `render` / `asChild`, and number themselves inside groups; `onSelect(event)`: `preventDefault()` keeps the menu open (`MenuItemProps`). `Dropdown.Menu` / `Dropdown.Sub` `onOpenChange(open, details)` (`DropdownOpenChangeDetails`); `initialFocus` / `finalFocus` on `Dropdown.Content`, `Dropdown.SubContent` and `ContextMenu.Content`. `ContextMenuItem` / `ContextMenuItemProps` alias Dropdown's row.
- Dialog, AlertDialog, Sheet and Select pass Base UI's change details to `onOpenChange(open, details)`, so `details.cancel()` keeps them as they are (`DialogOpenChangeDetails`, `AlertDialogOpenChangeDetails`, `SheetOpenChangeDetails`, `SelectOpenChangeDetails`). `Dialog.Content`, `AlertDialog.Content` and `Sheet.Content` take `initialFocus`, `finalFocus` and `popupClassName`; `Dialog` and `Sheet` take `disablePointerDismissal`; `Sheet.Content` takes `side`. `Select.Trigger` takes `render` / `asChild` and `wrapperClassName`; `Select.Content` takes `finalFocus`.
- Toast: `Toast.Close` (`ToastClose`); `title`, `description`, `icon` and `action` take nodes; `onClose`; `toast.dismiss` / `useToast().dismiss` alias `close`. `Tooltip` and `Tooltip.Provider` take `delay`. `NavigationMenu.Indicator` (`NavigationMenuIndicator`) places the strip's liquid marker.
- The date and time pickers take `required`, `onBlur`, `aria-label` / `-labelledby` / `-describedby` / `-invalid` and `controlProps` (attributes and a `ref` for the field's control); `locale` also takes a BCP 47 tag; times follow `hourCycle`. DatePicker `formatDate`, `hidden` and `labels.invalid` (a caption under a field holding no real date); DateRangePicker `editable` (`startInputProps` / `endInputProps`), `withTime`, `formatDate`, `startName` / `endName`; TimePicker `formatTime` and `labels` (`TimePickerLabels`); MonthPicker `formatDate`, `withYear` and `labels`; DurationPicker `minHours`, `hourStep`, `formatValue` and `labels` (`DurationPickerLabels`).
- Table `containerClassName`, `stacked={false}` on `Table.Header` / `Table.Row`; body rows number themselves across bodies. Accordion `Accordion.Content` `contentClassName`, `Accordion.Trigger` `render` / `asChild` / `nativeButton`, `icon` and `weightShift`, a runtime `type`. `Card.Title` `as` (`CardTitleProps`); Checkbox `checked="indeterminate"` (`CheckboxCheckedState`); Copy `variant="chip"` / `"glyph"` and `labels`; Combobox `labels`, node item labels with `textValue`, `hideTrigger`; Radio and `Tabs.Item` node labels; `ColorPicker.Popover` `disabled`, `readOnly`; FileDropzone `style`; NumberInput and Combobox's `onQueryChange` hear Base UI's details. Icons `chevron-up`, `triangle-alert`, `circle-question-mark`, `trash`, `timer`, `funnel-x`, `flag`.

Breaking:

- **The AI items left modo-ui for `@justanarthur/modo-ui-ai`.** `InputMessage` (with `FileThumbnail` and the types `InputMessageProps`, `InputMessageSlotContext`, `InputMessageStatus`, `QueuedMessage`) is the ai kit's `Composer.Draft` (`ComposerDraft`), and the Composer block takes its draft props; `ThinkingIndicator` (`ThinkingIndicatorProps`) is the ai kit's `Message.Working`, its goo look only. The subpaths `components/AI/input-message` and `components/AI/thinking-indicator`, the `.shimmer-text` utility and the optional peer `pdfjs-dist` (now the kit's) are gone.
- **Every primitive and component sits in a group folder**, so the sidebar and the tier overviews read as a few sections: primitives in `systems/` (Craft, Sizes, Surface, Motion, Morph, FluidHover), `layout/` (ScrollArea, Separator, Resizable, VirtualList, Sortable) and `content/` (Code, Skeleton); components in `actions/`, `data-display/`, `feedback/` and `containers/` beside `inputs/`, `navigation/` and `overlays/`. Docs URLs keep the item id; the package subpaths follow the folders, with no aliases for the old ones (the barrel is unchanged; `variants` moves with its item, e.g. `components/actions/button/variants`):

| Old subpath | New subpath |
|---|---|
| `primitives/code` | `primitives/content/code` |
| `primitives/craft` | `primitives/systems/craft` |
| `primitives/fluid-hover` | `primitives/systems/fluid-hover` |
| `primitives/morph` | `primitives/systems/morph` |
| `primitives/motion` | `primitives/systems/motion` |
| `primitives/resizable` | `primitives/layout/resizable` |
| `primitives/scroll-area` | `primitives/layout/scroll-area` |
| `primitives/separator` | `primitives/layout/separator` |
| `primitives/sizes` | `primitives/systems/sizes` |
| `primitives/skeleton` | `primitives/content/skeleton` |
| `primitives/sortable` | `primitives/layout/sortable` |
| `primitives/surface` | `primitives/systems/surface` |
| `primitives/virtual-list` | `primitives/layout/virtual-list` |
| `components/accordion` | `components/containers/accordion` |
| `components/avatar` | `components/data-display/avatar` |
| `components/badge` | `components/data-display/badge` |
| `components/button` | `components/actions/button` |
| `components/card` | `components/containers/card` |
| `components/copy` | `components/actions/copy` |
| `components/diff` | `components/data-display/diff` |
| `components/empty-state` | `components/feedback/empty-state` |
| `components/kbd` | `components/data-display/kbd` |
| `components/list` | `components/data-display/list` |
| `components/log-view` | `components/data-display/log-view` |
| `components/markdown` | `components/data-display/markdown` |
| `components/meter` | `components/feedback/meter` |
| `components/progress` | `components/feedback/progress` |
| `components/status-dot` | `components/feedback/status-dot` |
| `components/table` | `components/data-display/table` |

- `Card.Divider` renders the Separator (a `div`, its ref an `HTMLDivElement`) instead of an `<hr>`; `Copy`'s ref is an `HTMLElement`.
- DatePicker and DateRangePicker show an "Invalid date" caption under a field holding no real date (`labels.invalid`; `null` hides it).
- `IndexedRows` drops `isRow`; Dropdown's and Table's rows number themselves in document order (`lib/row-order`).

Fixes:

- The compound parts of the function roots (`Popover.Trigger`, `Dialog.Content`, `Select.Item`, `Tooltip.Provider`, `Morph.Part`, …) are typed in the published `.d.ts`; CI type-checks every part from `dist`.
- A standalone `Accordion` nested in an `Accordion.Group`'s panel keeps its own open state.

### @justanarthur/modo-ui-ai 0.2.0

- **New package (0.1.0): an AI agent app kit on modo-ui**, moved out of the AI desktop prototype (#44) and rebuilt on modo-ui's items: components `Message` (+ `Message.Working`), `ToolCall`, `AgentRun`, `Reasoning`, `WorkSummary`, `TodoList`, `Recap`, `ChapterNav`, `PromptCard`, `PermissionRequest`, `QuestionPrompt`, `PlanApproval`; blocks for the session (`Transcript`, which follows a streaming reply, `Composer`, `AgentPrompt`, `TranscriptSearch`, `CommandPalette`, `ShortcutsSheet`, `FailureState`), the sidebars and boards, the side pane and its panes, and settings; docs-only screens on mock data. modo-ui is a peer; the kit's glyphs extend its icon set through `AiIconProvider`; `styles.css` holds the kit's utilities for a host on modo-ui's prebuilt CSS. Docs at `/ai/`.
- **The composer's draft is the old modo-ui `InputMessage`**, merged into `Composer` instead of a second chat item: `Composer.Draft` (also `ComposerDraft`) is the draft alone, with attachments (PDF previews through the optional peer `pdfjs-dist`), the queue while a reply streams, history and suggestions; `Composer` takes `value` / `defaultValue` / `onValueChange`, `status` / `defaultStatus` / `onStatusChange` and `onStop` (in place of `streaming`), `queue` / `defaultQueue` / `onQueueChange`, `history`, `suggestions`, `placeholderSuggestion`, `accept` and `maxFiles`, and `onSend` gets the files too. `FileThumbnail` is exported; `styles.css` carries the draft's edge states. SessionBoard's reply box is `Composer.Draft`.
- **`Message.Working` is the old modo-ui `ThinkingIndicator`** (its goo look): the dots and the cycling word, flush with the text.
- modo-ui 2.0 is the peer.
- Items sit in group folders: components in `conversation/` and `prompts/`; blocks in `conversation/`, `sessions/`, `panes/`, `profiles/`, `dialogs/` and `settings/` (which takes `permission-rules` and `plugin-catalog`). Docs URLs keep the item id; the subpaths follow the folders:

| Old subpath | New subpath |
|---|---|
| `components/agent-run` | `components/conversation/agent-run` |
| `components/chapter-nav` | `components/conversation/chapter-nav` |
| `components/message` | `components/conversation/message` |
| `components/permission-request` | `components/prompts/permission-request` |
| `components/plan-approval` | `components/prompts/plan-approval` |
| `components/prompt-card` | `components/prompts/prompt-card` |
| `components/question-prompt` | `components/prompts/question-prompt` |
| `components/reasoning` | `components/conversation/reasoning` |
| `components/recap` | `components/conversation/recap` |
| `components/todo-list` | `components/conversation/todo-list` |
| `components/tool-call` | `components/conversation/tool-call` |
| `components/work-summary` | `components/conversation/work-summary` |
| `blocks/agent-prompt` | `blocks/conversation/agent-prompt` |
| `blocks/artifacts-pane` | `blocks/panes/artifacts-pane` |
| `blocks/changes-pane` | `blocks/panes/changes-pane` |
| `blocks/command-palette` | `blocks/dialogs/command-palette` |
| `blocks/composer` | `blocks/conversation/composer` |
| `blocks/failure-states` | `blocks/conversation/failure-states` |
| `blocks/file-pane` | `blocks/panes/file-pane` |
| `blocks/hook-dialog` | `blocks/dialogs/hook-dialog` |
| `blocks/inbox` | `blocks/sessions/inbox` |
| `blocks/mcp-server-dialog` | `blocks/dialogs/mcp-server-dialog` |
| `blocks/permission-rules` | `blocks/settings/permission-rules` |
| `blocks/plugin-catalog` | `blocks/settings/plugin-catalog` |
| `blocks/pr-pane` | `blocks/panes/pr-pane` |
| `blocks/profile-onboarding` | `blocks/profiles/profile-onboarding` |
| `blocks/profile-switcher` | `blocks/profiles/profile-switcher` |
| `blocks/profile-usage` | `blocks/profiles/profile-usage` |
| `blocks/session-board` | `blocks/sessions/session-board` |
| `blocks/session-sidebar` | `blocks/sessions/session-sidebar` |
| `blocks/shortcuts-sheet` | `blocks/dialogs/shortcuts-sheet` |
| `blocks/side-pane` | `blocks/panes/side-pane` |
| `blocks/tasks-pane` | `blocks/panes/tasks-pane` |
| `blocks/terminal-pane` | `blocks/panes/terminal-pane` |
| `blocks/transcript` | `blocks/conversation/transcript` |
| `blocks/transcript-search` | `blocks/conversation/transcript-search` |
| `blocks/usage-pane` | `blocks/panes/usage-pane` |

## 1.0.0 — 2026-11-16

The first stable release of both packages. From here on the public API follows semver: a breaking change means a new major.

### @justanarthur/modo

What 1.0 is:

- **A docs site from a design system, with no content of its own.** modo discovers `tokens/`, `primitives/`, `components/`, `blocks/` and `pages/` by directory and renders them in its own Vite app. Every token, visual, component and piece of documentation comes from the host; the chrome carries only its own labels.
- **Items documented by TSDoc.** An item is `<tier>/[<group>/…]<name>/index.tsx`: name, lead, body and props come from its doc comment and its types (`@default`, `@values`, `{@include}`, `{@includeCode}`). Group folders nest the sidebar and the tier overviews.
- **Live examples** from a co-located `examples.mdx`, built with the rest of the design system in one shared esbuild build, each in an example card with Show code and Copy. Short inline `@example` blocks compile in the browser.
- **Foundation pages** for colors, typography (elements, families, scale, weights), radius, spacing and motion, read from `tokens/*.css`.
- **Pages tier** for full screens assembled from blocks.
- **Canvas** (`/canvas`): every foundation and item live on one pan-and-zoom surface, fast with hundreds of items.
- **Shell inheritance.** The chrome renders with the host's own Button, Link, Code, Icon, Select and Sidebar when they match by name and props (or are pinned in `shell`), with structural Plain fallbacks otherwise. The host restyles the rest through `data-modo` attributes.
- **Structural CSS only.** Every visual reads a token through a small generic contract (shadcn names: `--border`, `--muted-foreground`, `--font-size-<role>`, `--space-*`, …), so the site looks like the design system it documents.
- **`modo.config.ts`**: `name`, `description`, `css`, `vite` (extend the internal Vite config, e.g. Tailwind or UnoCSS), `shell`, `panel`, `examples`, `base`, and site branding.
- **Static builds** with a copy of the shell per route, per-page head tags and a `404.html`, ready for GitHub Pages or any static host.

New since 0.9:

- `modo init` ships a `.gitignore`, pins `@justanarthur/modo` to the version that scaffolded it, starts on React 19, validates the project name and prints the next steps.
- `modo preview` serves the built site.
- `modo dev --port` and `--host`; every flag also takes `--flag=value`; an unknown flag fails with the help text.
- `modo add page` is listed in the help.
- Site branding: a header and footer from the config, socials, per-page head tags.
- Item pages show a metadata row from doc-comment block tags (`@status`, `@since`, `@deprecated`) and link to the item's source in the repo. `@source` / `@license` upstreams are credited once, in a Credits section on the overview.
- Builds fail on item errors instead of shipping a broken page; Babel for inline examples loads lazily.
- The canvas opens fitted to the view; bento previews fit and pack, example rows and token labels wrap; the nav no longer repeats the design system's name.
- Built on Vite 8 (Rolldown and Oxc) and `@vitejs/plugin-react` 6; the shared item build runs on esbuild 0.28.
- `engines`: Node 20.19+ or 22.12+, the floor of Vite 8.
- The shell contract is public: `@justanarthur/modo` exports the slot prop types (`ButtonSlotProps`, `LinkSlotProps`, `CodeSlotProps`, `IconSlotProps`, `SelectSlotProps`, `SidebarSlotProps`, `SidebarItemProps`, `SidebarSectionProps`), `ShellComponents`, `PanelItemProps`, `SelectOption`, `IconName` and the config interfaces (`ShellConfig`, `ThemeConfig`, `RepoConfig`, `PanelConfig`, `PanelItem`).
- The `vite` extension path resolves like every other module path: the extension is optional.
- `shell`, `panel`, `examples` and `vite` references may be package specifiers (`@scope/ds/docs#Select`), resolved through the package's `exports` (`source`, then `import`, then `default`).
- `root`: the folder holding the tiers, `tokens/` and `guides/`, for a library that keeps its sources in a subfolder. `modo add` takes `--config`.
- Free-form MDX guides from `guides/`, at `/guides/<slug>`: frontmatter `title` / `description`, a `01-` prefix to order them, folders as sidebar sections with an `index.mdx` landing page; a Guides sidebar section and an overview card. Group folder titles drop a `01-` prefix too.
- Group an item's examples: in `examples.mdx` a `#` with `##` under it becomes a group, with a nested On this page.
- Props through the TypeScript compiler: inherited, `Omit` / `Pick`, intersected, imported and generic props types; a closing "Defaults to `x`." fills the Default column. `typescript` (>=5) is an optional peer: without it a plain parser reads same-file types, with one warning.
- An item may re-export another package's component: its docs, props and examples come from the package's `source` condition or its typings. `{@inheritDoc <ref>}` prepends a base's description and examples. Includes stay inside their package.

Breaking:

- `SelectSlotProps.onChange` is `onValueChange`, and slot matching requires `value`, `onValueChange` and `options`: a host Select that declares `onChange` now falls back to the Plain one.
- The CLI hands Vite its whole config inline (`createViteConfig`, `configFile: false`). `MODO_USER_ROOT`, `MODO_CONFIG_PATH` and `MODO_PORT` are gone: use `--config` and `--port`.
- `virtual:modo-shell` no longer exports `ResolvedShellExport` / `PanelItemExport`: type panel items with `PanelItemProps`.
- The chrome no longer asks the Icon slot for `external`.

Fixes:

- An unknown item or token group renders the not-found page.
- Host colors pick up `--color-sm` and `--color-xs` too.
- A `Sidebar` member slot never reads the root's pin.

### @justanarthur/modo-ui

What 1.0 is:

- **Fluid Functionalism (Base UI flavor) on UnoCSS**: motion springs, fluid hover, a two-step size ladder and an eight-level elevated surface system.
- **A morph layer**: overlays grow out of their trigger, travelling indicators melt between items (`useMorph`, `MorphSurface`, `GooIndicator`).
- **The field ladder**: every text field (Input, Textarea, InputGroup) on one shared field box with a variant; Checkbox, Radio and Switch with their groups; date and time pickers on react-day-picker.
- **Published for any stack**: components and types from the package root and per item (`/primitives/*`, `/components/*`, `/blocks/*`), the UnoCSS preset (`/unocss`), and `styles.css`, `base.css`, `tokens.css` and `tailwind.css` for Tailwind v4 hosts.
- **Its own docs, built with modo**, with its design language in `DESIGN.md`, an agent guide in `AGENTS.md` and a Craft page of bad / good pairs.

New since 0.6:

- The morph layer and Craft export from the package root.
- `dist` keeps `'use client'` and the licence headers of derived code; `pdfjs-dist` is an optional peer; `sideEffects` and `engines` are set.
- The card eyebrow drops uppercase and letter-spacing.
- `Select`, `Combobox` and `ColorPicker.Popover` take `open` / `defaultOpen` / `onOpenChange`; anchored contents take `side`, `align`, `sideOffset` and `container`; `Tooltip` takes `open` / `defaultOpen`, `align` and `container`; `Search` takes `size` and `container`.
- Form controls take `name`: Checkbox (with `disabled` and `value`), `Radio.Group`, Switch, Select, Combobox, Slider, ColorPicker and the date and time pickers.
- `Tabs variant="subtle"`; `Card.Group` selects both ways (`value` / `defaultValue` / `onValueChange`); `Dropdown.Item` takes `shortcut`; ContextMenu shares Dropdown's selection and search.
- `useLift`, `SizeScope` and a named `SidebarApp` / `Craft` export from the package root.
- New items: `Avatar`, `Field` (label, description and error around any control), `FileDropzone` with `FileDropzone.Row` (drag verdicts, announced rejections, upload progress), `Label` (its own item, still exported from `inputs/input`), `NavigationMenu` (one panel morphing out of its trigger and between panels), `NumberInput` (Base UI NumberField on the field ladder), `Pagination` (a liquid current page, a jump-to-page field), `Progress` with `Progress.Spinner`, `Separator` and `Skeleton`.
- Controls take `invalid`, `disabled`, `readOnly` and `required` from an enclosing `Field`; `useFieldState` does the same for your own.
- Input: `readOnly`, `required`, `startAdornment` / `endAdornment`, `InputAction` and `InputAdornment`; a `type` swap keeps the caret. Textarea: `readOnly`, `required`.
- Checkbox `indeterminate`; Checkbox, Radio and Switch without a `label` render the bare control.
- Select rows need no `index`; `Select.Value`; node row labels with `textValue`; `readOnly`. Combobox `query` / `defaultQuery` / `onQueryChange`, `filter={null}`, `loading` (a status row pinned under the rows), a `Content` `footer` (a press keeps the caret in the input; Tab reaches it), `readOnly`.
- DatePicker `editable` (type over the locale's numeric mask; an invalid entry marks the field, Escape restores it); DatePicker and DateRangePicker take `valueType="string"` for ISO-string values and `labels`.
- Popover takes `anchor`, `alignOffset`, the `collision*` props and `initialFocus` / `finalFocus`, and `onOpenChange` gets Base UI's details. Tooltip takes `.Trigger` / `.Content`. `AlertDialog.Action` waits on a returned promise or `pending`; `AlertDialog.Cancel`. A global `toast()` next to `useToast()`, once `<Toast manager={toast} />` is mounted.
- Dropdown submenus (`Dropdown.Sub`, `.SubTrigger`, `.SubContent`); rows number themselves (`index` optional); `Dropdown.Content keepMounted`.
- ContextMenu submenus (`ContextMenu.Sub`, `.SubTrigger`, `.SubContent`), Dropdown's; `ContextMenu.Content keepMounted`.
- Table `Footer`, `Caption`, `Empty`, sortable heads (`sort` / `defaultSort` / `onSortChange`) and `stacked` rows. Button `outline`, `destructive`, `success` and `link`, and a loading Button keeps focus; Badge `outline`; `Card.Divider` and `border`; link tabs (`Tabs.Item` `href`).
- Server-safe helpers: `./lib/{utils,springs,size-scale,shape-classes,field-classes}` and `./components/*/variants` carry no `'use client'`; the hooks and contexts are exported per subpath too (`./lib/field-box`, `./lib/use-morph`, …). CI checks the built `dist/`.
- The item sources ship under a `source` export condition (the package root, `/primitives/*`, `/components/*`, `/blocks/*`, the `./lib/*` and `variants` subpaths), with each item's `examples.mdx`: a modo site that re-exports a ui item documents it with its prose, props and live examples. The tarball grows from 415 kB to 791 kB.
- Tokens: the button washes (`--destructive-strong`, `--destructive-wash*`, `--success-strong`, `--success-wash*`), `--shadow-button-outline*`, `--shadow-button-ghost`, `--skeleton` and `--duration-loop`; shape-context's off-scale radii as `--radius-pill`, `--radius-focus-ring` and `--radius-pill-focus-ring` (`rounded-pill|focus-ring|pill-focus-ring`).

Breaking:

- `onChange` is `onValueChange` on Input, Textarea and Slider, and gets the value, not an event.
- `TabsSubtle` is gone: use `Tabs variant="subtle"`. Tabs take `value` / `defaultValue` / `onValueChange` only: `selectedIndex`, `defaultSelectedIndex` and `onSelect` are removed.
- Sizes are the ladder only: Button drops `sm`, `md`, `lg` and `icon-lg` (`icon-sm` stays, for the modo shell); Badge drops `sm`, `md` and `lg`; Sidebar's menu and sub-menu buttons take `default` / `compact` instead of `sm` / `lg` and `sm` / `md`.
- `Dialog.Content` / `AlertDialog.Content` `size` is `width`.
- Tooltip `forceOpen` is `open`.
- DatePicker and DateRangePicker split `disabled`: `disabled` is a boolean for the field, `disabledDays` takes the matchers.
- `Card.Button` takes Button's variants (`ghost` by default); its `link` variant and `CardButtonVariant` are gone.
- Removed: `SliderComfortable` / `SliderComfortableProps`, `ColorPickerPortalContainer` (use `Tooltip.PortalContainer`, which now scopes every overlay), `ContextMenuItem` / `ContextMenuItemProps` (`ContextMenu.Item` is Dropdown's `MenuItem`), `useDropdownMaybe`, Select's `triggerVariants` and Combobox's `comboboxFieldVariants`.

Fixes:

- `Radio.Group` with `onValueChange` and no `defaultValue` reports picks.
- `Sidebar.Provider` and `Sidebar.Group` with only `onOpenChange` open and close.
- `Accordion` `collapsible={false}` keeps one item open.
- A picker inside `InputGroup.Field` takes the field's error and disabled state; clearing a picker's text clears its value.
- ContextMenu's radio rows are real radio items.
- Arrow keys skip `aria-disabled` rows in Checkbox and Radio groups.
- Toast's glyphs come from the icon context, so an `IconProvider` restyles them.
- A child's handlers chain with Button's under `render` / `asChild`.

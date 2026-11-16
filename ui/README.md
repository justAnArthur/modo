# @justanarthur/modo-ui

A React design system: [Fluid Functionalism](https://www.fluidfunctionalism.com)
(Base UI flavor) on UnoCSS, with a liquid morph layer on top. Motion springs, a
fluid hover highlight, a two-step size ladder and an eight-level elevated
surface system come from Fluid Functionalism; overlays that grow out of
whatever opened them, and indicators that melt between items, are local.

**Live docs:** https://justanarthur.github.io/modo/ui/ — every component with
its props and live examples, built with [modo](https://github.com/justAnArthur/modo).

## Install

```sh
npm install @justanarthur/modo-ui
```

React 18 or later is a peer dependency. Import from the package root, or one
item per subpath:

```tsx
import { Button, Switch } from '@justanarthur/modo-ui'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
```

Subpaths follow the docs' tiers and groups: `primitives/*`, `components/*`
(`components/button`, `components/inputs/select`, …) and `blocks/*`
(`blocks/sidebar-app`). The shared systems are subpaths too, for components of
your own: `lib/utils`, `lib/springs`, `lib/size-scale`, `lib/shape-classes`,
`lib/field-classes`, `lib/field-box`, `lib/size-context`, `lib/shape-context`,
`lib/icon-context`, `lib/use-controllable-state`, `lib/use-morph` and
`lib/goo-indicator`; Button's, Badge's and FileDropzone's pure tables are
`components/button/variants`, `components/badge/variants` and
`components/inputs/file-dropzone/variants`.

## Styles

The components are styled with utility classes. Take them prebuilt, or let
your own Tailwind or UnoCSS generate them from the package's `dist/`, so each
class is emitted once, beside your own. Pick one path.

### Prebuilt CSS

No CSS tooling needed. `styles.css` holds the reset, the tokens, the base
styles, the Inter variable font and every utility the components use:

```ts
import '@justanarthur/modo-ui/styles.css'
```

### Tailwind CSS v4

`tailwind.css` imports the tokens and base styles, adds `@source` for the
components, the `dark:` variant, the theme (`@theme inline`) and the token
utilities (`text-body`, `weight-medium`, `duration-fast`, …):

```css
@import "tailwindcss";
@import "@justanarthur/modo-ui/tailwind.css";
```

### UnoCSS

Add the preset next to `presetWind4`, and the components' classes through
`modoUiContent` (UnoCSS reads `content` from your config only, never from a
preset, so this part can't ship inside it):

```ts
// uno.config.ts
import presetModoUi, { modoUiContent } from '@justanarthur/modo-ui/unocss'
import { defineConfig, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [presetWind4(), presetModoUi()],
  content: { inline: [modoUiContent] },
})
```

Then import the generated CSS and the tokens with the base styles:

```ts
import 'virtual:uno.css'
import '@justanarthur/modo-ui/base.css'
```

`@justanarthur/modo-ui/tokens.css` holds the CSS variables alone, for a host
that brings its own base styles.

## Theming and dark mode

Every color is a `light-dark()` token, so `color-scheme` picks the side. It
follows the OS until `<html>` (or any subtree) carries the `light` or `dark`
class. The `dark:` utilities match inside a `.dark` ancestor, so set the class
whenever you pin a scheme:

```ts
document.documentElement.classList.toggle('dark', dark)
document.documentElement.classList.toggle('light', !dark)
```

A subtree with its own class keeps that scheme (a dark preview card on a light
page).

To re-brand, override tokens after the package's stylesheet, on the same
selector the tokens use (`.light` / `.dark` subtrees re-declare them). Give a
color both sides with `light-dark()`:

```css
:root,
.light,
.dark {
  --brand: oklch(0.65 0.19 150);
  --brand-hover: oklch(0.6 0.19 150);
  --background: light-dark(oklch(0.99 0.005 150), oklch(0.2 0.01 150));
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
}
```

The tokens live in five groups: colors (`--background`, `--foreground`,
`--muted-foreground`, `--accent`, `--brand`, `--destructive`, `--status-*`,
`--syntax-*`, …), typography (`--font-sans`, `--text-<role>`,
`--weight-*`), motion (`--duration-*`), radius and spacing. The surface ladder
(`--surface-1…8`, `--shadow-1…8`) re-points per scheme. The docs'
Foundations pages list every one with its value.

## Component API

The same conventions run through every component:

- **State both ways.** Values are `value` / `defaultValue` / `onValueChange`
  (`checked` / `defaultChecked` / `onCheckedChange` on Checkbox and Switch),
  and `onValueChange` gets the value, not an event: `Input`, `Textarea` and
  `Slider` included. Overlays and other popups take `open` / `defaultOpen` /
  `onOpenChange`. Leave the value prop out and the component keeps its own
  state.
- **Sizes.** `size` is `default` (36px) or `compact` (28px); Button adds
  `icon` and `icon-compact`. Leave it out and a component follows the nearest
  `SizeProvider`, so one `<SizeProvider size="compact">` makes a whole
  region dense, menus included.
- **Forms.** Checkbox, `Radio.Group`, Switch, Select, Combobox, Slider,
  NumberInput, ColorPicker, ChoiceList and the date and time pickers take `name` and
  submit their value with the surrounding form; Input and Textarea are native
  fields. Text fields, Select and Combobox take `readOnly` and `required`.
- **Fields.** Wrap a control in `Field` for a label, a description and an
  error (`Field.Label`, `.Description`, `.Error`); the control takes the
  field's `invalid`, `disabled`, `readOnly` and `required` unless it sets its
  own.
- **Overlays.** Content parts that anchor to a trigger (Popover, PreviewCard,
  Dropdown, Select, Combobox) take `side`, `align`, `sideOffset` and
  `container`, plus the morph options `from`, `effect`, `hideSource` and
  `tier`. `Tooltip.PortalContainer` portals every overlay inside it into
  another element (a preview frame, a shadow root). `Dialog.Content` and
  `AlertDialog.Content` take `width`: `sm` (400px), `lg` (540px) or `xl`
  (880px). `Tooltip` takes `open` / `defaultOpen` to pin it, `side`, `align`
  and `container`, and `Tooltip.Trigger` / `Tooltip.Content` for a trigger of
  your own. `Popover.Content` also takes `anchor`, `alignOffset`, the
  `collision*` props and `initialFocus` / `finalFocus`.
- **Tabs** take `variant`: `segmented` (a track with an elevated indicator,
  the default) or `subtle` (a borderless strip with a pill).
- **Date pickers.** `disabled` turns the field off; `disabledDays` takes
  react-day-picker matchers for the days that can't be picked.
  `valueType="string"` makes DatePicker and DateRangePicker take and report
  ISO strings instead of `Date`s; `labels` replaces their texts; DatePicker's
  `editable` lets the field be typed into.

```tsx
<Select name="plan" defaultValue="pro" onValueChange={setPlan}>…</Select>
<Input size="compact" onValueChange={setQuery} />
<DatePicker disabledDays={{ before: new Date() }} />
<Field invalid>
  <Field.Label>Email</Field.Label>
  <Input type="email" />
  <Field.Error>Enter a valid email.</Field.Error>
</Field>
```

## Next.js and React Server Components

- Every module with state, effects, handlers or browser APIs opens with
  `'use client'`, kept at the top of each built chunk, so the components work
  from Server Components (Next.js App Router) as client components.
- `@justanarthur/modo-ui/lib/{utils,springs,size-scale,shape-classes,field-classes}`
  and `components/{button,badge,inputs/file-dropzone}/variants` carry no
  `'use client'`, so a Server Component can call `cn`, read the class tables,
  build a link with `buttonVariants` or check a file with `acceptsFile`. The
  components and the context and hook subpaths are client modules; each
  context is one instance, shared by the barrel, the items and the subpaths.
- In a Server Component, use the named parts (`CardHeader`, `DialogContent`,
  `TabsList`, `SidebarMenuButton`, …) rather than the dotted form
  (`Card.Header`): React can't read a property off a client module from the
  server. Both are exported; the dotted form works in client components.
- `pdfjs-dist` is an optional peer, used only for PDF thumbnails in
  `InputMessage` (`npm install pdfjs-dist`). It loads lazily on the first PDF
  attachment, and fetches its worker from `cdn.jsdelivr.net`. Without it, a
  PDF attachment shows the file icon and a console warning. Webpack-based
  builds (Next.js) resolve the dynamic import at build time, so there install
  `pdfjs-dist` or alias it to `false`.

## Hooks for your own components

The motion and layout systems are exported, so components of your own move
and stack the way these do (the docs' Morph, Motion, Sizes and Surface pages
show them):

| Export | What it does |
|---|---|
| `useMorph(open, origin, options)` | The morph engine: grows an overlay's surface from its source (the trigger, the press point, an edge) to its own box on a spring tier, with a liquid goo neck by default, and holds it through the exit. |
| `MorphSurface` | Renders a `useMorph` state: the goo-filtered shape, the surface's background and shadow, the content clipped by it. |
| `GooIndicator` | An indicator (a selection, a thumb) that travels between items' rects and melts like a drop of liquid on the way. |
| `useReduceMotion()` | The one reduced-motion read: the OS setting, or a `<MotionConfig reducedMotion>` asking for it. |
| `useControllableState(value, defaultValue, onChange)` | Controlled and uncontrolled state in one, Base UI style: controlled while `value` isn't `undefined`, reporting every change either way. |
| `spring`, `exitFallbackMs` | The spring tiers (`fast`, `moderate`, `slow`, `goo`), each with its quicker `exit` tween, for motion's `transition`. |
| `useSize`, `useSizeVariant`, `SizeProvider`, `SizeScope` | The size ladder: a component's classes for its step, the step a region chose, and the providers that set it (`SizeScope` only when a `size` is given). |
| `useSurface`, `useLift(offset)`, `SurfaceProvider`, `Elevated` | The surface ladder: the substrate level, the level `offset` above it (capped at 8), re-providing it, and a raised `div`. |
| `useFluidHover`, `FluidHoverHighlight`, `FluidHover` | The fluid hover highlight: the hook and its highlight for a custom list, or the container for a simple one. |
| `IconProvider`, `ShapeProvider` | Swap the icon set, or switch every radius between rounded and pill. |
| `useFieldBox`, `useFieldState` (`lib/field-box`) | The field ladder's box around a control of your own, and an enclosing `Field`'s state resolved against a control's own props. |
| `useToast()`, `toast` | Show toasts: `useToast()` inside a `Toast`, or the global `toast` anywhere once `<Toast manager={toast} />` is mounted (one per app). Both have `show`, `success`, `error`, `warning`, `info`, `loading`, `promise`, `update` and `close`. |
| `Sortable`, `useSortableHandle`, `VirtualList`, `Resizable` | Building blocks for lists and layouts: reorder by pointer or keyboard (the handle props for a button of your own), render only the rows in view (a ref's `scrollToIndex`), and split a region into panes that resize. |
| `cn` | Class merging that knows the token utilities (`cn('text-body', 'text-muted-foreground')` keeps both). |

## Documenting ui items in your own modo site

A [modo](https://github.com/justAnArthur/modo/tree/main/lib) site can list ui
items next to its own. Re-export one as an item:

```tsx
// components/button/index.tsx
export { default } from '@justanarthur/modo-ui/components/button'
```

The package ships its TypeScript sources and each item's `examples.mdx` under
a `source` export condition, which modo reads and bundlers and Node skip
(they take `dist/`): the page gets the item's description, prop table and live examples,
bundled from those sources so they share one copy of each context. Load ui's
styles in the site's `css` (`@import "@justanarthur/modo-ui/styles.css";`);
the prebuilt sheet holds the components' utilities, so for the layout
utilities the examples add, point your Tailwind `@source` or UnoCSS `content`
at `node_modules/@justanarthur/modo-ui/{primitives,components,blocks}`.

## Credits

modo-ui is a port of [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism)
by Micka Touillaud / mickadesign, at commit
`b3587bdbd83fc66c2a6aae3817ffb856cb09260b`: MIT © 2026 Micka Touillaud, full
text in [`LICENSE.fluid-functionalism`](./LICENSE.fluid-functionalism). Every
vendored file keeps its provenance header.

The morph layer takes techniques from three more MIT projects:

| Project | Repository @ commit | License | What it contributes |
|---|---|---|---|
| beUI | `github.com/starc007/ui-components` @ `de52f337e520e7ee37749b36eb1c32df86137bcb` | MIT © 2026 Saurabh Chauhan, [`LICENSE.beui`](./LICENSE.beui) | the gooey popover's rect interpolation, rounded-rect path, source cutout and goo filter; the morphing search (idea only) |
| motion-primitives | `github.com/ibelick/motion-primitives` @ `120f64f6ca60348e251f929e9c81f11ccbe45eda` | MIT © 2024 ibelick, [`LICENSE.motion-primitives`](./LICENSE.motion-primitives) | the morphing popover and morphing dialog (trigger growing into the panel, shared parts) |
| Sileo | `github.com/hiaaryan/sileo` @ `9793f844349983e140cf33cebbb8f51626d41407` | MIT, [`LICENSE.sileo`](./LICENSE.sileo) | the goo blur as a share of the surface radius; the gooey toast |

Sileo declares MIT in its `package.json` but ships no LICENSE file, so
`LICENSE.sileo` is the standard MIT text naming the repository's owner.
beUI's and motion-primitives' are copied verbatim. Only visuals come from
these projects: Base UI keeps all behavior (positioning, focus, dismissal,
hover and tap, scroll lock).

The package itself is MIT ([`LICENSE`](./LICENSE)). How the port was done
(the upstream → local file map, every local modification, the Tailwind →
UnoCSS translation) is in [`PORTING.md`](https://github.com/justAnArthur/modo/blob/main/ui/PORTING.md)
in the repository.

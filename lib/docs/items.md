# Items

An item is one documented component: a folder with an `index.tsx` that default-exports it, a TSDoc block above it, and its examples beside it. modo finds items by folder; you register nothing.

## Tiers

Items live in four tier folders at the project root. The docs list them in this order. Any of them can be missing.

| Folder | For |
| --- | --- |
| `primitives/` | Atoms: Button, Link, Surface. |
| `components/` | Composites: Dialog, Select, Sidebar. |
| `blocks/` | Page-level patterns assembled from components. |
| `pages/` | Full screens assembled from blocks. |

Each item gets a page at `/docs/<tier>/<id>`, where `<id>` is its folder name. Blocks and pages are screen-sized: overviews give them whole rows and shrink them to fit, and the canvas lays them out in fewer columns.

Create one with the CLI:

```sh
modo add primitive badge          # primitives/badge/index.tsx + examples.mdx
modo add component overlays/dialog
modo add page dashboard
```

## Group folders

An item folder can sit inside group folders. A folder without an `index.tsx` is a group; groups nest.

```
components/
├── select/index.tsx                 — components/select
├── overlays/                        — group "Overlays"
│   └── dialog/index.tsx             — components/dialog
└── inputs/
    └── date-time/                   — nested group "Date time"
        └── calendar/index.tsx       — components/calendar
```

- A group is a nested sidebar section and a headed section of the tier overview. Each level lists its own items first, then its groups by folder name.
- The id is still the item's folder name, so URLs don't change when you regroup. Ids must be unique per tier across groups: a second item with the same id is skipped and reported as an error.
- modo doesn't look inside an item's own folder for more items.

## The item file

```
primitives/button/
├── index.tsx       — the item: default export + TSDoc block
├── examples.mdx    — its live examples
└── button.css      — co-located CSS, injected automatically
```

```tsx
// lib/templates/default/primitives/button/index.tsx
import type { MouseEventHandler, ReactNode } from 'react'

/**
 * Button — triggers an action. Also the docs chrome's Button: the chrome
 * passes `variant="ghost"`, `aria-label` and `aria-pressed`.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button({
  variant = 'primary',
  disabled,
  onClick,
  className,
  children,
  ...aria
}: {
  /** Visual style. */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Disables interaction. */
  disabled?: boolean
  /** Click handler. */
  onClick?: MouseEventHandler<HTMLButtonElement>
  /** Extra classes on the button. */
  className?: string
  /** Button content. */
  children?: ReactNode
  'aria-label'?: string
  'aria-pressed'?: boolean
}) {
  return (
    <button type="button" data-variant={variant} disabled={disabled} onClick={onClick} className={className} {...aria}>
      {children}
    </button>
  )
}
```

- `index.tsx` must have a default export. An item without one is skipped and fails `modo build`.
- The item's name is the default export's function or const name. An anonymous `export default function` takes the folder name.
- Every `.css` file in the item folder is injected, in file-name order. Don't import them.
- Compound parts hang off the default export (`Card.Header = CardHeader`). Examples can use `<Card.Header>`.

## The TSDoc block

The block right above the default export's declaration is the item's docs. It may be above `function Button` or `const Button = forwardRef(…)`; the `export default Button` line can sit anywhere in the file. Only whitespace and `export` / `default` / `async` / `declare` may sit between the block and the declaration.

The block is Markdown:

- The first paragraph is the page lead and the meta description.
- The rest renders below it as prose.
- Links and fenced code render through your shell `Link` and `Code`. Raw HTML shows as text.

A block tag counts only at the start of a line, outside a code fence. Any other `@word` stays prose, so `@fluid sidebar` or an email address is safe.

## Props

The props table comes from TypeScript's checker, so the props type can be written any way TypeScript understands:

- The first parameter's type: `function X({ a, b = 1 }: { a: string; b?: number })`, `function X(props: XProps)`.
- Or `const X = forwardRef<HTMLElement, XProps>(…)` (also under `memo`), else the component's own call signature (`Object.assign(Root, { Header })`).
- `extends`, `Omit` / `Pick` / `Partial`, intersections and unions, and types imported from other files or packages all resolve. A union's props are merged; a prop is optional unless every member has it.

Which members make the table:

- Members declared in your own files, in the package the item's docs were read from (a [re-export](#re-exported-items)), or in another package documented with modo (one that depends on `@justanarthur/modo`).
- Not members inherited from other packages' typings: React's DOM attributes (`HTMLAttributes`), a headless library's props. Re-declare one in your type to list it.
- Not keys an object literal yields through inference (cva's `VariantProps`), nor index signatures.

Props are listed by declaring type, in the order the types first appear, then in source order.

Each prop's JSDoc is its description, in Markdown. Its default comes from, in order:

1. The destructuring: `b = 1`. A bare constant (`accept = DEFAULT_ACCEPT`) gives way to a documented default.
2. `@default x` in the prop's JSDoc.
3. A closing sentence of the form "Defaults to `x`." (kept in the description).

| Tag | Effect |
| --- | --- |
| `@default x` | Fills the Default column. |
| `@values a, b` | Names the allowed values as "One of `a`, `b`." It is dropped when the type already lists them as a literal union. |

```tsx
interface BadgeProps {
  /** How loud the badge is. @values neutral, accent */
  tone?: string
  /** @default 'md' */
  size?: 'sm' | 'md'
  /** Shows a dot before the label. Defaults to `false`. */
  dot?: boolean
}
```

Shell slot matching reads these props too: keep `children` (and `href` for a Link) visible in the type. See [shell.md](./shell.md).

### Without TypeScript

`typescript` (5 or later) is an optional peer dependency. Without it, modo prints one `[modo:bundle] warning:` and reads items with a plain parser: the props come from the inline object type, or a same-file `interface` / object `type` (`function X(props: XProps)`, `forwardRef<HTMLElement, XProps>`); quoted prop names, inherited members and imported types are left out, and re-exported items and `{@inheritDoc}` don't resolve.

## Re-exported items

An item may be another package's component. Its `index.tsx` re-exports it, in any of these forms:

```tsx
export { default } from '@acme/ds/components/button'
export { Button as default } from '@acme/ds/components/button'
import Button from '@acme/ds/components/button'
export default Button
```

modo follows the export to its declaration and reads the docs, props and `@example {@include ./examples.mdx}` there, next to that file. A relative re-export (`export { default } from './impl'`) works the same way.

- A package that publishes its sources under a `source` export condition (`"./components/*": { "source": "./components/*/index.tsx", "default": "./dist/…" }`) is read from them. If that package is documented with modo, the items and their examples are bundled from the same sources, so they share one copy of each module.
- Otherwise its typings (`.d.ts`) are read, and its examples.mdx is looked for beside them.
- The page's block tags (`@since`, `@deprecated`, `@source`) are the target's.

## {@inheritDoc}

A wrapper documents what it adds and inherits the rest:

```tsx
import Button, { type ButtonProps } from '@acme/ds/components/button'

/**
 * {@inheritDoc @acme/ds/components/button}
 *
 * The fancy one glows.
 *
 * @example {@include ./examples.mdx}
 */
export default function FancyButton({ glow = false, ...props }: ButtonProps & { glow?: boolean }) {
  return <Button data-glow={glow} {...props} />
}
```

- The reference is a module specifier (its default export) or a name in the file's scope (`{@inheritDoc Button}`).
- The base's description comes first, then the wrapper's own. Its examples (inline and examples.mdx) come before the wrapper's.
- The base's props show when the wrapper's type includes them; the wrapper's block tags are its own.
- A base may inherit from another; a cycle and an unresolvable reference are `[modo:bundle] warning:`s.

## examples.mdx

Put examples in a co-located `examples.mdx` and include it from the block:

```tsx
/**
 * Button — triggers an action.
 *
 * @example {@include ./examples.mdx}
 */
```

```mdx
import Button from './index'

# Primary

<Button>Save</Button>

# Secondary

A quieter action next to a primary one.

<Button variant="secondary">Cancel</Button>
```

The rules:

- The whole `@example` line must be the include. Then the file is compiled into live examples instead of being inlined.
- Each example is a `#` title, an optional caption, and a JSX block. Every top-level JSX block becomes a live example card with Show code and Copy.
- A fenced code block renders as code to read, through your shell `Code`. Don't wrap code in a component; fence it.
- `###` is a sub-heading. Every heading gets an anchor; example and group titles get `example-<slug>` ids.
- The file goes through the same esbuild build as your items, with `remark-gfm`. Imports are real: the item is `./index`, another item is `../../<tier>/<id>` (one more `../` per group folder), packages by name. Contexts and providers are shared with the chrome.
- Items and the [`examples`](./config.md#examples) exports also resolve as JSX tags without an import. An identifier used in an expression (`icon={Plus}`) needs a real import.
- Expressions are plain JavaScript: no TypeScript syntax such as `as const`. MDX isn't type-checked.
- If you use a scanning CSS tool, its content globs must include `.mdx`.

A missing `.mdx` file is a `[modo:bundle] warning:`; the item still renders.

### Groups

A long list can be grouped. A `#` with `##` headings under it (before the next `#`) is a group, and each `##` an example in it. A group may hold its own example straight under its `#`, before its first `##`. Every other `#` stays a plain example, so one file can mix both:

```mdx
# Basic

<Tabs />

# Subtle

The borderless strip.

<Tabs variant="subtle" />

## With icons

<Tabs variant="subtle" icons />
```

| Heading | Plain | In a group |
| --- | --- | --- |
| `#` | example title, h3 | group title, h3 (`data-modo="example-group-title"`) |
| `##` | example title, h3 (no `#` above it) | example title, h4 |
| `###` | sub-heading, h4 | sub-heading, h5 (not in the table of contents) |

"On this page" lists h2–h4, so it reads Examples › Subtle › With icons. The roles are decided at build time from the whole file, so a page never re-renders into its groups.

## Inline @example

For a few short cases you can write an example inside the block. The code is a fenced block, or bare JSX: everything from the first line that starts with `<` up to the next tag. A `# Title` line and a caption above the code are optional. An `@example` with neither a fence nor JSX is reported as a warning.

````tsx
/**
 * Badge — a short status label.
 *
 * @example
 * # Tones
 * ```tsx
 * <Badge>Neutral</Badge>
 * <Badge tone="accent">New</Badge>
 * ```
 *
 * @example <Badge tone="accent">Bare</Badge>
 */
````

Inline examples compile in the browser with Babel standalone, loaded only on pages that have one:

- The body is one JSX expression or several siblings. No hooks.
- Leading `import` lines and a trailing `;` are stripped, so you can show imports for copy-paste.
- An identifier resolves only if it is an item name or an `examples` export (items win). Nothing touches globals.
- The code can't contain `*/`, so no JSX comments. Move such examples to `examples.mdx`.

Inline examples render before the `examples.mdx` ones.

## Full screen

Every example card, inline or from `examples.mdx`, has Open full screen beside Copy and Show code. It shows the example alone on its item's route, `/docs/<tier>/<id>?example=<key>`, across the whole viewport and without the chrome, so a screen-sized demo (a page, a dashboard block) renders at 1:1. A modified or middle click opens it in a new tab.

The key is the example's title as a slug (`# With icons` → `with-icons`). An untitled example takes its position: `3` for the item's third inline `@example`, `2.1` for the first live block of its second `.mdx`. In an `examples.mdx` the title is the example heading right above the block; a group title names none.

Escape, Back or the close button returns to the item page, at the example's card. An example that handles Escape itself (an open dialog calling `preventDefault`) keeps it. The URL is shareable, and works on a static build: it's the item's own page.

## Includes

Includes are TypeDoc inline tags, usable anywhere in the block. Paths are relative to the file the block is in (`index.tsx`, or a re-exported item's source). They are not recursive, and they stay inside the package the block belongs to (and your project, for your own files): a block read from `node_modules` can't include a file outside its package.

| Tag | Effect |
| --- | --- |
| `{@include ./usage.md}` | Inlines the file as Markdown, for prose too long for the comment. |
| `{@includeCode ./snippet.ts}` | Inlines the file as a fenced code block, with the extension as its language. |
| `@example {@include ./examples.mdx}` | Compiles the file into live examples (above). |

A missing file is a `[modo:bundle] warning:` and the include renders as nothing. In `modo dev`, editing an included `.md` or `.mdx` reloads the page.

## Block tags

The lifecycle tags show in a row under the page lead (`data-modo="page-meta"`). Provenance tags stay in the code and are credited once, on the overview:

| Tag | Shows |
| --- | --- |
| `@status <text>` | A status label. `@alpha`, `@beta` or `@experimental` set it too, when there's no `@status`. |
| `@since <version>` | "Since 1.2". |
| `@deprecated [text]` | "Deprecated", with the Markdown text after it if any. |
| `@source <url> [label]` | An upstream this item derives from. Repeat it for several. The overview's Credits section lists each upstream once (by label, linked to its repository) with how many items cite it. The label defaults to the URL without its scheme. |
| `@license <text>` | The upstream's license; the nth `@license` belongs to the nth `@source`. Shown beside that upstream in Credits. |

With [`repo`](./config.md#repo) set, the row also links the item's `index.tsx` in the repository.

```tsx
// ui/components/button/index.tsx
/**
 * …
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/button.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(/* … */)
```

`@remarks`, `@see`, `@version`, `@author`, `@internal`, `@public` and `@privateRemarks` are parsed as block tags, so their text leaves the description, but modo doesn't render them.

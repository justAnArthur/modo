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

The props table comes from the source, not from TypeScript's checker:

- The destructured parameter and its inline object type: `function X({ a, b = 1 }: { a: string; b?: number })`.
- Or a bare type name that resolves to an `interface` or object `type` in the same file: `function X(props: XProps)`.
- Or `const X = forwardRef<HTMLElement, XProps>(…)`, which reads `XProps` from the same file.

Each prop's JSDoc is its description, in Markdown. Two tags are read from it:

| Tag | Effect |
| --- | --- |
| `@default x` | Fills the Default column. A default in the destructuring (`b = 1`) wins over it. |
| `@values a, b` | Names the allowed values as "One of `a`, `b`." It is dropped when the type already lists them as a literal union. |

```tsx
interface BadgeProps {
  /** How loud the badge is. @values neutral, accent */
  tone?: string
  /** @default 'md' */
  size?: 'sm' | 'md'
}
```

Quoted prop names (`'aria-label'?: string`) and index signatures are left out of the table. Types imported from another file don't resolve; declare the props type in `index.tsx` if you want a table.

Shell slot matching reads these props too: keep `children` (and `href` for a Link) visible in the type. See [shell.md](./shell.md).

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
- Each example is a `#` (or `##`) title, an optional caption, and a JSX block. Every top-level JSX block becomes a live example card with Show code and Copy.
- A fenced code block renders as code to read, through your shell `Code`. Don't wrap code in a component; fence it.
- `###` is a sub-heading. Every heading gets an anchor and an entry in the page's table of contents. Example titles get `example-<slug>` ids.
- The file goes through the same esbuild build as your items, with `remark-gfm`. Imports are real: the item is `./index`, another item is `../../<tier>/<id>` (one more `../` per group folder), packages by name. Contexts and providers are shared with the chrome.
- Items and the [`examples`](./config.md#examples) exports also resolve as JSX tags without an import. An identifier used in an expression (`icon={Plus}`) needs a real import.
- Expressions are plain JavaScript: no TypeScript syntax such as `as const`. MDX isn't type-checked.
- If you use a scanning CSS tool, its content globs must include `.mdx`.

A missing `.mdx` file is a `[modo:bundle] warning:`; the item still renders.

## Inline @example

For a few short cases you can write an example inside the block. It needs a fenced code block; a `# Title` line and caption above the fence are optional.

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
 */
````

Inline examples compile in the browser with Babel standalone, loaded only on pages that have one:

- The body is one JSX expression or several siblings. No hooks.
- Leading `import` lines and a trailing `;` are stripped, so you can show imports for copy-paste.
- An identifier resolves only if it is an item name or an `examples` export (items win). Nothing touches globals.
- The code can't contain `*/`, so no JSX comments. Move such examples to `examples.mdx`.

Inline examples render before the `examples.mdx` ones.

## Includes

Includes are TypeDoc inline tags, usable anywhere in the block. Paths are relative to `index.tsx`. They are not recursive.

| Tag | Effect |
| --- | --- |
| `{@include ./usage.md}` | Inlines the file as Markdown, for prose too long for the comment. |
| `{@includeCode ./snippet.ts}` | Inlines the file as a fenced code block, with the extension as its language. |
| `@example {@include ./examples.mdx}` | Compiles the file into live examples (above). |

A missing file is a `[modo:bundle] warning:` and the include renders as nothing. In `modo dev`, editing an included `.md` or `.mdx` reloads the page.

## Block tags

These tags show in a row under the page lead (`data-modo="page-meta"`):

| Tag | Shows |
| --- | --- |
| `@status <text>` | A status label. `@alpha`, `@beta` or `@experimental` set it too, when there's no `@status`. |
| `@since <version>` | "Since 1.2". |
| `@deprecated [text]` | "Deprecated", with the Markdown text after it if any. |
| `@source <url> [label]` | "Upstream" and a link. The label defaults to the URL without its scheme. Repeat it for several upstreams. |
| `@license <text>` | The license text. Repeat it for several. |

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

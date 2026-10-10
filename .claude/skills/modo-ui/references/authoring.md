# Authoring an item

How a new primitive, component or block is laid out, documented and verified in
`ui`, with a complete template that compiles, lints and renders. Repo-wide rules
live in `AGENTS.md` (**docs**, **file naming**, **styling**); this file is the ui-specific practice.

## Contents

- [Files](#files)
- [Header comment](#header-comment)
- [Props interface](#props-interface)
- [TSDoc](#tsdoc)
- [Compound parts](#compound-parts)
- [examples.mdx](#examplesmdx)
- [Template: Pagination](#template-pagination)
- [Porting an upstream FF component](#porting-an-upstream-ff-component)
- [Adding a token](#adding-a-token)
- [Verify](#verify)

## Files

```
components/<group>/<name>/
  index.tsx          the item: default export + TSDoc + props interface
  examples.mdx       its examples, included by `@example {@include ./examples.mdx}`
  <part>.tsx         optional helpers (a row, a docs stage), imported by index.tsx
  <name>.css         optional, auto-injected; structure only (visuals through tokens)
```

Groups are `inputs`, `navigation`, `overlays`; ungrouped items are core display pieces. The id stays
`<name>`, so moving between groups changes no URL. Imports: `lib/*` relatively (`../../../lib/…` from a
grouped item), other items by folder (`../../button`, `../../overlays/popover`), primitives as
`../../../primitives/sizes`.

## Header comment

Every file opens with a `/* */` block that says where the code comes from.

A local addition (single quotes, no semicolons, repo style):

```ts
/*
 * Local addition (not part of Fluid Functionalism): <what it is, one or two lines>.
 * <Credit any idea taken from beUI / motion-primitives / Sileo: repo, path, commit, license file.>
 */
```

A port of an upstream FF file keeps upstream's formatting and lists every change:

```ts
// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/<name>.tsx` @ <commit>
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; imports rewritten to `../../../lib/*`; `framer-motion` → `motion/react`.
 * - Styling reads DS tokens: `text-[Npx]` → `text-<role>`; `fontVariationSettings` → `weight-*`; …
 * - <every behavior change>
 */
```

Then add its row to `README.md`'s file map (and the tier mapping table for a new item).

## Props interface

modo's parser (`lib/src/lib/tsdoc.ts`) reads props from a same-file `interface <Item>Props`:

- **Only members declared in the body count.** Inherited members (`extends HTMLAttributes<…>`) are
  invisible in the table; re-declare the ones a reader needs (`className`, `children`, `disabled`).
- **One member per line.** A member whose type spans lines is dropped. Hoist a long union to a type
  alias (`type BadgeColor = …`) and reference it.
- **Every member has a description.** End with "Defaults to \`x\`." when there is a default: the table
  reads the default from that sentence. `@values a, b` names allowed values when the type can't.
- **The item is the file's default export**, a `function X(…)` or `const X = forwardRef<HTMLDivElement,
  XProps>(…)`; the forwardRef's first type argument holds no `<` or `,`.
- Shared prop prose is shared verbatim: the morph options (`from`, `effect`, `hideSource`, `tier`) copy
  their docs from [motion.md](motion.md#morphing-overlays); `size` reads "Pins … to one step of the size
  ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider."

## TSDoc

The JSDoc block on the default export is the page's only prose:

```ts
/**
 * <Lead: one sentence, what it is for. Becomes the page lead.>
 *
 * <Concept paragraph: what it does that a stock component doesn't, in the
 * interface's terms (what moves, from where, what stays put), which Base UI
 * primitive gives the behavior, and how it is controlled.>
 *
 * Statics:
 * - `Item.Part` — what it is: its key props.
 *
 * @example {@include ./examples.mdx}
 */
```

Write for someone using the product, not the code: "the panel melts out of the button", not "a goo
filter is applied". Sentence case, plain words, present tense. Name other items by their page names
(see Morph, see Sizes).

## Compound parts

Parts hang off the default export so examples can write `<Popover.Content>`:

```ts
function Popover(…) { … }
Popover.Trigger = PopoverTrigger
Popover.Content = PopoverContent
export default Popover
```

For a `forwardRef` root, type the parts on a cast (`as ForwardRefExoticComponent<…> & { Item: typeof
Item }`) and `Object.assign(Root, { Item })`. Keep upstream's named exports as well. A part that wraps a
control takes `SlotProps` from `lib/slot.ts` (`render={<Button/>}` or `asChild`).

## examples.mdx

```mdx
import Thing from './index'
import Button from '../../button'

# Section title

One-line caption: what to try and what to notice.

<Thing defaultValue="a" />
```

- Each `#` heading is one example card; the JSX block under it is live, and its source is the card's
  Show code. `###` is a sub-heading. Fence code that should be read, never wrap it in `<Code>`.
- **Hook-free.** Nothing runs a component body in an example, so interactivity comes from `default*`
  props. When a demo needs choreography (a value that changes on a timer, a button that toggles a
  state), write a small local stage component next to the item (`badge/change-demo.tsx`) and import it.
- **Plain JS expressions** (acorn): no `as const`, no type annotations.
- **Real imports.** The item is `./index`; other items by path. An identifier used in an expression
  (`icon={Plus}`) needs an import even when it is an item.
- Order: the main use first, then each variation that changes how it looks or moves (sizes, sides,
  effects), then states (disabled, loading, error), then composition with other items.
- Examples use the same tokens as items: no arbitrary visual values; frame geometry (`w-72`,
  `min-h-[240px]`) is fine.

## Template: Pagination

A complete control built only from the shared systems: size ladder, shape, one fluid hover
highlight, a liquid current-page indicator, a weight ghost-span, controlled + uncontrolled state,
icons from the icon context, the ghost `Button`, and a `size` prop that pins the subtree. It
typechecks, passes Biome and renders in light, dark and compact. Use it as the starting shape for any
strip or list of choices; for overlays start from Popover (see
[components.md](components.md#which-file-to-copy)).

`components/navigation/pagination/index.tsx`:

```tsx
/*
 * Local addition (not part of Fluid Functionalism): page navigation in the
 * system's motion language. The current page is a liquid indicator
 * (`lib/goo-indicator.tsx`) that melts from page to page, and one fluid hover
 * highlight runs along the strip.
 */

import { useRef } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import {
  type ItemRect,
  type UseFluidHoverReturn,
  useFluidHover,
  useRegisterFluidHoverItem,
} from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import Button from '../../button'

// Literal tables: UnoCSS only generates the classes it can read whole.
const SQUARE = { default: 'min-w-9', compact: 'min-w-7' }

type Slot = number | 'gap'

/** The ends, the current page and its siblings, and a gap wherever pages are skipped. */
function slots(page: number, total: number, siblings: number): Slot[] {
  const shown = new Set([1, total])
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= total) shown.add(p)

  const result: Slot[] = []
  let previous = 0
  for (const p of [...shown].sort((a, b) => a - b)) {
    // A gap of one page shows that page: an ellipsis would be no shorter.
    if (p - previous === 2) result.push(p - 1)
    else if (p - previous > 2) result.push('gap')
    result.push(p)
    previous = p
  }
  return result
}

interface PageButtonProps {
  page: number
  index: number
  current: boolean
  lit: boolean
  register: UseFluidHoverReturn['registerItem']
  onSelect: (page: number) => void
}

function PageButton({ page, index, current, lit, register, onSelect }: PageButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const size = useSize()
  const shape = useShape()
  useRegisterFluidHoverItem(register, index, ref)

  return (
    <button
      ref={ref}
      type="button"
      aria-current={current ? 'page' : undefined}
      onClick={() => onSelect(page)}
      className={cn(
        'relative z-10 flex cursor-pointer items-center justify-center px-2 tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
        size.control,
        SQUARE[size.variant],
        shape.button,
      )}
    >
      {/* The invisible semibold copy holds the width, so the current page turns semibold without moving its neighbours. */}
      <span className={cn('inline-grid', size.text)}>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 weight-semibold">
          {page}
        </span>
        <span
          className={cn(
            'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast',
            current || lit ? 'text-foreground' : 'text-muted-foreground',
            current ? 'weight-semibold' : 'weight-normal',
          )}
        >
          {page}
        </span>
      </span>
    </button>
  )
}

interface PaginationProps {
  /** Number of pages. */
  total: number
  /** Controlled current page, counted from 1. Pair with `onPageChange`. */
  page?: number
  /** Initial page, for an uncontrolled pagination. Defaults to `1`. */
  defaultPage?: number
  /** Called with the new page whenever it changes. */
  onPageChange?: (page: number) => void
  /** Pages shown on each side of the current one before a gap. Defaults to `1`. */
  siblings?: number
  /** Pins the strip to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `nav` root. */
  className?: string
}

/**
 * Page navigation: previous and next, the first and last pages, and the
 * current page's neighbours, with a gap wherever pages are skipped.
 *
 * The current page is a liquid indicator: picking another page melts it
 * across the strip (see the liquid indicators in Morph), and its number turns
 * semibold without moving the others. One fluid hover highlight runs along
 * the page buttons, so a click between two pages lands on the lit one. Works
 * controlled (`page` + `onPageChange`) or uncontrolled (`defaultPage`).
 *
 * @example {@include ./examples.mdx}
 */
function Pagination({
  total,
  page,
  defaultPage = 1,
  onPageChange,
  siblings = 1,
  size: sizeProp,
  className,
}: PaginationProps) {
  const [current, setCurrent] = useControllableState(page, defaultPage, onPageChange)
  const size = useSize(sizeProp)
  const shape = useShape()
  const containerRef = useRef<HTMLDivElement>(null)
  const hover = useFluidHover(containerRef, { axis: 'x' })
  const ArrowLeft = useIcon('arrow-left')
  const ArrowRight = useIcon('arrow-right')
  const iconSize = size.variant === 'compact' ? 'icon-compact' : 'icon'

  const list = slots(current, total, siblings)
  const pages = list.filter((slot): slot is number => slot !== 'gap')
  // A page change can re-key the strip; hold the last measured rect so the
  // indicator travels from where it was instead of blinking out mid-measure.
  const measured = hover.isMeasured ? hover.itemRects[pages.indexOf(current)] : undefined
  const lastRect = useRef<ItemRect | undefined>(measured)
  if (measured) lastRect.current = measured

  const nav = (
    <nav aria-label="Pagination" className={cn('flex items-center', size.gap, className)}>
      <Button
        variant="ghost"
        size={iconSize}
        aria-label="Previous page"
        disabled={current <= 1}
        onClick={() => setCurrent(current - 1)}
      >
        <ArrowLeft />
      </Button>

      <div ref={containerRef} {...hover.handlers} className="relative flex items-center gap-1">
        {lastRect.current && <GooIndicator rect={lastRect.current} className={cn('bg-accent', shape.bg)} />}
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {list.map((slot, i) =>
          slot === 'gap' ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className={cn(
                'flex items-center justify-center text-muted-foreground',
                size.control,
                SQUARE[size.variant],
                size.text,
              )}
            >
              …
            </span>
          ) : (
            <PageButton
              key={slot}
              page={slot}
              index={pages.indexOf(slot)}
              current={slot === current}
              lit={hover.activeIndex === pages.indexOf(slot)}
              register={hover.registerItem}
              onSelect={setCurrent}
            />
          ),
        )}
      </div>

      <Button
        variant="ghost"
        size={iconSize}
        aria-label="Next page"
        disabled={current >= total}
        onClick={() => setCurrent(current + 1)}
      >
        <ArrowRight />
      </Button>
    </nav>
  )

  // A size prop pins the whole strip, the page buttons included.
  return sizeProp ? <SizeProvider size={sizeProp}>{nav}</SizeProvider> : nav
}

export type { PaginationProps }
export { Pagination }

export default Pagination
```

`components/navigation/pagination/examples.mdx`:

```mdx
import Pagination from './index'

# Pages

The current page melts from page to page, and the hover glides along the strip. A click between two pages lands on the lit one.

<Pagination total={12} defaultPage={5} />

# Few pages

With nothing to skip, every page shows.

<Pagination total={5} defaultPage={2} />

# Compact

The strip steps down the size ladder with everything around it.

<Pagination total={20} defaultPage={10} size="compact" />
```

What each part shows:

- **`SQUARE` table** — dynamic classes come from literal tables so UnoCSS can see them.
- **`useSize(sizeProp)` + `<SizeProvider>`** — the root resolves its own step and pins its subtree, so
  `PageButton`'s `useSize()` and the `Button`s follow.
- **One `useFluidHover` on the strip**, `axis: 'x'`, handlers spread on the `relative` container; only
  page buttons register (the gap is not a click target); rows have no `:hover` fill and sit at `z-10`.
- **`GooIndicator` from `itemRects`**, held at the last measured rect while a page change re-keys the
  strip, so it travels instead of blinking.
- **Ghost-span** on the page number; text color follows the highlight (`lit`), weight follows the
  persistent state (`current`).
- **`aria-current="page"`**, labelled icon buttons, native buttons for focus and activation.

## Porting an upstream FF component

The mechanical pass every ported item went through (README › Items):

1. Take `registry/base/<name>.tsx` when upstream ships a flavored file, else `registry/default/`. Note
   the commit. Components newer than the port's pin (`b3587bd`) may lean on upstream libs this port
   lacks (`typeClass`, `nestedRadius`, `useSize().field`); port those pieces or translate them.
2. Drop `"use client"`; rewrite `@/lib/*` and `@/hooks/*` to `../../../lib/*`, `SizeProvider` to
   `primitives/sizes`, `Elevated` to `primitives/surface`, `@/registry/radix/*` to the Base sibling,
   `framer-motion` to `motion/react`, `next/link` to an anchor.
3. Translate styling to tokens: `text-[Npx]` → `text-<role>[-compact]`, `fontVariationSettings` →
   `weight-*`, `duration-80|160|240` → `duration-<tier>`, hex rings → `ring-focus-ring`.
4. Replace upstream motion with the local layer where it applies: popups and tooltips morph
   (`useMorph` + `MorphSurface`), traveling fills become `GooIndicator`s.
5. Add `default*` twins through `useControllableState` for every controlled-only prop.
6. React 18: `MutableRefObject` casts where a forwarded ref is written, `useRef<T | null>(null)`,
   `forwardRef` for components that receive refs.
7. Re-declare the props interface one member per line with the FF docs API-table text; write the TSDoc
   from the FF docs page; one `# <FF section title>` example per docs section in `examples.mdx`
   (Playground and API Reference are never ported).
8. Header comment listing every change; README file-map row.

## Adding a token

1. The var in `tokens/<group>.css` (colors as one `light-dark(light, dark)` value on `:root, .light,
   .dark`; a shadow that differs per scheme goes in `primitives/surface/surface.css` with the per-scheme
   re-pointing).
2. Its utility in `uno.config.ts`: `theme.colors` / `theme.shadow` for a color or shadow (pointing at the
   var), a `rules` entry for a new utility family.
3. A class group in `lib/utils.ts` when the utility's prefix could collide in `cn` (a `text-*` that is
   not a color, a new `duration-*`).
4. Mirror it in `DESIGN.md` (front matter and prose) so the design doc stays the readable source.

## Verify

From the repo root unless noted:

```bash
bun run lint
```

```bash
cd ui && bunx tsc -p . --noEmit
```

```bash
rg -n -e 'font-(normal|medium|semibold|bold)\b' -e "from 'framer-motion'" -e '\b(uppercase|tracking-[a-z]+)\b' -e 'text-(foreground|muted-foreground)/[0-9]' -e '(duration|delay): ?[0-9.]+' -e 'useReducedMotion\(' -e 'hover:bg-' -e 'transition-colors' -e '"use client"' ui/components/navigation/pagination
```

Then run it and look (the runner kills stray servers and builds the lib CLI if needed):

```bash
cd demo && bun scripts/run-design-systems.ts ui
```

Open the item's page and check, in this order: `[modo:bundle]` warnings in the server output (a parser
or build problem), the props table (every prop, its default), each example in light and dark (the
Theme panel), inside a compact region, by keyboard only (ring on keyboard, none on click), with the OS
set to reduce motion (morphs fade, travel snaps), and a popup opened inside a Dialog (it must lift
above it).

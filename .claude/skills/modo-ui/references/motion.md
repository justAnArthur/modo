# Motion recipes

How things move in `ui`, as code you can paste. Shipped items already follow all of
it; these recipes are for what you build next to them, so a new list moves at the same magnitudes as
the Select beside it. Imports are written from an item at `components/<group>/<name>/index.tsx`. The live pages are `primitives/systems/motion`, `primitives/systems/fluid-hover` and
`primitives/systems/morph` in the dev server.

## Contents

- [Spring tiers](#spring-tiers)
- [Reduced motion](#reduced-motion)
- [Fluid hover](#fluid-hover)
- [Liquid indicators](#liquid-indicators)
- [Weight without reflow](#weight-without-reflow)
- [Icon swaps](#icon-swaps)
- [Morphing overlays](#morphing-overlays)
- [Shared parts](#shared-parts)
- [State morphs inside a control](#state-morphs-inside-a-control)
- [Goo between your own shapes](#goo-between-your-own-shapes)
- [Growing in place](#growing-in-place)
- [Measured heights](#measured-heights)

## Spring tiers

```ts
import { spring, springEnter } from '../../../lib/springs'
```

| Token | Enter | Exit | Use for |
|---|---|---|---|
| `spring.fast` | spring 0.08s, bounce 0 | tween 0.06s | Hover highlight, focus ring, fades, stroke and weight changes, tooltips' fade |
| `spring.moderate` | spring 0.16s, bounce 0 | tween 0.12s | Indicators, thumbs, small panels, width changes, folds; anything that must land exactly |
| `spring.slow` | spring 0.24s, bounce 0.12 | tween 0.16s | Large surfaces, plain morphs (the default `tier`), shared parts, a field growing over its row |
| `spring.goo` | spring, visual 0.25s, bounce 0.15 | spring back, visual 0.2s | Only through the morph engine: the neck needs the time |

The bigger the thing that moves, the slower the tier. Never write a duration, an ease or a fifth tier.

```tsx
// Mount / unmount
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0, transition: spring.fast.exit }}
  transition={spring.fast}
/>

// A target that flips without unmounting picks by state
<motion.span animate={{ opacity: open ? 1 : 0 }} transition={open ? spring.fast : spring.fast.exit} />

// A transition object that must not carry `exit` (animate(), layout transitions)
animate(progress, 1, { ...springEnter(spring.moderate), onUpdate: render })

// Deferred-unmount timers derive from the tier
setTimeout(unmount, exitFallbackMs(spring.moderate))
```

CSS transitions use the tier utilities: `transition-[color,stroke-width] duration-fast`,
`duration-moderate-exit`, `delay-fast`. A property wind4 doesn't know (`stroke-width` and
`font-variation-settings` are already added) needs `theme.property` in `uno.config.ts`.

Animate `transform` and `opacity`. Only the morph engine and `GooIndicator` write boxes, because they
measure the geometry themselves; anything else that changes size springs `width` on a `motion` element
(see [Growing in place](#growing-in-place)) or folds a layer inside a fixed box (see
[State morphs](#state-morphs-inside-a-control)).

## Reduced motion

```ts
import { useReduceMotion } from '../../../lib/reduced-motion'
const reduced = useReduceMotion() // OS setting, or a surrounding MotionConfig asking for it
```

Fewer and gentler, never none: travel snaps (`transition={false}` / `{ duration: 0 }`), every morph
becomes a fade (the engine does this itself), opacity and color fades stay. There is no app-root
`MotionConfig` here, so never rely on one: read `useReduceMotion()` wherever you drive motion yourself.

## Fluid hover

One highlight per list, on the item nearest the cursor, gliding on `spring.fast` and melting from row
to row. A fresh entry fades in where the pointer is; a click in a gap goes to the lit row.

**Plain list or grid** — the container does it all:

```tsx
import FluidHover from '../../../primitives/systems/fluid-hover'

<FluidHover className="w-64 p-1" items={['Profile', 'Billing', 'Team']} />

<FluidHover columns={3} gapClick={{ maxDistance: 16 }}>
  <FluidHover.Item onClick={open}>…</FluidHover.Item>
</FluidHover>
```

**Custom rows** — the hook, the registration and the one highlight:

```tsx
import { type ReactNode, useRef } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { type UseFluidHoverReturn, useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'

function List({ rows }: { rows: { id: string; label: ReactNode; onSelect: () => void }[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hover = useFluidHover(containerRef, { axis: 'y' })
  const shape = useShape()
  return (
    <div ref={containerRef} {...hover.handlers} className="relative flex flex-col p-1">
      <FluidHoverHighlight hover={hover} className={shape.bg} />
      {rows.map((row, i) => (
        <Row key={row.id} index={i} register={hover.registerItem} onSelect={row.onSelect}>
          {row.label}
        </Row>
      ))}
    </div>
  )
}

function Row({ index, register, onSelect, children }: {
  index: number
  register: UseFluidHoverReturn['registerItem']
  onSelect: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const size = useSize()
  useRegisterFluidHoverItem(register, index, ref)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={cn('relative z-10 flex items-center text-left outline-none', size.control, size.itemPx, size.gap, size.text)}
    >
      {children}
    </button>
  )
}
```

Rules:

- **Axis matches the shape:** `y` lists, `x` strips, `xy` grids (`gapClick={{ maxDistance: 16 }}` for
  generous whitespace).
- **Spread `handlers` on the container** (it routes gap clicks); the container is `relative` and its
  padding is part of the list.
- **Rows have no `:hover` fill.** They sit above the highlight (`relative z-10`); hover may change their
  text color or icon stroke, read from `hover.activeIndex === i`.
- **Only click targets register.** Disabled rows stay registered and are skipped with
  `isItemDisabled: isDisabledRow` (from `lib/popup.ts`) or the container's `disabledIndices`.
- **One list per group of alternatives**; a divider between different kinds of rows means a new
  container. A popup that keeps rows mounted while hidden calls `hover.remeasure()` on open. Never
  re-measure on `children` changes.
- **Keyboard:** `const focus = useRowFocus(hover)` (`lib/row-group.tsx`; `useRowGroup(hover, { axis })`
  when the group handles arrows, Home and End itself) lights the focused row; spread
  `focus.handlers` on the container and draw `<FocusRing rect={focus.focusRect} />`
  (`lib/focus-ring.tsx`; see Focus in SKILL.md). Pass `from={itemRects[checked]}` so a fresh session starts on the
  current choice; `hidden` keeps state while a popup is closed; `transition={false}` after a reflow.
- **Skip fluid hover** where a wrong click would hurt, where only some items are clickable, where items
  sit far apart in empty space, or where rows move as you scroll.

## Liquid indicators

Anything that travels between items is a `GooIndicator`: when it leaves a rect, a blob lingers a third
of the spring, then follows and is absorbed, melted through a goo filter (only while moving). Render it
beneath the items, in their `relative` container, from the rects `useFluidHover` measures.

```tsx
import { GooIndicator } from '../../../lib/goo-indicator'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { useLift } from '../../../lib/surface-context'

const { itemRects, activeIndex: hovered } = hover
const level = useLift(3)
const selectedRect = itemRects[selected]
const hoverRect = hovered !== null ? itemRects[hovered] : undefined
const hovering = hoverRect !== undefined && hovered !== selected

{selectedRect && (
  // An elevated, opaque indicator: fill + radius in className, its own shadow at rest
  <GooIndicator
    rect={selectedRect}
    className={cn(SURFACE_BG[level], shape.bg)}
    shadow={SURFACE_SHADOW[level]}
    opacity={hovering ? 0.85 : 1}
  />
)}
{selectedRect && (
  // The hover pill rests on the selection, so it drips back into it as it fades
  <GooIndicator
    rect={hovering ? hoverRect : selectedRect}
    className={cn('bg-hover', shape.bg)}
    transition={spring.fast}
    opacity={hovering ? 0.4 : 0}
  />
)}
```

- `transition` defaults to `spring.moderate`; `false` snaps (a reflow, not a change of item).
- `from` sets where it first appears and travels in from.
- Translucent fills (`bg-hover`, `bg-active`) melt as well as opaque ones: `GooLayer` thresholds
  coverage and refills with the fill's own token.
- A square fill has no radius to melt and simply slides.
- Contiguous multi-selection: `useSelectionRuns(checked)` → `useMergeSplitBlocks(runs, itemRects,
  shape.mergedRadius)` → `<SelectionBackgrounds blocks={blocks} />` (see `inputs/checkbox`).

## Weight without reflow

State (selected, active, open) makes a label `weight-semibold`. A heavier weight is wider, so reserve
the width with an invisible semibold copy in the same grid cell. `WeightLabel` is that pair:

```tsx
import { WeightLabel } from '../../../lib/weight-label'

<WeightLabel emphasized={selected} lit={active} trim truncate="line" className={cn('flex-1', size.text)}>
  {label}
</WeightLabel>
```

`emphasized` picks the weight, `lit` the color (foreground or muted; leave it out to inherit), `trim`
adds `text-trim` for a fixed-height row, `truncate` ends a long label in an ellipsis (`'line'`, or
`'inherit'` under a consumer's `truncate`). It forwards its ref and HTML props. By hand, the pair is:

```tsx
<span className={cn('inline-grid whitespace-nowrap', size.text)}>
  <span aria-hidden="true" className="invisible col-start-1 row-start-1 weight-semibold text-trim">
    {label}
  </span>
  <span
    className={cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast text-trim',
      active ? 'text-foreground' : 'text-muted-foreground',
      selected ? 'weight-semibold' : 'weight-normal',
    )}
  >
    {label}
  </span>
</span>
```

- The transition list must include `font-variation-settings`; `transition-colors` snaps the weight.
- The pair is `weight-normal` → `weight-semibold`. Don't invent other pairs.
- Hover previews through the highlight and the text color, not through weight; weight is for persistent
  state.
- Skip the ghost only when the weight never changes or the box is fixed-width anyway.

## Icon swaps

Two glyphs in one icon-sized grid cell crossfading with a touch of blur and scale, so the slot never
resizes. The arriving glyph rides the tier's full duration, the leaving one its exit, as tweens (blur
is a filter string a spring can't drive, and a critically damped spring would settle early).

```tsx
const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const enter = { type: 'tween' as const, duration: spring.fast.duration, ease: 'easeOut' as const }
const leave = { type: 'tween' as const, ...spring.fast.exit, ease: 'easeIn' as const }

<span className="grid" style={{ width: size.icon, height: size.icon }}>
  <motion.span className="col-start-1 row-start-1 flex" initial={false} animate={done ? HIDDEN : SHOWN} transition={done ? leave : enter}>
    <CopyIcon size={size.icon} strokeWidth={1.5} />
  </motion.span>
  <motion.span className="col-start-1 row-start-1 flex" initial={false} animate={done ? SHOWN : HIDDEN} transition={done ? enter : leave}>
    <CheckIcon size={size.icon} strokeWidth={1.5} />
  </motion.span>
</span>
```

The named eases are the one sanctioned exception to "no easing": they pair with a tier's duration for
a filter tween. Keep the accessible label stable and announce the new state from a visually hidden
`aria-live="polite"` span. `Copy` goes further (the glyph melts into a status disc); match the
component you extend.

## Morphing overlays

Every new floating surface grows out of its source and closes back into it. Base UI keeps all behavior;
the engine only draws. Copy `components/overlays/popover/index.tsx` for the full reference; the wiring
is:

```tsx
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useMergeRefs } from '../../../lib/merge-refs'
import {
  type AnchorProps,
  OverlayContext,
  positionerProps,
  useOverlay,
  useOverlayRoot,
  usePortalContainer,
} from '../../../lib/overlay'
import { PopupSurface } from '../../../lib/popup-surface'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'

// Root: the open state both ways, and what opened it (captured by root.onOpenChange)
function Flyout({ open, defaultOpen, onOpenChange, children }: FlyoutProps) {
  const root = useOverlayRoot({ open, defaultOpen, onOpenChange })
  return (
    <OverlayContext.Provider value={root.state}>
      <PopoverPrimitive.Root open={root.open} onOpenChange={root.onOpenChange}>
        {children}
      </PopoverPrimitive.Root>
    </OverlayContext.Provider>
  )
}

interface FlyoutContentProps extends AnchorProps, MorphProps, HTMLAttributes<HTMLDivElement> {}

// Content: the engine, the positioner, the lifted surface
const FlyoutContent = forwardRef<HTMLDivElement, FlyoutContentProps>(
  ({ side, align, sideOffset, from, effect, hideSource, tier, container, className, children, ...props }, ref) => {
    const { open, origin } = useOverlay('Flyout.Content')
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)
    return (
      <PopoverPrimitive.Portal container={usePortalContainer(container)}>
        <PopoverPrimitive.Positioner
          {...positionerProps({ side, align, sideOffset, effect, hideSource }, { side: 'bottom', align: 'center', sideOffset: 12 })}
        >
          {/* The popup keeps its final size: positioning and collision never see the animation */}
          <PopoverPrimitive.Popup ref={popupRef} className="relative outline-none" {...props}>
            {/* +2 above the substrate, re-provided, shadow-surface-3; lift="panel" for a dialog-like +4 */}
            <PopupSurface morph={morph} className={cn('flex flex-col gap-1 p-4', className)}>
              {children}
            </PopupSurface>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    )
  },
)
```

`positionerProps` merges the content's anchoring props over the overlay's defaults and pulls the panel
back over its trigger when it opens in place (`effect: 'morph'` + `hideSource`). `usePortalContainer`
honors `container`, else the nearest `PortalContainer`.

Options (`useMorph(open, origin, options, onExited?)`):

| Option | Values | Default | Note |
|---|---|---|---|
| `from` | `'trigger'`, `'pointer'`, `'center'`, `'top'`/`'right'`/`'bottom'`/`'left'` (window edges), a ref | `'trigger'` | `pointer` grows a droplet from the press point (context menus). |
| `effect` | `'goo'`, `'morph'`, `'slide'`, `'fade'` | `'goo'` | Goo runs on `spring.goo` whatever the tier. Reduced motion forces `fade`. |
| `hideSource` | boolean | `false` | The trigger fades out while open, so it reads as becoming the panel. With `effect: 'morph'` the panel opens in place (`positionerProps` handles the offset). |
| `tier` | `'moderate'`, `'slow'` | `'slow'` | For morph, slide and fade. Small panels (suggestions) take `moderate`. |
| `exit` | `{ effect: 'slide' \| 'fade', from? }` | — | Close-only override, read as the close starts (a swiped sheet slides on off its edge). |
| `instant` | `(popup) => boolean` | — | Show or hide at once while true (Base UI's `data-instant` tooltip hand-off). |

Expose the options on your content part with the house prop docs, so every overlay reads the same.
Extending `MorphProps` (`lib/use-morph.ts`) and `AnchorProps` (`lib/overlay.tsx`) gives you them; their
text is:

```ts
/** Where the panel grows from (see Morph): the pressed trigger, the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
/** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
effect?: 'goo' | 'morph' | 'slide' | 'fade'
/** Hide the trigger while open, so it reads as turning into the panel. Defaults to `false`. */
hideSource?: boolean
/** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'slow'`. */
tier?: 'moderate' | 'slow'
```

Details the engine handles, which you must not redo: the exit hold that keeps Base UI from unmounting
mid-close, focus returning to the trigger, cutting the source out of the growing shape, the outline
standing in for the shadow while the neck is attached, picking up a reopen mid-close. A modal's
backdrop fades with the engine's progress: `render={<motion.div style={{ opacity: morph.progress }} />}`
(see Dialog). Inverted surfaces pass `bg="bg-foreground"` and no shadow (see Tooltip). The neck's
length is the gap between trigger and panel: keep `sideOffset` at 12 for a panel, 6 for a list (Select,
Combobox, Dropdown, Search, the pickers).

## Shared parts

A part in the trigger and its twin in the panel fly between each other while the surface morphs
(`MorphPart`, a motion `layoutId` on `spring.slow`). The overlay root scopes them with
`MorphPartScope`; Dialog does, so inside a Dialog:

```tsx
<Dialog>
  <Dialog.Trigger className="flex w-56 flex-col gap-3 rounded-xl bg-surface-2 p-3 text-left shadow-surface-2 outline-none focus-visible:ring-1 focus-visible:ring-focus-ring">
    <Morph.Part id="cover" className="h-28 w-full rounded-lg bg-brand/20" />
    <Morph.Part id="title" className="text-subtitle weight-semibold text-foreground">Liquid glass</Morph.Part>
  </Dialog.Trigger>
  <Dialog.Content width="lg" effect="morph" hideSource>
    <Morph.Part id="cover" className="h-48 w-full rounded-lg bg-brand/20" />
    <Morph.Part id="title" className="text-title weight-semibold text-foreground">Liquid glass</Morph.Part>
  </Dialog.Content>
</Dialog>
```

A new overlay root that wants parts provides `MorphPartScope` with a memoized `{ id: useId(), open }`
(see `DialogState` in `overlays/dialog/index.tsx`); `MorphSurface` already marks its content as inside the
overlay.

## State morphs inside a control

A state change inside a fixed box (Button's `loading`) drives one progress value and writes geometry
in a render function, then drops the inline styles at rest so the classes take over again:

```tsx
const progress = useMotionValue(on ? 1 : 0)
useLayoutEffect(() => {
  const el = layer.current
  if (!el) return
  const render = (p: number) => { el.style.borderRadius = `${rest + (circle - rest) * p}px` /* … */ }
  const settle = () => el.removeAttribute('style')
  const target = on ? 1 : 0
  if (reduced || progress.get() === target) {
    progress.jump(target)
    return on ? render(1) : settle()
  }
  const controls = animate(progress, target, { ...springEnter(spring.moderate), onUpdate: render, onComplete: on ? undefined : settle })
  return () => controls.stop()
}, [on, reduced])
```

The outer box never changes, so nothing around the control moves. Content that leaves goes on
`spring.fast.exit` so the two states barely overlap.

## Goo between your own shapes

- **Opaque shapes** (a toast's pill and body, three dots): wrap them in an element with
  `style={{ filter: \`url(#${id})\` }}` and render `<GooFilter id={id} blur={…} />` from
  `lib/morph-layers.tsx`. The blur scales with radius: `radius * GOO_BLUR_RATIO` (0.5).
- **Translucent shapes** (hover / active fills): `GooLayer` from `lib/goo-indicator.tsx` thresholds
  coverage instead, then refills with the fill token; turn it on only while shapes move.
- The filter is the effect itself, so its inline `style` is allowed; geometry stays measured, colors
  stay tokens.

## Growing in place

A control that grows (Search) keeps its resting box in the layout and springs its own width over its
neighbours, absolutely positioned from the edge that stays put, lifted to a popup level while open:

```tsx
<motion.div
  className={cn(
    'absolute top-0 h-full overflow-hidden ring-1 transition-[box-shadow] duration-moderate',
    align === 'end' ? 'right-0' : 'left-0',
    shape.input,
    expanded ? cn('z-10 ring-transparent', SURFACE_BG[level], SURFACE_SHADOW[3]) : 'ring-border',
  )}
  initial={false}
  animate={{ width: expanded ? width : restWidth }}
  transition={reduced ? { duration: 0 } : expanded ? spring.slow : spring.slow.exit}
/>
```

Its contents keep a fixed width inside the clip, so they hold their place while the box grows over
them.

## Measured heights

A wrapper that animates to a measured height springs only when *it* toggles. When a child changed the
measurement (a nested section collapsing), snap with `{ duration: 0 }`: two springs stacked chase each
other and land late. Animate to a measured pixel height, never `height: 'auto'` under a scaled ancestor.
